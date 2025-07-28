from typing import List, Dict
from datetime import timedelta
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from schemas import *
from models import *
from auth import *
from crypto import encrypt_message, decrypt_message
from bson import ObjectId
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, APIRouter, WebSocket, WebSocketDisconnect, Body, Query, Form
import json

# Утилиты для пуша
async def push_personal_message(to_user: str, payload: dict):
    ws = active_connections_ws.get(to_user)
    if ws:
        await ws.send_text(json.dumps(payload))

async def push_group_message(group_members: List[str], from_user: str, payload: dict):
    for member in group_members:
        if member != from_user and member in active_connections_ws:
            await active_connections_ws[member].send_text(json.dumps(payload))

app = FastAPI()
router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_headers=["*","bypass-tunnel-reminder"],
    allow_credentials=True,
    allow_methods=["*"],
)

### НАСТРОЙКИ ###
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 мегабайт
MAX_FILE_COUNT = 20

### АУНТИФИКАЦИЯ ###

@app.post("/register")
async def register(user: UserCreate):
    existing = await get_user(user.username)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    hashed = get_password_hash(user.password)
    await create_user(user.username, hashed)
    return {"message": "User registered"}

@app.post("/token")
async def login(user: UserLogin):
    user_obj = await authenticate_user(user.username, user.password)
    if not user_obj:
        raise HTTPException(status_code=400, detail="Не верный логин или пароль")
    token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}

### СООБЩЕНИЯ ###

@app.post("/send/message")
async def send_message(
    payload: MessagePayload,
    current_user: dict = Depends(get_current_user)
):
    receiver = payload.receiver
    content = payload.content

    # … ваши валидации …
    encrypted_content = encrypt_message(content)

    # 1) сохраняем в БД
    await create_message(
        sender=current_user["username"],
        receiver=receiver,
        content=encrypted_content,
        audio_file_id=None
    )

    # 2) формируем объект, который придёт клиенту
    message_data = {
        "sender": current_user["username"],
        "receiver": receiver,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }
    payload_ws = {
        "type": "new_message",
        "data": message_data
    }

    # 3) пушим через WS, если получатель онлайн
    await push_personal_message(receiver, payload_ws)

    return JSONResponse({"message": "Сообщение отправлено"}, status_code=201)


@app.post("/send/voice")
async def send_voice_message(
    receiver: str = Form(None),
    group_id: str = Form(None),
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # … ваши валидации и загрузка в GridFS …
    contents = await audio_file.read()
    file_id = await voice_fs_bucket.upload_from_stream(
        audio_file.filename, contents,
        metadata={"user_id": current_user["username"], "type": "voice"}
    )
    audio_file_id = str(file_id)

    if receiver:
        # личка
        await create_message(
            sender=current_user["username"],
            receiver=receiver,
            content=None,
            audio_file_id=audio_file_id
        )
        message_data = {
            "sender": current_user["username"],
            "receiver": receiver,
            "audio_url": f"/voice/{audio_file_id}",
            "timestamp": datetime.utcnow().isoformat()
        }
        payload_ws = {"type": "new_voice_message", "data": message_data}
        await push_personal_message(receiver, payload_ws)
        return JSONResponse({"message": "Голосовое сообщение отправлено"}, status_code=201)

    # группа
    group = await get_group_by_id(group_id)
    await db.group_messages.insert_one({
        "group_id": group_id,
        "sender": current_user["username"],
        "audio_file_id": audio_file_id,
        "timestamp": datetime.utcnow()
    })
    message_data = {
        "sender": current_user["username"],
        "group_id": group_id,
        "audio_url": f"/voice/{audio_file_id}",
        "timestamp": datetime.utcnow().isoformat()
    }
    payload_ws = {"type": "new_group_voice_message", "data": message_data}
    await push_group_message(group["members"], current_user["username"], payload_ws)
    return JSONResponse({"message": "Голосовое сообщение отправлено в группу"}, status_code=201)

@app.get("/messages", response_model=List[MessageOut])
async def get_messages(current_user: dict = Depends(get_current_user)):
    raw_msgs = await get_messages_for_user(current_user["username"])
    result = []

    for msg in raw_msgs:
        audio_url = None
        file_url = None
        filename = None
        file_id = msg.get("file_id")

        if msg.get("audio_file_id"):
            audio_url = f"/voice/{msg['audio_file_id']}"

        if file_id:
            file_url = f"/file/{file_id}"
            try:
                file_doc = await db.fs.files.find_one({"_id": ObjectId(file_id)})
                if file_doc:
                    filename = file_doc["filename"]
            except:
                pass

        result.append(MessageOut(
            sender=msg["sender"],
            receiver=msg["receiver"],
            content=decrypt_message(msg["content"]) if msg.get("content") else None,
            audio_url=audio_url,
            file_id=str(file_id) if file_id else None,
            file_url=file_url,
            filename=filename,
            timestamp=msg["timestamp"]
        ))

    return result

@app.post("/send/file")
async def send_file_message(
    receiver: str = Form(None),
    group_id: str = Form(None),
    file: UploadFile = File(None),
    file_id: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    if not receiver and not group_id:
        raise HTTPException(400, detail="Нужно указать либо receiver, либо group_id")
    if receiver and group_id:
        raise HTTPException(400, detail="Нельзя указать одновременно receiver и group_id")

    if not file and not file_id:
        raise HTTPException(400, detail="Нужно передать либо file, либо file_id")
    if file and file_id:
        raise HTTPException(400, detail="Укажите либо file, либо file_id, не оба")

    # Загружаем файл, если передан
    uploaded_file_id = None
    if file:
        contents = await file.read()
        result_id = await fs_bucket.upload_from_stream(
            file.filename,
            contents,
            metadata={
                "user_id": current_user["username"],
                "content_type": file.content_type,
                "type": "generic"
            }
        )
        uploaded_file_id = str(result_id)
    else:
        # Проверка, существует ли указанный file_id
        try:
            file_obj = await fs_bucket.find({"_id": ObjectId(file_id)}).to_list(1)
            if not file_obj:
                raise HTTPException(404, detail="Указанный файл не найден")
            uploaded_file_id = file_id
        except Exception:
            raise HTTPException(400, detail="Неверный file_id")

    # Сохраняем сообщение
    if receiver:
        rec_user = await get_user(receiver)
        if not rec_user:
            raise HTTPException(404, detail="Получатель не найден")

        await create_message(
            sender=current_user["username"],
            receiver=receiver,
            content=None,
            audio_file_id=None,
            file_id=uploaded_file_id  # ← Новый аргумент в функции
        )
        return {"message": "Файл отправлен в личку"}

    group = await get_group_by_id(group_id)
    if not group:
        raise HTTPException(404, detail="Группа не найдена")
    if current_user["username"] not in group["members"]:
        raise HTTPException(403, detail="Вы не состоите в группе")

    await db.group_messages.insert_one({
        "group_id": group_id,
        "sender": current_user["username"],
        "content": None,
        "audio_file_id": None,
        "file_id": uploaded_file_id,
        "timestamp": datetime.utcnow()
    })
    return {"message": "Файл отправлен в группу"}

### ДРУЗЬЯ ###

@app.post("/friends/add")
async def add_friend(req: FriendAddRequest, current_user: dict = Depends(get_current_user)):
    if req.username == current_user["username"]:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    friend = await get_user(req.username)
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    # Добавляем друга в список текущего пользователя
    await add_friend_db(current_user["username"], req.username)

    # Добавляем текущего пользователя в список друга
    await add_friend_db(req.username, current_user["username"])

    return {"message": f"{req.username} added as friend (mutual)"}

@app.get("/friends/list", response_model=FriendListResponse)
async def list_friends(current_user: dict = Depends(get_current_user)):
    friends = await get_friends(current_user["username"])
    return FriendListResponse(friends=[FriendInfo(username=f) for f in friends])

### ФАЙЛЫ ###

@app.post("/file")
async def upload_file(user_id: str, file: UploadFile = File(...)):
    contents = await file.read()

    # ⛔ Проверка размера файла
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, detail="Файл превышает максимальный размер 50 МБ")

    # ⛔ Проверка количества файлов
    file_count = await count_user_files(user_id)
    if file_count >= MAX_FILE_COUNT:
        raise HTTPException(400, detail="Превышено максимальное количество файлов: 20")

    # ✅ Загрузка
    file_id = await fs_bucket.upload_from_stream(
        file.filename,
        contents,
        metadata={"user_id": user_id, "content_type": file.content_type}
    )

    return {"file_id": str(file_id)}

@app.get("/files")
async def list_files(user_id: str):
    cursor = db.fs.files.find({"metadata.user_id": user_id})
    files = []
    async for doc in cursor:
        files.append({
            "file_id": str(doc["_id"]),
            "filename": doc["filename"],
            "content_type": doc["metadata"].get("content_type"),
        })
    return files

@app.get("/file/{file_id}")
async def get_file(file_id: str):
    try:
        stream = await fs_bucket.open_download_stream(ObjectId(file_id))
        return StreamingResponse(stream, media_type=stream.metadata.get("content_type"))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    
@app.get("/voice/{file_id}")
async def get_file(file_id: str):
    try:
        stream = await voice_fs_bucket.open_download_stream(ObjectId(file_id))
        return StreamingResponse(stream, media_type=stream.metadata.get("content_type"))
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    
@app.delete("/file/{file_id}")
async def delete_file(file_id: str):
    try:
        oid = ObjectId(file_id)
        await fs_bucket.delete(oid)
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.post("/text")
async def upload_text_file(
    user_id: str,
    file: UploadFile = File(...),
):
    # Проверяем, что файл текстовый (опционально)
    if not file.content_type.startswith("text/"):
        raise HTTPException(status_code=400, detail="Можно загружать только текстовые файлы")

    contents = await file.read()  # bytes
    # Можно проверить размер, если нужно

    # Загружаем в GridFS
    file_id = await fs_bucket.upload_from_stream(
        file.filename,
        contents,
        metadata={"user_id": user_id, "content_type": file.content_type}
    )

    return {"file_id": str(file_id)}

@app.put("/text/{file_id}")
async def update_text_file_in_gridfs(
    file_id: str,
    file: UploadFile = File(...),
    user_id: str = Query(...),
):
    # Проверяем, что файл текстовый
    if not file.content_type.startswith("text/"):
        raise HTTPException(status_code=400, detail="Можно загружать только текстовые файлы")

    # Удаляем старый файл из GridFS
    await fs_bucket.delete(ObjectId(file_id))

    contents = await file.read()
    # Загружаем новый файл
    new_file_id = await fs_bucket.upload_from_stream(
        file.filename,
        contents,
        metadata={"user_id": user_id, "content_type": file.content_type}
    )

    return {"new_file_id": str(new_file_id)}

### ПРОФИЛЬ ###

@app.get("/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"username": current_user["username"]})
    if not user:
        raise HTTPException(404, "Профиль не найден")

    return convert_date_fields({
        "avatar_url": user.get("avatar_url"),
        "birth_date": user.get("birth_date"),
        "bio": user.get("bio"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "gender": user.get("gender"),
        "city": user.get("city"),
        "country": user.get("country"),
    })


@app.put("/profile", response_model=dict)
async def update_profile(
    data: UserProfileUpdate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await update_user_profile(current_user["username"], update_data)
    return {"message": "Profile updated"}

@app.post("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Файл должен быть изображением")

    # --- 1) удаляем старый ---
    user_doc = await db.users.find_one({"username": current_user["username"]})
    old_id = user_doc.get("avatar_id")
    if old_id:
        try:
            await avatar_fs_bucket.delete(ObjectId(old_id))
        except:
            pass

    # --- 2) загружаем новый ---
    data = await file.read()
    new_id = await avatar_fs_bucket.upload_from_stream(
        file.filename, data,
        metadata={
            "user_id": current_user["username"],
            "content_type": file.content_type,
            "uploaded_at": datetime.utcnow().isoformat()
        }
    )

    # --- 3) сохраняем avatar_id в профиле ---
    await db.users.update_one(
        {"username": current_user["username"]},
        {"$set": {"avatar_id": str(new_id)}}
    )

    return {"message": "Аватар загружен", "avatar_url": "/profile/avatar"}

@app.get("/profile/avatar")
async def get_avatar(current_user: dict = Depends(get_current_user)):
    user_doc = await db.users.find_one({"username": current_user["username"]})
    avatar_id = user_doc.get("avatar_id")
    if not avatar_id:
        raise HTTPException(404, "Аватар не найден")

    try:
        stream = await avatar_fs_bucket.open_download_stream(ObjectId(avatar_id))
    except:
        raise HTTPException(404, "Аватар не найден")

    return StreamingResponse(stream, media_type=stream.metadata.get("content_type"))

### ЗАДАЧИ ###

@app.post("/task", response_model=dict)
async def add_task(task: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = await create_task(current_user["username"], task)
    return {"message": "Task added", "id": task_id}

@app.get("/tasks", response_model=List[TaskOut])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await get_tasks_by_user(current_user["username"])
    return tasks

@app.delete("/task/{task_id}", response_model=dict)
async def remove_task(task_id: str, current_user: dict = Depends(get_current_user)):
    deleted = await delete_task(task_id, current_user["username"])
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Task not found or not yours")
    return {"message": "Task deleted successfully"}

### ГРУППЫ ###

@app.post("/group")
async def create_group_endpoint(
    group: GroupCreate,
    current_user: dict = Depends(get_current_user)
):
    group_id, invite_key = await create_group(group.name, current_user["username"])
    return {"group_id": group_id, "invite_key": invite_key}

@app.post("/group/join")
async def join_group_endpoint(
    request: JoinGroupRequest,
    current_user: dict = Depends(get_current_user)
):
    username = request.username or current_user["username"]
    group = await add_user_to_group(request.invite_key, username, current_user["username"])
    return {"message": f"{username} added to group {group['name']}"}

@app.delete("/group/{group_id}")
async def delete_group_endpoint(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Проверка, есть ли такая группа и текущий пользователь — её создатель
    group = await get_group_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    if group["creator"] != current_user["username"]:
        raise HTTPException(status_code=403, detail="Только создатель может удалить группу")

    # Удаляем группу
    await db.groups.delete_one({"_id": ObjectId(group_id)})

    # Удаляем все сообщения, связанные с этой группой
    delete_result = await db.group_messages.delete_many({"group_id": group_id})

    return {
        "message": "Group and related messages deleted successfully",
        "deleted_messages_count": delete_result.deleted_count
    }

@app.get("/groups", response_model=List[GroupInfo])
async def list_user_groups(current_user: dict = Depends(get_current_user)):
    groups = await get_groups_for_user(current_user["username"])
    return groups

@app.get("/group/messages", response_model=List[MessageOut])
async def get_group_messages(
    group_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    # Проверка существования группы
    group = await get_group_by_id(group_id)
    if not group:
        raise HTTPException(404, detail="Группа не найдена")

    # Проверка членства пользователя
    if current_user["username"] not in group["members"]:
        raise HTTPException(403, detail="Вы не состоите в этой группе")

    # Получаем все сообщения этой группы
    cursor = db.group_messages.find({"group_id": group_id}).sort("timestamp", 1)

    messages = []
    async for msg in cursor:
        audio_url = None
        file_url = None
        filename = None
        file_id = msg.get("file_id")

        if msg.get("audio_file_id"):
            audio_url = f"/voice/{msg['audio_file_id']}"

        if file_id:
            file_url = f"/file/{file_id}"
            try:
                file_doc = await db.fs.files.find_one({"_id": ObjectId(file_id)})
                if file_doc:
                    filename = file_doc["filename"]
            except:
                pass

        messages.append(MessageOut(
            sender=msg["sender"],
            receiver=group_id,  # в этом случае "receiver" — это id группы
            content=decrypt_message(msg["content"]) if msg.get("content") else None,
            audio_url=audio_url,
            file_id=str(file_id) if file_id else None,
            file_url=file_url,
            filename=filename,
            timestamp=msg["timestamp"]
        ))

    return messages

### WEBRTC ЗВОНКИ ###

active_connections_ws: Dict[str, WebSocket] = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    try:
        current_user = await get_current_user_ws(websocket)
    except WebSocketException:
        return

    username = current_user["username"]
    await websocket.accept()
    active_connections_ws[username] = websocket
    print(f"🔗 {username} подключился")

    try:
        while True:
            try:
                raw = await websocket.receive_text()
                msg = json.loads(raw)
                to_user = msg.get("to")
                payload = msg.get("data")

                if not to_user or not payload:
                    print(f"⚠️ Пустой to или data от {username}: {msg}")
                    continue

                if to_user in active_connections_ws:
                    print(f"➡️ Пересылка от {username} к {to_user}")
                    await active_connections_ws[to_user].send_text(json.dumps({
                        "from": username,
                        "data": payload
                    }))
                else:
                    print(f"❌ {to_user} не в сети")
            except Exception as e:
                print(f"💥 Ошибка при обработке сообщения от {username}: {e}")
                break  # выходим из while
    except WebSocketDisconnect:
        print(f"🔌 {username} отключился")
    finally:
        active_connections_ws.pop(username, None)
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

app = FastAPI()
router = APIRouter()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        raise HTTPException(status_code=400, detail="Incorrect credentials")
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
    group_id = payload.group_id
    content = payload.content

    if not receiver and not group_id:
        raise HTTPException(400, detail="Нужно указать receiver или group_id")
    if receiver and group_id:
        raise HTTPException(400, detail="Одновременно нельзя указывать receiver и group_id")
    if not content:
        raise HTTPException(400, detail="Должен быть текст сообщения")

    encrypted_content = encrypt_message(content)

    if receiver:
        rec_user = await get_user(receiver)
        if not rec_user:
            raise HTTPException(404, detail="Получатель не найден")
        await create_message(
            sender=current_user["username"],
            receiver=receiver,
            content=encrypted_content,
            audio_file_id=None
        )
        return JSONResponse({"message": "Сообщение отправлено в личку"})

    group = await get_group_by_id(group_id)
    if not group:
        raise HTTPException(404, detail="Группа не найдена")
    if current_user["username"] not in group["members"]:
        raise HTTPException(403, detail="Вы не состоите в группе")
    await db.group_messages.insert_one({
        "group_id": group_id,
        "sender": current_user["username"],
        "content": encrypted_content,
        "audio_file_id": None,
        "timestamp": datetime.utcnow()
    })
    return JSONResponse({"message": "Сообщение отправлено в группу"})

@app.post("/send/voice")
async def send_voice_message(
    receiver: str = Form(None),
    group_id: str = Form(None),
    audio_file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not receiver and not group_id:
        raise HTTPException(400, detail="Нужно указать receiver или group_id")
    if receiver and group_id:
        raise HTTPException(400, detail="Одновременно нельзя указывать receiver и group_id")

    if not audio_file.content_type.startswith("audio/"):
        raise HTTPException(400, detail="Файл должен быть аудиофайлом")

    contents = await audio_file.read()
    file_id = await voice_fs_bucket.upload_from_stream(
        audio_file.filename,
        contents,
        metadata={
            "user_id": current_user["username"],
            "content_type": audio_file.content_type,
            "type": "voice"
        }
    )
    audio_file_id = str(file_id)

    if receiver:
        rec_user = await get_user(receiver)
        if not rec_user:
            raise HTTPException(404, detail="Получатель не найден")
        await create_message(
            sender=current_user["username"],
            receiver=receiver,
            content=None,
            audio_file_id=audio_file_id
        )
        return JSONResponse({"message": "Голосовое сообщение отправлено в личку"})

    group = await get_group_by_id(group_id)
    if not group:
        raise HTTPException(404, detail="Группа не найдена")
    if current_user["username"] not in group["members"]:
        raise HTTPException(403, detail="Вы не состоите в группе")
    await db.group_messages.insert_one({
        "group_id": group_id,
        "sender": current_user["username"],
        "content": None,
        "audio_file_id": audio_file_id,
        "timestamp": datetime.utcnow()
    })
    return JSONResponse({"message": "Голосовое сообщение отправлено в группу"})

@app.get("/messages", response_model=List[MessageOut])
async def get_messages(current_user: dict = Depends(get_current_user)):
    raw_msgs = await get_messages_for_user(current_user["username"])
    result = []
    for msg in raw_msgs:
        audio_url = None
        if msg.get("audio_file_id"):
            audio_url = f"/files/{msg['audio_file_id']}"

        result.append(MessageOut(
            sender=msg["sender"],
            receiver=msg["receiver"],
            content=decrypt_message(msg["content"]) if msg.get("content") else None,
            audio_url=audio_url,
            timestamp=msg["timestamp"]
        ))
    return result

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
    profile = await get_user_profile(current_user["username"])
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.put("/profile", response_model=dict)
async def update_profile(
    data: UserProfileUpdate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await update_user_profile(current_user["username"], update_data)
    return {"message": "Profile updated"}

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
    await delete_group(group_id, current_user["username"])
    return {"message": "Group deleted successfully"}

@app.get("/groups", response_model=List[GroupInfo])
async def list_user_groups(current_user: dict = Depends(get_current_user)):
    groups = await get_groups_for_user(current_user["username"])
    return groups
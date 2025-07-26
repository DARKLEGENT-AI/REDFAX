from fastapi import WebSocket, WebSocketDisconnect, Query
from jose import JWTError, jwt
from typing import Dict, List

# --- помощники для аутентификации по токену в WS ---
async def get_current_user_ws(token: str):
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user(username)
    if not user:
        raise credentials_exception
    return {"username": username}

# --- менеджер активных звонков ---
class CallManager:
    def __init__(self):
        # ключ — call_id, значение — список WebSocket
        self.active_calls: Dict[str, List[WebSocket]] = {}

    async def connect(self, call_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_calls.setdefault(call_id, []).append(websocket)

    def disconnect(self, call_id: str, websocket: WebSocket):
        conns = self.active_calls.get(call_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active_calls.pop(call_id, None)

    async def forward(self, call_id: str, data, sender: WebSocket):
        """
        Отправляем всем участникам сессии, кроме отправителя.
        Если data — bytes, шлём send_bytes, иначе send_json.
        """
        for ws in self.active_calls.get(call_id, []):
            if ws is not sender:
                if isinstance(data, (bytes, bytearray)):
                    await ws.send_bytes(data)
                else:
                    await ws.send_json(data)

call_manager = CallManager()

# --- WS‑эндпоинт для звонка ---
# Клиенты: 
#   ws://yourserver/ws/call/{friend_username}?token=<JWT>
# 
# Через этот канал они будут обмениваться:
# 1) JSON‑сигналы: {"type": "offer", "sdp": ...}, {"type": "answer", "sdp": ...}, {"type": "ice", "candidate": ...}
# 2) Бинарные аудио‑фреймы: raw PCM/AAC/chunk
@app.websocket("/ws/call/{friend_username}")
async def websocket_call(
    websocket: WebSocket,
    friend_username: str,
    token: str = Query(...)
):
    # 1) аутентифицируем по токену
    current_user = await get_current_user_ws(token)
    # 2) генерируем уникальный call_id — одинаковый у вас и у друга
    users = sorted([current_user["username"], friend_username])
    call_id = f"call_{users[0]}_{users[1]}"

    # 3) подключаем WS в менеджер
    await call_manager.connect(call_id, websocket)

    try:
        while True:
            msg = await websocket.receive()
            # если пришёл JSON (например, offer/answer/ice)
            if "text" in msg:
                data = msg["text"]
                await call_manager.forward(call_id, data, websocket)
            # если пришли бинарные данные (аудио chunk)
            elif "bytes" in msg:
                chunk = msg["bytes"]
                await call_manager.forward(call_id, chunk, websocket)
    except WebSocketDisconnect:
        call_manager.disconnect(call_id, websocket)

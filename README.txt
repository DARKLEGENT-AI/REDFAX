pip install motor pymongo[snappy] python-jose[cryptography] passlib[bcrypt] fastapi uvicorn


REDFAX_SERVER/
├── main.py         # Точка входа (инициализация FastAPI и маршруты)
├── models.py       # MongoDB модели и подключение к базе данных
├── schemas.py      # Pydantic схемы
├── auth.py         # Авторизация, токены, хеширование, зависимости
├── crypto.py       # Шифрование/дешифрование AES
├── docker-compose.yml # Запуск MongoDB
├─ site # Фронтэнд

docker compose -f 'docker-compose.yml' up -d --build 'mongodb' 

uvicorn main:app --reload

ФРОНТ
HTML, Tallwind, TS, React, Vite

БЭК 
Python, Mongo , Websocket , Rest API, Монолит, Fast Api.

Ситема контроля версий
Git, GitHub.

Контейнеризация:
Docker,  Docker-compose.
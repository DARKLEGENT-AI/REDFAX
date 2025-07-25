from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Optional

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str

class MessageCreate(BaseModel):
    receiver: str
    content: str

class MessageOut(BaseModel):
    sender: str
    receiver: str
    content: str
    timestamp: datetime

class FriendAddRequest(BaseModel):
    username: str

class Contact(BaseModel):
    username: str

class FriendInfo(BaseModel):
    username: str

class FriendListResponse(BaseModel):
    friends: List[FriendInfo]

class FileMeta(BaseModel):
    filename: str
    content_type: str
    uploaded_at: int  # timestamp

class FileCreate(BaseModel):
    filename: str
    content: str

class FileUpdate(BaseModel):
    content: str

class UserProfile(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    languages: Optional[List[str]] = None
    bio: Optional[str] = None
    nickname: Optional[str] = None

class UserProfileUpdate(UserProfile):
    pass

class TaskCreate(BaseModel):
    title: str
    date: date  # формат YYYY-MM-DD

class TaskOut(TaskCreate):
    id: str

class GroupCreate(BaseModel):
    name: str

class GroupInDB(BaseModel):
    id: str
    name: str
    admin: str
    members: List[str]
    invite_key: str

class JoinGroupRequest(BaseModel):
    invite_key: str
    username: Optional[str] = None  # для админа

class GroupInfo(BaseModel):
    id: str
    name: str
    admin: str
    invite_key: str
    members: List[str]

class GroupMessageCreate(BaseModel):
    group_id: str
    content: str

class GroupMessageOut(BaseModel):
    sender: str
    content: str
    timestamp: datetime

class MessageCreate(BaseModel):
    receiver: str
    content: Optional[str] = None  # Текст может быть пустым
    audio_file_id: Optional[str] = None

class MessageOut(BaseModel):
    sender: str
    receiver: str
    content: Optional[str] = None
    audio_url: Optional[str] = None
    timestamp: datetime
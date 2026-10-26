from sqlalchemy import Column, Integer, String
from database import Base, engine
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from fastapi.security import OAuth2PasswordBearer


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    hashed_password = Column(String)
    role = Column(String)


class Folder(Base):
    __tablename__ = "folders"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    access_level = Column(String)
    documents = relationship("Document", back_populates="folder")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    title = Column(String, unique=True)
    content = Column(Text)
    folder_id = Column(Integer, ForeignKey("folders.id"))
    folder = relationship("Folder", back_populates="documents")


# Создаем таблицы
Base.metadata.create_all(bind=engine)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Pydantic модели
class UserCreate(BaseModel):
    username: str
    password: str


class UserInDB(UserCreate):
    id: int

    class Config:
        from_attributes = True


class FolderResponse(BaseModel):
    id: int
    name: str
    access_level: str

    class Config:
        from_attributes = True


class TitleResponse(BaseModel):
    title: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    title: str
    content: str

    class Config:
        from_attributes = True

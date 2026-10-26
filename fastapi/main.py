import os
import re
import uuid
import base64
from io import BytesIO
from typing import List
from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from sqlalchemy import func, event
from sqlalchemy.orm import Session

from database import get_db, engine
from models import (
    User, UserCreate, Folder, FolderResponse, Document,
    DocumentResponse, oauth2_scheme, TitleResponse
)


SECRET_KEY = os.environ.get("SECRET_KEY", "LyaytZkuVqR8k452")
ALGORITHM = "HS256"
TEMP_DIR = r"/static/documents"
app = FastAPI(debug=True)
# Публичный адрес бэкенда для ссылок на скачивание
IP = os.environ.get("PUBLIC_API_URL", "http://localhost:8000")

# Разрешённые источники для CORS (список через запятую в CORS_ORIGINS)
_origins = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not bcrypt.checkpw(form_data.password.encode('utf-8'), user.hashed_password.encode('utf-8')):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = jwt.encode({"sub": user.username, "role": user.role}, SECRET_KEY, algorithm=ALGORITHM)

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/register")
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already taken")
    print(user_data.password)
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), salt)

    new_user = User(
        username=user_data.username,
        hashed_password=hashed_password.decode('utf-8'),
        role="guest"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return JSONResponse(
        status_code=201,
        content={"message": "Your account is successfully registered!"}
    )


@app.get("/folders", response_model=List[FolderResponse])
async def get_folders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        folders = db.query(Folder).all()
    else:
        folders = db.query(Folder).filter(Folder.access_level.in_(["public", "restricted"])).all()
    return folders


@app.get("/folders/{folder_name}", response_model=List[TitleResponse])
async def get_documents(folder_name: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.name == folder_name).first()
    if not folder:
        raise HTTPException(status_code=404, detail=f"Folder not found {folder_name}")

    if folder.access_level == "secret" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail=f"Access denied to {folder_name}")

    return folder.documents

@app.get("/document")
async def get_document(
        folder_name: str,
        file_name: str,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    folder = db.query(Folder).filter(Folder.name == folder_name).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.access_level == "secret" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if folder.access_level == "restricted" and current_user.role not in ["admin", "engineer"]:
        raise HTTPException(status_code=403, detail="Access denied")

    file = db.query(Document).filter(Document.folder_id == int(folder.id)).filter(Document.title == file_name).first()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file_content = base64.b64decode(file.content)

    file_stream = BytesIO(file_content)

    file_extension = os.path.splitext(file_name)[1]
    random_filename = f"{uuid.uuid4().hex}{file_extension}"

    return StreamingResponse(file_stream, media_type="application/octet-stream", headers={"Content-Disposition": f"attachment; filename={random_filename}"})

@app.post("/upload")
async def upload_file(
        folder_name: str,
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    folder = db.query(Folder).filter(Folder.name == folder_name).first()

    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    if folder.access_level == "secret" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if folder.access_level == "restricted" and current_user.role not in ["admin", "engineer"]:
        raise HTTPException(status_code=403, detail="Access denied")

    existing_file = (
        db.query(Document)
        .filter(Document.folder_id == int(folder.id), Document.title == file.filename)
        .first()
    )

    if existing_file:
        raise HTTPException(status_code=400, detail="Filename already exists")

    file_content = await file.read()
    encoded_content = base64.b64encode(file_content).decode("utf-8")

    new_document = Document(
        title=file.filename,
        content=encoded_content,
        folder_id=folder.id
    )

    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    return {"message": f"File '{file.filename}' uploaded successfully"}



@app.get("/user/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username}

@app.post("/generate_download_link")
async def generate_download_link(
        file_name: str = Query(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.title == file_name).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    folder = db.query(Folder).filter(Folder.id == document.folder_id).first()

    if folder.access_level == "secret" and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if folder.access_level == "restricted" and current_user.role not in ["admin", "engineer"]:
        raise HTTPException(status_code=403, detail="Access denied")

    token = jwt.encode(
        {
            "document_title": document.title,
            "exp": datetime.utcnow() + timedelta(minutes=3)
        },
        SECRET_KEY,
        algorithm="HS256"
    )

    return {
        "download_link": f"{IP}/download?token={token}"
    }


@app.get("/download")
async def download_file(
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        file_name = payload.get("document_title")
        sanitized_file = os.path.basename(file_name)
        document = db.query(Document).filter(Document.title == sanitized_file).first()
        if document is None:
            raise HTTPException(status_code=404, detail="Document not found")

        try:
            file_content = base64.b64decode(document.content)
            print(file_content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error decoding file: {str(e)}")

        with open(rf".{TEMP_DIR}/{sanitized_file}", "wb") as f:
            f.write(file_content)


        return FileResponse(rf".{TEMP_DIR}/{sanitized_file}")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token expired")
    except jwt.JWTError as e:
        print(f"JWT Error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid token")

def id2name(folder_id: int) -> str:
    db: Session = next(get_db())

    folder = db.get(Folder, folder_id)

    if folder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Folder with id {folder_id} not found"
        )

    return folder.name


@app.get("/search")
async def search_documents(
        query: str = Query(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user:
        documents = db.query(Document)

        result = []
        base64_pattern = re.compile(r'^[A-Za-z0-9+/=]+$')

        for doc in documents:
            try:
                if not base64_pattern.match(doc.content):
                    print("Invalid Base64 format, skipping")
                    continue

                decoded_bytes = base64.b64decode(doc.content)
                decoded_content = decoded_bytes.decode("utf-8", errors="replace")

                if query in decoded_content:
                    result.append({"title": doc.title, "folder_name": id2name(doc.folder_id)})
            except (UnicodeDecodeError, base64.binascii.Error) as e:
                print(f"Decoding error: {e}")

        return result

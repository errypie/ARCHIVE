import bcrypt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Folder, Document  # Импортируем модели
import base64, os

# Настройки базы данных (строка подключения берётся из переменной окружения)
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/archivedb",
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def init_database():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:

        # Проверяем существование данных
        if db.query(User).count() > 0:
            print("Данные уже инициализированы")
            return

        admin_password = hash_password("admin_,jA12Dlxz<7%m(@")
        engineer_password = hash_password("engineer_S%9;JRdT_22p>n1")
        guest_password = hash_password("guest")

        admin = User(username="admin", hashed_password=admin_password, role="admin")
        engineer = User(username="engineer", hashed_password=engineer_password, role="engineer")
        guest = User(username="guest", hashed_password=guest_password, role="guest")
        db.add_all([admin, engineer, guest])

        public_folder = db.query(Folder).filter(Folder.name == "Public").first()
        if not public_folder:
            public_folder = Folder(name="Public", access_level="public")
            db.add(public_folder)

        restricted_folder = db.query(Folder).filter(Folder.name == "Restricted").first()
        if not restricted_folder:
            restricted_folder = Folder(name="Engineers", access_level="restricted")
            db.add(restricted_folder)
            restricted_folder = Folder(name="Managers", access_level="restricted")
            db.add(restricted_folder)

        secret_folder = db.query(Folder).filter(Folder.name == "Admins").first()
        if not secret_folder:
            secret_folder = Folder(name="Admins", access_level="secret")
            db.add(secret_folder)

        file_content = 'user: 123, password: 123'

        encoded_content = base64.b64encode(file_content.encode('utf-8')).decode("utf-8")
        scada_doc = Document(
            title="passwords.txt",
            content=encoded_content,
            folder=secret_folder
        )
        db.add(scada_doc)

        db.commit()
        print("База данных успешно инициализирована")
    finally:
        db.close()


if __name__ == "__main__":
    init_database()

from sqlalchemy import create_engine
from app.core.config import settings
from app.models.user import Base
from app.models.exam import Base as ExamBase

engine = create_engine(settings.DATABASE_URL)
Base.metadata.create_all(bind=engine)
ExamBase.metadata.create_all(bind=engine)
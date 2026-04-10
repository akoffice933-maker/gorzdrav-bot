from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, BigInteger, Boolean, Index, func
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool
import datetime
import os
import zoneinfo

from config import DATABASE_URL

# Настройка БД в зависимости от типа
def _is_sqlite(url: str) -> bool:
    """Проверяет, является ли URL SQLite"""
    return url.startswith("sqlite") or "sqlite" in url.lower()


if _is_sqlite(DATABASE_URL):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
else:
    # PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=3600
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _now_utc() -> datetime.datetime:
    """Возвращает timezone-aware текущее время в UTC"""
    return datetime.datetime.now(datetime.timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    tg_id = Column(BigInteger, unique=True, nullable=False, index=True)

    # Запись к врачу
    district_id = Column(Integer, nullable=True)
    lpu_id = Column(Integer, nullable=True)
    lpu_name = Column(String(255), nullable=True)
    doctor_id = Column(Integer, nullable=True)
    doctor_name = Column(String(255), nullable=True)
    appointment_time = Column(DateTime(timezone=True), nullable=True)
    reminder_sent = Column(Boolean, default=False)

    # Авторизация ESIA
    esia_token = Column(Text, nullable=True)
    esia_token_expires = Column(DateTime(timezone=True), nullable=True)

    # Служебное
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_tg_id_appointment', 'tg_id', 'appointment_time'),
        Index('idx_appointment_reminder', 'appointment_time', 'reminder_sent'),
    )


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True)
    tg_id = Column(BigInteger, nullable=False, index=True)
    analysis_type = Column(String(50), nullable=True)  # 'ocr' или 'text'
    raw_text = Column(Text, nullable=False)
    ai_analysis = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index('idx_tg_id_created', 'tg_id', 'created_at'),
    )


# Создание таблиц (в production используйте Alembic)
def init_db():
    """Инициализация БД — вызывается один раз при старте"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Контекстный менеджер для получения сессии БД"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

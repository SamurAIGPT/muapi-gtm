import asyncio
from datetime import datetime
from typing import AsyncGenerator, Optional, Dict, Any
from sqlalchemy import Column, String, Text, DateTime, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from backend.core.config import settings

Base = declarative_base()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# Enable WAL (Write-Ahead Logging) mode on SQLite connection for fast concurrency
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Key-Value App Settings Model
class AppSetting(Base):
    __tablename__ = "app_settings"
    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    async with AsyncSessionLocal() as session:
        result = await session.get(AppSetting, key)
        return result.value if result else default

async def set_setting(key: str, value: str):
    async with AsyncSessionLocal() as session:
        setting = await session.get(AppSetting, key)
        if setting:
            setting.value = value
            setting.updated_at = datetime.utcnow()
        else:
            setting = AppSetting(key=key, value=value)
            session.add(setting)
        await session.commit()

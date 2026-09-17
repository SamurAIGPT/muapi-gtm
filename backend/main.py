import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.core.config import settings, OUTPUTS_DIR
from backend.core.db import init_db
from backend.routers import (
    workbooks,
    leads,
    signals,
    automations,
    settings as settings_router,
    outreach,
    audiences,
    watches,
    analytics,
    chat
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and tables
    await init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-grade GTM Data Engine & Clay Alternative powered by Muapi APIs",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(workbooks.router)
app.include_router(leads.router)
app.include_router(signals.router)
app.include_router(automations.router)
app.include_router(outreach.router)
app.include_router(audiences.router)
app.include_router(watches.router)
app.include_router(analytics.router)
app.include_router(chat.router)
app.include_router(settings_router.router)

# Mount outputs static directory
if os.path.exists(OUTPUTS_DIR):
    app.mount("/outputs", StaticFiles(directory=str(OUTPUTS_DIR)), name="outputs")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "port": settings.PORT
    }

if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

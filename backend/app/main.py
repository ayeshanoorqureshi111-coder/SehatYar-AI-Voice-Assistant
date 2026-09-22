from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database.connection import engine
from app.database.base import Base

from app.routes.user import router as user_router
from app.routes.auth import router as auth_router
from app.routes.voice import router as voice_router
from app.models.doctor import Doctor
from app.routes.doctor import router as doctor_router
from app.models.appointment import Appointment
from app.routes.appointment import router as appointment_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SehatYar AI Voice Assistant",
    description="AI-powered healthcare voice assistant",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://sehat-yar-ai-voice-assistant.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(user_router)
app.include_router(auth_router)
app.include_router(voice_router)
app.include_router(doctor_router)
app.include_router(appointment_router)

@app.get("/")
def root():
    return {
        "message": "SehatYar API is running"
    }


@app.get("/db-test")
def database_test():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

    return {
        "database": result.scalar()
    }
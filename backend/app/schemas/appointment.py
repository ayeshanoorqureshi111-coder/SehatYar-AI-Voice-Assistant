from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    user_id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str


class AppointmentResponse(BaseModel):
    id: int
    user_id: int
    doctor_id: int
    appointment_date: str
    appointment_time: str
    status: str

    class Config:
        from_attributes = True
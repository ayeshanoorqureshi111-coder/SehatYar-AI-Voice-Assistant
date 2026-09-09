from pydantic import BaseModel


class DoctorCreate(BaseModel):
    name: str
    specialty: str
    city: str
    available_time: str | None = None


class DoctorResponse(BaseModel):
    id: int
    name: str
    specialty: str
    city: str
    available_time: str | None = None

    class Config:
        from_attributes = True
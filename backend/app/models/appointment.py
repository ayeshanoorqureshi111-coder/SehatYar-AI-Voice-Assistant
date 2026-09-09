from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.base import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    appointment_date = Column(String, nullable=False)

    appointment_time = Column(String, nullable=False)

    status = Column(String, default="Booked")
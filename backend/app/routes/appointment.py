from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.appointment import Appointment
from app.models.user import User
from app.models.doctor import Doctor
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.utils.jwt import get_current_user


router = APIRouter(
    prefix="/appointments",
    tags=["Appointments"]
)


# Book an appointment
@router.post("/", response_model=AppointmentResponse)
def book_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    # Check user
    user = db.query(User).filter(
        User.id == appointment.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Check doctor
    doctor = db.query(Doctor).filter(
        Doctor.id == appointment.doctor_id
    ).first()

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    # Create appointment
    new_appointment = Appointment(
        user_id=appointment.user_id,
        doctor_id=appointment.doctor_id,
        appointment_date=appointment.appointment_date,
        appointment_time=appointment.appointment_time,
        status="Booked"
    )

    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return new_appointment


# Get all appointments
@router.get("/", response_model=list[AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db)
):
    return db.query(Appointment).all()


# Get logged-in user's appointments
@router.get("/my", response_model=list[AppointmentResponse])
def get_my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appointments = db.query(Appointment).filter(
        Appointment.user_id == current_user.id
    ).all()

    return appointments


# Get appointment by ID
@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return appointment


# Cancel appointment
@router.delete("/{appointment_id}")
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    appointment.status = "Cancelled"

    db.commit()

    return {
        "message": "Appointment cancelled successfully"
    }
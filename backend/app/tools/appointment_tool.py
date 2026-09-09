from app.database.connection import SessionLocal

from app.models.appointment import Appointment
from app.models.user import User
from app.models.doctor import Doctor


def book_appointment(
    user_id: int,
    doctor_id: int,
    appointment_date: str,
    appointment_time: str
):
    db = SessionLocal()

    try:
        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if not user:
            return "User not found."

        doctor = db.query(Doctor).filter(
            Doctor.id == doctor_id
        ).first()

        if not doctor:
            return "Doctor not found."

        appointment = Appointment(
            user_id=user_id,
            doctor_id=doctor_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status="Booked"
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return (
            f"Appointment booked successfully. "
            f"Appointment ID: {appointment.id}. "
            f"Doctor: {doctor.name}. "
            f"Date: {appointment_date}. "
            f"Time: {appointment_time}."
        )

    finally:
        db.close()


def get_my_appointments(user_id: int):
    db = SessionLocal()

    try:
        user = db.query(User).filter(
            User.id == user_id
        ).first()

        if not user:
            return "User not found."

        appointments = (
            db.query(Appointment, Doctor)
            .join(
                Doctor,
                Appointment.doctor_id == Doctor.id
            )
            .filter(
                Appointment.user_id == user_id
            )
            .order_by(
                Appointment.id.desc()
            )
            .all()
        )

        if not appointments:
            return "You do not have any appointments booked."

        results = []

        for appointment, doctor in appointments:
            results.append(
                f"Appointment ID: {appointment.id}, "
                f"Doctor: {doctor.name}, "
                f"Date: {appointment.appointment_date}, "
                f"Time: {appointment.appointment_time}, "
                f"Status: {appointment.status}"
            )

        return "\n".join(results)

    finally:
        db.close()
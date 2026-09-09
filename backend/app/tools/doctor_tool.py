from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.doctor import Doctor


def search_doctors(
    specialty: str = None,
    city: str = None
):
    db: Session = SessionLocal()

    try:
        # Convert common diseases/symptoms to specialties
        if specialty:
            s = specialty.lower()

            if "stomach" in s:
                specialty = "Gastroenterologist"

            elif "heart" in s:
                specialty = "Cardiologist"

            elif "skin" in s:
                specialty = "Dermatologist"

            elif "eye" in s:
                specialty = "Ophthalmologist"

            elif "bone" in s:
                specialty = "Orthopedic"

            elif "child" in s or "kids" in s:
                specialty = "Pediatrician"

        query = db.query(Doctor)

        if specialty:
            query = query.filter(
                Doctor.specialty.ilike(f"%{specialty}%")
            )

        if city:
            query = query.filter(
                Doctor.city.ilike(f"%{city}%")
            )

        doctors = query.all()

        if not doctors:
            return "No doctors found."

        result = []

        for doctor in doctors:
            result.append(
                f"""
Doctor: {doctor.name}
Specialty: {doctor.specialty}
City: {doctor.city}
Available: {doctor.available_time}
"""
            )

        return "\n".join(result)

    finally:
        db.close()
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorResponse


router = APIRouter(
    prefix="/doctors",
    tags=["Doctors"]
)


@router.post("/", response_model=DoctorResponse)
def create_doctor(
    doctor: DoctorCreate,
    db: Session = Depends(get_db)
):
    db_doctor = Doctor(
        name=doctor.name,
        specialty=doctor.specialty,
        city=doctor.city,
        available_time=doctor.available_time
    )

    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)

    return db_doctor


@router.get("/", response_model=list[DoctorResponse])
def get_doctors(
    db: Session = Depends(get_db)
):
    return db.query(Doctor).all()


@router.get("/search", response_model=list[DoctorResponse])
def search_doctors(
    specialty: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Doctor)

    if specialty:
        query = query.filter(
            Doctor.specialty.ilike(f"%{specialty}%")
        )

    if city:
        query = query.filter(
            Doctor.city.ilike(f"%{city}%")
        )

    return query.all()
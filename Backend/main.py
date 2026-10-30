
from pathlib import Path
import sqlite3

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal


app = FastAPI(title="MediSync AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:5502",
        "http://localhost:5502",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Store the database inside the backend folder.
DB_PATH = Path(__file__).resolve().parent / "medisync.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


# Create the table automatically when the backend starts.
def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS visits (
                id TEXT PRIMARY KEY,
                patient_id TEXT NOT NULL,
                name TEXT NOT NULL,
                visit_date TEXT NOT NULL,
                visit_type TEXT NOT NULL,
                notes TEXT NOT NULL,
                plan TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)


initialize_database()


class VisitRecord(BaseModel):
    id: str
    name: str
    patientId: str = ""
    date: str
    visitType: Literal[
        "General Consultation",
        "Follow-up",
        "Routine Check-up",
        "Other",
        "General consultation",
        "Routine checkup"
    ]
    notes: str
    plan: str = ""
    createdAt: str


@app.get("/")
def home():
    return {"message": "MediSync AI API is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/visits")
def save_visit(visit: VisitRecord):
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO visits
            (id, patient_id, name, visit_date, visit_type,
             notes, plan, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                visit.id,
                visit.patientId,
                visit.name,
                visit.date,
                visit.visitType,
                visit.notes,
                visit.plan,
                visit.createdAt,
            ),
        )

    return {
        "message": "Visit saved successfully",
        "visitId": visit.id,
        "patientId": visit.patientId,
    }


@app.get("/visits")
def get_visits():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM visits ORDER BY created_at DESC"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "patientId": row["patient_id"],
            "name": row["name"],
            "date": row["visit_date"],
            "visitType": row["visit_type"],
            "notes": row["notes"],
            "plan": row["plan"],
            "createdAt": row["created_at"],
        }
        for row in rows
    ]

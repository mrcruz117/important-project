from pathlib import Path
from typing import Annotated, Optional
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime


# CORS middlware

origins = [ "http://localhost:3000",  # React
    "http://localhost:5173",  # Vite
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# create model
class Record(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    owner: str = Field(index=True)

    name: str = Field( index=True)
    email: str = Field(index=True)
    message: str
    
    deleted_at: Optional[datetime] = Field(default=None, nullable=True)

# update record model
class RecordUpdate(SQLModel):
    name:str | None = None
    email:str | None = None
    message:str | None = None

# creating an engine
DB_DIR = Path(__file__).resolve().parents[1] / "database"
DB_DIR.mkdir(exist_ok=True)
sqlite_file_name = DB_DIR / "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

# create the table
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# create session dependency
def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]


# create db table on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# create a record
@app.post("/records")
def create_record(record: Record, session: SessionDep) -> Record:

    session.add(record)
    session.commit()
    session.refresh(record)
    return record

# restore record endpoint
@app.post("/records/{record_id}/restore")
def restore_record(record_id: int, session: SessionDep):
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if record.deleted_at is None:
        raise HTTPException(status_code=400, detail="Record is not deleted")

    record.deleted_at = None

    session.add(record)
    session.commit()
    session.refresh(record)

    return record

# read records
@app.get("/records")
def read_records(session: SessionDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 100) -> list[Record]:
    records = session.exec(select(Record).where(Record.deleted_at.is_(None)).offset(offset).limit(limit)).all()
    return records

# view deleted records
@app.get("/records/deleted")
def read_deleted_records(session: SessionDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 100) -> list[Record]:
    records = session.exec(select(Record).where(Record.deleted_at.is_not(None)).offset(offset).limit(limit)).all()
    return records


# delete records (soft delete)
@app.delete("/records/{record_id}")
def delete_record(record_id: int, session: SessionDep):
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if record.deleted_at:
        raise HTTPException(status_code=400, detail="Record already deleted")

    record.deleted_at = datetime.utcnow()

    session.add(record)
    session.commit()
    session.refresh(record)

    return record

# update a record
@app.patch("/records/{record_id}")
def update_record(record_id: int, updated_record: RecordUpdate, session: SessionDep) -> Record:
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if record.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted record")

    update_data = updated_record.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(record, key, value)

    session.add(record)
    session.commit()
    session.refresh(record)

    return record
    


def seed_gen() -> list:
    return [
        Record(
            name="Alice Johnson",
            email="alice.johnson@example.com",
            message="Hello from Alice!",
            owner="system"
        ),
        Record(
            name="Bob Smith",
            email="bob.smith@example.com",
            message="Testing the list UI.",
            owner="system"
        ),
        Record(
            name="Charlie Brown",
            email="charlie.brown@example.com",
            message="Seed record for development.",
            owner="system"
        ),
        Record(
            name="Charlie White",
            email="charlie.white@example.com",
            message="Seed record for development.",
            owner="system"
        ),
        Record(
            name="Charlie Gray",
            email="charlie.gray@example.com",
            message="Seed record for development.",
            owner="system"
        ),

        # --- Additional 20 test records ---
        Record(
            name="David Miller",
            email="david.miller@example.com",
            message="Additional seed record.",
            owner="system"
        ),
        Record(
            name="Emma Davis",
            email="emma.davis@example.com",
            message="Adding more test data.",
            owner="system"
        ),
        Record(
            name="Frank Wilson",
            email="frank.wilson@example.com",
            message="Seed data for QA.",
            owner="system"
        ),
        Record(
            name="Grace Lee",
            email="grace.lee@example.com",
            message="Testing bulk inserts.",
            owner="system"
        ),
        Record(
            name="Henry Taylor",
            email="henry.taylor@example.com",
            message="Sample record for UI testing.",
            owner="system"
        ),
        Record(
            name="Isabella Moore",
            email="isabella.moore@example.com",
            message="Development seed entry.",
            owner="system"
        ),
        Record(
            name="Jack Anderson",
            email="jack.anderson@example.com",
            message="Filling database with sample data.",
            owner="system"
        ),
        Record(
            name="Karen Thomas",
            email="karen.thomas@example.com",
            message="Testing pagination.",
            owner="system"
        ),
        Record(
            name="Liam Jackson",
            email="liam.jackson@example.com",
            message="Another seed record.",
            owner="system"
        ),
        Record(
            name="Mia Martin",
            email="mia.martin@example.com",
            message="Checking list rendering.",
            owner="system"
        ),
        Record(
            name="Noah Thompson",
            email="noah.thompson@example.com",
            message="Seed record for user flow tests.",
            owner="system"
        ),
        Record(
            name="Olivia Garcia",
            email="olivia.garcia@example.com",
            message="Development test entry.",
            owner="system"
        ),
        Record(
            name="Paul Martinez",
            email="paul.martinez@example.com",
            message="Adding more realistic data.",
            owner="system"
        ),
        Record(
            name="Quinn Robinson",
            email="quinn.robinson@example.com",
            message="Testing edge cases.",
            owner="system"
        ),
        Record(
            name="Riley Clark",
            email="riley.clark@example.com",
            message="Seed data for integration tests.",
            owner="system"
        ),
        Record(
            name="Sophia Rodriguez",
            email="sophia.rodriguez@example.com",
            message="Sample entry for UI checks.",
            owner="system"
        ),
        Record(
            name="Thomas Lewis",
            email="thomas.lewis@example.com",
            message="Testing data volume.",
            owner="system"
        ),
        Record(
            name="Uma Walker",
            email="uma.walker@example.com",
            message="More seed data.",
            owner="system"
        ),
        Record(
            name="Victor Hall",
            email="victor.hall@example.com",
            message="Testing consistency.",
            owner="system"
        ),
        Record(
            name="Wendy Allen",
            email="wendy.allen@example.com",
            message="Trying the cool test record.",
            owner="system"
        ),
        Record(
            name="HUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUGE NAMEEEEEEEEEEEEEEEEEEEE",
            email="weHUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUGEndy.allen@example.com",
            message="Final testTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT reCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCcord.",
            owner="system"
        ),
    ]


#
@app.post("/seed")
def seed_db(session: SessionDep):
    try:
        create_record = seed_gen()

        inserted = 0
        duplicates = 0
        errors = []

        for r in create_record:
            try:
                existing = session.exec(
                    select(Record).where(Record.email == r.email)
                ).first()

                if existing:
                    duplicates += 1
                    continue

                session.add(r)
                inserted += 1

            except Exception as e:
                # capture per-record errors without crashing whole seed
                errors.append({
                    "email": r.email,
                    "error": str(e)
                })

        session.commit()

        return {
            "message": "Seed completed",
            "inserted": inserted,
            "duplicates_skipped": duplicates,
            "total_attempted": len(create_record),
            "errors": errors if errors else None
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Seed failed: {str(e)}"
        )
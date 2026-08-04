from pathlib import Path
from typing import Annotated, Optional
from fastapi import Depends, FastAPI, HTTPException, Query, Header
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

# adding users
USERS = { 
    "mcruz": "admin",
    "acheebez": "user",
    "gfrango": "user",
    "bingus": "read-only",
}

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

# get active user
def get_current_user(x_user: str = Header(...)):
    role = USERS.get(x_user)

    if not role:
        raise HTTPException(
            status_code=403,
            detail="Unknown user"
        )

    return {
        "username": x_user,
        "role": role
    }

UserDep = Annotated[dict, Depends(get_current_user)]


# create db table on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# create a record
@app.post("/records")
def create_record(record: Record, session: SessionDep, user: UserDep) -> Record:
    if not can_create(user):
        raise HTTPException(status_code=403, detail="You do not have permission to create records")
    record.owner = user["username"]
    
    session.add(record)
    session.commit()
    session.refresh(record)
    return record

# restore record endpoint
@app.post("/records/{record_id}/restore")
def restore_record(record_id: int, session: SessionDep, user: UserDep):
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if not can_restore(user, record):
        raise HTTPException(status_code=403,detail="You do not have permission to restore this record")

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
def delete_record(record_id: int, session: SessionDep, user: UserDep):
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if not can_delete(user, record):
        raise HTTPException(status_code=403,detail="You do not have permission to delete this record")

    if record.deleted_at:
        raise HTTPException(status_code=400, detail="Record already deleted")

    record.deleted_at = datetime.utcnow()

    session.add(record)
    session.commit()
    session.refresh(record)

    return record

# update a record
@app.patch("/records/{record_id}")
def update_record(record_id: int, updated_record: RecordUpdate, session: SessionDep, user: UserDep) -> Record:
    record = session.get(Record, record_id)

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    if not can_edit(user, record):
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")

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
        ),
        Record(
            name="Bob Smith",
            email="bob.smith@example.com",
            message="Testing the list UI.",
        ),
        Record(
            name="Charlie Brown",
            email="charlie.brown@example.com",
            message="Seed record for development.",
        ),
        Record(
            name="Charlie White",
            email="charlie.white@example.com",
            message="Seed record for development.",
        ),
        Record(
            name="Charlie Gray",
            email="charlie.gray@example.com",
            message="Seed record for development.",
        ),

        # --- Additional 20 test records ---
        Record(
            name="David Miller",
            email="david.miller@example.com",
            message="Additional seed record.",
        ),
        Record(
            name="Emma Davis",
            email="emma.davis@example.com",
            message="Adding more test data.",
        ),
        Record(
            name="Frank Wilson",
            email="frank.wilson@example.com",
            message="Seed data for QA.",
        ),
        Record(
            name="Grace Lee",
            email="grace.lee@example.com",
            message="Testing bulk inserts.",
        ),
        Record(
            name="Henry Taylor",
            email="henry.taylor@example.com",
            message="Sample record for UI testing.",
        ),
        Record(
            name="Isabella Moore",
            email="isabella.moore@example.com",
            message="Development seed entry.",
        ),
        Record(
            name="Jack Anderson",
            email="jack.anderson@example.com",
            message="Filling database with sample data.",
        ),
        Record(
            name="Karen Thomas",
            email="karen.thomas@example.com",
            message="Testing pagination.",
        ),
        Record(
            name="Liam Jackson",
            email="liam.jackson@example.com",
            message="Another seed record.",
        ),
        Record(
            name="Mia Martin",
            email="mia.martin@example.com",
            message="Checking list rendering.",
        ),
        Record(
            name="Noah Thompson",
            email="noah.thompson@example.com",
            message="Seed record for user flow tests.",
        ),
        Record(
            name="Olivia Garcia",
            email="olivia.garcia@example.com",
            message="Development test entry.",
        ),
        Record(
            name="Paul Martinez",
            email="paul.martinez@example.com",
            message="Adding more realistic data.",
        ),
        Record(
            name="Quinn Robinson",
            email="quinn.robinson@example.com",
            message="Testing edge cases.",
        ),
        Record(
            name="Riley Clark",
            email="riley.clark@example.com",
            message="Seed data for integration tests.",
        ),
        Record(
            name="Sophia Rodriguez",
            email="sophia.rodriguez@example.com",
            message="Sample entry for UI checks.",
        ),
        Record(
            name="Thomas Lewis",
            email="thomas.lewis@example.com",
            message="Testing data volume.",
        ),
        Record(
            name="Uma Walker",
            email="uma.walker@example.com",
            message="More seed data.",
        ),
        Record(
            name="Victor Hall",
            email="victor.hall@example.com",
            message="Testing consistency.",
        ),
        Record(
            name="Wendy Allen",
            email="wendy.allen@example.com",
            message="Trying the cool test record.",
        ),
        Record(
            name="HUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUGE NAMEEEEEEEEEEEEEEEEEEEE",
            email="weHUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUGEndy.allen@example.com",
            message="Final testTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT reCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCcord.",
        ),
    ]


#
@app.post("/seed")
def seed_db(session: SessionDep, user: UserDep):

    if not can_seed(user):
        raise HTTPException(status_code=403, detail="Only admins may seed the database")

    try:
        create_record = seed_gen()

        owners = [ "mcruz", "acheebez", "gfrango"]

        for index, record in enumerate(create_record):
            record.owner = owners[index % len(owners)]

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

# permissions helpers
def is_admin(user):
    return user["role"] == "admin"

def is_readonly(user):
    return user["role"] == "read-only"

def owns_record(user, record):
    if not record:
        return False
    
    return record.owner == user["username"]

def can_edit(user, record):
    if is_admin(user):
        return True

    if user["role"] == "user":
        return owns_record(user, record)

    return False

def can_delete(user, record):
    return can_edit(user, record)

def can_restore(user, record):
    return can_edit(user, record)

def can_create(user):
    return user["role"] in ["admin", "user"]

def can_seed(user):
    return is_admin(user)
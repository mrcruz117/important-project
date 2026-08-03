from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Field, Session, SQLModel, create_engine, select
from fastapi.middleware.cors import CORSMiddleware

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
    name: str = Field( index=True)
    email: str = Field(index=True)
    message: str

# creating an engine
sqlite_file_name = "database.db"
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

# read records
@app.get("/records")
def read_records(session: SessionDep, offset: int = 0, limit: Annotated[int, Query(le=100)] = 100) -> list[Record]:
    records = session.exec(select(Record).offset(offset).limit(limit)).all()
    return records


# create a record
@app.post("/records")
def create_record(record: Record, session: SessionDep) -> Record:
    
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
    ]


from fastapi import HTTPException
from sqlmodel import select

@app.post("/seed")
def seed_db(session: SessionDep):
    try:
        raw_records = seed_gen()

        inserted = 0
        duplicates = 0
        errors = []

        for r in raw_records:
            try:
                existing = session.exec(
                    select(Record).where(Record.email == r.email)
                ).first()

                if existing:
                    duplicates += 1
                    continue

                session.add(Record(
                    name=r.name,
                    email=r.email,
                    message=r.message
                ))
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
            "total_attempted": len(raw_records),
            "errors": errors if errors else None
        }

    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Seed failed: {str(e)}"
        )
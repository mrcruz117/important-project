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
# gfds

# create model
class Record(SQLModel, table=True):
    name: str = Field(primary_key=True, index=True)
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



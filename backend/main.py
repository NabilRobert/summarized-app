import os
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from ingest import extract_from_pdf, extract_from_url, extract_from_text
from embeddings import chunk_text, build_faiss_index
from session_store import store
from chat import get_reply

app = FastAPI()

_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.post("/ingest")
async def ingest(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    url: str | None = Form(default=None),
):
    try:
        if file is not None:
            file_bytes = await file.read()
            raw_text = extract_from_pdf(file_bytes)
            doc_name = file.filename or "uploaded_document.pdf"
        elif url:
            raw_text = extract_from_url(url)
            doc_name = url
        elif text:
            raw_text = extract_from_text(text)
            doc_name = "pasted_text"
        else:
            raise HTTPException(
                status_code=422,
                detail="Provide one of: file, url, or text.",
            )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        chunks = chunk_text(raw_text)
        faiss_index, chunks = build_faiss_index(chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing failed: {e}")

    session_id = str(uuid.uuid4())
    store.create_session(session_id)
    store.update_session(
        session_id,
        faiss_index=faiss_index,
        chunks=chunks,
        doc_name=doc_name,
    )

    return {
        "session_id": session_id,
        "message": f"I've analyzed {doc_name}. What do you need to know?",
    }


@app.post("/chat")
async def chat(body: ChatRequest):
    try:
        session = store.get_session(body.session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session["faiss_index"] is None:
        raise HTTPException(status_code=400, detail="Session has no indexed document.")

    try:
        reply = get_reply(session, body.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {e}")

    return {"reply": reply}

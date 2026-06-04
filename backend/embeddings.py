import os
import numpy as np
import faiss
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from openai import OpenAI

load_dotenv()

_client = OpenAI(
    base_url=os.getenv("SUMOPOD_BASE_URL"),
    api_key=os.getenv("SUMOPOD_API_KEY"),
)

_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
_CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
_EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
_RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "4"))


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=_CHUNK_SIZE,
        chunk_overlap=_CHUNK_OVERLAP,
    )
    return splitter.split_text(text)


def _embed(texts: list[str]) -> np.ndarray:
    response = _client.embeddings.create(model=_EMBEDDING_MODEL, input=texts)
    vectors = [item.embedding for item in response.data]
    return np.array(vectors, dtype=np.float32)


def build_faiss_index(chunks: list[str]) -> tuple[faiss.IndexFlatL2, list[str]]:
    if not chunks:
        raise ValueError("Cannot build FAISS index from empty chunks list")

    embeddings = _embed(chunks)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    return index, chunks


def retrieve_chunks(
    query: str,
    index: faiss.IndexFlatL2,
    chunks: list[str],
    k: int = _RETRIEVAL_TOP_K,
) -> list[str]:
    query_vec = _embed([query])
    k = min(k, len(chunks))
    _, indices = index.search(query_vec, k)
    return [chunks[i] for i in indices[0] if i < len(chunks)]

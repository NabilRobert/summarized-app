import os
import fitz
import httpx
from bs4 import BeautifulSoup


_DEFAULT_TIMEOUT = float(os.getenv("INGEST_HTTP_TIMEOUT", "15"))
_DEFAULT_USER_AGENT = os.getenv(
    "INGEST_USER_AGENT",
    "Mozilla/5.0 (compatible; PaperSummarizer/1.0)",
)


def extract_from_pdf(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}") from e

    text = text.strip()
    if not text:
        raise ValueError("PDF extraction returned empty content")
    return text


def extract_from_url(url: str, timeout: float = _DEFAULT_TIMEOUT) -> str:
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(url, headers={"User-Agent": _DEFAULT_USER_AGENT})
            response.raise_for_status()
    except httpx.HTTPError as e:
        raise ValueError(f"Failed to fetch URL '{url}': {e}") from e

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text(separator="\n").strip()
    if not text:
        raise ValueError(f"URL extraction returned empty content for '{url}'")
    return text


def extract_from_text(text: str) -> str:
    result = text.strip()
    if not result:
        raise ValueError("Provided text is empty")
    return result

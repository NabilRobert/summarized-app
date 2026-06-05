import os
from openai import OpenAI
from dotenv import load_dotenv
from embeddings import retrieve_chunks

load_dotenv()

_client = OpenAI(
    base_url=os.getenv("SUMOPOD_BASE_URL"),
    api_key=os.getenv("SUMOPOD_API_KEY"),
)

_CHAT_MODEL = os.getenv("CHAT_MODEL")
_MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "6"))


def _chat(messages: list[dict]) -> str:
    response = _client.chat.completions.create(
        model=_CHAT_MODEL,
        messages=messages,
    )
    return response.choices[0].message.content.strip()


def _build_system_prompt(doc_name: str | None, rolling_summary: str) -> str:
    doc_label = f'"{doc_name}"' if doc_name else "the uploaded document"
    parts = [
        f"You are a document assistant. Your sole purpose is to answer questions about {doc_label}.",
        "Rules you must follow without exception:",
        "1. Only answer questions that can be answered using the provided document context.",
        "2. If the question is not related to the document, respond with exactly: \"I can only answer questions about this document.\"",
        "3. Do not use any outside knowledge, even if you are confident in it.",
        "4. Do not engage in general conversation, creative tasks, coding help, or any topic outside the document.",
        "5. If the context does not contain enough information to answer, say so clearly and quote the relevant limitation.",
    ]
    if rolling_summary:
        parts.append(f"\nSummary of earlier conversation:\n{rolling_summary}")
    return "\n".join(parts)


def _summarize_turns(turns: list[dict]) -> str:
    messages = [
        {
            "role": "system",
            "content": "Summarize the following conversation turns concisely, preserving key facts and decisions.",
        },
        {
            "role": "user",
            "content": "\n".join(
                f"{m['role'].capitalize()}: {m['content']}" for m in turns
            ),
        },
    ]
    return _chat(messages)


def get_reply(session: dict, user_message: str) -> str:
    index = session["faiss_index"]
    chunks = session["chunks"]
    chat_history: list[dict] = session["chat_history"]
    rolling_summary: str = session["rolling_summary"]
    doc_name: str | None = session["doc_name"]

    context_chunks = retrieve_chunks(user_message, index, chunks)
    context_text = "\n\n".join(context_chunks)

    system_prompt = _build_system_prompt(doc_name, rolling_summary)
    recent_history = chat_history[-(_MAX_HISTORY_TURNS * 2):]

    messages = (
        [{"role": "system", "content": system_prompt}]
        + [{"role": "user", "content": f"Relevant context:\n{context_text}"}]
        + recent_history
        + [{"role": "user", "content": user_message}]
    )

    reply = _chat(messages)

    chat_history.append({"role": "user", "content": user_message})
    chat_history.append({"role": "assistant", "content": reply})

    turns_limit = _MAX_HISTORY_TURNS * 2
    if len(chat_history) > turns_limit:
        overflow = chat_history[:-turns_limit]
        session["rolling_summary"] = _summarize_turns(overflow)
        session["chat_history"] = chat_history[-turns_limit:]

    return reply

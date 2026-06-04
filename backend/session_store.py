class SessionStore:
    def __init__(self):
        self._sessions: dict = {}

    def create_session(self, session_id: str) -> dict:
        self._sessions[session_id] = {
            "faiss_index": None,
            "chunks": [],
            "doc_name": None,
            "chat_history": [],
            "rolling_summary": "",
        }
        return self._sessions[session_id]

    def get_session(self, session_id: str) -> dict:
        if session_id not in self._sessions:
            raise KeyError(f"Session '{session_id}' not found")
        return self._sessions[session_id]

    def update_session(self, session_id: str, **kwargs) -> dict:
        session = self.get_session(session_id)
        session.update(kwargs)
        return session

    def delete_session(self, session_id: str) -> None:
        if session_id not in self._sessions:
            raise KeyError(f"Session '{session_id}' not found")
        del self._sessions[session_id]


store = SessionStore()

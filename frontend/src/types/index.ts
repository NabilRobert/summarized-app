export interface IngestResponse {
  session_id: string
  message: string
}

export type InputMode = 'file' | 'text' | 'url'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
}

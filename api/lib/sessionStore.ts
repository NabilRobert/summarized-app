import { v4 as uuidv4 } from 'uuid'
import type { MemoryVectorStore } from 'langchain/vectorstores/memory'

export interface Session {
  docName: string
  vectorStore: MemoryVectorStore
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
  rollingSummary: string
}

const store = new Map<string, Session>()

export function createSession(data: Session): string {
  const id = uuidv4()
  store.set(id, data)
  return id
}

export function getSession(id: string): Session | undefined {
  return store.get(id)
}

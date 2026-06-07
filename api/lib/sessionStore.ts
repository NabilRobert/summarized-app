import { kv } from '@vercel/kv'
import { v4 as uuidv4 } from 'uuid'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { Document } from '@langchain/core/documents'
import { getEmbeddings } from './embeddings'

const TTL = 3600 // 1 hour

interface StoredVec { content: string; embedding: number[] }
interface StoredState {
  docName: string
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
  rollingSummary: string
}

export interface Session {
  docName: string
  vectorStore: MemoryVectorStore
  chatHistory: { role: 'user' | 'assistant'; content: string }[]
  rollingSummary: string
}

// Vectors and mutable state are stored separately:
//   sv:<id>  — immutable embeddings, written once at ingest
//   ss:<id>  — chatHistory + rollingSummary, updated on every chat turn
export async function createSession(data: Session): Promise<string> {
  const id = uuidv4()
  const mv = (data.vectorStore as unknown as { memoryVectors: StoredVec[] }).memoryVectors
  await Promise.all([
    kv.set(`sv:${id}`, mv.map(v => ({ content: v.content, embedding: v.embedding })), { ex: TTL }),
    kv.set(`ss:${id}`, { docName: data.docName, chatHistory: data.chatHistory, rollingSummary: data.rollingSummary } satisfies StoredState, { ex: TTL }),
  ])
  return id
}

export async function getSession(id: string): Promise<Session | null> {
  const [vectors, state] = await Promise.all([
    kv.get<StoredVec[]>(`sv:${id}`),
    kv.get<StoredState>(`ss:${id}`),
  ])
  if (!vectors || !state) return null

  const vectorStore = new MemoryVectorStore(getEmbeddings())
  await vectorStore.addVectors(
    vectors.map(v => v.embedding),
    vectors.map(v => new Document({ pageContent: v.content })),
  )

  return { ...state, vectorStore }
}

export async function updateSession(id: string, chatHistory: StoredState['chatHistory'], rollingSummary: string): Promise<void> {
  const state = await kv.get<StoredState>(`ss:${id}`)
  if (!state) return
  await kv.set(`ss:${id}`, { ...state, chatHistory, rollingSummary }, { ex: TTL })
}

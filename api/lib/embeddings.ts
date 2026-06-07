import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'

const CHUNK_SIZE    = parseInt(process.env.CHUNK_SIZE    ?? '500', 10)
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP ?? '50',  10)
const TOP_K         = parseInt(process.env.RETRIEVAL_TOP_K ?? '4', 10)
const EMBED_MODEL   = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'

function getEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    model: EMBED_MODEL,
    apiKey: process.env.SUMOPOD_API_KEY ?? '',
    configuration: { baseURL: process.env.SUMOPOD_BASE_URL },
  })
}

export async function chunkText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  })
  return splitter.splitText(text)
}

export async function buildVectorStore(chunks: string[]): Promise<MemoryVectorStore> {
  if (!chunks.length) throw new Error('Cannot build vector store from empty chunks')
  return MemoryVectorStore.fromTexts(chunks, chunks.map(() => ({})), getEmbeddings())
}

export async function retrieveChunks(query: string, store: MemoryVectorStore): Promise<string[]> {
  const results = await store.similaritySearch(query, TOP_K)
  return results.map(doc => doc.pageContent)
}

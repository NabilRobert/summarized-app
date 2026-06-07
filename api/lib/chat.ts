import OpenAI from 'openai'
import { retrieveChunks } from './embeddings'
import type { Session } from './sessionStore'

const MAX_TURNS  = parseInt(process.env.MAX_HISTORY_TURNS ?? '6', 10)
const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gpt-4o-mini'

type Msg = { role: 'user' | 'assistant'; content: string }

function getClient(): OpenAI {
  return new OpenAI({
    baseURL: process.env.SUMOPOD_BASE_URL,
    apiKey:  process.env.SUMOPOD_API_KEY ?? '',
  })
}

function buildSystemPrompt(docName: string, rollingSummary: string): string {
  const label = docName ? `"${docName}"` : 'the uploaded document'
  const lines = [
    `You are a document assistant. Your sole purpose is to answer questions about ${label}.`,
    'Rules you must follow without exception:',
    '1. Only answer questions that can be answered using the provided document context.',
    '2. If the question is not related to the document, respond with exactly: "I can only answer questions about this document."',
    '3. Do not use any outside knowledge, even if you are confident in it.',
    '4. Do not engage in general conversation, creative tasks, coding help, or any topic outside the document.',
    '5. If the context does not contain enough information to answer, say so clearly.',
  ]
  if (rollingSummary) lines.push(`\nSummary of earlier conversation:\n${rollingSummary}`)
  return lines.join('\n')
}

async function callChat(
  client: OpenAI,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const res = await client.chat.completions.create({ model: CHAT_MODEL, messages })
  return res.choices[0].message.content?.trim() ?? ''
}

async function summarizeTurns(client: OpenAI, turns: Msg[]): Promise<string> {
  return callChat(client, [
    { role: 'system', content: 'Summarize the following conversation turns concisely, preserving key facts.' },
    { role: 'user',   content: turns.map(m => `${m.role}: ${m.content}`).join('\n') },
  ])
}

export async function getReply(session: Session, userMessage: string): Promise<string> {
  const client = getClient()
  const contextChunks = await retrieveChunks(userMessage, session.vectorStore)
  const contextText   = contextChunks.join('\n\n')
  const systemPrompt  = buildSystemPrompt(session.docName, session.rollingSummary)
  const recentHistory = session.chatHistory.slice(-(MAX_TURNS * 2))

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: `Relevant context:\n${contextText}` },
    ...(recentHistory as OpenAI.ChatCompletionMessageParam[]),
    { role: 'user',   content: userMessage },
  ]

  const reply = await callChat(client, messages)

  session.chatHistory.push({ role: 'user',      content: userMessage })
  session.chatHistory.push({ role: 'assistant', content: reply })

  const limit = MAX_TURNS * 2
  if (session.chatHistory.length > limit) {
    const overflow = session.chatHistory.slice(0, -limit)
    session.rollingSummary  = await summarizeTurns(client, overflow)
    session.chatHistory     = session.chatHistory.slice(-limit)
  }

  return reply
}

import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { Message } from '../types'

interface Props {
  sessionId: string
  greeting: string
}

export default function ChatWindow({ sessionId, greeting }: Props) {
  const [input, setInput] = useState('')
  const { sendMessage, messages, loading, error } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  const allMessages: Message[] = [
    { role: 'assistant', content: greeting },
    ...messages,
  ]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(sessionId, text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-8 mb-8 flex flex-col h-[calc(100vh-4rem)]">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 px-1">
        {allMessages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <span className="inline-flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-red-500">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question…"
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}

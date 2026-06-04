import { useState } from 'react'
import UploadPanel from './components/UploadPanel'
import ChatWindow from './components/ChatWindow'

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [greeting, setGreeting] = useState<string | null>(null)

  function handleIngestSuccess(id: string, msg: string) {
    setSessionId(id)
    setGreeting(msg)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <span className="font-semibold text-slate-900 tracking-tight">
            Paper Summarizer
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden max-w-2xl w-full mx-auto px-4 flex flex-col">
        {!sessionId ? (
          <div className="my-auto py-8">
            <UploadPanel onSuccess={handleIngestSuccess} />
          </div>
        ) : (
          <ChatWindow sessionId={sessionId} greeting={greeting ?? ''} />
        )}
      </main>
    </div>
  )
}

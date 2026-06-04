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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!sessionId ? (
          <UploadPanel onSuccess={handleIngestSuccess} />
        ) : (
          <ChatWindow sessionId={sessionId} greeting={greeting ?? ''} />
        )}
      </div>
    </div>
  )
}

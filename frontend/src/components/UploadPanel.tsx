import { useRef, useState } from 'react'
import { useIngest } from '../hooks/useIngest'
import type { InputMode } from '../types'

interface Props {
  onSuccess: (sessionId: string, greeting: string) => void
}

const TABS: { id: InputMode; label: string }[] = [
  { id: 'file', label: 'PDF Upload' },
  { id: 'text', label: 'Paste Text' },
  { id: 'url', label: 'URL' },
]

export default function UploadPanel({ onSuccess }: Props) {
  const [mode, setMode] = useState<InputMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { ingest, loading, error } = useIngest()

  const canSubmit =
    !loading &&
    ((mode === 'file' && file !== null) ||
      (mode === 'text' && text.trim().length > 0) ||
      (mode === 'url' && url.trim().length > 0))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: File | string =
      mode === 'file' ? (file as File) : mode === 'text' ? text : url
    try {
      const response = await ingest(mode, data)
      onSuccess(response.session_id, response.message)
    } catch {
      // error already set in hook
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-16 p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Paper Summarizer</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload a PDF, paste text, or provide a URL to get started.
      </p>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'file' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {file ? (
              <p className="text-sm text-gray-700 font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Click to upload a PDF</p>
                <p className="text-xs text-gray-400 mt-1">PDF files only</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {mode === 'text' && (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your text here…"
            rows={8}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        )}

        {mode === 'url' && (
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/paper"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>
    </div>
  )
}

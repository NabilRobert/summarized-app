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
  const [dismissedError, setDismissedError] = useState<string | null>(null)
  const [sizeError, setSizeError] = useState<string | null>(null)

  const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MB — Vercel hard limit is 4.5 MB
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { ingest, loading, error } = useIngest()

  const showError = error && error !== dismissedError

  const canSubmit =
    !loading &&
    !sizeError &&
    ((mode === 'file' && file !== null) ||
      (mode === 'text' && text.trim().length > 0) ||
      (mode === 'url' && url.trim().length > 0))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDismissedError(null)
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Analyze a document</h2>
        <p className="text-sm text-slate-500 mt-1">
          Upload a PDF, paste text, or provide a URL to start chatting.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-slate-200 mb-6 -mx-1 px-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mode === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
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
            className="group border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40"
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-slate-700 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-400">Click to change file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-slate-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-slate-600">Click to upload a PDF</p>
                <p className="text-xs text-slate-400">PDF files only · max 4 MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => {
                const chosen = e.target.files?.[0] ?? null
                if (chosen && chosen.size > MAX_FILE_BYTES) {
                  setSizeError(`File is ${(chosen.size / 1024 / 1024).toFixed(1)} MB — must be under 4 MB. Try a smaller PDF or paste the text instead.`)
                  setFile(null)
                } else {
                  setSizeError(null)
                  setFile(chosen)
                }
              }}
            />
          </div>
        )}

        {mode === 'text' && (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste your text here…"
            rows={8}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition"
          />
        )}

        {mode === 'url' && (
          <div className="space-y-1">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/paper"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <p className="text-xs text-slate-400 px-1">Publicly accessible URLs only</p>
          </div>
        )}

        {sizeError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <span className="flex-1">{sizeError}</span>
          </div>
        )}

        {showError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setDismissedError(error)}
              className="shrink-0 mt-0.5 text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </form>
    </div>
  )
}

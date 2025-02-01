import { useState, useEffect } from 'react'
import { Info, Copy } from 'lucide-react'

interface ModelsResponse {
  models: string[]
  default: string
}

interface TranscriptResponse {
  text: string
  error?: string
}

export default function AudioTab() {
  const [url, setUrl] = useState('')
  const [service, setService] = useState<string>('deepgram')
  const [models, setModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  useEffect(() => {
    void fetch(`/models/${service}`)
      .then(res => res.json())
      .then((data: ModelsResponse) => {
        setModels(data.models)
        setSelectedModel(data.default)
      })
      .catch(console.error)
  }, [service])

  const handleSubmit = () => {
    void (async () => {
      setLoading(true)
      setError('')
      setTranscript('')

      try {
        const response = await fetch('/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            service,
            model: selectedModel,
          }),
        })

        if (!response.ok) {
          const data = (await response.json()) as TranscriptResponse
          throw new Error(data.error ?? 'Failed to transcribe audio')
        }

        const data = (await response.json()) as TranscriptResponse

        setTranscript(data.text)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    })()
  }

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(transcript)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <div className="space-y-4 p-4">
      <p className="mb-4 text-lg text-gray-600">Generate transcripts for audio files online.</p>

      <div>
        <label className="mb-2 block text-sm font-medium">Audio URL</label>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter Audio URL"
          className="w-full rounded-lg border px-4 py-2"
        />
        <div className="mt-2 flex items-start space-x-2 rounded-lg bg-blue-50 p-4">
          <Info className="mt-0.5 h-5 w-5 text-blue-600" />
          <p className="text-sm text-blue-700">
            You can find the audio download link for a podcast on{' '}
            <a href="https://www.listennotes.com/" className="underline hover:text-blue-800">
              ListenNotes
            </a>
          </p>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Speech-to-Text (STT) API Service</label>
        <select
          value={service}
          onChange={e => setService(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        >
          <option value="deepgram">Deepgram</option>
          <option value="aai">AssemblyAI</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Model</label>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          className="w-full rounded-lg border px-4 py-2"
        >
          {models.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !url}
          className="w-1/2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Transcribing...
            </span>
          ) : (
            'Transcribe'
          )}
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}

      {transcript && (
        <div className="mt-4 rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">Transcript</h3>
            <button
              onClick={() => void copyToClipboard()}
              className="relative text-gray-400 hover:text-gray-600"
              aria-label="Copy transcript"
            >
              <Copy className="h-5 w-5" />
              {showCopied && (
                <span className="absolute -top-8 -right-2 rounded bg-gray-800 px-2 py-1 text-xs text-white">
                  Copied
                </span>
              )}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-gray-700">{transcript}</div>
        </div>
      )}
    </div>
  )
}

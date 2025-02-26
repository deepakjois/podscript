import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Copy, Info } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface ModelsResponse {
  models: string[]
  default: string
}

const YouTubeTranscription = () => {
  // Add youtubeData state directly in the component
  const [youtubeData, setYoutubeData] = useState({ url: '', model: 'gpt-4o' })
  const [models, setModels] = useState<{ value: string; label: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const transcriptRef = useRef('')

  // Fetch available models on component mount
  useEffect(() => {
    fetch('/models/ytt')
      .then(res => res.json())
      .then((data: ModelsResponse) => {
        // Transform the models array to include labels
        const modelOptions = data.models.map(model => ({
          value: model,
          label: model,
        }))
        setModels(modelOptions)

        // Set the default model if it's available
        if (data.default) {
          setYoutubeData(prev => ({ ...prev, model: data.default }))
        }
      })
      .catch(err => {
        console.error('Error fetching models:', err)
        // Fallback to hardcoded models if fetch fails
        setModels([
          { value: 'gpt-4o', label: 'OpenAI - GPT-4o' },
          { value: 'gpt-4o-mini', label: 'OpenAI - GPT-4o Mini' },
          { value: 'gemini-2.0-flash', label: 'Google - Gemini 2.0 Flash' },
          { value: 'llama-3.3-70b-versatile', label: 'Llama - 3.3 70B Versatile (via Groq)' },
          { value: 'llama-3.1-8b-instant', label: 'Llama - 3.1 8B Instant (via Groq)' },
          { value: 'claude-3-5-sonnet-20241022', label: 'Anthropic - Claude 3.5 Sonnet' },
          { value: 'claude-3-5-haiku-20241022', label: 'Anthropic - Claude 3.5 Haiku' },
        ])
      })
  }, []) // Remove setYoutubeData from dependencies since it's now internal

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeData({ ...youtubeData, url: e.target.value })
  }

  // Handle model selection changes
  const handleModelChange = (value: string) => {
    setYoutubeData({ ...youtubeData, model: value })
  }

  // Handle transcription submission
  const handleTranscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!youtubeData.url) return

    setIsLoading(true)
    setError('')
    transcriptRef.current = ''
    setTranscript('')

    try {
      const params = new URLSearchParams({
        url: youtubeData.url,
        model: youtubeData.model,
      })

      // Create EventSource and await at least one connection event
      const eventSource = new EventSource(`/ytt?${params}`)
      await new Promise<void>((resolve, reject) => {
        eventSource.onopen = () => resolve()
        eventSource.onerror = () => reject(new Error('Failed to connect to the server'))

        // Set a timeout in case the connection hangs
        setTimeout(() => resolve(), 1000)
      })

      eventSource.onmessage = event => {
        if (event.data === 'error') {
          setError('Transcription failed')
          eventSource.close()
          return
        }
        transcriptRef.current += event.data
        setTranscript(transcriptRef.current)
      }

      eventSource.onerror = () => {
        setError('Connection error')
        eventSource.close()
        setIsLoading(false)
      }

      eventSource.addEventListener('done', () => {
        eventSource.close()
        setIsLoading(false)
        toast.success('Transcription completed')
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  // Copy transcript to clipboard
  const copyToClipboard = () => {
    void navigator.clipboard.writeText(transcript)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Transcripts from YouTube Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault()
              void handleTranscribe(e)
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="youtube-url" className="text-sm font-medium">
                YouTube URL
              </label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeData.url}
                onChange={handleUrlChange}
                className="placeholder:text-muted-foreground/60"
              />
              <div className="mt-2 flex items-start space-x-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                <Info className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Transcripts are generated by formatting autogenerated captions using an LLM model.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="model-select" className="text-sm font-medium">
                Model
              </label>
              <Select value={youtubeData.model} onValueChange={handleModelChange}>
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={e => {
              void handleTranscribe(e as React.FormEvent)
            }}
            disabled={isLoading || !youtubeData.url}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              'Generate Transcript'
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {transcript && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Transcript</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4 whitespace-pre-wrap">{transcript}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default YouTubeTranscription

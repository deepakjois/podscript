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
import { Loader2, Copy, Info, Trash2, X } from 'lucide-react'
import { useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

export interface YouTubeTranscriptionState {
  url: string
  model: string
  transcript: string
  error: string
  isTranscribing: boolean
}

export interface YouTubeTranscriptionProps {
  youtubeState: YouTubeTranscriptionState
  setYoutubeState: React.Dispatch<React.SetStateAction<YouTubeTranscriptionState>>
  models: { value: string; label: string }[]
}

// Custom hook for managing YouTube transcription with EventSource
function useYouTubeTranscription(
  youtubeState: YouTubeTranscriptionState,
  setYoutubeState: React.Dispatch<React.SetStateAction<YouTubeTranscriptionState>>,
) {
  const eventSourceRef = useRef<EventSource | null>(null)

  // Cleanup function for EventSource
  const cleanupEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Cancel transcription
  const cancelTranscription = useCallback(() => {
    cleanupEventSource()
    setYoutubeState(prev => ({
      ...prev,
      isTranscribing: false,
      error: 'Transcription cancelled',
    }))
    toast.info('Transcription cancelled')
  }, [cleanupEventSource, setYoutubeState])

  // Start transcription
  const startTranscription = useCallback(
    (url: string, model: string) => {
      if (!url) return

      setYoutubeState(prev => ({
        ...prev,
        error: '',
        transcript: '',
        isTranscribing: true,
      }))

      try {
        const params = new URLSearchParams({ url, model })

        // Create EventSource
        const eventSource = new EventSource(`/ytt?${params}`)
        eventSourceRef.current = eventSource

        eventSource.onmessage = event => {
          if (event.data === 'error') {
            setYoutubeState(prev => ({
              ...prev,
              error: 'Transcription failed',
              isTranscribing: false,
            }))
            cleanupEventSource()
            return
          }
          // Update transcript state with new content
          setYoutubeState(prev => ({
            ...prev,
            transcript: prev.transcript + event.data,
          }))
        }

        eventSource.onerror = () => {
          setYoutubeState(prev => ({
            ...prev,
            error: 'Connection error',
            isTranscribing: false,
          }))
          cleanupEventSource()
          toast.error('Transcription failed')
        }

        eventSource.addEventListener('done', () => {
          cleanupEventSource()
          setYoutubeState(prev => ({
            ...prev,
            isTranscribing: false,
          }))
          toast.success('Transcription completed')
        })
      } catch (e) {
        setYoutubeState(prev => ({
          ...prev,
          error: e instanceof Error ? e.message : 'An error occurred',
          isTranscribing: false,
        }))
        toast.error('Transcription failed')
      }
    },
    [cleanupEventSource, setYoutubeState],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEventSource()
    }
  }, [cleanupEventSource])

  return {
    startTranscription,
    cancelTranscription,
    isTranscribing: youtubeState.isTranscribing,
  }
}

const YouTubeTranscription = ({
  youtubeState,
  setYoutubeState,
  models,
}: YouTubeTranscriptionProps) => {
  const { startTranscription, cancelTranscription, isTranscribing } = useYouTubeTranscription(
    youtubeState,
    setYoutubeState,
  )

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeState(prev => ({
      ...prev,
      url: e.target.value,
    }))
  }

  // Handle model selection changes
  const handleModelChange = (value: string) => {
    setYoutubeState(prev => ({
      ...prev,
      model: value,
    }))
  }

  // Handle transcription submission
  const handleTranscribe = (e: React.FormEvent) => {
    e.preventDefault()
    startTranscription(youtubeState.url, youtubeState.model)
  }

  // Copy transcript to clipboard
  const copyToClipboard = () => {
    void navigator.clipboard.writeText(youtubeState.transcript)
    toast.success('Copied to clipboard')
  }

  // Clear transcript and related data
  const clearTranscript = () => {
    setYoutubeState(prev => ({
      ...prev,
      transcript: '',
      error: '',
    }))
    toast.success('Transcript cleared')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Transcripts from YouTube Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTranscribe} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="youtube-url" className="text-sm font-medium">
                YouTube URL
              </label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeState.url}
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
              <Select value={youtubeState.model} onValueChange={handleModelChange}>
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
          {isTranscribing ? (
            <div className="flex w-full gap-2">
              <Button variant="destructive" onClick={cancelTranscription} className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Cancel Transcription
              </Button>
              <Button disabled className="flex-1">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transcribing...
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleTranscribe}
              disabled={isTranscribing || !youtubeState.url}
              className="w-full"
            >
              Generate Transcript
            </Button>
          )}
        </CardFooter>
      </Card>

      {youtubeState.error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-300">{youtubeState.error}</p>
          </CardContent>
        </Card>
      )}

      {youtubeState.transcript && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Transcript</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Copy to clipboard"
                  aria-label="Copy transcript to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearTranscript}
                  title="Clear transcript"
                  aria-label="Clear transcript"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="bg-muted rounded-md p-4 whitespace-pre-wrap"
              role="region"
              aria-label="Transcript content"
            >
              {youtubeState.transcript}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default YouTubeTranscription

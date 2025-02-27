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
import { Loader2, Copy, Info, Trash2 } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'

// Speech-to-Text providers
export const STT_PROVIDERS = [
  { value: 'deepgram', label: 'Deepgram' },
  { value: 'aai', label: 'AssemblyAI' },
]

export interface AudioTranscriptionState {
  url: string
  source: string
  model: string
  transcript: string
  error: string
  isTranscribing: boolean
}

export interface AudioTranscriptionProps {
  audioState: AudioTranscriptionState
  setAudioState: React.Dispatch<React.SetStateAction<AudioTranscriptionState>>
  providers: { value: string; label: string }[]
  audioModels: { value: string; label: string }[]
  audioModelsMap: Record<string, { value: string; label: string }[]>
  setCurrentAudioModels: React.Dispatch<React.SetStateAction<{ value: string; label: string }[]>>
}

// Define response types for better type safety
interface TranscriptResponse {
  text: string
  error?: string
}

const AudioTranscription = ({
  audioState,
  setAudioState,
  providers,
  audioModels,
  audioModelsMap,
  setCurrentAudioModels,
}: AudioTranscriptionProps) => {
  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudioState(prev => ({
      ...prev,
      url: e.target.value,
    }))
  }

  // Handle provider selection changes - moved from parent component
  const handleProviderChange = (provider: string) => {
    // Update current audio models from the map
    const models = audioModelsMap[provider] || []

    // Always select the first model if available
    const firstModel = models.length > 0 ? models[0].value : ''

    // Important: Update both states in a specific order to ensure synchronization
    // First update the models list
    setCurrentAudioModels(models)

    // Then update the source and model in a single state update
    setAudioState(prev => ({
      ...prev,
      source: provider,
      model: firstModel,
    }))
  }

  // Handle model selection changes
  const handleModelChange = (value: string) => {
    setAudioState(prev => ({
      ...prev,
      model: value,
    }))
  }

  // Start transcription
  const startTranscription = useCallback(async () => {
    if (!audioState.url || !audioState.source) return

    setAudioState(prev => ({
      ...prev,
      error: '',
      transcript: '',
      isTranscribing: true,
    }))

    try {
      // Create JSON data for the request body
      const requestBody = JSON.stringify({
        url: audioState.url,
        service: audioState.source,
        model: audioState.model,
      })

      // Use POST request to send JSON in the body (standard approach)
      const response = await fetch('/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      if (!response.ok) {
        const data = (await response.json()) as TranscriptResponse
        throw new Error(data.error ?? 'Failed to transcribe audio')
      }

      const data = (await response.json()) as TranscriptResponse

      setAudioState(prev => ({
        ...prev,
        transcript: data.text,
        isTranscribing: false,
      }))

      toast.success('Transcription completed')
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred'
      setAudioState(prev => ({
        ...prev,
        error: errorMessage,
        isTranscribing: false,
      }))
      toast.error('Transcription failed')
    }
  }, [audioState.url, audioState.source, audioState.model, setAudioState])

  // Handle transcription submission
  const handleTranscribe = (e: React.FormEvent) => {
    e.preventDefault()
    void startTranscription()
  }

  // Copy transcript to clipboard
  const copyToClipboard = () => {
    void navigator.clipboard.writeText(audioState.transcript)
    toast.success('Copied to clipboard')
  }

  // Clear transcript and related data
  const clearTranscript = () => {
    setAudioState(prev => ({
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
          <CardTitle>Audio Transcription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTranscribe} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="audio-url" className="text-sm font-medium">
                Audio URL
              </label>
              <Input
                id="audio-url"
                type="url"
                placeholder="https://example.com/podcast.mp3"
                value={audioState.url}
                onChange={handleUrlChange}
                className="placeholder:text-muted-foreground/60"
              />
              <div className="mt-2 flex items-start space-x-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                <Info className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You can find the audio download link for a podcast on{' '}
                  <a
                    href="https://www.listennotes.com/"
                    className="underline hover:text-blue-800 dark:hover:text-blue-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ListenNotes
                  </a>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="provider-select" className="text-sm font-medium">
                Speech-to-Text (STT) Provider
              </label>
              <Select value={audioState.source} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="model-select" className="text-sm font-medium">
                Model
              </label>
              <Select
                value={audioState.model || (audioModels.length > 0 ? audioModels[0].value : '')}
                onValueChange={handleModelChange}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {audioModels.map(model => (
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
            onClick={handleTranscribe}
            disabled={audioState.isTranscribing || !audioState.url}
            className="w-full"
          >
            {audioState.isTranscribing ? (
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

      {audioState.error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-300">{audioState.error}</p>
          </CardContent>
        </Card>
      )}

      {audioState.transcript && (
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
              {audioState.transcript}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AudioTranscription

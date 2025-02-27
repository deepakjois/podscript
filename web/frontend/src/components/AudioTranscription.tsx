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

export interface AudioTranscriptionState {
  url: string
  source: string
  model: string
  transcript: string
  error: string
  isTranscribing: boolean
}

export interface ProviderModel {
  value: string
  label: string
}

export interface AudioProvider {
  provider: ProviderModel
  models: ProviderModel[]
}

export interface AudioTranscriptionProps {
  audioState: AudioTranscriptionState
  setAudioState: React.Dispatch<React.SetStateAction<AudioTranscriptionState>>
  providers: AudioProvider[]
}

// Define response types for better type safety
interface TranscriptResponse {
  text: string
  error?: string
}

const AudioTranscription = ({ audioState, setAudioState, providers }: AudioTranscriptionProps) => {
  // Get models for the current or specified provider
  const getModels = (providerValue = audioState.source) => {
    return providers.find(p => p.provider.value === providerValue)?.models ?? []
  }

  // Handle provider selection changes
  const handleProviderChange = (provider: string) => {
    const models = getModels(provider)

    setAudioState(prev => ({
      ...prev,
      source: provider,
      model: models.length > 0 ? models[0].value : '',
    }))
  }

  // Start transcription
  const startTranscription = useCallback(async () => {
    if (!audioState.url || !audioState.source) return

    setAudioState(prev => ({ ...prev, error: '', transcript: '', isTranscribing: true }))

    try {
      const response = await fetch('/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: audioState.url,
          service: audioState.source,
          model: audioState.model,
        }),
      })

      const data = (await response.json()) as TranscriptResponse

      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to transcribe audio')
      }

      setAudioState(prev => ({ ...prev, transcript: data.text, isTranscribing: false }))
      toast.success('Transcription completed')
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An error occurred'
      setAudioState(prev => ({ ...prev, error: errorMessage, isTranscribing: false }))
      toast.error('Transcription failed')
    }
  }, [audioState.url, audioState.source, audioState.model, setAudioState])

  // Get current models for rendering
  const currentModels = getModels()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Transcript from Audio URLs</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={e => {
              e.preventDefault()
              void startTranscription()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="audio-url" className="text-sm font-medium">
                Audio URL
              </label>
              <Input
                id="audio-url"
                type="url"
                placeholder="https://example.com/podcast.mp3"
                value={audioState.url}
                onChange={e => setAudioState(prev => ({ ...prev, url: e.target.value }))}
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
                    <SelectItem key={provider.provider.value} value={provider.provider.value}>
                      {provider.provider.label}
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
                value={audioState.model || (currentModels.length > 0 ? currentModels[0].value : '')}
                onValueChange={value => setAudioState(prev => ({ ...prev, model: value }))}
              >
                <SelectTrigger id="model-select">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {currentModels.map(model => (
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
            onClick={() => void startTranscription()}
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
                  onClick={() => {
                    void navigator.clipboard.writeText(audioState.transcript)
                    toast.success('Copied to clipboard')
                  }}
                  title="Copy to clipboard"
                  aria-label="Copy transcript to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setAudioState(prev => ({ ...prev, transcript: '', error: '' }))
                    toast.success('Transcript cleared')
                  }}
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

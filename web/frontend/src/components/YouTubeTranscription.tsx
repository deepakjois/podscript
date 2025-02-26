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
import { Loader2 } from 'lucide-react'

interface YouTubeTranscriptionProps {
  youtubeData: {
    url: string
    model: string
  }
  setYoutubeData: React.Dispatch<React.SetStateAction<{ url: string; model: string }>>
  handleTranscribe: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
}

const YouTubeTranscription = ({
  youtubeData,
  setYoutubeData,
  handleTranscribe,
  isLoading,
}: YouTubeTranscriptionProps) => {
  // Available models for YouTube transcription
  const models = [
    { value: 'gpt-4o', label: 'OpenAI - GPT-4o' },
    { value: 'gpt-4o-mini', label: 'OpenAI - GPT-4o Mini' },
    { value: 'gemini-2.0-flash', label: 'Google - Gemini 2.0 Flash' },
    { value: 'llama-3.3-70b-versatile', label: 'Llama - 3.3 70B Versatile (via Groq)' },
    { value: 'llama-3.1-8b-instant', label: 'Llama - 3.1 8B Instant (via Groq)' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Anthropic - Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Anthropic - Claude 3.5 Haiku' },
  ]

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeData({ ...youtubeData, url: e.target.value })
  }

  // Handle model selection changes
  const handleModelChange = (value: string) => {
    setYoutubeData({ ...youtubeData, model: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>YouTube Transcription</CardTitle>
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
              />
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
    </div>
  )
}

export default YouTubeTranscription

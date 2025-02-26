import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Link, Upload } from 'lucide-react'

interface AudioTranscriptionProps {
  audioData: {
    url: string
    source: string
    file: File | null
  }
  setAudioData: React.Dispatch<
    React.SetStateAction<{
      url: string
      source: string
      file: File | null
    }>
  >
  inputMethod: string
  setInputMethod: React.Dispatch<React.SetStateAction<string>>
  handleTranscribe: (e: React.FormEvent) => Promise<void>
  isLoading: boolean
}

const AudioTranscription = ({
  audioData,
  setAudioData,
  inputMethod,
  setInputMethod,
  handleTranscribe,
  isLoading,
}: AudioTranscriptionProps) => {
  // Available STT providers
  const providers = [
    { value: 'deepgram', label: 'Deepgram' },
    { value: 'assemblyai', label: 'AssemblyAI' },
    { value: 'groq', label: 'Groq' },
  ]

  // Handle URL input changes
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudioData({ ...audioData, url: e.target.value })
  }

  // Handle file input changes
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAudioData({ ...audioData, file: e.target.files?.[0] ?? null })
  }

  // Handle provider selection changes
  const handleProviderChange = (value: string) => {
    setAudioData({ ...audioData, source: value })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audio Transcription</CardTitle>
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
              <label htmlFor="provider-select" className="text-sm font-medium">
                Speech-to-Text Provider
              </label>
              <Select value={audioData.source} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.value} value={provider.value}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {audioData.source === 'groq' && inputMethod === 'url' && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Note: Groq only supports audio files, not URLs.
                </p>
              )}
            </div>

            <Tabs value={inputMethod} onValueChange={setInputMethod} className="w-full">
              <TabsList className="mb-4 grid grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  From URL
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  From File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="mt-0">
                <div className="space-y-2">
                  <label htmlFor="audio-url" className="text-sm font-medium">
                    Audio URL
                  </label>
                  <Input
                    id="audio-url"
                    type="url"
                    placeholder="https://example.com/podcast.mp3"
                    value={audioData.url || ''}
                    onChange={handleUrlChange}
                    disabled={audioData.source === 'groq'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="file" className="mt-0">
                <div className="space-y-2">
                  <label htmlFor="audio-file" className="text-sm font-medium">
                    Audio File
                  </label>
                  <Input id="audio-file" type="file" accept="audio/*" onChange={handleFileChange} />
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={e => {
              void handleTranscribe(e as React.FormEvent)
            }}
            disabled={
              isLoading ||
              (inputMethod === 'url' && (!audioData.url || audioData.source === 'groq')) ||
              (inputMethod === 'file' && !audioData.file)
            }
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

export default AudioTranscription

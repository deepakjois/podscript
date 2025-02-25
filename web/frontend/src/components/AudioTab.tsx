import { useState, useEffect } from 'react'
import { Info, Copy } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'

interface ModelsResponse {
  models: string[]
  default: string
}

interface TranscriptResponse {
  text: string
  error?: string
}

interface AudioFormValues {
  url: string
  service: string
  model: string
}

export default function AudioTab() {
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [showCopied, setShowCopied] = useState(false)

  // Create form with react-hook-form
  const form = useForm<AudioFormValues>({
    defaultValues: {
      url: '',
      service: 'deepgram',
      model: '',
    },
  })

  // Get the current service value from the form
  const service = form.watch('service')

  useEffect(() => {
    void fetch(`/models/${service}`)
      .then(res => res.json())
      .then((data: ModelsResponse) => {
        setModels(data.models)
        form.setValue('model', data.default)
      })
      .catch(console.error)
  }, [service, form])

  const handleSubmit = form.handleSubmit(async (data: AudioFormValues) => {
    setLoading(true)
    setError('')
    setTranscript('')

    try {
      const response = await fetch('/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: data.url,
          service: data.service,
          model: data.model,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as TranscriptResponse
        throw new Error(data.error ?? 'Failed to transcribe audio')
      }

      const responseData = (await response.json()) as TranscriptResponse
      setTranscript(responseData.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  })

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(transcript)
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Transcription</CardTitle>
        <CardDescription>Generate transcripts for audio files online.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audio URL</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Audio URL" {...field} />
                  </FormControl>
                  <FormDescription>
                    <div className="mt-2 flex items-start space-x-2 rounded-lg bg-blue-50 p-4">
                      <Info className="mt-0.5 h-5 w-5 text-blue-600" />
                      <p className="text-sm text-blue-700">
                        You can find the audio download link for a podcast on{' '}
                        <a
                          href="https://www.listennotes.com/"
                          className="underline hover:text-blue-800"
                        >
                          ListenNotes
                        </a>
                      </p>
                    </div>
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Speech-to-Text (STT) API Service</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                      <SelectItem value="aai">AssemblyAI</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <div className="flex justify-center">
              <Button type="submit" disabled={loading || !form.watch('url')} className="w-1/2">
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
              </Button>
            </div>
          </form>
        </Form>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}

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
      </CardContent>
    </Card>
  )
}

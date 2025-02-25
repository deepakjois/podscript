import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Moon,
  Sun,
  Settings,
  Mic,
  Youtube,
  Loader2,
  Upload,
  Link,
  Save,
  AlertCircle,
} from 'lucide-react'

const AppLayout = () => {
  // Main state
  const [youtubeData, setYoutubeData] = useState({ url: '', model: 'gpt-4o' })
  const [audioData, setAudioData] = useState<{ url: string; source: string; file: File | null }>({
    url: '',
    source: 'deepgram',
    file: null,
  })
  const [theme, setTheme] = useState('light')
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [inputMethod, setInputMethod] = useState('url') // 'url' or 'file'

  // Update theme when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  // Handle form submission for transcription
  const handleTranscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    const activeTab = document
      .querySelector('[role="tabpanel"][data-state="active"]')
      ?.getAttribute('data-value')
    let canProceed = false

    if (activeTab === 'youtube' && youtubeData.url) {
      canProceed = true
    } else if (activeTab === 'audio') {
      if (
        (inputMethod === 'url' && audioData.url && audioData.source !== 'groq') ||
        (inputMethod === 'file' && audioData.file)
      ) {
        canProceed = true
      }
    }

    if (!canProceed) return

    setIsLoading(true)

    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock transcript response
      setTranscript(
        'Sample transcript would appear here. This is a placeholder for the actual transcript content that would be returned from the API after processing the audio or YouTube captions.',
      )
    } catch (error) {
      console.error('Error transcribing:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // YouTube Transcription Component
  const YouTubeTranscription = () => {
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

  // Audio Transcription Component
  const AudioTranscription = () => {
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
                    <Input
                      id="audio-file"
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                    />
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

  // Settings Panel Component
  const SettingsPanel = () => {
    // Initial settings state
    const [settings, setSettings] = useState({
      openai: { apiKey: '' },
      anthropic: { apiKey: '' },
      groq: { apiKey: '' },
      deepgram: { apiKey: '' },
      assemblyai: { apiKey: '' },
      google: { apiKey: '' },
      aws: {
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-east-1',
      },
    })

    const [status, setStatus] = useState({ message: '', isError: false })
    const [saving, setSaving] = useState(false)

    // Handle input changes
    const handleChange = (provider: string, field: string, value: string) => {
      setSettings(prev => ({
        ...prev,
        [provider]: {
          ...prev[provider as keyof typeof prev],
          [field]: value,
        },
      }))
    }

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSaving(true)

      try {
        // This would be replaced with actual API call to save settings
        await new Promise(resolve => setTimeout(resolve, 1000))

        setStatus({
          message: 'Settings saved successfully!',
          isError: false,
        })
      } catch {
        setStatus({
          message: 'Error saving settings. Please try again.',
          isError: true,
        })
      } finally {
        setSaving(false)

        // Clear status message after 3 seconds
        setTimeout(() => {
          setStatus({ message: '', isError: false })
        }, 3000)
      }
    }

    return (
      <div className="space-y-6 py-4">
        {status.message && (
          <Alert
            className={
              status.isError
                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            }
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={e => {
            e.preventDefault()
            void handleSubmit(e)
          }}
          className="space-y-6"
        >
          <Accordion type="multiple" className="w-full">
            {/* OpenAI */}
            <AccordionItem value="openai">
              <AccordionTrigger>OpenAI Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="openai-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="openai-api-key"
                    type="password"
                    value={settings.openai.apiKey}
                    onChange={e => handleChange('openai', 'apiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Anthropic */}
            <AccordionItem value="anthropic">
              <AccordionTrigger>Anthropic Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="anthropic-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="anthropic-api-key"
                    type="password"
                    value={settings.anthropic.apiKey}
                    onChange={e => handleChange('anthropic', 'apiKey', e.target.value)}
                    placeholder="sk-ant-..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Groq */}
            <AccordionItem value="groq">
              <AccordionTrigger>Groq Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="groq-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="groq-api-key"
                    type="password"
                    value={settings.groq.apiKey}
                    onChange={e => handleChange('groq', 'apiKey', e.target.value)}
                    placeholder="gsk_..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Deepgram */}
            <AccordionItem value="deepgram">
              <AccordionTrigger>Deepgram Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="deepgram-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="deepgram-api-key"
                    type="password"
                    value={settings.deepgram.apiKey}
                    onChange={e => handleChange('deepgram', 'apiKey', e.target.value)}
                    placeholder="..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* AssemblyAI */}
            <AccordionItem value="assemblyai">
              <AccordionTrigger>AssemblyAI Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="assemblyai-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="assemblyai-api-key"
                    type="password"
                    value={settings.assemblyai.apiKey}
                    onChange={e => handleChange('assemblyai', 'apiKey', e.target.value)}
                    placeholder="..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Google Gemini */}
            <AccordionItem value="google">
              <AccordionTrigger>Google Gemini Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <label htmlFor="google-api-key" className="text-sm font-medium">
                    API Key
                  </label>
                  <Input
                    id="google-api-key"
                    type="password"
                    value={settings.google.apiKey}
                    onChange={e => handleChange('google', 'apiKey', e.target.value)}
                    placeholder="..."
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* AWS Bedrock */}
            <AccordionItem value="aws">
              <AccordionTrigger>AWS Bedrock Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="aws-access-key" className="text-sm font-medium">
                      Access Key ID
                    </label>
                    <Input
                      id="aws-access-key"
                      type="password"
                      value={settings.aws.accessKeyId}
                      onChange={e => handleChange('aws', 'accessKeyId', e.target.value)}
                      placeholder="AKIA..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="aws-secret-key" className="text-sm font-medium">
                      Secret Access Key
                    </label>
                    <Input
                      id="aws-secret-key"
                      type="password"
                      value={settings.aws.secretAccessKey}
                      onChange={e => handleChange('aws', 'secretAccessKey', e.target.value)}
                      placeholder="..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="aws-region" className="text-sm font-medium">
                      Region
                    </label>
                    <Input
                      id="aws-region"
                      type="text"
                      value={settings.aws.region}
                      onChange={e => handleChange('aws', 'region', e.target.value)}
                      placeholder="us-east-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Mic className="h-6 w-6" />
          <h1 className="text-xl font-bold">Podscript</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {/* Settings Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 sm:w-96">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <SettingsPanel />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl p-4">
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="youtube" className="flex w-1/2 items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube Transcription
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex w-1/2 items-center gap-2">
              <Mic className="h-4 w-4" />
              Audio Transcription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <YouTubeTranscription />
          </TabsContent>

          <TabsContent value="audio">
            <AudioTranscription />
          </TabsContent>
        </Tabs>

        {/* Transcript Display */}
        {transcript && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4 whitespace-pre-wrap">{transcript}</div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="text-muted-foreground border-t p-4 text-center text-sm">
        <p>Podscript - Generate transcripts for podcasts and other audio files</p>
      </footer>
    </div>
  )
}

export default AppLayout

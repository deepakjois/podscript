import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Moon, Sun, Settings, Mic, Youtube, AlertCircle } from 'lucide-react'
import YouTubeTranscription, { YouTubeTranscriptionState } from '@/components/YouTubeTranscription'
import AudioTranscription, {
  AudioTranscriptionState,
  AudioProvider,
} from '@/components/AudioTranscription'
import SettingsPanel from '@/components/SettingsPanel'
import { Toaster, toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Speech-to-Text providers
const STT_PROVIDERS = [
  { value: 'deepgram', label: 'Deepgram' },
  { value: 'aai', label: 'AssemblyAI' },
]

interface ModelsResponse {
  models: string[]
  default: string
}

interface ProviderResult {
  provider: string
  models: { value: string; label: string }[]
  defaultModel: string
}

const App = () => {
  const [theme, setTheme] = useState('dark')
  const [ytModels, setYtModels] = useState<{ value: string; label: string }[]>([])
  const [audioProviders, setAudioProviders] = useState<AudioProvider[]>([])
  const [modelsError, setModelsError] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(true)

  const [youtubeState, setYoutubeState] = useState<YouTubeTranscriptionState>({
    url: '',
    model: '',
    transcript: '',
    error: '',
    isTranscribing: false,
  })

  const [audioState, setAudioState] = useState<AudioTranscriptionState>({
    url: '',
    source: 'deepgram',
    model: '',
    transcript: '',
    error: '',
    isTranscribing: false,
  })

  // Fetch models on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        // Fetch YouTube models
        const ytResponse = await fetch('/models/ytt')
        const ytData = (await ytResponse.json()) as ModelsResponse

        const ytModelOptions = ytData.models.map(model => ({ value: model, label: model }))
        setYtModels(ytModelOptions)

        // Set initial YouTube model
        setYoutubeState(prev => ({
          ...prev,
          model: ytData.default || (ytData.models.length > 0 ? ytData.models[0] : ''),
        }))

        // Fetch audio models for all providers
        const audioResults = await Promise.all(
          STT_PROVIDERS.map(async provider => {
            try {
              const response = await fetch(`/models/${provider.value}`)
              const data = (await response.json()) as ModelsResponse

              return {
                provider: provider.value,
                models: data.models.map(model => ({ value: model, label: model })),
                defaultModel: data.default,
              } as ProviderResult
            } catch (error: unknown) {
              console.error(`Error fetching models for ${provider.value}:`, error)
              return { provider: provider.value, models: [], defaultModel: '' } as ProviderResult
            }
          }),
        )

        // Process audio providers
        const providers: AudioProvider[] = audioResults
          .filter(result => result.models.length > 0)
          .map(result => ({
            provider: {
              value: result.provider,
              label: STT_PROVIDERS.find(p => p.value === result.provider)?.label ?? result.provider,
            },
            models: result.models,
          }))

        setAudioProviders(providers)

        // Set initial audio model
        const initialProvider = providers.find(p => p.provider.value === 'deepgram')
        if (initialProvider?.models.length) {
          setAudioState(prev => ({ ...prev, model: initialProvider.models[0].value }))
        }

        setIsLoadingModels(false)
      } catch (error: unknown) {
        console.error('Error fetching models:', error)
        setModelsError('Failed to load models. Please refresh the page and try again.')
        setIsLoadingModels(false)
      }
    }

    void fetchModels()
  }, [])

  // Update theme when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Header component
  const Header = () => (
    <header className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-2">
        <Mic className="h-6 w-6" />
        <h1 className="font-mono text-xl font-bold">podscript</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>

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
  )

  // Loading state
  if (isLoadingModels) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
          <p className="text-lg">Loading models...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (modelsError) {
    return (
      <div className="bg-background text-foreground min-h-screen transition-colors">
        <Toaster position="top-center" />
        <Header />
        <main className="container mx-auto max-w-3xl p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{modelsError}</AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button onClick={() => window.location.reload()}>Refresh Page</Button>
          </div>
        </main>
      </div>
    )
  }

  // Main app
  return (
    <div className="bg-background text-foreground min-h-screen transition-colors">
      <Toaster position="top-center" />
      <Header />
      <main className="container mx-auto max-w-3xl p-4">
        <Tabs
          defaultValue="youtube"
          className="w-full"
          onValueChange={() => {
            if (youtubeState.isTranscribing || audioState.isTranscribing) {
              toast.error(
                'Please wait for the active transcription to complete before switching tabs',
              )
              return false
            }
          }}
        >
          <TabsList className="mb-6 w-full">
            <TabsTrigger
              value="youtube"
              className="flex w-1/2 items-center gap-2"
              disabled={audioState.isTranscribing}
            >
              <Youtube className="h-4 w-4" />
              YouTube URL
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="flex w-1/2 items-center gap-2"
              disabled={youtubeState.isTranscribing}
            >
              <Mic className="h-4 w-4" />
              Audio URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <YouTubeTranscription
              youtubeState={youtubeState}
              setYoutubeState={setYoutubeState}
              models={ytModels}
            />
          </TabsContent>

          <TabsContent value="audio">
            <AudioTranscription
              audioState={audioState}
              setAudioState={setAudioState}
              providers={audioProviders}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

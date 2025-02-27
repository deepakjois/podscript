import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Moon, Sun, Settings, Mic, Youtube, AlertCircle } from 'lucide-react'
import YouTubeTranscription, { YouTubeTranscriptionState } from '@/components/YouTubeTranscription'
import AudioTranscription, {
  AudioTranscriptionState,
  STT_PROVIDERS,
} from '@/components/AudioTranscription'
import SettingsPanel from '@/components/SettingsPanel'
import { Toaster, toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface ModelsResponse {
  models: string[]
  default: string
}

const App = () => {
  // Theme state
  const [theme, setTheme] = useState('dark')

  // Models state
  const [ytModels, setYtModels] = useState<{ value: string; label: string }[]>([])
  const [audioModelsMap, setAudioModelsMap] = useState<
    Record<string, { value: string; label: string }[]>
  >({})
  const [currentAudioModels, setCurrentAudioModels] = useState<{ value: string; label: string }[]>(
    [],
  )
  const [modelsError, setModelsError] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(true)

  // YouTube URL transcription state
  const [youtubeState, setYoutubeState] = useState<YouTubeTranscriptionState>({
    url: '',
    model: '',
    transcript: '',
    error: '',
    isTranscribing: false,
  })

  // Audio URL transcription state
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
    setIsLoadingModels(true)

    // Fetch YouTube transcription models
    const fetchYtModels = fetch('/models/ytt')
      .then(res => res.json())
      .then((data: ModelsResponse) => {
        // Transform the models array to include labels
        const modelOptions = data.models.map(model => ({
          value: model,
          label: model,
        }))
        setYtModels(modelOptions)

        // Set initial YouTube model
        if (data.default) {
          setYoutubeState(prev => ({
            ...prev,
            model: data.default,
          }))
        } else if (data.models.length > 0) {
          setYoutubeState(prev => ({
            ...prev,
            model: data.models[0],
          }))
        }

        return true
      })
      .catch(err => {
        console.error('Error fetching YouTube models:', err)
        setModelsError('Failed to load YouTube models. Please refresh the page and try again.')
        return false
      })

    // Fetch audio transcription models for all providers
    const fetchAllAudioModels = Promise.all(
      STT_PROVIDERS.map(provider =>
        fetch(`/models/${provider.value}`)
          .then(res => res.json())
          .then((data: ModelsResponse) => {
            // Transform the models array to include labels
            const modelOptions = data.models.map(model => ({
              value: model,
              label: model,
            }))

            return {
              provider: provider.value,
              models: modelOptions,
              defaultModel: data.default || modelOptions[0]?.value,
            }
          })
          .catch(err => {
            console.error(`Error fetching models for ${provider.value}:`, err)
            return { provider: provider.value, models: [], defaultModel: '' }
          }),
      ),
    )
      .then(results => {
        // Create a map of provider -> models
        const modelsMap: Record<string, { value: string; label: string }[]> = {}
        const defaultModelsMap: Record<string, string> = {}

        results.forEach(result => {
          if (result.models.length > 0) {
            modelsMap[result.provider] = result.models
            defaultModelsMap[result.provider] = result.defaultModel
          }
        })

        setAudioModelsMap(modelsMap)

        // Set initial audio models to the default provider (deepgram)
        const initialProvider = 'deepgram'
        const initialModels = modelsMap[initialProvider] || []
        setCurrentAudioModels(initialModels)

        // Always select the first model for the initial provider
        const firstModel = initialModels.length > 0 ? initialModels[0].value : ''
        if (firstModel) {
          setAudioState(prev => ({
            ...prev,
            model: firstModel,
          }))
        }

        return Object.keys(modelsMap).length > 0
      })
      .catch(err => {
        console.error('Error fetching audio models:', err)
        setModelsError(prev =>
          prev ? prev : 'Failed to load audio models. Please refresh the page and try again.',
        )
        return false
      })

    // Wait for both fetches to complete
    Promise.all([fetchYtModels, fetchAllAudioModels])
      .then(results => {
        // If both fetches were successful or at least one was successful
        if (results.some(result => result)) {
          setIsLoadingModels(false)
        }
      })
      .catch(err => {
        console.error('Error fetching models:', err)
        setIsLoadingModels(false)
      })
  }, [])

  // Update theme when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  // Common header component
  const Header = () => (
    <header className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-2">
        <Mic className="h-6 w-6" />
        <h1 className="font-mono text-xl font-bold">podscript</h1>
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
  )

  // If still loading models, show loading state
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

  // If there was an error loading models, show error state
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

  // If models loaded successfully, show the full app
  return (
    <div className="bg-background text-foreground min-h-screen transition-colors">
      {/* Toast provider */}
      <Toaster position="top-center" />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto max-w-3xl p-4">
        <Tabs
          defaultValue="youtube"
          className="w-full"
          onValueChange={() => {
            // Prevent tab switching if any transcription is in progress
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
              providers={STT_PROVIDERS}
              audioModels={currentAudioModels}
              audioModelsMap={audioModelsMap}
              setCurrentAudioModels={setCurrentAudioModels}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

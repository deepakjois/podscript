import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Moon, Sun, Settings, Mic, Youtube, AlertCircle } from 'lucide-react'
import YouTubeTranscription, { YouTubeTranscriptionState } from '@/components/YouTubeTranscription'
import AudioTranscription from '@/components/AudioTranscription'
import SettingsPanel from '@/components/SettingsPanel'
import { Toaster } from 'sonner'
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
  const [models, setModels] = useState<{ value: string; label: string }[]>([])
  const [modelsError, setModelsError] = useState('')
  const [isLoadingModels, setIsLoadingModels] = useState(true)

  // YouTube URL transcription state
  const [youtubeState, setYoutubeState] = useState<YouTubeTranscriptionState>({
    url: '',
    model: '',
    transcript: '',
    error: '',
  })

  // Audio URL transcription state
  const [audioData, setAudioData] = useState<{ url: string; source: string; file: File | null }>({
    url: '',
    source: 'deepgram',
    file: null,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [inputMethod, setInputMethod] = useState('url') // 'url' or 'file'

  // Fetch models on mount
  useEffect(() => {
    setIsLoadingModels(true)
    fetch('/models/ytt')
      .then(res => res.json())
      .then((data: ModelsResponse) => {
        // Transform the models array to include labels
        const modelOptions = data.models.map(model => ({
          value: model,
          label: model,
        }))
        setModels(modelOptions)

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

        setIsLoadingModels(false)
      })
      .catch(err => {
        console.error('Error fetching models:', err)
        setModelsError('Failed to load models. Please refresh the page and try again.')
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

  // Handle form submission for audio transcription
  const handleAudioTranscribe = async (e: React.FormEvent) => {
    e.preventDefault()

    let canProceed = false

    if (
      (inputMethod === 'url' && audioData.url && audioData.source !== 'groq') ||
      (inputMethod === 'file' && audioData.file)
    ) {
      canProceed = true
    }

    if (!canProceed) return

    setIsLoading(true)

    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock success - would be replaced with actual API response handling
      console.log('Audio transcription completed')
    } catch (error) {
      console.error(
        'Error transcribing audio:',
        error instanceof Error ? error.message : 'Unknown error',
      )
    } finally {
      setIsLoading(false)
    }
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
        <Tabs defaultValue="youtube" className="w-full">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="youtube" className="flex w-1/2 items-center gap-2">
              <Youtube className="h-4 w-4" />
              YouTube URL
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex w-1/2 items-center gap-2">
              <Mic className="h-4 w-4" />
              Audio URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <YouTubeTranscription
              youtubeState={youtubeState}
              setYoutubeState={setYoutubeState}
              models={models}
            />
          </TabsContent>

          <TabsContent value="audio">
            <AudioTranscription
              audioData={audioData}
              setAudioData={setAudioData}
              inputMethod={inputMethod}
              setInputMethod={setInputMethod}
              handleTranscribe={handleAudioTranscribe}
              isLoading={isLoading}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App

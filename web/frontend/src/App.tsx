import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Moon, Sun, Settings, Mic, Youtube } from 'lucide-react'
import YouTubeTranscription from '@/components/YouTubeTranscription'
import AudioTranscription from '@/components/AudioTranscription'
import SettingsPanel from '@/components/SettingsPanel'

const App = () => {
  // Main state
  const [youtubeData, setYoutubeData] = useState({ url: '', model: 'gpt-4o' })
  const [audioData, setAudioData] = useState<{ url: string; source: string; file: File | null }>({
    url: '',
    source: 'deepgram',
    file: null,
  })
  const [theme, setTheme] = useState('dark')
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
            <YouTubeTranscription
              youtubeData={youtubeData}
              setYoutubeData={setYoutubeData}
              handleTranscribe={handleTranscribe}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="audio">
            <AudioTranscription
              audioData={audioData}
              setAudioData={setAudioData}
              inputMethod={inputMethod}
              setInputMethod={setInputMethod}
              handleTranscribe={handleTranscribe}
              isLoading={isLoading}
            />
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
    </div>
  )
}

export default App

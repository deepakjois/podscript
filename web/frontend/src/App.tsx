import { useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import Settings from '@/components/Settings'
import YouTubeTab from '@/components/YouTubeTab'
import AudioTab from '@/components/AudioTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function App() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <>
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex h-16 items-center justify-between py-4">
          <h1 className="font-mono text-2xl font-bold">podscript</h1>
          {!showSettings && (
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <SettingsIcon size={24} />
            </button>
          )}
        </div>

        {showSettings ? (
          <Settings onClose={() => setShowSettings(false)} />
        ) : (
          <Tabs defaultValue="youtube">
            <TabsList className="w-full">
              <TabsTrigger value="youtube" className="flex-1">
                YouTube URL
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex-1">
                Audio URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="youtube">
              <YouTubeTab />
            </TabsContent>
            <TabsContent value="audio">
              <AudioTab />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  )
}

export default App

import { useState } from 'react'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { Settings as SettingsIcon } from 'lucide-react'
import Settings from './components/Settings'
import YouTubeTab from './components/YouTubeTab'
import AudioTab from './components/AudioTab'

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
          <TabGroup>
            <TabList className="flex space-x-1 rounded-xl bg-gray-100 p-1">
              <Tab
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm leading-5 font-medium ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-800'
                  }`
                }
              >
                YouTube URL
              </Tab>
              <Tab
                className={({ selected }) =>
                  `w-full rounded-lg py-2.5 text-sm leading-5 font-medium ${
                    selected
                      ? 'bg-white shadow'
                      : 'text-gray-700 hover:bg-white/[0.12] hover:text-gray-800'
                  }`
                }
              >
                Audio URL
              </Tab>
            </TabList>
            <TabPanels className="mt-4">
              <TabPanel>
                <YouTubeTab />
              </TabPanel>
              <TabPanel>
                <AudioTab />
              </TabPanel>
            </TabPanels>
          </TabGroup>
        )}
      </div>
    </>
  )
}

export default App

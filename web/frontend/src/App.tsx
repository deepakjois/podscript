import { useState, useEffect } from 'react'
import { Button } from './components/ui/button'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dark Mode Demo</h1>
          <Button variant={darkMode ? 'outline' : 'default'} onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Card Example</h2>
          <p className="mb-4">This card will change appearance based on the theme.</p>
          <div className="flex gap-2">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-6">
          <p className="text-muted-foreground">This is muted content that adapts to the theme.</p>
        </div>
      </div>
    </div>
  )
}

export default App

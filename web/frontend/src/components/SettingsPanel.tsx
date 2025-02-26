import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertCircle, Save } from 'lucide-react'

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
    <div className="space-y-6 p-4">
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
        <Accordion type="multiple" className="w-full rounded-lg border p-2">
          {/* OpenAI */}
          <AccordionItem value="openai">
            <AccordionTrigger>OpenAI</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="openai-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Anthropic */}
          <AccordionItem value="anthropic">
            <AccordionTrigger>Anthropic</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="anthropic-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Groq */}
          <AccordionItem value="groq">
            <AccordionTrigger>Groq</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="groq-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Deepgram */}
          <AccordionItem value="deepgram">
            <AccordionTrigger>Deepgram</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="deepgram-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* AssemblyAI */}
          <AccordionItem value="assemblyai">
            <AccordionTrigger>AssemblyAI</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="assemblyai-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Google Gemini */}
          <AccordionItem value="google">
            <AccordionTrigger>Google Gemini</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="google-api-key" className="block text-sm font-medium">
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
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* AWS Bedrock */}
          <AccordionItem value="aws">
            <AccordionTrigger>AWS Bedrock</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="aws-access-key" className="block text-sm font-medium">
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

                <div className="space-y-1.5">
                  <label htmlFor="aws-secret-key" className="block text-sm font-medium">
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

                <div className="space-y-1.5">
                  <label htmlFor="aws-region" className="block text-sm font-medium">
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

export default SettingsPanel

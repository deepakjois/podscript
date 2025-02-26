import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { AlertCircle, Save, Loader2, Eye, EyeOff } from 'lucide-react'

// Define API response type to match backend structure
interface ApiSettingsResponse {
  openai_api_key?: string
  anthropic_api_key?: string
  groq_api_key?: string
  deepgram_api_key?: string
  assembly_ai_api_key?: string
  gemini_api_key?: string
  aws_region?: string
  aws_access_key_id?: string
  aws_secret_access_key?: string
  aws_session_token?: string
}

// Custom password input component with toggle visibility
interface PasswordInputProps {
  id: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label: string
}

const PasswordInput = ({ id, value, onChange, placeholder, label }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password" // Prevent browser password autofill
          className="placeholder:text-muted-foreground/60" // Added lighter placeholder styling
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

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
      sessionToken: '',
      region: 'us-east-1',
    },
  })

  const [status, setStatus] = useState({ message: '', isError: false })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const response = await fetch('/settings')
        if (!response.ok) throw new Error('Failed to load settings')

        // Explicitly type the response data
        const data = (await response.json()) as ApiSettingsResponse

        // Map the API response to our settings structure
        setSettings({
          openai: { apiKey: data.openai_api_key ?? '' },
          anthropic: { apiKey: data.anthropic_api_key ?? '' },
          groq: { apiKey: data.groq_api_key ?? '' },
          deepgram: { apiKey: data.deepgram_api_key ?? '' },
          assemblyai: { apiKey: data.assembly_ai_api_key ?? '' },
          google: { apiKey: data.gemini_api_key ?? '' },
          aws: {
            accessKeyId: data.aws_access_key_id ?? '',
            secretAccessKey: data.aws_secret_access_key ?? '',
            sessionToken: data.aws_session_token ?? '',
            region: data.aws_region ?? 'us-east-1',
          },
        })
      } catch (error: unknown) {
        console.error('Error fetching settings:', error)
        setStatus({
          message: 'Failed to load settings. Please refresh the page.',
          isError: true,
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchSettings()
  }, [])

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
    setStatus({ message: '', isError: false })

    try {
      // Map our settings structure to the API expected format
      const apiPayload: ApiSettingsResponse = {
        openai_api_key: settings.openai.apiKey,
        anthropic_api_key: settings.anthropic.apiKey,
        groq_api_key: settings.groq.apiKey,
        deepgram_api_key: settings.deepgram.apiKey,
        assembly_ai_api_key: settings.assemblyai.apiKey,
        gemini_api_key: settings.google.apiKey,
        aws_region: settings.aws.region,
        aws_access_key_id: settings.aws.accessKeyId,
        aws_secret_access_key: settings.aws.secretAccessKey,
        aws_session_token: settings.aws.sessionToken,
      }

      const response = await fetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      setStatus({
        message: 'Settings saved successfully!',
        isError: false,
      })
    } catch (error: unknown) {
      console.error('Error saving settings:', error)
      setStatus({
        message: 'Error saving settings. Please try again.',
        isError: true,
      })
    } finally {
      setSaving(false)

      // Clear success message after 3 seconds (keep error messages visible)
      if (!status.isError) {
        setTimeout(() => {
          setStatus({ message: '', isError: false })
        }, 3000)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4 pb-24">
          {' '}
          {/* Added extra padding at bottom to ensure content doesn't get hidden behind the button */}
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
            id="settings-form"
            onSubmit={e => {
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
                    <PasswordInput
                      id="openai-api-key"
                      value={settings.openai.apiKey}
                      onChange={e => handleChange('openai', 'apiKey', e.target.value)}
                      placeholder="sk-..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Anthropic */}
              <AccordionItem value="anthropic">
                <AccordionTrigger>Anthropic</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="anthropic-api-key"
                      value={settings.anthropic.apiKey}
                      onChange={e => handleChange('anthropic', 'apiKey', e.target.value)}
                      placeholder="sk-ant-..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Groq */}
              <AccordionItem value="groq">
                <AccordionTrigger>Groq</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="groq-api-key"
                      value={settings.groq.apiKey}
                      onChange={e => handleChange('groq', 'apiKey', e.target.value)}
                      placeholder="gsk_..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Deepgram */}
              <AccordionItem value="deepgram">
                <AccordionTrigger>Deepgram</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="deepgram-api-key"
                      value={settings.deepgram.apiKey}
                      onChange={e => handleChange('deepgram', 'apiKey', e.target.value)}
                      placeholder="..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* AssemblyAI */}
              <AccordionItem value="assemblyai">
                <AccordionTrigger>AssemblyAI</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="assemblyai-api-key"
                      value={settings.assemblyai.apiKey}
                      onChange={e => handleChange('assemblyai', 'apiKey', e.target.value)}
                      placeholder="..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Google Gemini */}
              <AccordionItem value="google">
                <AccordionTrigger>Google Gemini</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="google-api-key"
                      value={settings.google.apiKey}
                      onChange={e => handleChange('google', 'apiKey', e.target.value)}
                      placeholder="..."
                      label="API Key"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* AWS Bedrock */}
              <AccordionItem value="aws">
                <AccordionTrigger>AWS Bedrock</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <PasswordInput
                      id="aws-access-key"
                      value={settings.aws.accessKeyId}
                      onChange={e => handleChange('aws', 'accessKeyId', e.target.value)}
                      placeholder="AKIA..."
                      label="Access Key ID"
                    />

                    <PasswordInput
                      id="aws-secret-key"
                      value={settings.aws.secretAccessKey}
                      onChange={e => handleChange('aws', 'secretAccessKey', e.target.value)}
                      placeholder="..."
                      label="Secret Access Key"
                    />

                    <PasswordInput
                      id="aws-session-token"
                      value={settings.aws.sessionToken}
                      onChange={e => handleChange('aws', 'sessionToken', e.target.value)}
                      placeholder="..."
                      label="Session Token (Optional)"
                    />

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
                        autoComplete="off"
                        className="placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </div>
      </div>

      {/* Save button that matches the width of the panel */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 shadow-md dark:border-gray-800 dark:bg-gray-950">
        <Button form="settings-form" type="submit" className="w-full" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default SettingsPanel

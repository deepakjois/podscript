import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface ApiKeys {
  openai_api_key: string
  anthropic_api_key: string
  assembly_ai_api_key: string
  deepgram_api_key: string
  groq_api_key: string
  gemini_api_key: string
  aws_region: string
  aws_access_key_id: string
  aws_secret_access_key: string
  aws_session_token: string
}

const API_KEY_LABELS: Record<keyof ApiKeys, string> = {
  openai_api_key: 'OpenAI API Key',
  anthropic_api_key: 'Anthropic API Key',
  assembly_ai_api_key: 'AssemblyAI API Key',
  deepgram_api_key: 'Deepgram API Key',
  groq_api_key: 'Groq API Key',
  gemini_api_key: 'Gemini API Key',
  aws_region: 'AWS Region',
  aws_access_key_id: 'AWS Access Key ID',
  aws_secret_access_key: 'AWS Secret Access Key',
  aws_session_token: 'AWS Session Token',
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [showFields, setShowFields] = useState<Record<keyof ApiKeys, boolean>>(
    Object.keys(API_KEY_LABELS).reduce((acc, key) => ({ ...acc, [key]: false }), {}) as Record<
      keyof ApiKeys,
      boolean
    >,
  )
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<ApiKeys>({
    defaultValues: {} as ApiKeys,
  })

  useEffect(() => {
    fetch('/settings')
      .then(res => res.json())
      .then((data: ApiKeys) => {
        // Set all form values at once
        Object.keys(data).forEach(key => {
          form.setValue(key as keyof ApiKeys, data[key as keyof ApiKeys])
        })
      })
      .catch(() => setError('Failed to load settings'))
  }, [form])

  const handleSubmit = form.handleSubmit(async (data: ApiKeys) => {
    setError('')
    setIsSaving(true)
    try {
      const res = await fetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      onClose()
    } catch (err) {
      console.error(err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  })

  const toggleFieldVisibility = (key: keyof ApiKeys) => {
    setShowFields(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <>
      <div className="py-4">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
      </div>

      <Card className="mx-auto mt-8 max-w-md">
        <CardHeader>
          <CardTitle>API Settings</CardTitle>
          <CardDescription>Configure your API keys for transcription services</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {(Object.keys(API_KEY_LABELS) as (keyof ApiKeys)[]).map(key => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{API_KEY_LABELS[key]}</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input
                            type={showFields[key] ? 'text' : 'password'}
                            {...field}
                            className="pr-10"
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() => toggleFieldVisibility(key)}
                          className="absolute top-1/2 right-2 -translate-y-1/2"
                        >
                          {showFields[key] ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </FormItem>
                  )}
                />
              ))}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-center">
                <Button type="submit" disabled={isSaving} className="w-1/2">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  )
}

import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ApiKeys {
  openai_api_key: string
  anthropic_api_key: string
  assembly_ai_api_key: string
  deepgram_api_key: string
  groq_api_key: string
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
  aws_region: 'AWS Region',
  aws_access_key_id: 'AWS Access Key ID',
  aws_secret_access_key: 'AWS Secret Access Key',
  aws_session_token: 'AWS Session Token'
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [showFields, setShowFields] = useState<Record<keyof ApiKeys, boolean>>(
    Object.keys(API_KEY_LABELS).reduce((acc, key) => ({ ...acc, [key]: false }), {}) as Record<
      keyof ApiKeys,
      boolean
    >,
  )
  const [keys, setKeys] = useState<ApiKeys>({} as ApiKeys)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/settings')
      .then(res => res.json())
      .then((data: ApiKeys) => setKeys(data))
      .catch(() => setError('Failed to load settings'))
  }, [])

  const handleSave = async (): Promise<void> => {
    setError('')
    setIsSaving(true)
    try {
      const res = await fetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      onClose()
    } catch (err) {
      console.error(err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="py-4">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="mx-auto mt-8 max-w-md space-y-6">
        {(Object.keys(keys) as (keyof ApiKeys)[]).map(key => (
          <div key={key}>
            <label className="mb-2 block text-sm font-medium">{API_KEY_LABELS[key]}</label>
            <div className="relative">
              <input
                type={showFields[key] ? 'text' : 'password'}
                value={keys[key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setKeys(prev => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full rounded-lg border px-4 py-2 pr-10"
              />
              <button
                onClick={() =>
                  setShowFields((prev: Record<keyof ApiKeys, boolean>) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
                className="absolute top-1/2 right-2 -translate-y-1/2"
              >
                {showFields[key] ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="w-1/2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}

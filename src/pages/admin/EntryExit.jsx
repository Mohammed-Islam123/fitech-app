import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, LogIn, LogOut, Loader } from 'lucide-react'
import { api } from '../../services/api'

export default function EntryExit() {
  const { t } = useTranslation()
  const [cardCode, setCardCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // Auto-focus the input on mount so the USB reader can type straight in
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = async () => {
    const code = cardCode.trim()
    if (!code) {
      setError(t('Please enter or scan a card code'))
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await api.scanEntryExit(code)
      setResult(data)
      setCardCode('')
      inputRef.current?.focus()
    } catch (err) {
      let msg = err.message || t('Failed to process scan')
      if (err.status === 404) msg = t('Member not found. Please check the card.')
      else if (err.status === 401) msg = t('Session expired. Please login again.')
      else if (err.status === 403) msg = t('You do not have permission to scan cards.')
      else if (err.status === 400) msg = err.payload?.message || err.payload?.detail || t('Invalid card or member status.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-6 sm:p-8 max-w-xl mx-auto">
      <div className="bg-white border border-secondary-200 rounded-2xl shadow-sm p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-secondary-900">{t('Entry / Exit')}</h1>
            <p className="text-sm text-secondary-500">{t('Scan a member card to record entry or exit')}</p>
          </div>
        </div>

        {/* Input Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            {t('Card Code')}
          </label>
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('Tap card on reader or type code…')}
              className="flex-1 h-11 px-4 rounded-lg border border-secondary-300 bg-secondary-50 text-secondary-900 placeholder-secondary-400 focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-50 transition-all text-sm"
              autoComplete="off"
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !cardCode.trim()}
              className="h-11 px-5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:bg-secondary-300 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  {t('Scan')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Success */}
        {result && (
          <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              {result.type === 'entry' ? <LogIn size={18} /> : <LogOut size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {result.type === 'entry' ? t('Checked In') : t('Checked Out')}
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                {result.memberName || result.memberId || t('Member')} — {result.timestamp ? new Date(result.timestamp).toLocaleString() : ''}
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <LogOut size={18} />
            </div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

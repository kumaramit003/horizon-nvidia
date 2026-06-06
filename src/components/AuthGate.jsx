import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LogIn, ShieldCheck } from 'lucide-react'
import { Wordmark, Tagline } from './Brand'
import { api, clearAuthToken, getAuthToken, setAuthToken } from '../lib/api'

const GOOGLE_SCRIPT_ID = 'google-identity-services'

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    api.authConfig()
      .then(config => {
        if (config.google_client_id) setClientId(config.google_client_id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      setStatus('signed_out')
      return
    }

    api.me()
      .then(currentUser => {
        setUser(currentUser)
        setStatus('signed_in')
      })
      .catch(() => {
        clearAuthToken()
        setStatus('signed_out')
      })
  }, [])

  const handleSignedIn = useCallback(({ token, user: signedInUser }) => {
    setAuthToken(token)
    sessionStorage.removeItem('discoveryId')
    setUser(signedInUser)
    setStatus('signed_in')
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Local logout still matters if the server is unavailable.
    }
    clearAuthToken()
    sessionStorage.removeItem('discoveryId')
    setUser(null)
    setStatus('signed_out')
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-mesh">
        <div className="text-center text-[13px] text-ink-500">Checking account...</div>
      </div>
    )
  }

  if (status !== 'signed_in') {
    return (
      <LoginScreen
        clientId={clientId}
        error={error}
        onError={setError}
        onSignedIn={handleSignedIn}
      />
    )
  }

  return children({ user, onSignOut: handleSignOut })
}

function LoginScreen({ clientId, error, onError, onSignedIn }) {
  const buttonRef = useRef(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [buttonStatus, setButtonStatus] = useState('idle')
  const [authenticating, setAuthenticating] = useState(false)

  useEffect(() => {
    if (!clientId || clientId.startsWith('replace_with_')) return

    let cancelled = false
    setGoogleReady(false)
    setButtonStatus('loading')
    setAuthenticating(false)
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return
        setGoogleReady(true)

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async response => {
            try {
              onError('')
              setAuthenticating(true)
              if (!response.credential) {
                throw new Error('Google did not return an ID credential')
              }
              const result = await api.googleLogin(response.credential)
              onSignedIn(result)
            } catch (err) {
              setAuthenticating(false)
              onError(err.message || 'Google sign-in failed')
            }
          },
        })

        buttonRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
          width: 280,
        })
        window.setTimeout(() => {
          if (!cancelled && buttonRef.current?.childElementCount) {
            setButtonStatus('ready')
          } else if (!cancelled) {
            setButtonStatus('blocked')
          }
        }, 1200)
      })
      .catch(err => {
        setButtonStatus('blocked')
        onError(err.message || 'Could not load Google Sign-In')
      })

    return () => {
      cancelled = true
    }
  }, [clientId, onError, onSignedIn])

  const configured = clientId && !clientId.startsWith('replace_with_')
  const showFallback = configured && googleReady && buttonStatus !== 'ready'

  const promptGoogle = () => {
    if (!window.google?.accounts?.id) {
      onError('Google Sign-In is not ready yet')
      return
    }
    window.google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        onError('Google blocked the prompt. Check that localhost is an authorized JavaScript origin for this OAuth client.')
      }
    })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-mesh px-6">
      <div className="pointer-events-none absolute inset-0 dot-grid opacity-50" />
      <span className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full gradient-soft-peach opacity-40 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-32 -right-32 h-[28rem] w-[28rem] rounded-full gradient-soft-mint opacity-40 blur-3xl" />

      <div className="relative w-full max-w-[520px] text-center">
        <Wordmark size="xl" className="justify-center" />
        <div className="mt-10 rounded-3xl border border-black/[0.06] bg-cream-50 p-8 shadow-lift">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl gradient-orb-finn text-white shadow-soft">
            <ShieldCheck size={22} />
          </div>
          <h1 className="mt-5 display text-[38px] leading-tight text-forest-500">
            Sign in to continue
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
            Use your Google account to create a FounderOS workspace.
          </p>

          <div className="mt-7 flex justify-center">
            {configured ? (
              <div className="flex min-h-[46px] flex-col items-center gap-3">
                {authenticating ? (
                  <div className="rounded-full border border-sage-200 bg-sage-50 px-4 py-2 text-[12.5px] text-forest-500">
                    Opening your workspace...
                  </div>
                ) : (
                  <>
                    <div ref={buttonRef} />
                    {buttonStatus === 'loading' && (
                      <div className="text-[12px] text-ink-500">Loading Google sign-in...</div>
                    )}
                    {showFallback && (
                      <button
                        onClick={promptGoogle}
                        className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-[13px] font-medium text-forest-500 shadow-soft hover:bg-cream-50"
                      >
                        <LogIn size={15} />
                        Continue with Google
                      </button>
                    )}
                    {buttonStatus === 'blocked' && (
                      <div className="max-w-[360px] text-[12px] leading-relaxed text-ink-500">
                        If the Google button stays hidden, add <span className="font-mono text-forest-500">http://localhost:5173</span> to this OAuth client&apos;s authorized JavaScript origins.
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-butter-200 bg-butter-100 px-4 py-2 text-[12.5px] text-ink-700">
                <LogIn size={14} />
                Add VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-100 px-4 py-3 text-[12.5px] text-ink-800">
              {error}
            </div>
          )}
        </div>
        <Tagline block className="mt-8" />
      </div>
    </div>
  )
}

function loadGoogleScript() {
  const existing = document.getElementById(GOOGLE_SCRIPT_ID)
  if (existing) return waitForGoogleIdentity()

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('Google Sign-In took too long to load'))
    }, 6000)

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      waitForGoogleIdentity()
        .then(() => {
          window.clearTimeout(timeout)
          resolve()
        })
        .catch(error => {
          window.clearTimeout(timeout)
          reject(error)
        })
    }
    script.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('Google Sign-In script failed to load'))
    }
    document.head.appendChild(script)
  })
}

function waitForGoogleIdentity() {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = () => {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }
      if (Date.now() - startedAt > 6000) {
        reject(new Error('Google Sign-In script loaded, but the identity API did not initialize'))
        return
      }
      window.setTimeout(check, 100)
    }
    check()
  })
}

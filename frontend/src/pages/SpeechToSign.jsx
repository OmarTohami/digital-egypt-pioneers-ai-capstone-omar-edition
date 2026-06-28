import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import HandSkeleton from '../components/HandSkeleton'
import styles from './SpeechToSign.module.css'

const API = 'http://localhost:8000'

const LANGUAGES = {
  'English (US)': 'en',
  'Arabic (Egypt)': 'ar',
  'French': 'fr',
  'German': 'de',
}

export default function SpeechToSign() {
  const nav = useNavigate()

  const [langLabel, setLangLabel] = useState('English (US)')
  const [recording, setRecording]  = useState(false)
  const [transcript, setTranscript] = useState('')
  const [tokens, setTokens]         = useState([])
  const [current, setCurrent]       = useState(0)
  const [status, setStatus]         = useState('')  // 'recording' | 'transcribing' | 'done' | 'error'
  const [manualText, setManualText] = useState('')

  const mediaRef   = useRef(null)
  const chunksRef  = useRef([])

  // ── Start / Stop recording ────────────────────────────────────────────────
  async function toggleRecording() {
    if (recording) {
      mediaRef.current?.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        setStatus('transcribing')

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'recording.webm')
        formData.append('language', LANGUAGES[langLabel])

        try {
          const res  = await fetch(`${API}/transcribe`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.error) {
            setStatus('error')
            setTranscript(data.error)
          } else {
            setTranscript(data.text)
            setStatus('done')
            await fetchTokens(data.text)
          }
        } catch (err) {
          setStatus('error')
          setTranscript('Could not reach backend.')
        }
      }

      mr.start()
      setRecording(true)
      setStatus('recording')
    } catch {
      setStatus('error')
      setTranscript('Microphone access denied.')
    }
  }

  // ── Fetch landmarks for each letter ──────────────────────────────────────
  async function fetchTokens(text) {
    const lang = LANGUAGES[langLabel]
    const chars = text.toUpperCase().split('').filter(c => /[A-Z\u0600-\u06FF ]/.test(c))
    const results = []

    for (const ch of chars) {
      if (ch === ' ') { results.push({ char: 'SPACE', landmarks: [] }); continue }
      try {
        const res  = await fetch(`${API}/landmarks/${lang}/${encodeURIComponent(ch)}`)
        const data = await res.json()
        results.push({ char: ch, landmarks: data.found ? data.landmarks : [] })
      } catch {
        results.push({ char: ch, landmarks: [] })
      }
    }

    setTokens(results)
    setCurrent(0)
  }

  // ── Manual text submit ────────────────────────────────────────────────────
  async function handleManual() {
    if (!manualText.trim()) return
    setTranscript(manualText.trim())
    setStatus('done')
    await fetchTokens(manualText.trim())
  }

  const currentToken = tokens[current]

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <button className="btn btn-ghost" onClick={() => nav('/')}>← Back</button>
        <h1 className={styles.title}>🎙️ Speech to Sign</h1>

        <select
          className={styles.langSelect}
          value={langLabel}
          onChange={e => { setLangLabel(e.target.value); setTokens([]); setTranscript('') }}
        >
          {Object.keys(LANGUAGES).map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Record button */}
      <div className={styles.recordSection}>
        <button
          className={`${styles.recordBtn} ${recording ? styles.recordBtnActive : ''}`}
          onClick={toggleRecording}
        >
          {recording ? '⏹ Stop Recording' : '🎙️ Start Recording'}
        </button>

        {status === 'recording' && (
          <div className={styles.pulse}>🔴 Recording…</div>
        )}
        {status === 'transcribing' && (
          <div className={styles.pulse}>⏳ Transcribing…</div>
        )}
        {status === 'done' && transcript && (
          <div className={styles.transcript}>✅ {transcript}</div>
        )}
        {status === 'error' && (
          <div className={styles.transcriptError}>⚠️ {transcript}</div>
        )}
      </div>

      {/* Manual override */}
      <div className={styles.manualRow}>
        <span className={styles.manualLabel}>— or type manually —</span>
        <div className={styles.manualInputRow}>
          <input
            className={styles.input}
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder="e.g. hello"
          />
          <button className="btn btn-primary" onClick={handleManual}>Show signs</button>
          {manualText && (
            <button className="btn btn-ghost" onClick={() => { setManualText(''); setTokens([]); setTranscript('') }}>Clear</button>
          )}
        </div>
      </div>

      {/* Sign display */}
      {tokens.length > 0 && (
        <>
          <div className={styles.display}>
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.22 }}
                className={styles.skeletonCard}
              >
                <div className={styles.skeletonLabel}>
                  {currentToken?.char === 'SPACE' ? 'SPACE' : currentToken?.char}
                </div>
                <HandSkeleton
                  landmarks={currentToken?.landmarks || []}
                  size={300}
                  animated={true}
                />
                {currentToken && !currentToken.landmarks.length && currentToken.char !== 'SPACE' && (
                  <div className={styles.noData}>No landmark data for this letter</div>
                )}
              </motion.div>
            </AnimatePresence>
            <div className={styles.progress}>{current + 1} / {tokens.length}</div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <button className="btn btn-ghost" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>← Prev</button>
            <button className="btn btn-ghost" onClick={() => setCurrent(c => Math.min(tokens.length - 1, c + 1))} disabled={current === tokens.length - 1}>Next →</button>
          </div>

          {/* Letter strip */}
          <div className={styles.strip}>
            {tokens.map((t, i) => (
              <button
                key={i}
                className={`${styles.stripTile} ${i === current ? styles.stripActive : ''} ${!t.landmarks.length && t.char !== 'SPACE' ? styles.stripMissing : ''}`}
                onClick={() => setCurrent(i)}
              >
                {t.char === 'SPACE' ? '·' : t.char}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {tokens.length === 0 && status !== 'recording' && status !== 'transcribing' && (
        <div className={styles.empty}>
          <span>🎙️</span>
          <p>Record your voice or type a word to see the signs</p>
        </div>
      )}
    </div>
  )
}

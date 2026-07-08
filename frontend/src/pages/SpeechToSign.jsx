import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import HandSkeleton from '../components/HandSkeleton'
import LangToggle   from '../components/LangToggle'
import { useApp }   from '../context/AppContext'
import styles from './SpeechToSign.module.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const DELAY_MS = 1200   // ms per letter during auto-play

// Audio file types whisper can handle
const ACCEPTED_AUDIO = '.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4'

export default function SpeechToSign() {
  const nav = useNavigate()
  const { uiLang, t } = useApp()

  const [lang,         setLang]         = useState(() => uiLang)
  const [recording,    setRecording]    = useState(false)
  const [transcript,   setTranscript]   = useState('')
  const [tokens,       setTokens]       = useState([])
  const [current,      setCurrent]      = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [status,       setStatus]       = useState('')   // 'recording' | 'transcribing' | 'done' | 'error'
  const [manualText,   setManualText]   = useState('')

  // ── File upload state ─────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileStatus,   setFileStatus]   = useState('')  // 'uploading' | 'done' | 'error'
  const fileInputRef = useRef(null)

  const mediaRef  = useRef(null)
  const chunksRef = useRef([])
  const timerRef  = useRef(null)

  // ── Auto-play ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || tokens.length === 0) return
    timerRef.current = setInterval(() => {
      setCurrent(c => {
        if (c >= tokens.length - 1) {
          setPlaying(false)
          return c
        }
        return c + 1
      })
    }, DELAY_MS)
    return () => clearInterval(timerRef.current)
  }, [playing, tokens.length])

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
        formData.append('language', lang)

        try {
          const res  = await fetch(`${API}/transcribe`, { method: 'POST', body: formData })
          const data = await res.json()
          if (data.error) {
            setStatus('error')
            setTranscript(data.error)
          } else {
            setTranscript(data.text)
            setStatus('done')
            await fetchTokens(data.text, lang)
          }
        } catch {
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

  // ── Upload audio file ─────────────────────────────────────────────────────
  async function handleFileUpload(file) {
    if (!file) return
    setSelectedFile(file)
    setFileStatus('uploading')
    setTranscript('')
    setTokens([])
    setPlaying(false)

    const formData = new FormData()
    formData.append('audio', file, file.name)
    formData.append('language', lang)

    try {
      const res  = await fetch(`${API}/transcribe`, { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) {
        setFileStatus('error')
        setTranscript(data.error)
      } else {
        setTranscript(data.text)
        setFileStatus('done')
        setStatus('done')
        await fetchTokens(data.text, lang)
      }
    } catch {
      setFileStatus('error')
      setTranscript('Could not reach backend.')
    }
  }

  function handleFileDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function clearFile() {
    setSelectedFile(null)
    setFileStatus('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Fetch landmarks for each letter ──────────────────────────────────────
  async function fetchTokens(text, language) {
    // For Arabic, keep characters as-is (toUpperCase corrupts Arabic glyphs)
    // For English, uppercase and keep only A-Z letters and spaces
    const chars = language === 'ar'
      ? text.split('').filter(c => /[\u0600-\u06FF ]/.test(c))
      : text.toUpperCase().split('').filter(c => /[A-Z ]/.test(c))

    const results = []
    for (const ch of chars) {
      if (ch === ' ') { results.push({ char: 'SPACE', landmarks: [] }); continue }
      try {
        const res  = await fetch(`${API}/landmarks/${language}/${encodeURIComponent(ch)}`)
        const data = await res.json()
        results.push({ char: ch, landmarks: data.found ? data.landmarks : [] })
      } catch {
        results.push({ char: ch, landmarks: [] })
      }
    }

    setTokens(results)
    setCurrent(0)
    setPlaying(false)
  }

  // ── Manual text submit ────────────────────────────────────────────────────
  async function handleManual() {
    if (!manualText.trim()) return
    setTranscript(manualText.trim())
    setStatus('done')
    await fetchTokens(manualText.trim(), lang)
  }

  // ── Language change ───────────────────────────────────────────────────────
  function handleLangChange(l) {
    setLang(l)
    setTokens([])
    setTranscript('')
    setPlaying(false)
    clearFile()
  }

  const currentToken = tokens[current]

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <button className="btn btn-ghost" onClick={() => nav('/')}>{t.back}</button>
        <h1 className={styles.title}>{t.sts_title}</h1>
        <LangToggle lang={lang} onChange={handleLangChange} />
      </div>

      {/* Record button */}
      <div className={styles.recordSection}>
        <button
          className={`${styles.recordBtn} ${recording ? styles.recordBtnActive : ''}`}
          onClick={toggleRecording}
        >
          {recording ? t.stopRec : t.startRec}
        </button>

        {status === 'recording' && (
          <div className={styles.pulse}>{t.recording}</div>
        )}
        {status === 'transcribing' && (
          <div className={styles.pulse}>{t.transcribing}</div>
        )}
        {status === 'done' && transcript && fileStatus === '' && (
          <div className={styles.transcript}>✅ {transcript}</div>
        )}
        {status === 'error' && fileStatus === '' && (
          <div className={styles.transcriptError}>⚠️ {transcript}</div>
        )}
      </div>

      {/* ── File Upload Section ── */}
      <div className={styles.uploadSection}>
        <span className={styles.manualLabel}>{t.uploadLabel}</span>

        <div
          className={`${styles.dropZone} ${fileStatus === 'uploading' ? styles.dropZoneActive : ''}`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_AUDIO}
            style={{ display: 'none' }}
            onChange={e => handleFileUpload(e.target.files[0])}
          />

          {!selectedFile ? (
            <>
              <span className={styles.uploadIcon}>📂</span>
              <span className={styles.uploadHint}>
                {t.dragDrop}
              </span>
            </>
          ) : (
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>🎵 {selectedFile.name}</span>

              {fileStatus === 'uploading' && (
                <span className={styles.pulse}>{t.transcribing}</span>
              )}
              {fileStatus === 'done' && (
                <span className={styles.transcript}>✅ {transcript}</span>
              )}
              {fileStatus === 'error' && (
                <span className={styles.transcriptError}>⚠️ {transcript}</span>
              )}

              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={e => { e.stopPropagation(); clearFile(); setTokens([]); setTranscript('') }}
              >
                ✕ {t.clear}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual override */}
      <div className={styles.manualRow}>
        <span className={styles.manualLabel}>{t.manualLabel}</span>
        <div className={styles.manualInputRow}>
          <input
            className={styles.input}
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManual()}
            placeholder={t.manualPlaceholder}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          />
          <button className="btn btn-primary" onClick={handleManual}>{t.showSigns}</button>
          {manualText && (
            <button className="btn btn-ghost" onClick={() => { setManualText(''); setTokens([]); setTranscript('') }}>{t.clear}</button>
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
                  <div className={styles.noData}>{t.noData}</div>
                )}
              </motion.div>
            </AnimatePresence>
            <div className={styles.progress}>{current + 1} / {tokens.length}</div>
          </div>

          {/* Playback controls — matching TextToSign */}
          <div className={styles.controls}>
            <button
              className="btn btn-ghost"
              onClick={() => { setCurrent(c => Math.max(0, c - 1)); setPlaying(false) }}
              disabled={current === 0}
            >
              {t.prev}
            </button>
            <button
              className={`btn ${playing ? 'btn-ghost' : 'btn-primary'}`}
              onClick={() => {
                if (current >= tokens.length - 1) setCurrent(0)
                setPlaying(p => !p)
              }}
            >
              {playing ? t.pause : t.autoplay}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setCurrent(c => Math.min(tokens.length - 1, c + 1)); setPlaying(false) }}
              disabled={current === tokens.length - 1}
            >
              {t.next}
            </button>
          </div>

          {/* Letter strip */}
          <div className={styles.strip}>
            {tokens.map((t, i) => (
              <button
                key={i}
                className={`${styles.stripTile} ${i === current ? styles.stripActive : ''} ${!t.landmarks.length && t.char !== 'SPACE' ? styles.stripMissing : ''}`}
                onClick={() => { setCurrent(i); setPlaying(false) }}
              >
                {t.char === 'SPACE' ? '·' : t.char}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {tokens.length === 0 && status !== 'recording' && status !== 'transcribing' && fileStatus !== 'uploading' && (
        <div className={styles.empty}>
          <span>🎤️</span>
          <p>{t.stsEmpty}</p>
        </div>
      )}
    </div>
  )
}

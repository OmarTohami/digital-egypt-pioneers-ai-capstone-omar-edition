import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import styles from './Home.module.css'

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

export default function Home() {
  const nav = useNavigate()
  return (
    <div className={styles.root}>
      <div className={styles.glow} />
      <motion.div
        className={styles.hero}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        initial="hidden" animate="show"
      >
        <motion.div className={styles.badge} variants={fade}>
          🤟 Sign Language Bridge
        </motion.div>
        <motion.h1 className={styles.title} variants={fade}>
          Sawa
        </motion.h1>
        <motion.p className={styles.sub} variants={fade}>
          Bridging communication through sign language —<br />
          supporting both Arabic and English alphabets.
        </motion.p>
        <motion.div className={styles.cards} variants={fade}>
          {/* Sign to Text */}
          <button className={styles.card} onClick={() => nav('/sign-to-text')}>
            <div className={styles.cardIcon}><CameraIcon /></div>
            <div className={styles.cardBody}>
              <h2>Sign to Text</h2>
              <p>Show a hand sign on camera — the app reads it and builds words in real time.</p>
            </div>
            <div className={styles.cardArrow}>→</div>
          </button>

          {/* Text to Sign */}
          <button className={styles.card} onClick={() => nav('/text-to-sign')}>
            <div className={styles.cardIcon}><KeyboardIcon /></div>
            <div className={styles.cardBody}>
              <h2>Text to Sign</h2>
              <p>Type any word and watch an animated hand skeleton show each letter's sign.</p>
            </div>
            <div className={styles.cardArrow}>→</div>
          </button>

          {/* Speech to Sign */}
          <button className={styles.card} onClick={() => nav('/speech-to-sign')}>
            <div className={styles.cardIcon}><MicIcon /></div>
            <div className={styles.cardBody}>
              <h2>Speech to Sign</h2>
              <p>Speak a word and the app transcribes it, then shows you each letter's sign.</p>
            </div>
            <div className={styles.cardArrow}>→</div>
          </button>
        </motion.div>

        <motion.p className={styles.foot} variants={fade}>
          Arabic · English · Real-time · Privacy-first
        </motion.p>
      </motion.div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

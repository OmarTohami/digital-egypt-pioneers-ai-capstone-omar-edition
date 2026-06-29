import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import styles from './Home.module.css'

const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }

export default function Home() {
  const nav = useNavigate()
  const { uiLang, setUiLang, t } = useApp()

  return (
    <div className={styles.root}>
      {/* Language toggle — top right */}
      <div className={styles.langBar}>
        <button
          className={`${styles.langBtn} ${uiLang === 'en' ? styles.langBtnActive : ''}`}
          onClick={() => setUiLang('en')}
        >
          🇺🇸 English
        </button>
        <button
          className={`${styles.langBtn} ${uiLang === 'ar' ? styles.langBtnActive : ''}`}
          onClick={() => setUiLang('ar')}
        >
          🇸🇦 العربية
        </button>
      </div>

      <div className={styles.glow} />

      <motion.div
        className={styles.hero}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        initial="hidden" animate="show"
      >
        <motion.div className={styles.badge} variants={fade}>
          {t.badge}
        </motion.div>

        <motion.h1 className={styles.title} variants={fade}>
          {t.homeTitle}
        </motion.h1>

        <motion.p className={styles.sub} variants={fade}>
          {t.homeSub.split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </motion.p>

        <motion.div className={styles.cards} variants={fade}>
          {/* Sign to Text */}
          <button className={styles.card} onClick={() => nav('/sign-to-text')}>
            <div className={styles.cardIcon}><CameraIcon /></div>
            <div className={styles.cardBody}>
              <h2>{t.card_s2t_title}</h2>
              <p>{t.card_s2t_desc}</p>
            </div>
            <div className={styles.cardArrow}>{uiLang === 'ar' ? '←' : '→'}</div>
          </button>

          {/* Speech to Sign */}
          <button className={styles.card} onClick={() => nav('/speech-to-sign')}>
            <div className={styles.cardIcon}><MicIcon /></div>
            <div className={styles.cardBody}>
              <h2>{t.card_sts_title}</h2>
              <p>{t.card_sts_desc}</p>
            </div>
            <div className={styles.cardArrow}>{uiLang === 'ar' ? '←' : '→'}</div>
          </button>
        </motion.div>

        <motion.p className={styles.foot} variants={fade}>
          {t.foot}
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

function MicIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

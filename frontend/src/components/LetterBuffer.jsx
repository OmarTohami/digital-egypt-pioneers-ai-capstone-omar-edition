import { motion, AnimatePresence } from 'framer-motion'
import styles from './LetterBuffer.module.css'

export default function LetterBuffer({ text, streakLetter, streakPct }) {
  const chars = text.split('')

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>Building word</div>

      {/* Word display */}
      <div className={styles.word}>
        {text
          ? text.replace(/ /g, '·')
          : <span className={styles.placeholder}>Show a sign to start…</span>
        }
      </div>

      {/* Letter tiles */}
      {chars.length > 0 && (
        <div className={styles.tiles}>
          <AnimatePresence initial={false}>
            {chars.map((ch, i) => (
              <motion.div
                key={i}
                className={`${styles.tile} ${ch === ' ' ? styles.space : ''}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                {ch === ' ' ? 'SPC' : ch}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Hold progress bar */}
      <div className={styles.holdWrap}>
        <div className={styles.holdLabel}>
          {streakLetter
            ? <>Holding <strong>{streakLetter}</strong></>
            : 'No sign detected'}
        </div>
        <div className={styles.holdTrack}>
          <motion.div
            className={styles.holdFill}
            animate={{ width: `${streakPct}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
      </div>
    </div>
  )
}

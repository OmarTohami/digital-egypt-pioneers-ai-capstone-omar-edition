import styles from './LangToggle.module.css'

export default function LangToggle({ lang, onChange }) {
  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${lang === 'en' ? styles.active : ''}`}
        onClick={() => onChange('en')}
      >
        🇺🇸 English
      </button>
      <button
        className={`${styles.btn} ${lang === 'ar' ? styles.active : ''}`}
        onClick={() => onChange('ar')}
      >
        🇸🇦 Arabic
      </button>
    </div>
  )
}

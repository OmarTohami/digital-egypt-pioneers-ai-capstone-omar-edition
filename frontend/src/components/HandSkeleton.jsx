import { useEffect, useRef } from 'react'
import styles from './HandSkeleton.module.css'

// MediaPipe hand connection pairs (landmark index pairs)
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],         // thumb
  [0,5],[5,6],[6,7],[7,8],         // index
  [0,9],[9,10],[10,11],[11,12],    // middle
  [0,13],[13,14],[14,15],[15,16],  // ring
  [0,17],[17,18],[18,19],[19,20],  // pinky
  [5,9],[9,13],[13,17],            // palm
]

// Fingertip indices
const TIPS = [4, 8, 12, 16, 20]

/**
 * landmarks: flat array of 63 floats [x0,y0,z0, x1,y1,z1, ...]
 *            normalized (centered on wrist, scale-invariant)
 * animated:  if true, draw with a breathing glow effect
 */
export default function HandSkeleton({ landmarks, animated = true, size = 280 }) {
  const canvasRef = useRef(null)
  const frameRef  = useRef(null)
  const phaseRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = size
    canvas.height = size

    if (!landmarks || landmarks.length < 63) {
      ctx.clearRect(0, 0, size, size)
      return
    }

    // Parse into 21 {x, y} points
    // The stored landmarks are centered on wrist — we need to re-project to canvas
    const pts3d = []
    for (let i = 0; i < 21; i++) {
      pts3d.push({
        x: landmarks[i * 3],
        y: landmarks[i * 3 + 1],
        z: landmarks[i * 3 + 2],
      })
    }

    // Find bounding box for the xy plane then map to canvas with padding
    const xs     = pts3d.map(p => p.x)
    const ys     = pts3d.map(p => p.y)
    const minX   = Math.min(...xs), maxX = Math.max(...xs)
    const minY   = Math.min(...ys), maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const range  = Math.max(rangeX, rangeY)
    const pad    = size * 0.18

    function project(p) {
      return {
        x: pad + ((p.x - minX) / range) * (size - pad * 2),
        y: pad + ((p.y - minY) / range) * (size - pad * 2),
      }
    }

    const pts2d = pts3d.map(project)

    function draw(phase) {
      ctx.clearRect(0, 0, size, size)

      // Subtle background circle
      const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
      grd.addColorStop(0, 'rgba(124,58,237,0.06)')
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, size, size)

      const glow = animated ? 0.7 + 0.3 * Math.sin(phase) : 1

      // Draw connections
      CONNECTIONS.forEach(([a, b]) => {
        const pa = pts2d[a], pb = pts2d[b]
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.strokeStyle = `rgba(124,58,237,${0.45 * glow})`
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.stroke()
      })

      // Draw joints
      pts2d.forEach((p, i) => {
        const isTip = TIPS.includes(i)
        const r     = isTip ? 6 : (i === 0 ? 7 : 4)

        // Outer glow for tips
        if (isTip && animated) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, r + 4 + 2 * Math.sin(phase), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(167,139,250,${0.15 * glow})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = isTip
          ? `rgba(196,181,253,${glow})`
          : i === 0
            ? `rgba(124,58,237,${glow})`
            : `rgba(139,92,246,${glow})`
        ctx.fill()
      })
    }

    if (animated) {
      const animate = () => {
        phaseRef.current += 0.06
        draw(phaseRef.current)
        frameRef.current = requestAnimationFrame(animate)
      }
      frameRef.current = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(frameRef.current)
    } else {
      draw(0)
    }
  }, [landmarks, size, animated])

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {(!landmarks || landmarks.length < 63) && (
        <div className={styles.empty}>
          <span>✋</span>
          <p>No sign data</p>
        </div>
      )}
    </div>
  )
}

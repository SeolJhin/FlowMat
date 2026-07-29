import { useEffect, useRef } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  ox: number
  oy: number
}

interface Edge {
  a: number
  b: number
  pulse: number
}

const NODE_COUNT = 28
const REACT_RADIUS = 150
const VIOLET = '160,107,255'
const CYAN = '63,212,200'

/**
 * Decorative, mouse-reactive node/edge canvas used behind the login screen.
 * Purely visual — no relation to any workflow data. Nodes drift slowly,
 * connect to nearby nodes with a travelling pulse, and gently scatter away
 * from the cursor; the cursor itself also links to its nearest neighbors.
 */
export function FlowCanvasBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    let animationFrame = 0
    let nodes: Node[] = []

    function resize() {
      const prevWidth = width
      const prevHeight = height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Rescale existing node positions so they keep the same *relative*
      // spot on screen instead of holding their old absolute pixel
      // position — otherwise shrinking/growing the window makes nodes
      // clip off-screen or bunch up in a way that reads as "jumping".
      if (prevWidth > 0 && prevHeight > 0 && nodes.length > 0) {
        const scaleX = width / prevWidth
        const scaleY = height / prevHeight
        for (const n of nodes) {
          n.x *= scaleX
          n.y *= scaleY
        }
      }
    }
    resize()
    window.addEventListener('resize', resize)

    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.045,
      vy: (Math.random() - 0.5) * 0.045,
      r: 2.4 + Math.random() * 1.6,
      ox: 0,
      oy: 0,
    }))

    const edges: Edge[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
        if (d < 260 && Math.random() < 0.35) edges.push({ a: i, b: j, pulse: Math.random() })
      }
    }

    const mouse = { x: -9999, y: -9999, active: false }
    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.active = true
    }
    function onMouseLeave() {
      mouse.active = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseleave', onMouseLeave)

    function step() {
      ctx!.clearRect(0, 0, width, height)

      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1

        let targetOx = 0
        let targetOy = 0
        if (mouse.active) {
          const dx = n.x - mouse.x
          const dy = n.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < REACT_RADIUS && d > 0.01) {
            const push = (1 - d / REACT_RADIUS) * 34
            targetOx = (dx / d) * push
            targetOy = (dy / d) * push
          }
        }
        n.ox += (targetOx - n.ox) * 0.12
        n.oy += (targetOy - n.oy) * 0.12
      }

      for (const e of edges) {
        const a = nodes[e.a]
        const b = nodes[e.b]
        const ax = a.x + a.ox
        const ay = a.y + a.oy
        const bx = b.x + b.ox
        const by = b.y + b.oy
        const d = Math.hypot(ax - bx, ay - by)
        if (d > 320) continue

        const alpha = Math.max(0, 1 - d / 320) * 0.34
        ctx!.strokeStyle = `rgba(${VIOLET},${alpha})`
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.moveTo(ax, ay)
        ctx!.lineTo(bx, by)
        ctx!.stroke()

        e.pulse += 0.0018
        if (e.pulse > 1) e.pulse -= 1
        const px = ax + (bx - ax) * e.pulse
        const py = ay + (by - ay) * e.pulse
        ctx!.beginPath()
        ctx!.arc(px, py, 1.6, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${CYAN},${alpha * 3.6 + 0.25})`
        ctx!.fill()
      }

      if (mouse.active) {
        const near = nodes
          .map((n) => ({ n, d: Math.hypot(n.x + n.ox - mouse.x, n.y + n.oy - mouse.y) }))
          .filter((o) => o.d < 260)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)

        for (const o of near) {
          const alpha = Math.max(0, 1 - o.d / 260) * 0.7
          ctx!.strokeStyle = `rgba(${CYAN},${alpha})`
          ctx!.lineWidth = 1.1
          ctx!.beginPath()
          ctx!.moveTo(mouse.x, mouse.y)
          ctx!.lineTo(o.n.x + o.n.ox, o.n.y + o.n.oy)
          ctx!.stroke()
        }

        const glow = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90)
        glow.addColorStop(0, `rgba(${VIOLET},0.16)`)
        glow.addColorStop(1, `rgba(${VIOLET},0)`)
        ctx!.fillStyle = glow
        ctx!.beginPath()
        ctx!.arc(mouse.x, mouse.y, 90, 0, Math.PI * 2)
        ctx!.fill()
      }

      for (const n of nodes) {
        const nx = n.x + n.ox
        const ny = n.y + n.oy
        ctx!.beginPath()
        ctx!.arc(nx, ny, n.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${VIOLET},0.75)`
        ctx!.fill()
        ctx!.beginPath()
        ctx!.arc(nx, ny, n.r + 3, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(${VIOLET},0.3)`
        ctx!.stroke()
      }

      animationFrame = requestAnimationFrame(step)
    }
    animationFrame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
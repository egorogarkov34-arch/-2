import { useEffect, useRef, useState } from 'react'

/** Native-feeling pull-to-refresh that avoids intercepting normal vertical scrolling. */
export function usePullToRefresh(onRefresh: () => void, threshold = 76) {
  const ref = useRef<HTMLElement>(null)
  const startY = useRef<number | null>(null)
  const distanceRef = useRef(0)
  const frameRef = useRef<number | null>(null)
  const queuedDistanceRef = useRef(0)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const onPointerDown = (event: PointerEvent) => { if (window.scrollY <= 0 && !refreshing) startY.current = event.clientY }
    const publishDistance = (nextDistance: number) => {
      queuedDistanceRef.current = nextDistance
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null
        setDistance(queuedDistanceRef.current)
      })
    }
    const resetDistance = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      queuedDistanceRef.current = 0
      setDistance(0)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (startY.current === null) return
      const next = Math.max(0, event.clientY - startY.current)
      const limitedDistance = Math.min(next * 0.48, threshold + 18)
      distanceRef.current = limitedDistance
      publishDistance(limitedDistance)
    }
    const onPointerUp = () => {
      const shouldRefresh = distanceRef.current >= threshold
      startY.current = null
      distanceRef.current = 0
      resetDistance()
      if (!shouldRefresh) return
      setRefreshing(true)
      onRefresh()
      window.setTimeout(() => setRefreshing(false), 620)
    }
    element.addEventListener('pointerdown', onPointerDown, { passive: true })
    element.addEventListener('pointermove', onPointerMove, { passive: true })
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [onRefresh, refreshing, threshold])

  return { ref, pullDistance: distance, isRefreshing: refreshing }
}

import type { LucideIcon } from 'lucide-react'

export function IconCircle({ icon: Icon, className = '' }: { icon: LucideIcon; className?: string }) {
  return <span className={`icon-circle ${className}`}><Icon size={19} strokeWidth={1.8} /></span>
}

/** MYKOSPHARE mark: a spore with branching hyphae. Pure SVG, inherits currentColor. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M16 11.6V6.2" />
        <path d="M16 6.2l-3.2-2.6M16 6.2l3.2-2.6" />
        <path d="M19.7 18.2l4.6 2.7" />
        <path d="M24.3 20.9l.8 3.9M24.3 20.9l3.5.9" />
        <path d="M12.3 18.2l-4.6 2.7" />
        <path d="M7.7 20.9l-.8 3.9M7.7 20.9l-3.5.9" />
      </g>
    </svg>
  )
}

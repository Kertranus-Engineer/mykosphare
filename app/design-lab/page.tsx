import Link from "next/link"

const EXPERIMENTS = [
  { href: "/home", title: "HOME (oficial)", note: "La experiencia móvil actual: Inicio, Cultivo, Ambiente, Historial y Más." },
  { href: "/home-v1", title: "HOME anterior", note: "La versión previa, conservada como respaldo." },
]

export default function DesignLabIndex() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Laboratorio de diseño</h1>
      <p style={{ opacity: 0.7, marginBottom: 24, lineHeight: 1.5 }}>
        Espacio para prototipos aislados de HOME y del dashboard avanzado. Hoy no hay experimentos abiertos: HOME V2 ya es el HOME oficial.
      </p>
      <ul style={{ display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
        {EXPERIMENTS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} style={{ display: "block", padding: 16, borderRadius: 16, border: "1px solid currentColor", borderColor: "color-mix(in oklab, currentColor 20%, transparent)" }}>
              <strong>{item.title}</strong>
              <span style={{ display: "block", opacity: 0.7, fontSize: 14, marginTop: 4 }}>{item.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

import Link from "next/link"

const EXPERIMENTS = [
  { href: "/design-lab/home-v2", title: "HOME V2 · Inicio", note: "Cultivo, resumen del ambiente y estado del dispositivo." },
  { href: "/design-lab/home-v2/cultivo", title: "HOME V2 · Cultivo", note: "Fotografías, etapas y bitácora de un cultivo." },
  { href: "/design-lab/home-v2/ambiente", title: "HOME V2 · Ambiente", note: "Lecturas, tendencia de la sesión, actuadores y alertas." },
  { href: "/design-lab/home-v2/historial", title: "HOME V2 · Historial", note: "Actividad, gráficos y fotografías." },
  { href: "/design-lab/home-v2/mas", title: "HOME V2 · Más", note: "Tema, modo demostración y otras vistas." },
]

export default function DesignLabIndex() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px", fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Laboratorio de diseño</h1>
      <p style={{ opacity: 0.7, marginBottom: 24, lineHeight: 1.5 }}>
        Prototipos aislados de HOME actual y del dashboard avanzado. Solo lectura: no controlan actuadores ni modifican datos.
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

"use client"
import Link from "next/link"
import { useHomeV2 } from "../data/home-v2-provider"
import { Card } from "../components/ui/surface"
import { DeviceDetails } from "../components/ambiente/device-sections"

export function ConnectScreen() {
  const { cloudStatus, retrySensors } = useHomeV2()
  return <div className="hv2-stack">
    <header className="hv2-page-head"><h1 className="hv2-page-title">Tu dispositivo</h1><p className="hv2-page-lead">Sigue sus lecturas desde cualquier teléfono con tu cuenta.</p></header>
    {cloudStatus === "unauthorized" ? <Card><p>Inicia sesión para ver el ESP32 asociado a tu cuenta.</p><Link className="hv2-button hv2-button--primary" href="/auth/login?next=%2Fhome%2Fconectar%3Fview%3Dreal">Iniciar sesión</Link></Card> : null}
    {cloudStatus === "unconfigured" ? <Card><p>Tu cuenta todavía no tiene una cámara registrada. El alta se realizará durante la instalación de tu dispositivo.</p></Card> : null}
    {cloudStatus === "not_found" ? <Card><p>Esta cámara no está disponible para tu cuenta.</p></Card> : null}
    {cloudStatus === "unavailable" || cloudStatus === "network_error" ? <Card><p role="alert">No puedo consultar tu dispositivo en este momento.</p></Card> : null}
    <DeviceDetails />
    <Card><p>{cloudStatus === "ready"
      ? "Tu ESP32 está enviando lecturas reales de temperatura y humedad. Las verás en Inicio y en Ambiente."
      : "Conecta el ESP32 a su alimentación y a Wi-Fi. Aquí aparecerá su primera lectura cuando termine la instalación."}</p><p className="hv2-caption">Esta pantalla solo muestra información. No activa ventiladores, humidificador ni calefactor.</p><button type="button" className="hv2-button" onClick={() => { void retrySensors() }}>Actualizar</button></Card>
    <Link href="/home?view=real" className="hv2-button hv2-button--primary">Volver a Inicio</Link>
    <Link href="/home?mode=simulation&amp;scenario=stable" className="hv2-button">Ver demostración</Link>
  </div>
}

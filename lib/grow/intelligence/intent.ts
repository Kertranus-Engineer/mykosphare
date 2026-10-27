import { interpretTargetRequest } from "../control/request"

/**
 * Free-text intent matching in Spanish, by deterministic keyword rules. No model involved: cheap, predictable,
 * and honest about what it did not understand (`unknown`), which is when a configured model may take over.
 */
export type Intent =
  | "status" | "why_humidity" | "why_temperature" | "overnight" | "what_to_check" | "improve" | "device_connected"
  | "uptime" | "trend" | "since_yesterday" | "set_targets" | "targets_now" | "actuator_log" | "automatic_status" | "species" | "needs" | "start_crop" | "greeting" | "unknown"

export function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim()
}

const has = (t: string, re: RegExp) => re.test(t)

export function classifyIntent(raw: string): Intent {
  const t = normalizeText(raw)
  if (!t) return "unknown"
  // A sentence that asks for specific numbers is a change request, whatever else it mentions.
  if (interpretTargetRequest(raw) !== null) return "set_targets"
  if (has(t, /\bautomatic\w*\b/) && has(t, /\b(funcion\w*|esta|modo|activ\w*)\b/)) return "automatic_status"
  if (has(t, /\b(ventilador\w*|humidificador\w*|extractor\w*|actuador\w*|calefactor\w*|rele\w*)\b/) && has(t, /\b(hizo|hace|hicieron|encendio|apago|funciono|activo|registro|actuo)\b/)) return "actuator_log"
  if (has(t, /\b(condiciones|objetivo\w*|parametros)\b/) && has(t, /\b(mantener|intentando|intentamos|vigente\w*|actual\w*|tenemos|configurad\w*|buscamos|queremos)\b/)) return "targets_now"
  if (has(t, /\b(quiero|voy a|vamos a|puedo|ayudame a|empezar|comenzar|iniciar|registrar|armar)\b.*\b(cultiv|hongo|seta|sembrar)/) || has(t, /nuevo cultivo/)) {
    if (!has(t, /\b(especie|recomiend|sugier|aconsej|cual)\b/)) return "start_crop"
  }
  if (has(t, /\b(especie|hongo|cultivo|cultivar)\b/) && has(t, /\b(recomiend|recomienda|sugier|aconsej|conviene|elegir)\b/)) return "species"
  if (has(t, /\bque especie\b/) || has(t, /\bque (puedo|debo|deberia) cultivar\b/)) return "species"
  if (has(t, /\b(necesit|falta|requier)\w*\b.*\b(de mi|de ti|funcionar|mejor)\b/) || has(t, /\bque (te )?falta\b/) || has(t, /\bpara funcionar mejor\b/)) return "needs"
  if (has(t, /\b(cuanto|cuantas)\b.*\b(tiempo|horas|minutos)\b/) || has(t, /\b(lleva|llevas|llevan)\b.*\bconectad/) || has(t, /\bdesde cuando\b/)) return "uptime"
  if (has(t, /\b(noche|anoche|madrugada|durmiendo)\b/)) return "overnight"
  if (has(t, /\b(ayer)\b/) || has(t, /\bha cambiado\b/) || has(t, /\bque cambio\b/)) return "since_yesterday"
  if (has(t, /\b(por que|porque|motivo|causa|razon)\b/) && has(t, /\b(humedad|seco|seca|humedo)\b/)) return "why_humidity"
  if (has(t, /\b(por que|porque|motivo|causa|razon)\b/) && has(t, /\b(temperatura|calor|frio|caliente|helado)\b/)) return "why_temperature"
  if (has(t, /\bhumedad\b.*\b(baj|cay|descend|subi|sub[ei]|aument)/)) return "why_humidity"
  if (has(t, /\btemperatura\b.*\b(baj|cay|descend|subi|sub[ei]|aument)/)) return "why_temperature"
  if (has(t, /\btendencia\b/) || (has(t, /\b(sube|subiendo|baja|bajando|aumentando|descendiendo|estable|estabilidad|se mantiene|variando)\b/) && has(t, /\b(temperatura|humedad|camara|todo|ambiente|esta|estan|se)\b/))) return "trend"
  if (has(t, /\b(mejorar|mejorarias|optimizar|perfeccionar|estabilizar|cambiarias|cambiaria)\b/)) return "improve"
  if (has(t, /\b(conectad[a-z]*|desconectad[a-z]*|conexion|online|offline|senal|wifi|wi fi)\b/)) return "device_connected"
  if (has(t, /\b(cambiar|revisar|atencion|alerta|problema|deberia|debo|hago|hacer|urgente)\b/) || has(t, /\bpasa algo\b/)) return "what_to_check"
  if (has(t, /\b(como (esta|va|anda|se ve)|estado|resumen|todo bien|que tal|situacion)\b/)) return "status"
  if (has(t, /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|ey)\b/)) return "greeting"
  return "unknown"
}

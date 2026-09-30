/**
 * Grower Mode copy (Spanish). Single source of user-facing strings so a future
 * i18n layer can swap this object. No thresholds or sensor logic belong here.
 */
export const GROW_COPY = {
  brand: "MYKOSPHARE",

  nav: {
    home: "Inicio",
    cultivation: "Cultivo",
    myko: "MYKO",
    menu: "Menú",
    face: "Pantalla ambiental",
    engineering: "Modo ingeniería",
    demoScenarios: "Escenarios de demostración",
    primary: "Navegación principal",
  },

  source: {
    real: "Real",
    simulated: "Simulación",
    realDescription: "Datos medidos por la cámara de cultivo.",
    simulatedDescription: "Datos simulados. No provienen de la cámara de cultivo.",
    simulatedReadingsInRealMode: "Esta cámara está enviando lecturas simuladas.",
  },

  freshness: {
    live: "Ahora",
    stale: "Desactualizado",
    offline: "Sin conexión",
    unknown: "Sin lecturas",
  },

  time: {
    justNow: "hace un momento",
    minutes: (n: number) => (n === 1 ? "hace 1 minuto" : `hace ${n} minutos`),
    hours: (n: number) => (n === 1 ? "hace 1 hora" : `hace ${n} horas`),
    days: (n: number) => (n === 1 ? "hace 1 día" : `hace ${n} días`),
    lastReading: (ago: string) => `Última lectura ${ago}`,
    noReading: "Sin lecturas recibidas",
    yesterday: "ayer",
  },

  status: {
    healthy: { title: "Todo bien", body: "Tu cultivo se mantiene estable." },
    humidityLow: { title: "Necesita humedad", body: "La humedad está por debajo de su rango." },
    humidityHigh: { title: "Necesita ventilación", body: "La humedad está por encima de su rango." },
    temperatureLow: { title: "Hace frío", body: "La temperatura está por debajo de su rango." },
    temperatureHigh: { title: "Hace calor", body: "La temperatura está por encima de su rango." },
    temperatureOut: { title: "Revisa la temperatura", body: "La temperatura está fuera de su rango." },
    critical: { title: "Necesita atención ahora", body: "Las condiciones están muy lejos de su rango." },
    criticalHumidity: "La humedad está muy lejos de su rango.",
    criticalTemperature: "La temperatura está muy lejos de su rango.",
    criticalBoth: "La temperatura y la humedad están muy lejos de su rango.",
    offline: { title: "No puedo sentir la cámara de cultivo", body: "Lo último que sé puede no reflejar el cultivo ahora." },
    stale: { title: "Mi información está desactualizada", body: "Hace un rato que no recibo lecturas nuevas." },
    unknown: { title: "Todavía no tengo suficiente información", body: "Aún no recibo lecturas de la cámara." },
    unknownPartial: "Sólo recibo parte de las lecturas, así que no puedo confirmar el estado.",
    unknownProfile: "Esta etapa no tiene un rango de referencia para comparar.",
  },

  metrics: {
    temperature: "Temperatura",
    humidity: "Humedad",
    missing: "--",
    missingLabel: "Sin lectura",
    condition: {
      ok: "En rango",
      low: "Baja",
      high: "Alta",
      critical: "Muy fuera de rango",
      unknown: "Sin referencia",
    },
    lastKnown: "Último valor conocido",
    range: (min: string, max: string) => `Rango ${min} – ${max}`,
  },

  stages: {
    inoculation: "Inoculación",
    colonization: "Colonización",
    consolidation: "Consolidación",
    primordia: "Primordios",
    fruiting: "Fructificación",
    harvest: "Cosecha",
  },

  stage: {
    day: (n: number) => `Día ${n}`,
    journeyTitle: "Ciclo del cultivo",
    current: "Etapa actual",
    possibleChange: "Posible cambio de etapa",
    possibleChangeBody: (stage: string) =>
      `Por los días transcurridos podría estar entrando en ${stage}. La etapa sólo cambia cuando se confirma observando el cultivo.`,
    done: "Completada",
    upcoming: "Próxima",
    suggested: "Posible",
  },

  species: {
    /** Localized display names keyed by scientific name. Fallback: profile commonName. */
    names: {
      "Pleurotus ostreatus": "Ostra",
    } as Record<string, string>,
    sampleProfile: "Perfil de ejemplo",
    sampleProfileBody: "Los rangos de este perfil son de ejemplo y no están validados como guía de cultivo.",
  },

  needs: {
    title: "Qué necesita",
    none: "Nada por ahora.",
    unknown: "No puedo saberlo sin lecturas actuales.",
    humidity: { title: "Humedad", body: "La humedad está por debajo del rango de esta etapa.", hint: "Puedes revisar el agua y el funcionamiento del humidificador." },
    ventilation: { title: "Ventilación", body: "Hay más humedad o calor de lo esperado para esta etapa.", hint: "Puedes revisar que el aire circule dentro de la cámara." },
    temperatureLow: { title: "Temperatura", body: "Está por debajo del rango de esta etapa.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    temperatureHigh: { title: "Temperatura", body: "Está por encima del rango de esta etapa.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    temperatureOut: { title: "Temperatura", body: "Está fuera del rango de esta etapa.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    telemetryStale: { title: "Lecturas", body: "Las lecturas llegan con retraso.", hint: "Puedes revisar la conexión WiFi de la cámara." },
    telemetryOffline: { title: "Conexión", body: "La cámara de cultivo dejó de enviar lecturas.", hint: "Puedes revisar que la cámara tenga energía y WiFi." },
    telemetryUnknown: { title: "Lecturas", body: "Todavía no he recibido lecturas.", hint: "Puedes revisar que la cámara esté encendida y conectada." },
    profileMissing: { title: "Perfil de cultivo", body: "Falta un rango de referencia para esta etapa.", hint: "" },
    urgent: "Urgente",
  },

  timeline: {
    title: "Hoy",
    fullTitle: "Historial",
    empty: "Todavía no hay eventos registrados.",
    simulatedTag: "Simulación",
    events: {
      condition_stable: "Cultivo estable",
      metric_dropped: { temperature: "La temperatura bajó", humidity: "La humedad bajó" },
      metric_rose: { temperature: "La temperatura subió", humidity: "La humedad subió" },
      metric_recovered: { temperature: "La temperatura volvió a su rango", humidity: "La humedad volvió a su rango" },
      metric_missing: { temperature: "Dejé de recibir la temperatura", humidity: "Dejé de recibir la humedad" },
      reading_received: "Última lectura recibida",
      signal_lost: "Perdí la señal de la cámara",
    },
  },

  myko: {
    senseTitle: "Qué siento",
    knowTitle: "Qué sé",
    cannotTitle: "Qué no puedo observar todavía",
    honesty: "MYKO representa el estado medido por la cámara de cultivo. No es una inteligencia artificial y no interpreta imágenes.",
    notReceiving: "No estoy recibiendo esta lectura.",
    knowStage: (stage: string) => `El cultivo está en ${stage} (etapa confirmada).`,
    knowDay: (day: number) => `Lleva ${day} ${day === 1 ? "día" : "días"} desde que empezó.`,
    knowSample: "Comparo con un perfil de ejemplo, no validado.",
    senseLive: "Ahora",
    senseStale: "Última lectura",
    moods: {
      content: "tranquilo",
      concerned: "inquieto",
      distressed: "en alerta",
      uncertain: "sin información suficiente",
    },
    forms: {
      early: "forma temprana",
      emerging: "forma emergente",
      mature: "forma madura",
      complete: "forma culminada",
    },
    label: (form: string, mood: string) => `MYKO, ${form}, ${mood}`,
    tapHint: "Toca a MYKO para ver más",
  },

  capabilities: {
    co2: { title: "CO₂", body: "MYKOSPHARE todavía no tiene un sensor de CO₂ conectado." },
    visual: { title: "Crecimiento visual", body: "Todavía no analizo imágenes del cultivo." },
    contamination: { title: "Contaminación", body: "No puedo detectar contaminación; revisa el cultivo a simple vista." },
  },

  cultivation: {
    title: "Tu cultivo",
    now: "Cómo está ahora",
    see: "Ver cultivo",
    technical: "Ver datos",
    tech: {
      readingAt: "Lectura",
      source: "Fuente",
      device: "Dispositivo",
      freshness: "Frescura",
      data: "Datos",
      run: "Cultivo",
      profile: "Perfil",
      none: "—",
      dataStatus: { complete: "Completos", partial: "Parciales", insufficient: "Insuficientes" },
    },
  },

  dataNotice: {
    partial: "Faltan lecturas: el estado no se puede confirmar por completo.",
  },

  views: {
    loading: "Conectando con tu cultivo…",
    unconfigured: {
      title: "No hay una cámara de cultivo conectada",
      body: "Cuando conectes tu cámara MYKOSPHARE, aquí verás cómo está tu cultivo.",
      demo: "Ver demostración",
    },
    invalid: {
      title: "No reconozco esta dirección",
      body: "El modo solicitado no existe. No se muestra ningún dato.",
    },
    unauthorized: {
      title: "Inicia sesión para ver tu cultivo",
      body: "Tu cámara de cultivo es privada.",
      action: "Iniciar sesión",
    },
    notFound: {
      title: "No encuentro esta cámara de cultivo",
      body: "Puede que no exista o que no pertenezca a tu cuenta.",
    },
    noRun: {
      title: "No hay un cultivo activo",
      body: "La cámara está lista, pero todavía no empezó ningún cultivo.",
      action: "Preparar cultivo · próximamente",
    },
    profileMissing: {
      title: "Falta el perfil de la especie",
      body: "Sin un perfil no puedo saber qué condiciones necesita este cultivo.",
    },
    unavailable: {
      title: "El servidor de MYKOSPHARE no responde",
      body: "No es un problema de tu cultivo. Vuelve a intentarlo en un momento.",
    },
    network: {
      title: "No puedo conectarme a MYKOSPHARE",
      body: "Revisa la conexión a internet de este dispositivo.",
    },
    retry: "Reintentar",
    unknownScenario: (value: string) => `Escenario “${value}” no reconocido; se muestra “estable”.`,
    unknownStage: (value: string) => `Etapa “${value}” no reconocida; se usa la del ejemplo.`,
  },

  demo: {
    scenarios: {
      stable: "Estable",
      dry: "Seco",
      humid: "Húmedo",
      cold: "Frío",
      hot: "Calor",
      critical: "Crítico",
      partial: "Lectura parcial",
      stale: "Desactualizado",
      offline: "Sin conexión",
      "no-data": "Sin lecturas",
    },
  },

  face: {
    back: "Volver",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir de pantalla completa",
  },
} as const

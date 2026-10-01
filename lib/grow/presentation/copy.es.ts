/**
 * Grower Mode copy (Spanish). Single source of user-facing strings so a future
 * i18n layer can swap this object. No thresholds or sensor logic belong here.
 *
 * Status headlines use MYKO's first-person voice: fixed deterministic copy that
 * represents measured state. It is not generated text and implies no AI.
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
    healthy: { title: "Todo bien", body: "Mi ambiente se mantiene estable." },
    humidityLow: { title: "Necesito humedad", body: "Mi ambiente está más seco de lo esperado." },
    humidityHigh: { title: "Necesito ventilación", body: "Hay más humedad de la que necesito." },
    temperatureLow: { title: "Temperatura baja", body: "Mi ambiente está más frío de lo esperado." },
    temperatureHigh: { title: "Temperatura alta", body: "Mi ambiente está más cálido de lo esperado." },
    temperatureOut: { title: "Revisa la temperatura", body: "La temperatura está fuera de mi rango." },
    critical: { title: "Necesito atención ahora", body: "Las condiciones están muy lejos de mi rango." },
    criticalHumidity: "La humedad está muy lejos de mi rango.",
    criticalTemperature: "La temperatura está muy lejos de mi rango.",
    criticalBoth: "La temperatura y la humedad están muy lejos de mi rango.",
    offline: { title: "No puedo sentir el ambiente", body: "Lo último que sé puede no reflejar el cultivo ahora." },
    stale: { title: "Mis lecturas están atrasadas", body: "Hace un rato que no recibo lecturas nuevas." },
    unknown: { title: "Aún sin datos", body: "Todavía no recibo lecturas del ambiente." },
    unknownPartial: "Sólo recibo parte de mis lecturas, así que no puedo confirmar cómo estoy.",
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
    lastKnown: "Último valor",
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
    position: (index: number, total: number) => `Etapa ${index} de ${total}`,
    possibleChange: "Posible transición detectada",
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
    title: "Necesita",
    none: "Nada por ahora.",
    detected: (ago: string) => `Detectado ${ago}`,
    humidity: { title: "Humedad", body: "Está por debajo del rango esperado.", hint: "Puedes revisar el agua y el funcionamiento del humidificador." },
    ventilation: { title: "Ventilación", body: "Hay más humedad o calor de lo esperado.", hint: "Puedes revisar que el aire circule dentro de la cámara." },
    temperatureLow: { title: "Temperatura", body: "Está por debajo del rango esperado.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    temperatureHigh: { title: "Temperatura", body: "Está por encima del rango esperado.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    temperatureOut: { title: "Temperatura", body: "Está fuera del rango esperado.", hint: "Puedes revisar la temperatura del lugar donde está la cámara." },
    telemetryStale: { title: "Lecturas", body: "Las lecturas llegan con retraso.", hint: "Puedes revisar la conexión WiFi de la cámara." },
    telemetryOffline: { title: "Conexión", body: "La cámara de cultivo dejó de enviar lecturas.", hint: "Puedes revisar que la cámara tenga energía y WiFi." },
    telemetryUnknown: { title: "Lecturas", body: "Todavía no he recibido lecturas.", hint: "Puedes revisar que la cámara esté encendida y conectada." },
    profileMissing: { title: "Perfil de cultivo", body: "Falta un rango de referencia para esta etapa.", hint: "" },
    urgent: "Urgente",
  },

  timeline: {
    title: "Hoy",
    fullTitle: "Historia",
    empty: "Todavía no hay eventos registrados.",
    emptyToday: "Hoy no hay eventos registrados todavía.",
    simulatedTag: "Sim",
    simulatedLabel: "Evento simulado",
    events: {
      cultivation_started: "Comenzó el cultivo",
      stage_confirmed: (stage: string) => `Etapa confirmada: ${stage}`,
      capture_added: "Nueva observación visual",
      condition_stable: "Ambiente estable",
      metric_dropped: { temperature: "La temperatura bajó", humidity: "La humedad bajó" },
      metric_rose: { temperature: "La temperatura subió", humidity: "La humedad subió" },
      metric_recovered: { temperature: "Temperatura recuperada", humidity: "Humedad recuperada" },
      metric_missing: { temperature: "Dejé de recibir la temperatura", humidity: "Dejé de recibir la humedad" },
      reading_received: "Última lectura recibida",
      signal_lost: "Perdí la señal de la cámara",
    },
  },

  myko: {
    name: "MYKO",
    organismOf: (crop: string) => `Organismo digital de ${crop}`,
    statusLabel: "Estado",
    honesty: "MYKO representa lo que miden los sensores de la cámara. No es una inteligencia artificial y todavía no ve el cultivo.",
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
    formNames: {
      early: "Espora",
      emerging: "Brote",
      mature: "Madurez",
      complete: "Plenitud",
    },
    label: (form: string, mood: string) => `MYKO, ${form}, ${mood}`,
    tapHint: "Toca a MYKO",
  },

  senses: {
    title: "Mis sentidos",
    intro: "Cada sensor nuevo en la cámara es un sentido nuevo para MYKO.",
    feel: "Siento",
    see: "Veo",
    status: {
      connected: "Conectado",
      noReading: "Sin lectura",
      noSignal: "Sin señal",
      waiting: "Esperando lecturas",
      notInstalled: "Sin sensor",
      notAvailable: "No disponible",
    },
    items: {
      temperature: { name: "Temperatura", future: "" },
      humidity: { name: "Humedad", future: "" },
      co2: { name: "CO₂", future: "Con un sensor de CO₂ podré sentir el aire del cultivo." },
      vision: { name: "Visión", future: "Con una cámara podré ver cómo crece." },
      mass: { name: "Masa", future: "Con una celda de carga podré sentir cambios de peso." },
    },
  },

  development: {
    title: "Mi desarrollo",
    currentForm: "Forma actual",
    confirmedStage: "Etapa confirmada",
    day: "Día de cultivo",
    note: "Mi forma sigue la etapa confirmada del cultivo, no el ambiente.",
  },

  history: {
    title: "Mi historia",
    days: "Días de cultivo",
    events: "Eventos registrados",
    captures: "Capturas",
    simulated: "Incluye eventos simulados",
  },

  look: {
    title: "Última mirada",
    empty: "No hay observaciones visuales todavía.",
    simulated: "Imagen simulada",
  },

  moments: {
    cultivation_started: { title: "Comienza un cultivo", voice: "Comenzamos." },
    stage_confirmed: { title: "Nueva etapa", voice: "Estoy cambiando." },
    first_capture: { title: "Primera observación", voice: "Ya puedo ver." },
    environment_recovered: { title: "Ambiente recuperado", voice: "El ambiente volvió a estabilizarse." },
    harvest_confirmed: { title: "Cosecha", voice: "Llegamos a cosecha." },
  },

  cultivation: {
    title: "Tu cultivo",
    now: "Ahora",
    see: "Ver cultivo",
    technical: "Ver datos técnicos",
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
    close: "Cerrar",
    fullscreen: "Pantalla completa",
    exitFullscreen: "Salir de pantalla completa",
  },

  lab: {
    title: "MYKO · Visual Lab",
    banner: "VISUAL DEVELOPMENT · VISUAL FIXTURES — no son datos de cultivo ni simulación.",
    fixture: "Visual fixture",
  },
} as const

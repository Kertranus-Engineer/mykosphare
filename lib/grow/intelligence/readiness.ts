/**
 * What must be proven before ANY actuator is enabled. The list is data on purpose: the interface shows it, tests
 * guard it, and a gate only changes status when a person records the measured result, never automatically.
 * Today every gate is pending and ACTUATION_ENABLED is false.
 */
export type GateCategory = "electrica" | "funcional" | "operacion"
export interface ReadinessGate {
  id: string
  category: GateCategory
  title: string
  /** How to test it. */
  test: string
  /** What counts as passing. */
  pass: string
  status: "pending"
}

export const ACTUATOR_READINESS: readonly ReadinessGate[] = [
  { id: "separate_power", category: "electrica", title: "Alimentación separada y aislada", test: "Fuente propia para cargas, aislada del ESP32 (relé con optoacoplador o SSR aislado). Conmuta cada carga 50 veces.", pass: "El ESP32 no se reinicia ni el DHT22 entrega lecturas inválidas en ninguna conmutación.", status: "pending" },
  { id: "protection_sizing", category: "electrica", title: "Fusible y cable dimensionados", test: "Calcula la corriente de cada carga; fusible/protección por rama y cable según esa corriente (con margen de al menos 25 %).", pass: "Cada rama tiene protección propia y ningún cable se calienta con la carga encendida.", status: "pending" },
  { id: "rcd_earth", category: "electrica", title: "Diferencial y tierra", test: "Alimentación detrás de un diferencial (RCD/GFCI) y tierra continua; mide la continuidad de tierra y prueba el botón del diferencial.", pass: "El diferencial dispara en la prueba y la continuidad de tierra es menor que 0,5 Ω.", status: "pending" },
  { id: "humid_zone", category: "electrica", title: "Zona húmeda separada de la electrónica", test: "Electrónica y conexiones fuera de la humedad y de las salpicaduras, en caja con la protección adecuada; el humidificador no puede gotear sobre ella.", pass: "Tras 24 h con el humidificador funcionando no hay condensación ni gotas sobre conexiones.", status: "pending" },
  { id: "relay_rating", category: "electrica", title: "Relé con capacidad suficiente", test: "Corriente y tensión nominales del relé de al menos el doble de la carga. Mide la corriente real con una pinza amperimétrica.", pass: "La corriente medida está por debajo de la mitad de la nominal del relé.", status: "pending" },
  { id: "inductive_suppression", category: "electrica", title: "Supresión en cargas inductivas", test: "Diodo o red RC en ventiladores/bombas. Observa el reinicio del ESP32 y los errores del DHT22 durante 100 conmutaciones.", pass: "Cero reinicios y cero lecturas inválidas atribuibles a la conmutación.", status: "pending" },
  { id: "failsafe_default", category: "funcional", title: "Apagado por defecto", test: "Con el montaje en carga ficticia: desconecta el USB, provoca un reinicio, un brownout y un cuelgue del programa.", pass: "En todos los casos todas las salidas quedan apagadas en menos de 1 s.", status: "pending" },
  { id: "watchdog", category: "funcional", title: "Watchdog de hardware", test: "Bloquea a propósito el lazo de control con una salida encendida.", pass: "El watchdog reinicia el ESP32 y las salidas quedan apagadas dentro del tiempo configurado.", status: "pending" },
  { id: "max_on_time", category: "funcional", title: "Tiempo máximo de encendido", test: "Fuerza una condición que mantendría la carga encendida indefinidamente.", pass: "Se apaga al llegar al máximo, queda registrado y no vuelve a encender sin el tiempo mínimo apagado.", status: "pending" },
  { id: "sensor_failure", category: "funcional", title: "Falla del sensor", test: "Desconecta el DHT22 con una carga encendida y luego déjalo reportando valores atascados.", pass: "La carga se apaga antes de la antigüedad máxima de lectura y el hecho queda registrado.", status: "pending" },
  { id: "hardware_ack", category: "funcional", title: "Confirmación real del hardware", test: "Sensor de corriente o contacto auxiliar que confirme que la carga está encendida o apagada. Desconecta ese retorno.", pass: "Sin confirmación dentro del plazo el controlador apaga, marca falla y no vuelve a encender hasta que una persona la libera.", status: "pending" },
  { id: "offline_run", category: "funcional", title: "Funcionamiento sin internet", test: "Corta el Wi-Fi durante una hora con el control activo sobre una carga ficticia.", pass: "El control sigue con su histéresis y, al volver la red, el registro se sincroniza sin duplicados.", status: "pending" },
  { id: "physical_cutoff", category: "operacion", title: "Corte físico accesible", test: "Interruptor general al alcance, visible y probado; también un termostato mecánico independiente para el calefactor.", pass: "Un solo gesto desconecta todas las cargas y el calefactor no puede superar su límite mecánico.", status: "pending" },
  { id: "dummy_load_trial", category: "operacion", title: "72 horas con carga ficticia", test: "Lámpara de baja potencia en lugar de cada carga, con el control real y los registros activos.", pass: "72 horas sin apagados inesperados, sin fallas latentes y con todas las actuaciones registradas.", status: "pending" },
  { id: "heater_last", category: "operacion", title: "El calefactor, al final", test: "Solo después de todo lo anterior y con supervisión presencial en las primeras horas.", pass: "Ningún punto previo pendiente; el límite mecánico y el corte físico probados con el calefactor.", status: "pending" },
]

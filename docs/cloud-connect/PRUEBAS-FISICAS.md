# MYKO-001 — procedimiento de pruebas físicas antes de mover una salida

Este procedimiento complementa los 15 requisitos de «Ajustes → Pruebas antes de activar actuadores». **Nada de esto lo ejecuta el software**: lo hace una persona con multímetro. El firmware actual (`cloud-v1+ctl0-sim`) **no maneja ninguna salida** (`kActuationBuild = false`); para encender algo hará falta una compilación distinta, que solo se preparará cuando los pasos P0–P3 estén firmados.

Reglas fijas: sin 220 V, sin calefactor, nunca cargas conectadas directamente a un GPIO, una sola salida a la vez, siempre con fusible y corte físico al alcance.

## Montaje declarado (a comprobar, no a asumir)

| Función | GPIO | Debe pasar por |
| --- | --- | --- |
| DHT22 (sensor) | 27 | Directo (solo señal, 3,3 V) |
| Ventilador de entrada | 19 | Etapa de potencia (módulo de relé aislado o transistor/MOSFET) |
| Ventilador de extracción | 18 | Ídem |
| Iluminación | 16 | Ídem (no la controla este firmware) |
| Humidificador | 17 | Ídem |
| Calefactor | 32 | Relé. **Fuera de alcance de esta fase** |
| LCD I²C | 21 / 22 | Directo (solo señal) |

## P0 — Revisión en mesa (sin energía)
1. Foto del cableado completo y de cada etapa de potencia; nombre/modelo del módulo de relé y de cada fuente.
2. Anota para cada carga: tensión, corriente nominal (placa) y si es inductiva (motor/ventilador/bomba).
3. Anota el nivel de reposo del módulo (**activo en bajo o en alto**). El código de pruebas anterior usa constantes `*_OFF`; compruébalo en el módulo real, no en el código.
4. **Pasa si:** cada carga tiene fuente, fusible y cable definidos, y ninguna supera la mitad de la capacidad del relé.

## P1 — Continuidad y aislamiento (todo desconectado de la red)
1. Con el multímetro en continuidad: cada GPIO de salida llega **solo** a la entrada (IN) de su módulo. Ninguno toca el lado de carga.
2. Entre el lado lógico (3,3 V/GND del ESP32) y el lado de carga: resistencia mayor que 1 MΩ si el módulo es aislado (optoacoplador). Si no está aislado, **detente**: hay que cambiar el módulo.
3. Tierra: continuidad menor que 0,5 Ω entre la tierra del enchufe/fuente y las partes metálicas accesibles (si hay tierra).
4. **Pasa si:** los tres puntos se cumplen y quedan anotados.

## P2 — Solo lógica (USB), sin cargas conectadas
1. Con el firmware actual, mide cada pin de salida en reposo: debe estar en el nivel que apaga su módulo (P0.3).
2. Provoca reinicio (botón EN), desconecta y reconecta el USB y bloquea el programa (si puedes): las salidas deben quedar en reposo en todos los casos.
3. **Pasa si:** nunca aparece un pulso de activación en un osciloscopio/multímetro con retención de máximos durante el arranque.

## P3 — Recepción de parámetros por Wi-Fi (primer objetivo comprobable, sin salidas)
1. Compilar y cargar `cloud-v1+ctl0-sim` (no mueve salidas) con las cargas **desconectadas**.
2. En MYKO Home, definir un objetivo de prueba y confirmar.
3. Esperar ≤ 1 minuto: la tarjeta debe pasar de «Guardado» a «Aplicado por MYKO-001 (vN)». En Actividad aparecen «recibida» y «aplicada».
4. Probar un cambio, reiniciar la placa (debe volver con la última versión válida) y cortar el Wi-Fi (el controlador sigue; HOME marca la señal antigua).
5. **Pasa si:** versión recibida = versión aplicada = versión pedida, y al reiniciar no se pierde.

## P4 en adelante — requiere una compilación nueva y tu presencia
Solo después de firmar P0–P3 y de repasar los 15 requisitos:
1. Una única salida de **baja tensión** (por ejemplo un ventilador de 12 V) en una fuente propia, con fusible en línea y una pinza amperimétrica, o una lámpara de baja potencia como carga ficticia.
2. Encender y apagar desde la compilación de prueba; medir corriente; comprobar que el apagado ocurre al cortar el Wi-Fi, al reiniciar y al desconectar el sensor.
3. 72 horas con carga ficticia y registro completo antes de pasar a la siguiente salida.
4. El humidificador y los demás ventiladores se repiten uno a uno. **El calefactor y cualquier carga de 220 V quedan para una fase posterior**, con protecciones eléctricas independientes.

## Lo que necesito de ti
- Fotos del cableado y de las etapas de potencia, y el modelo de los módulos de relé y de las fuentes.
- Confirmar el nivel de reposo de cada módulo (P0.3).
- Hacer P1 y P2 tú (o con alguien con conocimientos eléctricos) y decirme los resultados.
- Autorizar, aparte, cada paso que energice algo.

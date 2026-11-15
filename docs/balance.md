# Balance educativo y simulación

> Los porcentajes de Aire, Energía y Escudo son **reglas de juego**, no mediciones de la NASA.  
> Los eventos FLR/SEP con `"verificado": true` en `src/data/eventos.json` sí provienen del archivo NASA DONKI.

## Qué es dato NASA y qué es balance

| Concepto | Clasificación | Detalle |
| :--- | :--- | :--- |
| Entradas FLR/SEP, fechas, clases (`M`/`X`) y ventanas | **Archivo histórico (NASA DONKI)** | Solo con `"verificado": true`; si no, se muestra **Dato de ejemplo** |
| Notas educativas de plantas/radiación | **Curación local (NASA OSDR)** | `src/data/osdr.json`, siempre con sello archivo/ejemplo |
| Porcentajes iniciales, drenaje, costos de minijuego, efectos de eventos, rangos, mascota Luni | **Balance y diseño educativo** | `src/game/balance.ts`, `src/art/mascota.ts`, `src/i18n.ts` |

## Parámetros calibrados (`src/game/balance.ts`)

| Constante | Valor | Notas |
| :--- | :--- | :--- |
| `DURACION_JORNADA` | `180` s | `5` jornadas (`150` s en Demo) |
| `DRENAJE_BASE_POR_SEG` | `{ aire: 0.26, energia: 0.11, escudo: 0.08 }` | Drenaje base por segundo |
| `MULT_DRENAJE_POR_JORNADA` | `[0.70, 0.85, 1.00, 1.15, 1.25]` | J1..J5 |
| `COSTO_INTENTO_MINIJUEGO` | `nodos: -3`, `valvulas: -2`, `escudo: -2` Energía | Al abrir estación |
| `RECARGA_COMPLETA` | `+20` Energía | Premio de fin de jornada si se completan las misiones |
| `MULT_MODULO_DANADO` | `x1.25` | Sobre el recurso del módulo dañado |
| `REFUERZO_CONTROL_MISION` | `{ energia: +15, aire: +10 }` | Tras `2` jornadas incompletas seguidas |
| `ELECCIONES.envio_energia` | `mandarAire (+30 Aire, -6 E)` / `mandarEscudo (+30 Escudo, -6 E)` | Ninguna domina |
| `ELECCIONES.invernadero` | `plenaLuz (+38 Aire, -8 E)` / `ahorro (+24 Aire, -3 E)` | Ninguna domina |
| `ELECCIONES.escudo_potencia` | `potenciaAlta (+32 Escudo, -8 E)` / `potenciaBaja (+20 Escudo, -3 E)` | Ninguna domina |
| `AGUA_BAJA_MULT_AIRE` | `x1.15` | Si expira la fuga de J2 (`40` s) |
| `EFECTOS_EVENTO_FLR` (J3 `90` s) | `refugiarte (-12 E, pierde misiones)` / `seguirTrabajando (-25 Escudo)` | Intensidad `'media'` en J3 |
| `EFECTOS_APAGON` (J4 `70` s) | `soporteVida (-16 Aire)` / `escudos (-22 Escudo)` / `invernadero (-10 E, pierde misiones de invernadero)` | Ninguna domina |
| `EFECTOS_EVENTO_TORMENTA_GRANDE` (J5 `100` s) | `refugiarte (-15 E, pierde misiones)` / `seguirTrabajando (-35 Escudo)` | Ninguna domina |
| `RANGOS` | `commander: 5`, `specialist: 4`, `cadet: 2`, `trainee: 0` | Según jornadas completadas |

## Flujo de eventos de la semana

| Jornada | Momento | Evento | Notas |
| :--- | :--- | :--- | :--- |
| J2 | `70` s | Fuga del tanque | Misión urgente (`40` s); no pausa ni `ChoiceScene`. Si expira → `aguaBaja` en J3 |
| J3 | `90` s | Fulguración (`FLR`) | Pausa: Refugiarte vs Seguir trabajando |
| J4 | `70` s | Apagón | Pausa: apagar Soporte vital, Escudos o Invernadero |
| J5 | `100` s | Gran tormenta | Pausa: Refugiarte vs Seguir trabajando |

## Simulación combinatoria (`src/game/simulation.ts`)

```bash
npx tsx -e "import { simularSemana } from './src/game/simulation'; console.log(simularSemana('perfecto', { nivelJ3: 'media', nivelJ5: 'fuerte' }));"
```

| Combinación `(J3, J5)` | Política | Mínimo semanal (`A / E / S`) | Fin de semana (`A / E / S`) | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| `(media, media)` | `perfecto` | `13.7 / 13.1 / 30.7` | `13.7 / 33.0 / 30.7` | Completa J5 (mín `≥ 10`, final `< 40`) |
| `(media, media)` | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | Evacuación en J5 |
| `(media, media)` | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | Evacuación en J3 |
| `(media, fuerte)` | `perfecto` | `13.7 / 13.1 / 20.7` | `13.7 / 33.0 / 20.7` | Completa J5 |
| `(media, fuerte)` | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | Evacuación en J5 |
| `(media, fuerte)` | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | Evacuación en J3 |

Las pruebas automatizadas viven en `tests/simulation.test.ts`.

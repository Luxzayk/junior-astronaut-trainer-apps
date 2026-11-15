# Entrenador Lunar Junior

Juego educativo 2D (vista cenital) para niños de 7 a 12 años diseñado para el reto **Entrenador de misiones para astronautas junior** (NASA Space Apps 2026), construido con **Vite + TypeScript (`strict: true`) + Phaser 3 + Vitest**.

## Cómo ejecutar

```bash
npm install
npm run dev      # Abre el servidor de desarrollo en http://localhost:3000
npm run build    # Compila el sitio estático en dist/ (base: './')
npm run preview  # Previsualiza la compilación estática
npm test         # Ejecuta las pruebas unitarias y la simulación con Vitest
npm run lint     # Verifica tipos con TypeScript strict (tsc --noEmit)
```

### Modos de entrada por URL
- **Juego normal**: `/` abre `MenuScene` con los botones **Jugar** (inicia la semana de 5 jornadas) y **Demo rápida (4 min)** (o `?demo=1`).
- **Modo Demo (`?demo=1`)**: inicia directo en la **Jornada 3** (`150s`), con recursos iniciales `{ aire: 70, energia: 65, escudo: 80 }` y el evento de fulguración solar disparando a los `60s`.
- **Modo Debug (`?debug=1`)**: activa atajos de teclado y el panel de inspección (sin `?debug=1`, no existe ningún atajo ni overlay de debug en ejecución).

## Flujo de juego (5 jornadas completas)

1. **Menú y misiones activas**: cada jornada publica entre 1 y 2 misiones principales con estación y minijuego asignados. En el mapa se muestran el panel de misiones pendientes y el marcador en la estación activa.
2. **Tres minijuegos con registro común (`MINIGAME_REGISTRY`)**:
   - **Nodos (`energia`)**: circuito de cables (`4x3`) con rotación hasta conectar Entrada con Salida (costo de intento `-3%` Energía, límite `60s`, pista visual a los `10s`).
   - **Válvulas (`invernadero` / `tanque`)**: secuencia de válvulas A/B/C mientras sube el medidor de presión (`+2.5/s`, acierto `-15`, error `+18`, costo de intento `-2%` Energía, límite `45s`).
   - **Escudo (`escudos`)**: alinear los paneles del campo deflector antes del impacto (costo de intento `-2%` Energía, límite `45s`).
3. **Elecciones por estación (`ChoiceScene`)**: tras completar una misión normal se abre la decisión táctica con ganancias (`+`) y costos (`-`) visibles:
   - `envio_energia` (`energia`): **Mandar a Aire** vs **Mandar a Escudo**.
   - `invernadero` (`invernadero`): **Plena luz** vs **Ahorro de agua y luz**.
   - `escudo_potencia` (`escudos`): **Potencia alta** vs **Potencia baja**.
4. **Los 4 eventos de la semana**:
   - **Jornada 2 (`70s`) — Fuga en Tanque**: misión urgente (`40s` de ventana) que no pausa el reloj ni requiere `ChoiceScene`; si expira, activa `aguaBaja` en la Jornada 3 (drenaje de Aire `x1.15`).
   - **Jornada 3 (`90s`) — Fulguración solar (`FLR`)**: pausa la jornada y da a elegir **Refugiarte** (`-12` Energía y pierde las misiones pendientes de la jornada) o **Seguir trabajando** (`-25` Escudo).
   - **Jornada 4 (`70s`) — Apagón (`ApagonScene`)**: pausa y obliga a apagar uno de 3 módulos (**Soporte de vida** `-16` Aire, **Escudos** `-22` Escudo o **Invernadero** `-10` Energía y pierde misiones pendientes de Invernadero).
   - **Jornada 5 (`100s`) — Tormenta grande (`TORMENTA_GRANDE`)**: alerta mayor con decisión entre **Refugiarte** (`-15` Energía y pierde pendientes) o **Seguir trabajando** (`-35` Escudo).
5. **Cierre de jornada**:
   - **Completa**: todas las misiones normales hechas -> recarga `+20%` Energía.
   - **Incompleta**: marca el módulo de la primera misión pendiente como **módulo dañado** (drenaje `x1.25` de ese recurso hasta completar una misión allí).
   - **Refuerzo del Control de Misión**: tras `2` jornadas incompletas seguidas, envía un refuerzo único de `+15%` Energía y `+10%` Aire.

## Cómo editar jornadas, misiones y eventos (`src/game/jornadas.ts`)

Todas las jornadas están declaradas en `JORNADAS` dentro de `src/game/jornadas.ts`. Para añadir o ajustar una misión o evento en una jornada (`1..5`):
- **Misiones**: agrega o modifica entradas en `misiones` con `id`, `estacionId` (`'energia' | 'invernadero' | 'escudos' | 'tanque'`), `minijuego` (`'nodos' | 'valvulas' | 'escudo'`), `params` (`pasos`, `tiempoLimite`, y `paneles` para `escudo`), y `tipoEleccion` (`'envio_energia' | 'invernadero' | 'escudo_potencia'`).
- **Eventos de jornada**: configura `evento` con `{ tipo: 'fuga', segundo, ventana }`, `{ tipo: 'clima', segundo, eventoJsonId }`, o `{ tipo: 'apagon', segundo }`.
- La suite `tests/jornadas.test.ts` valida automáticamente que existan 5 jornadas, que toda estación y minijuego pertenezca al registro, que `pasos` no disminuya al avanzar de jornada y que ningún evento sea `null`.

## Datos reales de clima espacial (`src/data/eventos.json`)

El archivo `src/data/eventos.json` desacopla los metadatos de los eventos de clima espacial (`j3-fulguracion` y `j5-tormenta-grande`). Para reemplazar los ejemplos por eventos reales verificados de **NASA DONKI**:
1. Abre `src/data/eventos.json` y localiza el objeto con `"id": "j3-fulguracion"` o `"id": "j5-tormenta-grande"`.
2. Completa `fechaReal` (ISO/UTC del catálogo DONKI), `magnitudReal` (por ejemplo clase `X1.2` o nivel `G4`/`S3`), `fuenteUrl` (enlace directo al registro DONKI/CCMC), `textoNinos` (explicación breve para 7–12 años) y cambia `"verificado": true`.
3. Mientras `"verificado": false` o `textoNinos` esté vacío, `src/game/events.ts` usa el texto pedagógico seguro de `src/i18n.ts` y muestra el aviso de dato de ejemplo sin romper el juego.

## Modo debug (`?debug=1`)

Agrega `?debug=1` a la URL (por ejemplo `http://localhost:3000/?debug=1`).

| Tecla | Acción |
| :--- | :--- |
| `1`, `2`, `3` | Restar `10` a **Aire**, **Energía** o **Escudo** |
| `Shift + 1`, `2`, `3` | Sumar `10` a **Aire**, **Energía** o **Escudo** |
| `Alt + 1` .. `Alt + 5` | Saltar directo a la **Jornada 1..5** |
| `J` | Saltar directo a la **Jornada 3** |
| `V` | Disparar el evento de la jornada actual |
| `B` | Activar / desactivar `aguaBaja` |
| `M` | Completar la siguiente misión pendiente (o urgente) |
| `X` | Fallar / marcar perdida la siguiente misión pendiente |
| `O` | Mostrar / ocultar overlay de estado de misiones y módulo dañado |
| `G` | Dañar / reparar manualmente el módulo de **Energía** |
| `T` | Alternar velocidad del reloj y drenaje (`x1` / `x10`) |
| `N` | Avanzar a la siguiente jornada |
| `K` | Forzar fin de la jornada actual (evaluación de cierre) |
| `L` | Forzar evacuación inmediata |

## Simulación pura y tabla de balance calibrada

El motor puro `src/game/simulation.ts` ejecuta la semana completa (`dt = 1s`, sin Phaser) reutilizando directamente `GameStateManager`, `jornadas.ts`, `missions.ts`, `closing.ts` y `events.ts`.

### Cómo ejecutar la simulación

```bash
npm test   # Ejecuta tests/simulation.test.ts junto con toda la suite Vitest
npx tsx -e "import { simularSemana } from './src/game/simulation'; console.log(simularSemana('perfecto'));"
```

### Parámetros finales calibrados (`src/game/balance.ts`)

| Constante | Valor calibrado | Nota |
| :--- | :--- | :--- |
| `DURACION_JORNADA` | `180` s | `5` jornadas |
| `DRENAJE_BASE_POR_SEG` | `{ aire: 0.26, energia: 0.11, escudo: 0.08 }` | Por segundo base (`x1.00`) |
| `MULT_DRENAJE_POR_JORNADA` | `[0.70, 0.85, 1.00, 1.15, 1.25]` | J1..J5 |
| `COSTO_INTENTO_MINIJUEGO` | `nodos: -3`, `valvulas: -2`, `escudo: -2` Energía | Al abrir estación |
| `RECARGA_COMPLETA` | `+20` Energía | Cierre con todas las misiones hechas |
| `MULT_MODULO_DANADO` | `x1.25` | Sobre el recurso del módulo dañado |
| `REFUERZO_CONTROL_MISION` | `{ energia: +15, aire: +10 }` | Único, tras `2` incompletas seguidas |
| `ELECCIONES.envio_energia` | `mandarAire (+30 Aire, -6 E)` / `mandarEscudo (+30 Esc, -6 E)` | No dominadas |
| `ELECCIONES.invernadero` | `plenaLuz (+38 Aire, -8 E)` / `ahorro (+24 Aire, -3 E)` | No dominadas |
| `ELECCIONES.escudo_potencia` | `potenciaAlta (+32 Esc, -8 E)` / `potenciaBaja (+20 Esc, -3 E)` | No dominadas |
| `AGUA_BAJA_MULT_AIRE` | `x1.15` | Si expira la fuga de J2 (`40s`) |
| `EFECTOS_EVENTO_FLR` (J3 `90s`) | `refugiarte (-12 E, pierde pendientes)` / `seguirTrabajando (-25 Esc)` | No dominadas |
| `EFECTOS_APAGON` (J4 `70s`) | `soporteVida (-16 Aire)` / `escudos (-22 Esc)` / `invernadero (-10 E, pierde Inv.)` | No dominadas |
| `EFECTOS_EVENTO_TORMENTA_GRANDE` (J5 `100s`) | `refugiarte (-15 E, pierde pendientes)` / `seguirTrabajando (-35 Esc)` | No dominadas |

### Resultados de simulación por jornada (mínimos de Aire / Energía / Escudo)

| Política | J1 mín (`A / E / S`) | J2 mín (`A / E / S`) | J3 mín (`A / E / S`) | J4 mín (`A / E / S`) | J5 mín (`A / E / S`) | Resultado semana |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Perfecto** | `72.7 / 77.2 / 89.9` | `66.1 / 68.4 / 77.7` | `50.0 / 54.6 / 58.3` | `34.2 / 37.9 / 41.7` | `13.7 / 13.1 / 20.7` | **Completa J5** (sin evacuación; finales `13.7 / 33.0 / 20.7`) |
| **Mediocre** | `72.7 / 77.2 / 89.9` | `66.1 / 70.4 / 77.7` | `43.0 / 61.5 / 38.3` | `3.5 / 29.9 / 17.6` | `0.0 / 14.0 / 0.0` | **Evacuado en J5** (`s = 150`, alcanzó J5 `>= 3`) |
| **Pasivo** | `67.2 / 86.1 / 89.9` | `27.7 / 65.2 / 77.7` | `0.0 / 57.0 / 69.6` | `—` | `—` | **Evacuado en J3** (`s = 100`, Aire `= 0`) |

## Estructura de carpetas

```text
src/
  main.ts                 // Arranque: carga fuente Nunito local, detecta ?demo=1 y crea Phaser.Game
  config.ts               // Constantes de pantalla (1280x720, TILE=64, HUD_H=80)
  i18n.ts                 // Todos los textos en español (listo para añadir 'en')
  data/
    eventos.json          // Definición desacoplada de eventos de clima espacial
  game/
    state.ts              // Estado único del juego y emisor de eventos
    balance.ts            // Números de balance calibrados (no datos de NASA)
    clock.ts              // Lógica pura del reloj de jornada
    closing.ts            // Lógica pura de cierre de jornada y módulo dañado
    events.ts             // Lectura y helpers puros de eventos (Fuga, Clima, Apagón)
    jornadas.ts           // Definición de las 5 jornadas, misiones y eventos
    missions.ts           // Lógica pura de misiones, costos, elecciones y formato
    map.ts                // Mapa ASCII, salas, estaciones, colisiones y utilidades
    pathfinding.ts        // BFS puro sobre la cuadrícula (4 direcciones)
    simulation.ts         // Motor de simulación pura de 5 jornadas (sin Phaser)
  minigames/
    types.ts              // Contratos e interfaz común MinigameView
    registry.ts           // Registro común de los 3 minijuegos
    nodos.ts              // Lógica pura del minijuego Nodos (generación, rotación, BFS)
    valvulas.ts           // Lógica pura del minijuego Válvulas (secuencia y medidor)
    escudo.ts             // Lógica pura del minijuego Escudo (alineación de paneles)
    views/
      NodosView.ts        // Vista Phaser del minijuego Nodos
      ValvulasView.ts     // Vista Phaser del minijuego Válvulas
      EscudoView.ts       // Vista Phaser del minijuego Escudo
  scenes/
    BootScene.ts          // Genera textura del astronauta y abre MenuScene o juego Demo
    MenuScene.ts          // Menú inicial (Jugar / Demo rápida)
    BaseScene.ts          // Mapa, jugador, misiones, estaciones, entrada y debug
    HUDScene.ts           // Barras de recursos, reloj en arco, botón de pausa y agua baja
    MinigameScene.ts      // Host genérico para los minijuegos del registro
    ChoiceScene.ts        // Overlay de elecciones tácticas por estación
    EventScene.ts         // Overlay de eventos de clima espacial (J3 FLR y J5 Tormenta)
    ApagonScene.ts        // Overlay del evento de apagón en Jornada 4
    OverlayScene.ts       // Pantallas de pausa, cierre de jornada y evacuación
  ui/
    icons.ts              // Iconos vectoriales dibujados con Graphics
    theme.ts              // Paleta visual, tipografías y métricas de UI
tests/
  state.test.ts           // Pruebas del estado único, drenaje y pausa
  pathfinding.test.ts     // Pruebas de pathfinding BFS y colisiones lógicas
  nodos.test.ts           // Pruebas de generación, rotación y circuito de Nodos
  valvulas.test.ts        // Pruebas de secuencia, medidor y límites de Válvulas
  escudo.test.ts          // Pruebas de rotación, cobertura y resolución de Escudo
  missions.test.ts        // Pruebas de misiones, costos y flujo por estación
  closing.test.ts         // Pruebas de cierre, módulo dañado, refuerzo, eventos y Demo
  jornadas.test.ts        // Validación estructural de las 5 jornadas, pasos y elecciones
  simulation.test.ts      // Simulación matemática y verificación de no-dominancia
```

## Decisiones de diseño en puntos abiertos

- **Reiniciar jornada (Pausa)**: reinicia el reloj de la jornada actual a `0`, restaura recursos y estado de cierre al inicio exacto de esa jornada y reposiciona al astronauta en el Lobby.
- **Reintentar / Jugar de nuevo**: llama a `gameState.reset()` para volver a la jornada 1 con todos los recursos al 100%.

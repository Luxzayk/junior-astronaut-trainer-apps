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

## Datos locales curados de clima espacial (`src/data/eventos.json`) y 3 semanas

El juego funciona **100 % sin conexión y sin llamadas de red en tiempo de ejecución** (`src/` no usa `fetch` ni importa archivos crudos). Existen **3 semanas seleccionables** (`semana-1`, `semana-2`, `semana-3` en `src/game/semanas.ts`) vinculadas a 6 eventos curados en `src/data/eventos.json` y expuestos a través de `src/data/eventosLoader.ts`.

### 1. Cómo obtener datos reales de NASA DONKI (script offline)

Para consultar eventos reales del catálogo **NASA DONKI (FLR y SEP)** de forma manual y guardar archivos crudos para trazabilidad:

1. Edita las fechas reales (`YYYY-MM-DD`) de `SEMANAS` dentro de `scripts/fetch-donki.mjs`.
2. Ejecuta manualmente desde terminal con tu clave personal (evita ejecutar `DEMO_KEY` en bucle):
   ```bash
   NASA_API_KEY=TU_CLAVE node scripts/fetch-donki.mjs
   ```
3. El script guarda `src/data/donki/semana-1.raw.json`, `semana-2.raw.json` y `semana-3.raw.json` con `consultadoEn`, `ventana`, `flr` y `sep`. **Nunca** se importan esos `*.raw.json` desde `src/`.

### 2. Reglas de curaduría, campo `verificado` y restricción de nivel en Jornada 3

- **Campos obligatorios para marcar `"verificado": true`**: cada entrada en `src/data/eventos.json` debe incluir `id`, `semana`, `jornada` (`3` o `5`), `tipo` (`'FLR'` o `'SEP'`), `fecha` ISO válida, `clase` (ej. `'M8.2'`), `nivel` (`'media'` o `'fuerte'`), `fuenteNombre`, `fuenteUrl` no vacía, `consultadoEn` (fecha de consulta), y `textoNinos` con `es` y `en` para niños de 7 a 12 años.
- **Sello honesto automático**: si `"verificado": false` o falta/falla cualquiera de esos campos, `eventosLoader.ts` marca `esEjemplo: true` y la interfaz muestra el sello **Dato de ejemplo** / **Sample data**. Solo cuando todos los campos son válidos y `"verificado": true`, se muestra **Datos de archivo · consultado el `<fecha>`**.
- **Regla orientativa de nivel**: clase `M` -> `'media'`; clase `X` o tormenta `SEP` intensa -> `'fuerte'`.
- **Restricción calibrada en Jornada 3**: en la simulación combinatoria, un evento `'fuerte'` en Jornada 3 baja el mínimo de Energía de `perfecto` a `8.1%` (`< 10%`). Para mantener los valores calibrados de `src/game/balance.ts` sin alterarlos, `eventosLoader.ts` restringe **Jornada 3 únicamente a nivel `'media'`** (si un JSON trae `'fuerte'` en J3, emite `console.warn` y lo ajusta a `'media'`), mientras **Jornada 5 admite `'media'` o `'fuerte'`**.

### 3. Claves `EN` pendientes de revisión humana antes de publicación

Todas las claves de `src/i18n.ts` tienen paridad exacta `ES`/`EN` y están probadas automáticamente por `tests/i18n.test.ts`; antes de publicar a producción se recomienda revisión humana pedagógica/nativa de los siguientes bloques `EN`:

- `glosario.terminos.*` (`fulguracionTitulo/Desc`, `tormentaSepTitulo/Desc`, `escudoTitulo/Desc`, `invernaderoTitulo/Desc`, `moduloDanadoTitulo/Desc`, `aguaBajaTitulo/Desc`) y `glosario.chip*`.
- `tutorial.*` (`objetivoTexto`, `moverseTexto`, `irEstacionTexto`, `usarTexto`, `minijuegoTexto`, `elegirTexto`, `cierreTexto`, `pasoDe`, `saltarTutorial`, `entendido`).
- `eventoClima.*` (`flrTextoNinos`, `tormentaTextoNinos`, `fuenteVerificada`, `chipMisionesPerdidas`) y `sellos.*`.
- `fuentes.*` y `semanas.*` (`donkiDesc`, `balanceAviso`, `reglaNivelTitulo`, descripciones de semana), además de los campos `textoNinos.en` de `src/data/eventos.json` al cargar eventos reales.

## Tutorial interactivo y Accesibilidad (Fase 4)

- **Tutorial interactivo de 7 pasos (`src/game/tutorial.ts` + `TutorialScene.ts`)**: se activa automáticamente solo en **Jornada 1** cuando `tutorialVisto === false` y el modo no es `demo` (puede reactivarse desde **Ajustes -> Ver tutorial otra vez**).
  1. `objetivo` (pausa reloj, botón **Entendido**, destaca barras del HUD).
  2. `moverse` (sin pausa, avanza al caminar `DISTANCIA_TUTORIAL = 80px`).
  3. `ir_estacion` (sin pausa, flecha hacia estación **Energía**).
  4. `usar` (sin pausa, destaca botón **Usar** / tecla `E`).
  5. `minijuego` (sin pausa; si el jugador sale o falla permanece en el paso 5 para reintentar).
  6. `elegir` (pausa reloj al abrir `ChoiceScene`, espera `eleccion:confirmada`).
  7. `cierre` (se muestra al finalizar la Jornada 1, pausa reloj hasta pulsar **Entendido**).
  El botón **Saltar tutorial** (`>= 56px` de alto) está siempre disponible y guarda `tutorialVisto: true`.
- **Accesibilidad persistente (`src/game/settings.ts`, `contrast.ts`, `focus.ts`, `targets.ts`)**:
  - Idioma **ES / EN** instantáneo (`localStorage`).
  - **Texto grande (`x1.25`)** mediante `escalarTamanoTexto` con mínimo `18px` y `wordWrap`.
  - **Movimiento reducido**: desactiva pulsos de barras críticas, temblores de error, rebotes de flecha y escalados hover/press, manteniendo bordes gruesos estáticos e iconos `'!'`.
  - **Navegación completa por teclado** (`Tab`, flechas, `Enter`/`Space`, `Escape`) con anillo de foco `>= 3px` y contraste WCAG AA (`>= 4.5:1` en texto, `>= 3:1` en foco).

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

El motor puro `src/game/simulation.ts` ejecuta la semana completa (`dt = 1s`, sin Phaser) reutilizando directamente `GameStateManager`, `jornadas.ts`, `missions.ts`, `closing.ts` y `events.ts`, aceptando `{ nivelJ3, nivelJ5 }`.

### Cómo ejecutar la simulación

```bash
npm test   # Ejecuta tests/simulation.test.ts junto con toda la suite Vitest (74 tests)
npx tsx -e "import { simularSemana } from './src/game/simulation'; console.log(simularSemana('perfecto', { nivelJ3: 'media', nivelJ5: 'fuerte' }));"
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

### Resultados de simulación combinatoria (`4` combinaciones de nivel × `3` políticas)

| Combinación `(J3, J5)` | Política | Mínimo semana (`A / E / S`) | Final semana (`A / E / S`) | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| `(media, media)` *(válida)* | `perfecto` | `13.7 / 13.1 / 30.7` | `13.7 / 33.0 / 30.7` | **Completa J5** (mín `>= 10`, final `< 40`) |
| `(media, media)` *(válida)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | **Evacuado en J5** (`>= 3`) |
| `(media, media)` *(válida)* | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | **Evacuado en J3** (`<= 3`) |
| `(media, fuerte)` *(válida)* | `perfecto` | `13.7 / 13.1 / 20.7` | `13.7 / 33.0 / 20.7` | **Completa J5** (mín `>= 10`, final `< 40`) |
| `(media, fuerte)` *(válida)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | **Evacuado en J5** (`>= 3`) |
| `(media, fuerte)` *(válida)* | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | **Evacuado en J3** (`<= 3`) |
| `(fuerte, media)` *(bloqueada en J3)* | `perfecto` | `27.6 / 8.1 / 20.7` | `27.6 / 28.0 / 20.7` | **Energía mín `8.1 < 10`** (motivo de restringir J3 a `media`) |
| `(fuerte, media)` *(bloqueada en J3)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | Evacuado en J5 |
| `(fuerte, media)` *(bloqueada en J3)* | `pasivo` | `0.0 / 54.0 / 69.6` | `0.0 / 54.0 / 69.6` | Evacuado en J3 |
| `(fuerte, fuerte)` *(bloqueada en J3)* | `perfecto` | `27.6 / 8.1 / 10.7` | `27.6 / 28.0 / 10.7` | **Energía mín `8.1 < 10`** (motivo de restringir J3 a `media`) |
| `(fuerte, fuerte)` *(bloqueada en J3)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | Evacuado en J5 |
| `(fuerte, fuerte)` *(bloqueada en J3)* | `pasivo` | `0.0 / 54.0 / 69.6` | `0.0 / 54.0 / 69.6` | Evacuado en J3 |

## Estructura de carpetas

```text
scripts/
  fetch-donki.mjs         // Script manual offline para consultar NASA DONKI (sin uso en runtime)
src/
  main.ts                 // Arranque: carga fuente Nunito local, registra escenas y crea Phaser.Game
  config.ts               // Constantes de pantalla (1280x720, TILE=64, HUD_H=80) y claves de escena
  i18n.ts                 // Sistema bilingüe ES/EN con interpolación y paridad estricta
  data/
    donki/
      README.md           // Política de archivo local sin importación en src/
    eventos.json          // Catálogo local de 6 eventos para las 3 semanas (verificado/ejemplo)
    eventosLoader.ts      // Cargador seguro, sello de fecha y restricción de nivel en J3
    fuentes.ts            // Metadatos honestos de fuentes de archivo, balance y tecnología
  game/
    state.ts              // Estado único del juego y emisor tipado de eventos
    balance.ts            // Números de balance calibrados y DISTANCIA_TUTORIAL
    clock.ts              // Lógica pura del reloj de jornada
    closing.ts            // Lógica pura de cierre de jornada y módulo dañado
    events.ts             // Lectura y helpers puros de eventos (Fuga, Clima, Apagón)
    glosario.ts           // Términos pedagógicos del glosario bilingüe
    jornadas.ts           // Definición de las 5 jornadas, misiones y eventos
    missions.ts           // Lógica pura de misiones, costos, elecciones y formato
    map.ts                // Mapa ASCII, salas, estaciones, colisiones y utilidades
    pathfinding.ts        // BFS puro sobre la cuadrícula (4 direcciones)
    semanas.ts            // Definición y utilidades de las 3 semanas lunares
    settings.ts           // Ajustes persistentes (idioma, textoGrande, movimientoReducido, tutorialVisto, ultimaSemana)
    simulation.ts         // Motor de simulación pura de 5 jornadas con niveles configurables
    tutorial.ts           // Máquina de estados pura del tutorial interactivo de 7 pasos
  minigames/
    types.ts              // Contratos e interfaz común MinigameView
    registry.ts           // Registro común de los 3 minijuegos
    nodos.ts              // Lógica pura del minijuego Nodos (generación, rotación, BFS)
    valvulas.ts           // Lógica pura del minijuego Válvulas (secuencia y medidor)
    escudo.ts             // Lógica pura del minijuego Escudo (alineación de paneles)
    views/
      NodosView.ts        // Vista Phaser del minijuego Nodos (táctil y teclado)
      ValvulasView.ts     // Vista Phaser del minijuego Válvulas (táctil y teclado)
      EscudoView.ts       // Vista Phaser del minijuego Escudo (táctil y teclado)
  scenes/
    BootScene.ts          // Genera textura del astronauta y abre MenuScene o juego Demo
    MenuScene.ts          // Menú inicial (Jugar semana, Demo 4 min, Glosario, Fuentes, Ajustes, ES/EN)
    SemanaScene.ts        // Selector de 3 semanas lunares + botón Sorpresa
    FuentesScene.ts       // Pantalla Fuentes y ciencia real (con scroll y sellos honestos)
    GlosarioScene.ts      // Pantalla Glosario lunar bilingüe
    AjustesScene.ts       // Pantalla Ajustes (ES/EN, Texto grande, Movimiento reducido, Reiniciar tutorial)
    BaseScene.ts          // Mapa, jugador, misiones, estaciones, fuga urgente, entrada y debug
    HUDScene.ts           // Barras con iconos/estados, reloj en arco, botón pausa y Agua baja
    MinigameScene.ts      // Host genérico para los minijuegos del registro (con salida Escape)
    ChoiceScene.ts        // Overlay de elecciones tácticas por estación con chips de costo
    EventScene.ts         // Overlay de eventos de clima espacial (J3 FLR y J5 Tormenta) + chips glosario
    ApagonScene.ts        // Overlay del evento de apagón en Jornada 4
    OverlayScene.ts       // Pantallas de pausa, cierre de jornada, fin de demo y evacuación
    TutorialScene.ts      // Overlay interactivo del tutorial de 7 pasos con foco y flecha guía
  ui/
    contrast.ts           // Cálculo de luminancia relativa y validación WCAG AA de la paleta
    focus.ts              // Gestor reutilizable de navegación por teclado y anillo >= 3px
    glosarioModal.ts      // Modal de glosario reutilizable desde EventScene y OverlayScene
    icons.ts              // Iconos vectoriales dibujados con Graphics
    targets.ts            // Registro de coordenadas de objetivos UI por nombre
    theme.ts              // Paleta visual, tipografías, escalado textoGrande y métricas de UI
tests/
  closing.test.ts         // Pruebas de cierre, módulo dañado, refuerzo, eventos y Demo
  contrast.test.ts        // Pruebas de contraste WCAG, escala textoGrande y targets UI
  escudo.test.ts          // Pruebas de rotación, cobertura y resolución de Escudo
  eventos.test.ts         // Pruebas de eventosLoader, sello de archivo, restricción J3 y 3 semanas
  glosario.test.ts        // Pruebas de términos y cobertura ES/EN del glosario
  i18n.test.ts            // Pruebas de paridad de claves, placeholders e interpolación ES/EN
  jornadas.test.ts        // Validación estructural de las 5 jornadas, pasos y elecciones
  missions.test.ts        // Pruebas de misiones, costos y flujo por estación
  no-red.test.ts          // Verificación estática de cero llamadas de red e importaciones raw en src/
  nodos.test.ts           // Pruebas de generación, rotación y circuito de Nodos
  pathfinding.test.ts     // Pruebas de pathfinding BFS y colisiones lógicas
  settings.test.ts        // Pruebas de persistencia y suscripción de ajustes
  simulation.test.ts      // Simulación matemática 4x3 y verificación de no-dominancia
  state.test.ts           // Pruebas del estado único, drenaje y pausa
  tutorial.test.ts        // Pruebas del tutorial interactivo de 7 pasos y reglas de pausa
  valvulas.test.ts        // Pruebas de secuencia, medidor y límites de Válvulas
```

## Decisiones de diseño en puntos abiertos

- **Reiniciar jornada (Pausa)**: reinicia el reloj de la jornada actual a `0`, restaura recursos y estado de cierre al inicio exacto de esa jornada y reposiciona al astronauta en el Lobby.
- **Reintentar / Jugar de nuevo**: llama a `gameState.reset()` para volver a la jornada 1 con todos los recursos al 100%.
- **Jornada 3 nivel `'media'`**: para preservar intactos los valores de `balance.ts` mientras se garantiza que toda semana válida cumpla los umbrales de calibración (`>= 10` en mínimos y `< 40` en mínimo final), Jornada 3 restringe los eventos curados a `'media'`.

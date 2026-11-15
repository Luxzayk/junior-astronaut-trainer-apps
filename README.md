# Junior Lunar Trainer

A 2D top-down educational game for children ages 7–12, designed for the **Junior Astronaut Mission Trainer** challenge (NASA Space Apps 2026), built with **Vite + TypeScript (`strict: true`) + Phaser 3 + Vitest**.

## 1. How to Play

```bash
npm install
npm run dev      # Starts the development server at http://localhost:3000
npm run build    # Builds the static site in dist/ (base: './')
npm run check    # Audits dist/ (JS gzip <= 1.2 MB and no-network/URL policy)
npm run preview  # Previews the static build
npm test         # Runs all unit tests and the simulation with Vitest
npm run lint     # Checks types using TypeScript strict (tsc --noEmit)
```

### URL Launch Modes
- **Normal game**: `/` opens `MenuScene` with **Play the Week** (choose from 3 weeks of 5 days each), **4-Minute Demo**, **Glossary**, **Sources**, **Settings**, **Credits**, a quick **ES / EN** language toggle, and a quick **Sound** button.
- **Demo Mode (`?demo=1`)**: starts directly on **Day 3** (`150s`), with initial resources `{ aire: 70, energia: 65, escudo: 80 }` and the solar flare event triggering at `60s`.
- **Debug Mode (`?debug=1`)** and **Performance Mode (`?debug=1&perf=1`)**: enable inspection shortcuts and a live FPS/particle counter (without `?debug=1`, debug shortcuts and overlays are not available).

### Gameplay Flow (5 Complete Days)
1. **Menu and active missions**: each day features 1–2 main missions, each assigned to a station and minigame. The map displays a pending-missions panel and a marker at the active station. On Day 1, first-time players begin with a 7-step interactive tutorial.
2. **Three minigames in a shared registry (`MINIGAME_REGISTRY`)**:
   - **Nodes (`energia`)**: a rotating-wire circuit (`4x3`) that players must connect from Input to Output (attempt cost: `-3%` Energy; `60s` time limit; visual hint after `10s`).
   - **Valves (`invernadero` / `tanque`)**: an A/B/C valve sequence while a pressure gauge rises (`+2.5/s`; correct answer: `-15`; mistake: `+18`; attempt cost: `-2%` Energy; `45s` time limit).
   - **Shield (`escudos`)**: align deflector-field panels before impact (attempt cost: `-2%` Energy; `45s` time limit).
3. **Station-specific choices (`ChoiceScene`)**: after completing a normal mission, players face a tactical decision with visible benefits (`+`) and costs (`-`):
   - `envio_energia` (`energia`): **Send to Air** vs. **Send to Shield**.
   - `invernadero` (`invernadero`): **Full Light** vs. **Save Water and Light**.
   - `escudo_potencia` (`escudos`): **High Power** vs. **Low Power**.
4. **The week's 4 events**:
   - **Day 2 (`70s`) — Tank Leak**: an urgent mission (`40s` window) that does not pause the clock or require `ChoiceScene`. If it expires, it activates `aguaBaja` on Day 3 (Air drain `x1.15`).
   - **Day 3 (`90s`) — Solar Flare (`FLR`)**: pauses the day and offers **Take Shelter** (`-12` Energy and forfeits pending missions for that day) or **Keep Working** (`-25` Shield).
   - **Day 4 (`70s`) — Power Outage (`ApagonScene`)**: pauses the day and requires shutting down one of three modules (**Life Support**: `-16` Air; **Shields**: `-22` Shield; or **Greenhouse**: `-10` Energy and forfeits pending Greenhouse missions).
   - **Day 5 (`100s`) — Major Storm (`TORMENTA_GRANDE`)**: a major alert with a choice between **Take Shelter** (`-15` Energy and forfeits pending missions) or **Keep Working** (`-35` Shield).
5. **End-of-Day Sequences, Logbook, and Final Report**:
   - Short, skippable animated sequences (`src/fx/cierres.ts`) featuring **Luni** (`src/art/mascota.ts`) and gentle synthesized audio (`src/audio/audio.ts`).
   - After completing Day 5 or being evacuated (`Air <= 0%`) in week mode, `InformeScene` displays the player's rank (**Commander**, **Specialist**, **Cadet**, or **Astronaut Trainee**), a logbook of difficult decisions, the data used, an optional OSDR note, and a button to copy the result.

### Audio, Effects, and Accessibility
- **Synthesized WebAudio (`src/audio/audio.ts`, `src/audio/sonidos.ts`)**: no `.mp3/.ogg` files or continuous music. Audio initializes lazily after the first user gesture (`pointerdown`/`keydown`), limits playback to **4 simultaneous voices**, enforces a **150 ms** cooldown between identical alerts, and fails silently if `AudioContext` is unavailable. Accessible mute button (`>= 56px`) in Menu, HUD, Pause, and Settings (with volume control).
- **Persistent accessibility options (`src/game/settings.ts`, `contrast.ts`, `focus.ts`, `targets.ts`)**: instant **ES/EN** language switching, **Large Text (`x1.25`)**, **Reduced Motion** (disables pulses, screen shake, and moving particles while retaining static outlines and a `'!'` badge), and full keyboard navigation (`Tab`, arrow keys, `Enter`/`Space`, `Escape`).

---

## 2. How the Data Was Obtained

The game runs **100% offline, with no runtime network requests** (`src/` does not use `fetch` or `XMLHttpRequest` or import raw files; checked by `tests/no-red.test.ts` and `npm run check`).

### Locally Curated NASA DONKI Data (`src/data/eventos.json`)
1. **3 selectable weeks** were defined (`semana-1`, `semana-2`, `semana-3` in `src/game/semanas.ts`) and linked to 6 curated events in `src/data/eventos.json`, exposed through `src/data/eventosLoader.ts`.
2. To manually retrieve real events from the **NASA DONKI (FLR and SEP)** catalog while retaining offline traceability:
   - Edit the actual dates (`YYYY-MM-DD`) in `SEMANAS` inside `scripts/fetch-donki.mjs`.
   - Run the script manually from the terminal using your personal API key:
     ```bash
     NASA_API_KEY=TU_CLAVE node scripts/fetch-donki.mjs
     ```
   - The script saves `src/data/donki/semana-1.raw.json`, `semana-2.raw.json`, and `semana-3.raw.json` with `consultadoEn`, `ventana`, `flr`, and `sep`. These `*.raw.json` files are **not imported** from `src/`.
3. **Automatic, transparent data labeling**: each event marked with `"verificado": true` requires `id`, `semana`, `jornada` (`3` or `5`), `tipo` (`'FLR'` or `'SEP'`), a valid ISO `fecha`, `clase`, `nivel` (`'media'` or `'fuerte'`), `fuenteNombre`, `fuenteUrl`, `consultadoEn`, and `textoNinos` (`es`/`en`). If `"verificado": false` or any field is missing, `eventosLoader.ts` assigns `esEjemplo: true`, and the interface displays **Dato de ejemplo / Sample data** rather than claiming the data is live.
4. **Optional NASA OSDR data (`src/data/osdr.json`, `osdrLoader.ts`)**: a supplementary space-biology educational note curated locally with the same transparent label (`verificado: false` by default until human review).

---

## 3. What Is Game Balancing and What Is NASA Data?

| Concept | Classification | Details |
| :--- | :--- | :--- |
| FLR and SEP catalog entries, dates, classes (`M`/`X`), and time windows | **Historical archive data (NASA DONKI)** | Only when `"verificado": true` in `src/data/eventos.json`; otherwise explicitly labeled **Sample data**. |
| Optional educational notes about plants/radiation | **Locally curated data (NASA OSDR)** | `src/data/osdr.json`, always accompanied by an archive/sample label. |
| Initial percentages (`100%`), per-second resource drain, minigame costs, decision/event effects, durations (`180s`/`150s`), ranks, and the **Luni** mascot | **Game balancing and educational design** | Defined in `src/game/balance.ts`, `src/art/mascota.ts`, and `src/i18n.ts`; explicitly identified as an educational simulation in `FuentesScene`, `MinigameScene`, `EventScene`, and `InformeScene`. |

### Final Calibrated Parameters (`src/game/balance.ts`)

| Constant | Calibrated Value | Notes |
| :--- | :--- | :--- |
| `DURACION_JORNADA` | `180` s | `5` days (`150` s in Demo) |
| `DRENAJE_BASE_POR_SEG` | `{ aire: 0.26, energia: 0.11, escudo: 0.08 }` | Base per-second drain (`x1.00`) |
| `MULT_DRENAJE_POR_JORNADA` | `[0.70, 0.85, 1.00, 1.15, 1.25]` | D1..D5 |
| `COSTO_INTENTO_MINIJUEGO` | `nodos: -3`, `valvulas: -2`, `escudo: -2` Energy | On opening a station |
| `RECARGA_COMPLETA` | `+20` Energy | End-of-day reward when all missions are completed |
| `MULT_MODULO_DANADO` | `x1.25` | Applied to the damaged module's resource |
| `REFUERZO_CONTROL_MISION` | `{ energia: +15, aire: +10 }` | One-time boost after `2` consecutive incomplete days |
| `ELECCIONES.envio_energia` | `mandarAire (+30 Air, -6 E)` / `mandarEscudo (+30 Shield, -6 E)` | Neither choice dominates |
| `ELECCIONES.invernadero` | `plenaLuz (+38 Air, -8 E)` / `ahorro (+24 Air, -3 E)` | Neither choice dominates |
| `ELECCIONES.escudo_potencia` | `potenciaAlta (+32 Shield, -8 E)` / `potenciaBaja (+20 Shield, -3 E)` | Neither choice dominates |
| `AGUA_BAJA_MULT_AIRE` | `x1.15` | If the Day 2 leak (`40s`) expires |
| `EFECTOS_EVENTO_FLR` (D3 `90s`) | `refugiarte (-12 E, forfeits pending missions)` / `seguirTrabajando (-25 Shield)` | Restricted to `'media'` on D3 to preserve a minimum `>= 10%` |
| `EFECTOS_APAGON` (D4 `70s`) | `soporteVida (-16 Air)` / `escudos (-22 Shield)` / `invernadero (-10 E, forfeits Greenhouse missions)` | Neither choice dominates |
| `EFECTOS_EVENTO_TORMENTA_GRANDE` (D5 `100s`) | `refugiarte (-15 E, forfeits pending missions)` / `seguirTrabajando (-35 Shield)` | Neither choice dominates |
| `RANGOS` | `commander: 5`, `specialist: 4`, `cadet: 2`, `trainee: 0` | Based on fully completed days |

### Combinatorial Simulation (`src/game/simulation.ts`)

```bash
npx tsx -e "import { simularSemana } from './src/game/simulation'; console.log(simularSemana('perfecto', { nivelJ3: 'media', nivelJ5: 'fuerte' }));"
```

| Combination `(D3, D5)` | Policy | Weekly Minimum (`A / E / S`) | Week-End Values (`A / E / S`) | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `(media, media)` *(valid)* | `perfecto` | `13.7 / 13.1 / 30.7` | `13.7 / 33.0 / 30.7` | **Completes D5** (min `>= 10`, final `< 40`) |
| `(media, media)` *(valid)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | **Evacuated on D5** (`>= 3`) |
| `(media, media)` *(valid)* | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | **Evacuated on D3** (`<= 3`) |
| `(media, fuerte)` *(valid)* | `perfecto` | `13.7 / 13.1 / 20.7` | `13.7 / 33.0 / 20.7` | **Completes D5** (min `>= 10`, final `< 40`) |
| `(media, fuerte)` *(valid)* | `mediocre` | `0.0 / 14.0 / 0.0` | `0.0 / 14.0 / 0.0` | **Evacuated on D5** (`>= 3`) |
| `(media, fuerte)` *(valid)* | `pasivo` | `0.0 / 57.0 / 69.6` | `0.0 / 57.0 / 69.6` | **Evacuated on D3** (`<= 3`) |

---

## 4. Use of AI

The full, transparent disclosure of AI assistance is available in [`docs/uso-de-ia.md`](docs/uso-de-ia.md), along with submission materials in [`docs/pagina-proyecto.md`](docs/pagina-proyecto.md) and [`docs/guion-demo.md`](docs/guion-demo.md). No NASA scientific or historical data was invented by AI: all locally stored records that have not undergone human verification are explicitly labeled **Dato de ejemplo / Sample data** until a human runs `scripts/fetch-donki.mjs` and validates each field.

---

## 5. Text Pending Human Review

All keys in `src/i18n.ts` have exact `ES`/`EN` parity (tested by `tests/i18n.test.ts`). Before publishing the final hackathon version, human review is recommended for:

- **Child-friendly `EN` text (ages 7–12)**: `glosario.terminos.*`, `tutorial.*`, `eventoClima.*`, `sellos.*`, `fuentes.*`, `semanas.*`, `rangos.*`, `informe.*`, `mascota.*`, and `cierres.*`.
- **Curated summaries**: `textoNinos.es` / `textoNinos.en` fields in `src/data/eventos.json` and `src/data/osdr.json` when loading real, verified events/records.
- **Placeholders in `docs/` and `src/data/creditos.ts`**: fill in the bracketed placeholders (`[nombre del equipo]`, `[año]`, `[licencia]`, `[herramientas usadas]`, `[qué revisó el equipo]`).

---

## 6. Debug Reference and Manual Verification

Add `?debug=1` to the URL (`http://localhost:3000/?debug=1`) to enable shortcuts, or `?debug=1&perf=1` to also display the FPS and active-particle counter from startup.

### `?debug=1` Keyboard Shortcuts

| Key | Action | Notes and Preserved Key Conflicts |
| :--- | :--- | :--- |
| `1`, `2`, `3` | Subtract `10` from **Air**, **Energy**, or **Shield** | — |
| `Shift + 1`, `2`, `3` | Add `10` to **Air**, **Energy**, or **Shield** | — |
| `Alt + 1` .. `Alt + 5` | Jump directly to **Day 1..5** | — |
| `J` | Jump directly to **Day 3** | — |
| `V` | Trigger the current day's event | — |
| `B` | Toggle `aguaBaja` on/off | — |
| `M` | Complete the next pending (or urgent) mission | — |
| `X` | Fail / mark the next pending mission as lost | — |
| `O` | Show / hide the mission-status overlay | — |
| `G` | Manually damage / repair the **Energy** module | — |
| `T` | Toggle clock speed and resource drain (`x1` / `x10`) | — |
| `N` | Advance to the next day | — |
| `K` | Force the end of the current day (normal evaluation) | — |
| `C` | Force a **completed-day** ending | Completes the day's missions and triggers the ending |
| `Shift + C` | Force an **incomplete-day** ending | Marks a mission as pending/lost and triggers the ending |
| `I` | Open the **Final Report** with test data in `bitacora` | Jumps to completed D5 and opens `InformeScene` |
| `L` / `Shift + E` | Force **immediate evacuation** | **Preserved key conflict**: `E` without `Shift` remains **Use Station** |
| `F` | Show / hide the **FPS and active-particle counter** | Also starts visible with `?debug=1&perf=1` |
| `Shift + S` | Enable / mute **Sound** | **Preserved key conflict**: `S` without `Shift` remains Move Down (`WASD`) |

### Pre-Submission Manual Verification Checklist

- [ ] **Mobile / touchscreen (`390x844` / `Fit`)**: move by tapping rooms, press **Use**, play Nodes, Valves, and Shield, and verify that every button is at least `56px` without overlapping.
- [ ] **Demo Mode (`?demo=1`)**: complete Day 3 in `< 4` minutes, respond to the solar flare, and validate the demo-end screen.
- [ ] **Full week (5 days)**: play through D1 (with tutorial), D2 (urgent leak), D3 (FLR), D4 (power outage), and D5 (major storm) until the **Final Report**, rank, and copy-result option appear.
- [ ] **Live ES / EN switching**: toggle the language in Menu, HUD, Settings, Glossary, Sources, Credits, and Final Report while checking **Large Text (`x1.25`)**.
- [ ] **Mute and volume**: mute from Menu, HUD, Pause, and Settings, adjust the volume, and reload to verify that the preference persists in `localStorage` and no sound plays before a click/key press.
- [ ] **Reduced Motion**: enable it in Settings and confirm in HUD/Base that there is no screen shake, pulsing, or moving streaks while static outlines and `'!'` icons remain.
- [ ] **Offline operation**: build with `npm run build && npm run check`, switch DevTools to *Offline*, and confirm that no resources fail to load and no network requests appear.

---

## 7. Next Steps

1. Run `NASA_API_KEY=... node scripts/fetch-donki.mjs` using real dates selected by the team, review child-friendly text in `src/data/eventos.json`, and set `"verificado": true` only for validated records.
2. Fill in team/license/tool placeholders in `src/data/creditos.ts`, `docs/uso-de-ia.md`, and `docs/pagina-proyecto.md`.
3. Conduct a native-English pedagogical and linguistic review of the `EN` keys listed in Section 5.
4. Record the presentation video using `?demo=1` and following `docs/guion-demo.md`.

---

## Project Structure

```text
docs/
  pagina-proyecto.md      // NASA Space Apps submission information
  guion-demo.md           // Timed presentation script (~3–4 min)
  uso-de-ia.md            // Transparent disclosure of AI tools and human curation
scripts/
  fetch-donki.mjs         // Manual offline script to query NASA DONKI (not used at runtime)
  check-bundle.mjs        // dist/ audit: total size, JS gzip <= 1.2 MB, and external URLs
src/
  main.ts                 // Entry point: initializes audioEngine, loads local Nunito, and creates Phaser.Game
  config.ts               // Screen constants (1280x720, TILE=64, HUD_H=80) and ?debug/?demo/?perf flags
  i18n.ts                 // ES/EN bilingual system with interpolation and strict key parity
  art/
    mascota.ts            // Procedural "Luni" mascot with states + reusable short-message widget
    texturas.ts           // Procedural canvas generation for floors, walls, details, and astronaut (4 frames)
  audio/
    sonidos.ts            // Pure definitions of gentle WebAudio tones (no continuous music)
    audio.ts              // Audio engine: gesture-triggered startup, <= 4 voices, >= 150ms cooldown, silent fallback
  fx/
    efectos.ts            // Pure resource-state evaluator, visual layers, and preallocated particle pool
    cierres.ts            // Skippable animated sequences for complete, incomplete, and evacuation endings
  data/
    donki/README.md       // Local archive policy; no imports into src/
    creditos.ts           // Authorship, dependency, and license metadata
    eventos.json          // Local catalog of 6 events for the 3 weeks (verified/sample)
    eventosLoader.ts      // Safe loader, date label, and D3 intensity restriction
    fuentes.ts            // Transparent metadata for archive, balance, and technology sources
    osdr.json             // Optional locally curated educational note
    osdrLoader.ts         // Safe OSDR data loader with transparent labeling
  game/
    state.ts              // Single game state, logbook, debug helpers, and typed event emitter
    balance.ts            // Calibrated balance figures, RANGOS, and visual/audio constants
    bitacora.ts           // Pure decision logging and main resource-consumption cause tracking
    clock.ts              // Pure day-clock logic
    closing.ts            // Pure day-ending and damaged-module logic
    events.ts             // Pure event reading and helpers (Leak, Space Weather, Power Outage)
    glosario.ts           // Bilingual educational glossary terms
    informe.ts            // Rank calculation and Final Report summary
    jornadas.ts           // Definitions of the 5 days, missions, and events
    missions.ts           // Pure mission, cost, choice, and formatting logic
    map.ts                // ASCII map, rooms, stations, collisions, and utilities
    pathfinding.ts        // Pure BFS on the grid (4 directions)
    semanas.ts            // Definitions and utilities for the 3 lunar weeks
    settings.ts           // Persistent settings (idioma, textoGrande, movimientoReducido, sonido, volumen, tutorialVisto, ultimaSemana)
    simulation.ts         // Pure 5-day simulation engine with configurable intensity levels
    tutorial.ts           // Pure state machine for the 7-step interactive tutorial
  minigames/
    types.ts              // Contracts and shared MinigameView interface
    registry.ts           // Shared registry for the 3 minigames
    nodos.ts / valvulas.ts / escudo.ts
    views/                // NodosView.ts, ValvulasView.ts, EscudoView.ts
  scenes/
    BootScene.ts          // Generates procedural textures and launches Menu or Demo
    MenuScene.ts          // Main menu with Sound, ES/EN, Weeks, Demo, Glossary, Sources, Settings, and Credits
    SemanaScene.ts        // Selector for 3 lunar weeks + Surprise button
    FuentesScene.ts       // Sources and real science screen
    GlosarioScene.ts      // Bilingual lunar glossary screen
    AjustesScene.ts       // Settings screen (ES/EN, Large Text, Reduced Motion, Sound/Volume, Tutorial)
    CreditosScene.ts      // Credits and licenses screen
    BaseScene.ts          // Map, astronaut, missions, effects, ?perf=1 counter, and ?debug=1 shortcuts
    HUDScene.ts           // Icon/status bars, arc-shaped timer, Luni, Sound button, and Pause
    MinigameScene.ts      // Generic host for registered minigames
    ChoiceScene.ts        // Station-specific tactical choice overlay with cost chips
    EventScene.ts         // Space-weather event overlay with Luni + glossary chips
    ApagonScene.ts        // Power-outage event overlay on Day 4
    OverlayScene.ts       // Pause (with Sound button), animated endings, demo ending, and evacuation
    InformeScene.ts       // Final Report with rank, logbook, main cause, and copy button
    TutorialScene.ts      // Interactive 7-step tutorial overlay
  ui/
    contrast.ts           // WCAG AA palette contrast validation
    focus.ts              // Reusable keyboard focus manager with >= 3px focus ring
    glosarioModal.ts      // Reusable glossary modal
    icons.ts              // Vector icons drawn with Graphics (including Sound)
    targets.ts            // Registry of UI target coordinates by name
    theme.ts              // Visual palette, typography, Large Text scaling, and UI metrics
tests/
  audio.test.ts           // WebAudio tests: mute, 4-voice cap, 150ms cooldown, and resilience
  bitacora.test.ts        // Decision logging and primary resource-consumption cause tests
  closing.test.ts        // Day-ending, damaged-module, boost, event, and Demo tests
  contrast.test.ts       // WCAG contrast, Large Text scaling, and UI target tests
  creditos.test.ts       // Credits and license tests
  efectos.test.ts        // Pure visual-state and particle/shake limit tests
  escudo.test.ts         // Shield rotation, coverage, and completion tests
  eventos.test.ts        // eventosLoader, archive label, D3 restriction, and 3-week tests
  glosario.test.ts       // Glossary term and ES/EN coverage tests
  i18n.test.ts           // ES/EN key parity, placeholder, and interpolation tests
  informe.test.ts        // Rank calculation and Final Report summary tests
  jornadas.test.ts       // Structural validation of the 5 days, steps, and choices
  mascota.test.ts        // Pure Luni mood-state tests
  missions.test.ts       // Mission, cost, and station-flow tests
  no-red.test.ts         // Static check for no network/fetch/external URLs in src/
  nodos.test.ts          // Node generation, rotation, and circuit tests
  osdr.test.ts           // OSDR loader and transparent labeling tests
  pathfinding.test.ts    // BFS pathfinding and logical collision tests
  settings.test.ts       // Settings persistence and subscription tests (including sound/volume)
  simulation.test.ts     // 4x3 mathematical simulation and non-dominance tests
  state.test.ts          // Single-state, resource-drain, and pause tests
  tutorial.test.ts       // 7-step interactive tutorial and pause-rule tests
  valvulas.test.ts       // Valve sequence, gauge, and limit tests
```

## Textos EN pendientes de revisión humana

Claves nuevas del menú (ES y EN tienen las mismas claves):
`menu.idiomaEs`, `menu.idiomaEn`, `menu.costoDecision`, `menu.demoHint`,
`menu.listoComandante`, `menu.datosReales`, `menu.datosEjemplo`,
`menu.eventoArchivo`, `menu.eventoEjemplo`, `menu.fuenteArchivo`,
`menu.etiquetaArchivo`, `menu.etiquetaEjemplo`, `menu.origenDatos`.

Se conservan `days` y `Power` porque son los términos del HUD y del cierre en EN.
El enlace de procedencia se añade después de Sonido en Tab, conservando primero
Jugar, Demo, Glosario, Fuentes, Ajustes, Créditos, ES, EN y Sonido.
El lienzo lógico sigue siendo 1280×720 con Scale FIT; texto grande reorganiza
los accesos secundarios en dos filas sin reducir el tamaño de letra.

# Entrenador Lunar Junior

Juego educativo 2D (vista cenital) para niños de 7 a 12 años diseñado para el reto **Entrenador de misiones para astronautas junior** (NASA Space Apps 2026), construido con **Vite + TypeScript (`strict: true`) + Phaser 3 + Vitest**.

## 1. Cómo jugar

```bash
npm install
npm run dev      # Abre el servidor de desarrollo en http://localhost:3000
npm run build    # Compila el sitio estático en dist/ (base: './')
npm run check    # Audita dist/ (JS gzip <= 1.2 MB y política sin red/URLs)
npm run preview  # Previsualiza la compilación estática
npm test         # Ejecuta todas las pruebas unitarias y la simulación con Vitest
npm run lint     # Verifica tipos con TypeScript strict (tsc --noEmit)
```

### Modos de entrada por URL
- **Juego normal**: `/` abre `MenuScene` con **Jugar la semana** (selector de 3 semanas de 5 jornadas), **Demo de 4 minutos**, **Glosario**, **Fuentes**, **Ajustes**, **Créditos**, selector rápido **ES / EN** y botón rápido de **Sonido**.
- **Modo Demo (`?demo=1`)**: inicia directo en la **Jornada 3** (`120s`), con recursos iniciales `{ aire: 70, energia: 65, escudo: 80 }` y el evento de fulguración solar disparando a los `50s`.
- **Modo Debug (`?debug=1`)** y **Rendimiento (`?debug=1&perf=1`)**: activan atajos de inspección y el contador en vivo de FPS y partículas (sin `?debug=1` no existen atajos ni overlays de debug).

### Flujo de juego (5 jornadas completas)
1. **Menú y misiones activas**: cada jornada publica entre 1 y 2 misiones principales con estación y minijuego asignados (Jornada 1 incluye 2 misiones: Energía y Escudos). En el mapa se muestran el panel de misiones pendientes y el marcador en la estación activa. En la Jornada 1, si es la primera vez, arranca el tutorial interactivo de 7 pasos.
2. **Tres minijuegos con registro común (`MINIGAME_REGISTRY`)**:
   - **Nodos (`energia`)**: circuito de cables (`4x3`) con rotación hasta conectar Entrada con Salida (costo de intento `-3%` Energía, límite `60s`, pista visual a los `10s`).
   - **Válvulas (`invernadero` / `tanque`)**: secuencia de válvulas A/B/C mientras sube el medidor de presión (`+2.5/s`, acierto `-15`, error `+18`, costo de intento `-2%` Energía, límite `45s`).
   - **Escudo (`escudos`)**: alinear los paneles del campo deflector antes del impacto (costo de intento `-2%` Energía, límite `45s`).
3. **Elecciones por estación (`ChoiceScene`)**: tras completar una misión normal se abre la decisión táctica con ganancias (`+`) y costos (`-`) visibles:
   - `envio_energia` (`energia`): **Mandar a Aire** vs **Mandar a Escudo**.
   - `invernadero` (`invernadero`): **Plena luz** vs **Ahorro de agua y luz**.
   - `escudo_potencia` (`escudos`): **Potencia alta** vs **Potencia baja**.
4. **Los 4 eventos de la semana**:
   - **Jornada 2 (`45s`) — Fuga en Tanque**: misión urgente (`35s` de ventana) que no pausa el reloj ni requiere `ChoiceScene`; si expira, activa `aguaBaja` en la Jornada 3 (drenaje de Aire `x1.15`).
   - **Jornada 3 (`60s`) — Fulguración solar (`FLR`)**: pausa la jornada y da a elegir **Refugiarte** (`-12` Energía y pierde las misiones pendientes de la jornada) o **Seguir trabajando** (`-25` Escudo).
   - **Jornada 4 (`50s`) — Apagón (`ApagonScene`)**: pausa y obliga a apagar uno de 3 módulos (**Soporte de vida** `-16` Aire, **Escudos** `-22` Escudo o **Invernadero** `-10` Energía y pierde misiones pendientes de Invernadero).
   - **Jornada 5 (`70s`) — Tormenta grande (`TORMENTA_GRANDE`)**: alerta mayor con decisión entre **Refugiarte** (`-15` Energía y pierde pendientes) o **Seguir trabajando** (`-35` Escudo).
5. **Cierre, Bitácora e Informe Final**:
   - Secuencias animadas cortas y saltables (`src/fx/cierres.ts`) acompañadas por **Luni** (`src/art/mascota.ts`) y audio sintetizado suave (`src/audio/audio.ts`).
   - Al completar la Jornada 5 o sufrir una evacuación (`Aire <= 0%`) en modo semana se abre `InformeScene` con el rango obtenido (`Comandante`, `Especialista`, `Cadete` o `Astronauta en entrenamiento`), bitácora de decisiones difíciles, datos usados, nota opcional de OSDR y botón para copiar resultado.

### Audio, efectos y accesibilidad
- **Audio sintetizado con WebAudio (`src/audio/audio.ts`, `src/audio/sonidos.ts`)**: cero archivos `.mp3/.ogg` ni música continua. Se inicializa de forma diferida tras el primer gesto del usuario (`pointerdown`/`keydown`), limita a **4 voces simultáneas**, aplica enfriamiento de **150 ms** entre alertas idénticas y falla en silencio si `AudioContext` no existe. Botón de silencio accesible (`>= 56px`) en Menú, HUD, Pausa y Ajustes (con control de volumen).
- **Accesibilidad persistente (`src/game/settings.ts`, `contrast.ts`, `focus.ts`, `targets.ts`)**: idioma **ES/EN** instantáneo, **Texto grande (`x1.25`)**, **Movimiento reducido** (desactiva pulsos, temblores y partículas en movimiento dejando bordes estáticos y badge `'!'`), y navegación completa por teclado (`Tab`, flechas, `Enter`/`Space`, `Escape`).

---

## 2. Cómo se obtuvieron los datos

El juego funciona **100 % sin conexión y sin llamadas de red en tiempo de ejecución** (`src/` no usa `fetch`, `XMLHttpRequest` ni importa archivos crudos; verificado por `tests/no-red.test.ts` y `npm run check`).

### Datos locales curados de NASA DONKI (`src/data/eventos.json`)
1. Se definieron **3 semanas seleccionables** (`semana-1`, `semana-2`, `semana-3` en `src/game/semanas.ts`) vinculadas a 6 eventos curados en `src/data/eventos.json` y expuestos mediante `src/data/eventosLoader.ts`.
2. Para consultar eventos reales del catálogo **NASA DONKI (FLR y SEP)** de forma manual y guardar trazabilidad offline:
   - Edita las fechas reales (`YYYY-MM-DD`) de `SEMANAS` dentro de `scripts/fetch-donki.mjs`.
   - Ejecuta manualmente desde terminal con tu clave personal:
     ```bash
     NASA_API_KEY=TU_CLAVE node scripts/fetch-donki.mjs
     ```
   - El script guarda `src/data/donki/semana-1.raw.json`, `semana-2.raw.json` y `semana-3.raw.json` con `consultadoEn`, `ventana`, `flr` y `sep`. **Nunca** se importan esos `*.raw.json` desde `src/`.
3. **Sello honesto automático**: cada evento marcado con `"verificado": true` requiere `id`, `semana`, `jornada` (`3` o `5`), `tipo` (`'FLR'` o `'SEP'`), `fecha` ISO válida, `clase`, `nivel` (`'media'` o `'fuerte'`), `fuenteNombre`, `fuenteUrl`, `consultadoEn` y `textoNinos` (`es`/`en`). Si `"verificado": false` o falta algún campo, `eventosLoader.ts` asigna `esEjemplo: true` y la interfaz muestra **Dato de ejemplo / Sample data** en lugar de afirmar que es dato en vivo.
4. **Datos opcionales de NASA OSDR (`src/data/osdr.json`, `osdrLoader.ts`)**: nota educativa complementaria de biología espacial curada localmente con el mismo sello honesto (`verificado: false` por defecto hasta revisión humana).

---

## 3. Qué es balance de juego y qué es dato de la NASA

| Concepto | Clasificación | Detalle |
| :--- | :--- | :--- |
| Catálogo, fechas, clases (`M`/`X`) y ventanas de FLR y SEP | **Dato histórico de archivo (NASA DONKI)** | Solo cuando `"verificado": true` en `src/data/eventos.json`; en caso contrario se etiqueta explícitamente como **Dato de ejemplo**. |
| Notas educativas opcionales sobre plantas/radiación | **Dato curado local (NASA OSDR)** | `src/data/osdr.json`, siempre acompañado de su sello de archivo o ejemplo. |
| Porcentajes iniciales (`70%–80%` aleatorios), drenajes por segundo, costos de minijuegos, efectos de decisiones/eventos, duraciones (`120s`), rangos y mascota **Luni** | **Balance y diseño educativo del juego** | Definidos en `src/game/balance.ts`, `src/art/mascota.ts` e `src/i18n.ts`; declarados expresamente como simulación educativa en `FuentesScene`, `MinigameScene`, `EventScene` e `InformeScene`. |

### Parámetros finales calibrados (`src/game/balance.ts`)

| Constante | Valor calibrado | Nota |
| :--- | :--- | :--- |
| `DURACION_JORNADA` | `120` s | `5` jornadas (`2` minutos por jornada, `120` s en Demo) |
| `RANGO_RECURSOS_INICIALES` | `70`–`80` % | Sorteo inicial independiente por recurso (`75` base en simulación) |
| `DRENAJE_BASE_POR_SEG` | `{ aire: 0.38, energia: 0.12, escudo: 0.105 }` | Por segundo base (`x1.00`) |
| `MULT_DRENAJE_POR_JORNADA` | `[0.70, 0.85, 1.00, 1.15, 1.25]` | J1..J5 |
| `COSTO_INTENTO_MINIJUEGO` | `nodos: -3`, `valvulas: -2`, `escudo: -2` Energía | Al abrir estación |
| `RECARGA_COMPLETA` | `+20` Energía | Cierre con todas las misiones hechas |
| `MULT_MODULO_DANADO` | `x1.25` | Sobre el recurso del módulo dañado |
| `REFUERZO_CONTROL_MISION` | `{ energia: +15, aire: +10 }` | Único, tras `2` incompletas seguidas |
| `ELECCIONES.envio_energia` | `mandarAire (+30 Aire, -6 E)` / `mandarEscudo (+30 Esc, -6 E)` | No dominadas |
| `ELECCIONES.invernadero` | `plenaLuz (+38 Aire, -8 E)` / `ahorro (+24 Aire, -3 E)` | No dominadas |
| `ELECCIONES.escudo_potencia` | `potenciaAlta (+32 Esc, -8 E)` / `potenciaBaja (+20 Esc, -3 E)` | No dominadas |
| `AGUA_BAJA_MULT_AIRE` | `x1.15` | Si expira la fuga de J2 (`35s` a los `45s`) |
| `EFECTOS_EVENTO_FLR` (J3 `60s`) | `refugiarte (-12 E, pierde pendientes)` / `seguirTrabajando (-25 Esc)` | Restringido a `'media'` en J3 para conservar mínimo `>= 10%` |
| `EFECTOS_APAGON` (J4 `50s`) | `soporteVida (-16 Aire)` / `escudos (-22 Esc)` / `invernadero (-10 E, pierde Inv.)` | No dominadas |
| `EFECTOS_EVENTO_TORMENTA_GRANDE` (J5 `70s`) | `refugiarte (-15 E, pierde pendientes)` / `seguirTrabajando (-35 Esc)` | No dominadas |
| `RANGOS` | `commander: 5`, `specialist: 4`, `cadet: 2`, `trainee: 0` | Basados en jornadas completas |

### Simulación combinatoria (`src/game/simulation.ts`)

```bash
npx tsx -e "import { simularSemana } from './src/game/simulation'; console.log(simularSemana('perfecto', { nivelJ3: 'media', nivelJ5: 'fuerte' }));"
```

| Combinación `(J3, J5)` | Política | Mínimo semana (`A / E / S`) | Final semana (`A / E / S`) | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| `(media, media)` *(válida)* | `perfecto` | `20.3 / 14.9 / 22.6` | `20.3 / 34.7 / 22.6` | **Completa J5** (mín `>= 10`, final `< 40`) |
| `(media, media)` *(válida)* | `mediocre` | `0.0 / 0.0 / 0.0` | `0.0 / 0.0 / 0.0` | **Evacuado en J5** (`>= 3`) |
| `(media, media)` *(válida)* | `pasivo` | `0.0 / 49.7 / 52.6` | `0.0 / 61.4 / 52.6` | **Evacuado en J3** (`<= 3`) |
| `(media, fuerte)` *(válida)* | `perfecto` | `20.3 / 14.9 / 12.6` | `20.3 / 34.7 / 12.6` | **Completa J5** (mín `>= 10`, final `< 40`) |
| `(media, fuerte)` *(válida)* | `mediocre` | `0.0 / 0.0 / 0.0` | `0.0 / 0.0 / 0.0` | **Evacuado en J5** (`>= 3`) |
| `(media, fuerte)` *(válida)* | `pasivo` | `0.0 / 49.7 / 52.6` | `0.0 / 61.4 / 52.6` | **Evacuado en J3** (`<= 3`) |

---

## 4. Uso de IA

La declaración transparente y completa de asistencia por IA se encuentra en [`docs/uso-de-ia.md`](docs/uso-de-ia.md), junto con los materiales de entrega en [`docs/pagina-proyecto.md`](docs/pagina-proyecto.md) y [`docs/guion-demo.md`](docs/guion-demo.md). Ningún dato científico o histórico de la NASA fue inventado por IA: todos los registros locales sin verificación humana aparecen explícitamente marcados como **Dato de ejemplo / Sample data** hasta que un humano ejecute `scripts/fetch-donki.mjs` y valide cada campo.

---

## 5. Textos pendientes de revisión humana

Todas las claves de `src/i18n.ts` tienen paridad exacta `ES`/`EN` (probada por `tests/i18n.test.ts`). Antes de publicar la versión final del hackathon se recomienda revisión humana de:

- **Bloques `EN` para niños (7–12 años)**: `glosario.terminos.*`, `tutorial.*`, `eventoClima.*`, `sellos.*`, `fuentes.*`, `semanas.*`, `rangos.*`, `informe.*`, `mascota.*` y `cierres.*`.
- **Resúmenes curados**: campos `textoNinos.es` / `textoNinos.en` de `src/data/eventos.json` y `src/data/osdr.json` al cargar eventos/registros reales verificados.
- **Marcadores en `docs/` y `src/data/creditos.ts`**: completar los placeholders entre corchetes (`[nombre del equipo]`, `[año]`, `[licencia]`, `[herramientas usadas]`, `[qué revisó el equipo]`).

---

## 6. Tabla de debug y verificación manual

Agrega `?debug=1` a la URL (`http://localhost:3000/?debug=1`) para activar atajos, o `?debug=1&perf=1` para mostrar también desde el arranque el contador de FPS y partículas vivas.

### Tabla de atajos `?debug=1`

| Tecla | Acción | Notas y colisiones conservadas |
| :--- | :--- | :--- |
| `1`, `2`, `3` | Restar `10` a **Aire**, **Energía** o **Escudo** | — |
| `Shift + 1`, `2`, `3` | Sumar `10` a **Aire**, **Energía** o **Escudo** | — |
| `Alt + 1` .. `Alt + 5` | Saltar directo a la **Jornada 1..5** | — |
| `J` | Saltar directo a la **Jornada 3** | — |
| `V` | Disparar el evento de la jornada actual | — |
| `B` | Activar / desactivar `aguaBaja` | — |
| `M` | Completar la siguiente misión pendiente (o urgente) | — |
| `X` | Fallar / marcar perdida la siguiente misión pendiente | — |
| `O` | Mostrar / ocultar overlay de estado de misiones | — |
| `G` | Dañar / reparar manualmente el módulo de **Energía** | — |
| `T` | Alternar velocidad del reloj y drenaje (`x1` / `x10`) | — |
| `N` | Avanzar a la siguiente jornada | — |
| `K` | Forzar fin de la jornada actual (evaluación natural) | — |
| `C` | Forzar cierre de **jornada completa** | Completa misiones de la jornada y dispara cierre |
| `Shift + C` | Forzar cierre de **jornada incompleta** | Marca misión pendiente/perdida y dispara cierre |
| `I` | Abrir **Informe Final** con datos de prueba en `bitacora` | Salta a J5 completo y abre `InformeScene` |
| `L` / `Shift + E` | Forzar **evacuación inmediata** | **Colisión conservada**: `E` sin `Shift` se mantiene para **Usar estación** |
| `F` | Mostrar / ocultar contador de **FPS y partículas vivas** | También inicia visible con `?debug=1&perf=1` |
| `Shift + S` | Activar / silenciar **Sonido** | **Colisión conservada**: `S` sin `Shift` se mantiene para caminar abajo (`WASD`) |

### Checklist de verificación manual antes de entregar

- [ ] **Móvil / pantalla táctil (`390x844` / `Fit`)**: caminar tocando salas, pulsar **Usar**, jugar Nodos, Válvulas y Escudo, y comprobar que todos los botones miden al menos `56px` sin solaparse.
- [ ] **Modo Demo (`?demo=1`)**: completar en `< 4` minutos la Jornada 3, responder a la fulguración solar y validar la pantalla de fin de demo.
- [ ] **Semana completa (5 jornadas)**: recorrer J1 (con tutorial), J2 (fuga urgente), J3 (FLR), J4 (apagón) y J5 (tormenta grande) hasta ver **Informe Final**, rango y copiar resultado.
- [ ] **Cambio ES / EN en vivo**: alternar idioma en Menú, HUD, Ajustes, Glosario, Fuentes, Créditos e Informe Final comprobando `Texto grande (x1.25)`.
- [ ] **Silencio y volumen**: silenciar desde Menú, HUD, Pausa y Ajustes, ajustar volumen y recargar verificando que la preferencia persiste en `localStorage` y que nunca suena sin clic/tecla previo.
- [ ] **Movimiento reducido**: activarlo en Ajustes y confirmar en HUD/Base que no hay temblores, pulsos ni rayas móviles, manteniéndose los bordes estáticos e iconos `'!'`.
- [ ] **Sin red (offline)**: construir con `npm run build && npm run check`, abrir con DevTools en modo *Offline* y confirmar que no falla ningún recurso ni aparecen llamadas de red.

---

## 7. Próximos pasos

1. Ejecutar `NASA_API_KEY=... node scripts/fetch-donki.mjs` con fechas reales elegidas por el equipo, revisar los textos infantiles en `src/data/eventos.json` y activar `"verificado": true` únicamente en los registros validados.
2. Completar los marcadores de equipo/licencia/herramientas en `src/data/creditos.ts`, `docs/uso-de-ia.md` y `docs/pagina-proyecto.md`.
3. Realizar la revisión pedagógica y lingüística nativa de las claves `EN` listadas en la sección 5.
4. Grabar el video de presentación siguiendo `docs/guion-demo.md` utilizando `?demo=1`.

---

## Estructura del proyecto

```text
docs/
  pagina-proyecto.md      // Ficha de entrega para NASA Space Apps
  guion-demo.md           // Guion cronometrado de presentación (~3-4 min)
  uso-de-ia.md            // Declaración transparente de herramientas IA y curaduría humana
scripts/
  fetch-donki.mjs         // Script manual offline para consultar NASA DONKI (sin uso en runtime)
  check-bundle.mjs        // Auditoría de dist/: tamaño total, JS gzip <= 1.2 MB y URLs externas
src/
  main.ts                 // Arranque: inicializa audioEngine, carga Nunito local y crea Phaser.Game
  config.ts               // Constantes de pantalla (1280x720, TILE=64, HUD_H=80) y flags ?debug/?demo/?perf
  i18n.ts                 // Sistema bilingüe ES/EN con interpolación y paridad estricta
  art/
    mascota.ts            // Mascota procedural "Luni" por estados + widget reutilizable con frase corta
    texturas.ts           // Generación procedural en canvas de suelos, paredes, detalles y astronauta (4 frames)
  audio/
    sonidos.ts            // Definiciones puras de tonos WebAudio suaves (sin música continua)
    audio.ts              // MotorAudio: inicio tras gesto, <= 4 voces, >= 150ms cooldown y respaldo silencioso
  fx/
    efectos.ts            // Evaluador puro y capas visuales por recurso + pool pre-asignado de partículas
    cierres.ts            // Secuencias animadas saltables de cierre completo, incompleto y evacuación
  data/
    donki/README.md       // Política de archivo local sin importación en src/
    creditos.ts           // Metadatos de autoría, dependencias y licencias
    eventos.json          // Catálogo local de 6 eventos para las 3 semanas (verificado/ejemplo)
    eventosLoader.ts      // Cargador seguro, sello de fecha y restricción de nivel en J3
    fuentes.ts            // Metadatos honestos de fuentes de archivo, balance y tecnología
    osdr.json             // Nota educativa opcional curada localmente
    osdrLoader.ts         // Cargador seguro de datos OSDR con sello honesto
  game/
    state.ts              // Estado único del juego, bitácora, helpers debug y emisor tipado de eventos
    balance.ts            // Números de balance calibrados, RANGOS y constantes visuales/audio
    bitacora.ts           // Registro puro de decisiones y causas principales de gasto
    clock.ts              // Lógica pura del reloj de jornada
    closing.ts            // Lógica pura de cierre de jornada y módulo dañado
    events.ts             // Lectura y helpers puros de eventos (Fuga, Clima, Apagón)
    glosario.ts           // Términos pedagógicos del glosario bilingüe
    informe.ts            // Cálculo de Rango y resumen del Informe Final
    jornadas.ts           // Definición de las 5 jornadas, misiones y eventos
    missions.ts           // Lógica pura de misiones, costos, elecciones y formato
    map.ts                // Mapa ASCII, salas, estaciones, colisiones y utilidades
    pathfinding.ts        // BFS puro sobre la cuadrícula (4 direcciones)
    semanas.ts            // Definición y utilidades de las 3 semanas lunares
    settings.ts           // Ajustes persistentes (idioma, textoGrande, movimientoReducido, sonido, volumen, tutorialVisto, ultimaSemana)
    simulation.ts         // Motor de simulación pura de 5 jornadas con niveles configurables
    tutorial.ts           // Máquina de estados pura del tutorial interactivo de 7 pasos
  minigames/
    types.ts              // Contratos e interfaz común MinigameView
    registry.ts           // Registro común de los 3 minijuegos
    nodos.ts / valvulas.ts / escudo.ts
    views/                // NodosView.ts, ValvulasView.ts, EscudoView.ts
  scenes/
    BootScene.ts          // Genera texturas procedurales y arranca Menú o Demo
    MenuScene.ts          // Menú inicial con botón de Sonido, ES/EN, Semanas, Demo, Glosario, Fuentes, Ajustes y Créditos
    SemanaScene.ts        // Selector de 3 semanas lunares + botón Sorpresa
    FuentesScene.ts       // Pantalla Fuentes y ciencia real
    GlosarioScene.ts      // Pantalla Glosario lunar bilingüe
    AjustesScene.ts       // Pantalla Ajustes (ES/EN, Texto grande, Movimiento reducido, Sonido/Volumen, Tutorial)
    CreditosScene.ts      // Pantalla Créditos y licencias
    BaseScene.ts          // Mapa, astronauta, misiones, efectos, contador ?perf=1 y atajos ?debug=1
    HUDScene.ts           // Barras con iconos/estados, reloj en arco, Luni, botón Sonido y Pausa
    MinigameScene.ts      // Host genérico para los minijuegos del registro
    ChoiceScene.ts        // Overlay de elecciones tácticas por estación con chips de costo
    EventScene.ts         // Overlay de eventos de clima espacial con Luni + chips glosario
    ApagonScene.ts        // Overlay del evento de apagón en Jornada 4
    OverlayScene.ts       // Pausa (con botón Sonido), secuencias animadas de cierre, fin de demo y evacuación
    InformeScene.ts       // Informe Final con Rango, bitácora, causa principal y botón copiar
    TutorialScene.ts      // Overlay interactivo del tutorial de 7 pasos
  ui/
    contrast.ts           // Validación WCAG AA de la paleta
    focus.ts              // Gestor reutilizable de navegación por teclado y anillo >= 3px
    glosarioModal.ts      // Modal de glosario reutilizable
    icons.ts              // Iconos vectoriales dibujados con Graphics (incluye sonido)
    targets.ts            // Registro de coordenadas de objetivos UI por nombre
    theme.ts              // Paleta visual, tipografías, escalado textoGrande y métricas de UI
tests/
  audio.test.ts           // Pruebas WebAudio: mute, tope 4 voces, cooldown 150ms y resiliencia
  bitacora.test.ts        // Pruebas de registro y causa principal de gasto
  closing.test.ts         // Pruebas de cierre, módulo dañado, refuerzo, eventos y Demo
  contrast.test.ts        // Pruebas de contraste WCAG, escala textoGrande y targets UI
  creditos.test.ts        // Pruebas de créditos y licencias
  efectos.test.ts         // Pruebas puras de estados visuales y límites de partículas/temblor
  escudo.test.ts          // Pruebas de rotación, cobertura y resolución de Escudo
  eventos.test.ts         // Pruebas de eventosLoader, sello de archivo, restricción J3 y 3 semanas
  glosario.test.ts        // Pruebas de términos y cobertura ES/EN del glosario
  i18n.test.ts            // Pruebas de paridad de claves, placeholders e interpolación ES/EN
  informe.test.ts         // Pruebas de cálculo de Rango y resumen final
  jornadas.test.ts        // Validación estructural de las 5 jornadas, pasos y elecciones
  mascota.test.ts         // Pruebas puras de estados de ánimo de Luni
  missions.test.ts        // Pruebas de misiones, costos y flujo por estación
  no-red.test.ts          // Verificación estática de cero red/fetch/URLs externas en src/
  nodos.test.ts           // Pruebas de generación, rotación y circuito de Nodos
  osdr.test.ts            // Pruebas de cargador OSDR con sello honesto
  pathfinding.test.ts     // Pruebas de pathfinding BFS y colisiones lógicas
  settings.test.ts        // Pruebas de persistencia y suscripción de ajustes (incluye sonido/volumen)
  simulation.test.ts      // Simulación matemática 4x3 y verificación de no-dominancia
  state.test.ts           // Pruebas del estado único, drenaje y pausa
  tutorial.test.ts        // Pruebas del tutorial interactivo de 7 pasos y reglas de pausa
  valvulas.test.ts        // Pruebas de secuencia, medidor y límites de Válvulas
```

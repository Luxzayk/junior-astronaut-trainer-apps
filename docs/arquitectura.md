# Arquitectura del repositorio

Vista orientativa del código. El juego es un cliente estático Vite + Phaser 3; no hay backend en runtime.

```text
docs/
  pagina-proyecto.md      # Información de entrega NASA Space Apps
  guion-demo.md           # Guion de presentación (~2–3 min)
  uso-de-ia.md            # Declaración de herramientas de IA y curación humana
  balance.md              # Parámetros calibrados y simulación
  debug.md                # Atajos ?debug=1 y checklist QA
  arquitectura.md         # Este archivo
scripts/
  fetch-donki.mjs         # Consulta manual a NASA DONKI (no se usa en runtime)
  check-bundle.mjs        # Auditoría de dist/: tamaño, JS gzip ≤ 1.2 MB, URLs externas
src/
  main.ts                 # Entrada: audioEngine, Nunito local, Phaser.Game
  config.ts               # Constantes de pantalla (1280×720, TILE=64, HUD_H=80) y flags ?debug/?demo/?perf
  i18n.ts                 # Sistema bilingüe ES/EN con interpolación y paridad de claves
  art/
    mascota.ts            # Mascota procedural "Luni" + widget de mensajes cortos
    texturas.ts           # Generación procedural de suelos, paredes, detalles y astronauta
  audio/
    sonidos.ts            # Definiciones puras de tonos WebAudio (sin música continua)
    audio.ts              # Motor: arranque tras gesto, ≤ 4 voces, cooldown ≥ 150 ms
  fx/
    efectos.ts            # Evaluador de estado visual y pool de partículas
    cierres.ts            # Secuencias saltables de cierre (completa / incompleta / evacuación)
  data/
    donki/README.md       # Política de archivo local; sin imports a src/
    creditos.ts           # Autoría, dependencias y aviso de independencia
    eventos.json          # Catálogo local de eventos (3 semanas)
    eventosLoader.ts      # Carga segura, sellos y restricción de intensidad en J3
    fuentes.ts            # Metadatos transparentes de archivo, balance y tecnología
    osdr.json             # Nota educativa opcional (OSDR)
    osdrLoader.ts         # Carga segura OSDR con sellos
  game/
    state.ts              # Estado único, bitácora, helpers debug y emitter tipado
    balance.ts            # Cifras calibradas, rangos y constantes visuales/audio
    bitacora.ts           # Registro puro de decisiones y causa principal de consumo
    clock.ts              # Reloj de jornada
    closing.ts            # Cierre de jornada y módulos dañados
    events.ts             # Lectura de eventos (fuga, clima espacial, apagón)
    glosario.ts           # Términos del glosario bilingüe
    informe.ts            # Cálculo de rango y resumen del Informe Final
    jornadas.ts           # Definición de las 5 jornadas, misiones y eventos
    missions.ts           # Lógica pura de misiones, costos y elecciones
    map.ts                # Mapa ASCII, salas, estaciones y colisiones
    pathfinding.ts        # BFS en rejilla (4 direcciones)
    semanas.ts            # Definiciones de las 3 semanas lunares
    settings.ts           # Preferencias persistentes (idioma, a11y, sonido, tutorial…)
    simulation.ts         # Motor puro de simulación de 5 jornadas
    tutorial.ts           # Máquina de estados del tutorial interactivo (7 pasos)
  minigames/
    types.ts              # Contratos y MinigameView compartida
    registry.ts           # Registro de los 3 minijuegos
    nodos.ts / valvulas.ts / escudo.ts
    views/                # NodosView, ValvulasView, EscudoView
  scenes/
    BootScene.ts          # Texturas procedurales → Menú o Demo
    MenuScene.ts          # Menú principal
    SemanaScene.ts        # Selector de 3 semanas + Sorpresa
    FuentesScene.ts       # Fuentes y ciencia real
    GlosarioScene.ts      # Glosario lunar
    AjustesScene.ts       # Ajustes (idioma, texto grande, movimiento, sonido)
    CreditosScene.ts      # Créditos y licencias
    BaseScene.ts          # Mapa, astronauta, misiones, efectos, debug
    HUDScene.ts           # Barras, temporizador, Luni, Sonido, Pausa
    MinigameScene.ts      # Host genérico de minijuegos registrados
    ChoiceScene.ts        # Overlay de elección táctica post-misión
    EventScene.ts         # Overlay de clima espacial
    ApagonScene.ts        # Overlay de apagón (J4)
    OverlayScene.ts       # Pausa, cierres animados, fin de demo, evacuación
    InformeScene.ts       # Informe Final
    TutorialScene.ts      # Tutorial interactivo (7 pasos)
  ui/
    contrast.ts           # Validación de contraste WCAG AA
    focus.ts              # Gestor de foco por teclado (≥ 3px)
    glosarioModal.ts      # Modal reutilizable del glosario
    icons.ts              # Iconos vectoriales (Graphics)
    targets.ts            # Registro de coordenadas de objetivos UI
    theme.ts              # Paleta, tipografía, escala de texto grande
tests/
  *.test.ts               # Vitest: lógica pura, a11y, no-red, i18n, simulación, etc.
```

## Principios de diseño

- **Sin red en runtime:** `src/` no usa `fetch` / `XMLHttpRequest`; lo verifica `tests/no-red.test.ts`.
- **Lógica pura separada de vistas:** `game/`, `minigames/*.ts` y loaders son testeables sin Phaser.
- **Datos curados localmente:** `eventos.json` / `osdr.json` con sellos de verificación.
- **Accesibilidad de base:** contraste, foco, targets grandes, texto grande, movimiento reducido, ES/EN.

# Entrenador Lunar Junior / Junior Lunar Trainer

> **Aviso de independencia:** Proyecto independiente creado para NASA Space Apps 2026; no está afiliado ni respaldado por la NASA.  
> **Independence notice:** Independent project created for NASA Space Apps 2026; not affiliated with or endorsed by NASA.

Juego educativo 2D bilingüe (ES/EN) para niñas y niños de **7 a 12 años**. Durante **5 jornadas** cuidas **Aire**, **Energía** y **Escudo** en un puesto lunar, enfrentando fulguraciones y tormentas solares basadas en archivo de **NASA DONKI** — todo **100 % offline**.

**Stack:** Vite · TypeScript (`strict`) · Phaser 3 · Vitest

---

## Español (ES)

### Qué es

Los niños escuchan hablar de misiones a la Luna, pero casi no hay recursos interactivos sencillos que expliquen cómo el **clima espacial** obliga a tomar decisiones difíciles. En *Entrenador Lunar Junior* recorres 6 salas, resuelves 3 minijuegos y eliges trade-offs reales: refugiarte protege el escudo pero puede costar misiones; seguir trabajando cuida las misiones pero golpea la protección.

Al final recibes un **Informe** con rango (Comandante, Especialista, Cadete o Astronauta en entrenamiento), bitácora de decisiones y sellos claros de dato de archivo o ejemplo educativo.

### Cómo ejecutarlo

Requisitos: **Node.js 20+** y npm.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # pruebas Vitest
npm run lint     # TypeScript strict
npm run build    # sitio estático en dist/ (base: './')
npm run check    # audita tamaño gzip y política sin red
npm run preview  # previsualiza el build
```

| Modo | URL | Qué hace |
| :--- | :--- | :--- |
| Normal | `/` | Menú: jugar la semana, demo, glosario, fuentes, ajustes, créditos |
| Demo | `/?demo=1` | Arranca en Jornada 3 (~4 min) con alerta solar |
| Debug | `/?debug=1` | Atajos de inspección (ver [docs/debug.md](docs/debug.md)) |
| Rendimiento | `/?debug=1&perf=1` | Contador FPS / partículas |

### Cómo se juega

1. Elige una de **3 semanas** temáticas (5 jornadas cada una).
2. Camina entre salas (`Energía`, `Invernadero`, `Escudos`, `Tanque`, `Lobby`, `Refugio`) y completa misiones.
3. Tres minijuegos: **Nodos** (circuito), **Válvulas** (secuencia) y **Escudo** (alineación).
4. Tras cada misión normal, una **elección** con costos y beneficios visibles.
5. Eventos de la semana: fuga de agua (J2), fulguración solar (J3), apagón (J4), gran tormenta (J5).
6. Cierre con secuencias de **Luni**, bitácora e **Informe Final**.

### Datos NASA (offline)

El juego **no hace llamadas de red** en ejecución (`tests/no-red.test.ts` + `npm run check`).

- Catálogo curado en [`src/data/eventos.json`](src/data/eventos.json), cargado por `eventosLoader.ts`.
- Origen: eventos históricos **FLR** y **SEP** de **NASA DONKI (CCMC)**.
- Script manual de consulta: [`scripts/fetch-donki.mjs`](scripts/fetch-donki.mjs) (no se usa en runtime).
- Cada tarjeta indica si es **dato de archivo verificado** o **dato de ejemplo**.
- Los porcentajes de Aire / Energía / Escudo son **balance educativo**, no mediciones NASA.

```bash
# Solo para curación offline (requiere tu API key personal)
NASA_API_KEY=TU_CLAVE node scripts/fetch-donki.mjs
```

Detalle de balance y simulación: [docs/balance.md](docs/balance.md).

### Accesibilidad

- Tipografía ≥ 18px y **texto grande ×1.25** opcional
- **Movimiento reducido** (sin sacudidas ni partículas animadas)
- Navegación completa por **teclado** y **toque** (objetivos ≥ 56px)
- Cambio instantáneo **ES / EN**
- Audio sintetizado (WebAudio), mute accesible; no hay `.mp3`/`.ogg`

### Documentación

| Documento | Contenido |
| :--- | :--- |
| [docs/pagina-proyecto.md](docs/pagina-proyecto.md) | Pitch de entrega Space Apps |
| [docs/guion-demo.md](docs/guion-demo.md) | Guion de demo (~2–3 min) |
| [docs/uso-de-ia.md](docs/uso-de-ia.md) | Declaración transparente de uso de IA |
| [docs/balance.md](docs/balance.md) | Parámetros calibrados y simulación |
| [docs/debug.md](docs/debug.md) | Atajos `?debug=1` y checklist QA |
| [docs/arquitectura.md](docs/arquitectura.md) | Estructura del repositorio |

### Equipo

- **Paulo** — Diseño de juego y narrativa educativa
- **Diego** — Programación y sistemas
- **Bonifacio** — Curación de datos y ciencia
- **Josue** — Accesibilidad, pruebas y demostración

### Licencia y créditos

Hecho para **NASA Space Apps 2026**. Tecnologías: Phaser 3 (MIT), TypeScript, Vite, Vitest. Tipografía Nunito (SIL OFL), empaquetada localmente. Créditos in-game en `src/data/creditos.ts`.

---

## English (EN)

### What it is

An educational bilingual 2D game for children aged **7–12**. Across **5 days** you manage **Air**, **Power**, and **Shield** at a lunar outpost while facing solar flares and particle storms from a curated **NASA DONKI** archive — running **100% offline**.

Players walk six rooms, solve three minigames, and face honest trade-offs: sheltering protects the shield but can forfeit missions; keeping work going preserves missions but hits protection. The **Final Report** awards a rank and lists tough decisions with clear archive vs sample-data stamps.

### Run it

Requires **Node.js 20+** and npm.

```bash
npm install
npm run dev      # http://localhost:3000
npm test
npm run lint
npm run build && npm run check
npm run preview
```

| Mode | URL | Purpose |
| :--- | :--- | :--- |
| Normal | `/` | Full menu (week, demo, glossary, sources, settings, credits) |
| Demo | `/?demo=1` | Starts on Day 3 (~4 min) with solar alert |
| Debug | `/?debug=1` | Inspection shortcuts — see [docs/debug.md](docs/debug.md) |
| Perf | `/?debug=1&perf=1` | FPS / particle counter |

### How to play (short)

Pick a themed week → walk rooms → finish Nodes / Valves / Shield → make station choices → handle Day 2–5 events (leak, flare, blackout, major storm) → read the Final Report.

### NASA data (offline)

Zero runtime network calls. Curated local archive in `src/data/eventos.json` from NASA DONKI FLR/SEP records. Manual fetch script: `scripts/fetch-donki.mjs`. UI always labels **verified archive** vs **sample data**. Resource percentages are **game balance**, not NASA measurements. See [docs/balance.md](docs/balance.md).

### Accessibility

Large text ×1.25, reduced motion, full keyboard + touch (targets ≥ 56px), live ES/EN toggle, synthesized muteable WebAudio.

### Docs & team

Same links and team roles as in the Spanish section above. AI disclosure: [docs/uso-de-ia.md](docs/uso-de-ia.md). Submission pitch: [docs/pagina-proyecto.md](docs/pagina-proyecto.md).

---

## Estructura rápida / Quick structure

```text
docs/           # Pitch, demo, IA, balance, debug, arquitectura
scripts/        # fetch-donki.mjs (manual), check-bundle.mjs
src/
  art/ audio/ fx/ data/ game/ minigames/ scenes/ ui/
  main.ts  config.ts  i18n.ts
tests/          # Vitest (incluye no-red, i18n, simulación, a11y)
```

Detalle completo: [docs/arquitectura.md](docs/arquitectura.md).

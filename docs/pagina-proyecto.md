# Página del Proyecto — Entrenador Lunar Junior / Junior Lunar Trainer

> **Aviso de independencia / Independence notice:** Proyecto independiente creado para NASA Space Apps 2026; no está afiliado ni respaldado por la NASA. / Independent project created for NASA Space Apps 2026; not affiliated with or endorsed by NASA.

---

## Español (ES)

### 1. Problema educativo que resuelve
Los niños y niñas de 7 a 12 años escuchan sobre misiones a la Luna, pero casi no existen recursos interactivos sencillos que expliquen cómo el clima espacial (fulguraciones solares y tormentas de partículas) obliga a tomar decisiones difíciles para mantener segura una base lunar.

### 2. Usuario objetivo
Niñas, niños y familias hispanohablantes y angloparlantes de 7 a 12 años, con lectura accesible (mínimo 18px, texto grande x1.25 opcional, movimiento reducido, navegación completa por teclado o toque y soporte bilingüe ES/EN).

### 3. Qué aprende quien juega
- **La energía es limitada:** cada intento y cada ajuste de estación consume reservas que pueden hacer falta más tarde.
- **Las decisiones tienen consecuencias entre jornadas:** descuidar una estación deja un módulo dañado y el agua sin sellar afecta el aire del día siguiente.
- **Toda protección tiene un costo:** refugiarse ante una tormenta solar protege el escudo, pero hace perder misiones del día; seguir trabajando cuida las misiones, pero golpea el escudo.

### 4. Qué datos de la NASA usa y por qué
El juego utiliza un archivo local curado (`src/data/eventos.json`) basado en eventos reales de **NASA DONKI (CCMC)** —fulguraciones solares (`FLR`) y eventos de partículas energéticas solares (`SEP`)— junto con un script manual (`scripts/fetch-donki.mjs`) que estampa fecha de consulta y separa claramente entre datos verificados y ejemplos educativos. En tiempo de ejecución el juego funciona 100% sin conexión (cero llamadas de red), y todas las tarjetas indican honestamente cuándo muestran datos de archivo con su fecha o ejemplos educativos, diferenciando la ciencia real de las reglas de balance del juego.

### 5. Mecánicas principales
El jugador recorre un puesto lunar 2D durante **5 jornadas** cuidando **Aire**, **Energía** y **Escudo**:
- Camina entre 6 salas (`Energía`, `Invernadero / O₂`, `Escudos`, `Tanque de agua`, `Lobby`, `Refugio`) y resuelve 3 minijuegos (`Nodos`, `Válvulas`, `Escudo`).
- Tras cada minijuego toma decisiones con costos y beneficios reales entre recursos.
- Enfrenta eventos guiados por datos: fuga de agua urgente en Jornada 2, alerta de fulguración en Jornada 3, apagón en Jornada 4 y gran tormenta solar en Jornada 5.
- Al cerrar las 5 jornadas (o si el aire llega a 0%), recibe un **Informe Final** con su rango (`Comandante`, `Especialista`, `Cadete`, `Astronauta en entrenamiento`), sus decisiones difíciles, aprendizajes y datos usados.

### 6. Equipo y roles
- `[nombre]` — Diseño educativo y narrativa infantil
- `[nombre]` — Programación del juego (TypeScript + Phaser 3)
- `[nombre]` — Curación de datos NASA DONKI y validación científica
- `[nombre]` — Accesibilidad, pruebas y guion de demostración

### Justificación de premios sugeridos

- **Best Use of Data:** Entrenador Lunar Junior integra eventos históricos de fulguraciones (`FLR`) y tormentas de partículas (`SEP`) del catálogo NASA DONKI mediante un archivo local verificado offline (`eventosLoader.ts`), permitiendo elegir entre 3 semanas temáticas. Cada evento muestra su fuente, fecha, intensidad y sello explícito de archivo o ejemplo educativo, evitando inventar datos y separando con transparencia las mediciones reales del balance del juego.
- **Best Use of Science:** El juego traduce el impacto real del clima espacial y del soporte vital cerrado en decisiones comprensibles para niños de 7 a 12 años sin simplificaciones engañosas. A través de las alertas solares, los apagones, el daño acumulado de módulos y el glosario integrado, los jugadores experimentan por qué proteger a la tripulación de la radiación y mantener el reciclaje de agua y oxígeno exige priorizar recursos limitados.

---

## English (EN)

### 1. Educational problem solved
Children aged 7–12 hear about lunar exploration, yet very few interactive tools explain in plain language how space weather (solar flares and energetic particle storms) forces astronauts to make tough trade-offs to keep a lunar outpost safe.

### 2. Target audience
Children aged 7–12, families, and classrooms in Spanish and English, built with accessibility from the ground up (18px+ typography, optional 1.25x large text, reduced motion, full keyboard and touch controls, and full ES/EN toggle).

### 3. What players learn
- **Power is limited:** every station attempt and boost draws from shared reserves needed later.
- **Choices carry across days:** leaving a station unfinished damages a module, and an unsealed water leak increases air drain the next day.
- **Every protection has a cost:** taking shelter during a solar storm saves the shield at the expense of daily missions; keeping the crew working preserves missions at the expense of shield integrity.

### 4. NASA data used & why
The game uses a curated local archive (`src/data/eventos.json`) built from **NASA DONKI (CCMC)** solar flare (`FLR`) and solar energetic particle (`SEP`) records via an offline curation script (`scripts/fetch-donki.mjs`) that records consultation dates. At runtime the app runs completely offline with zero network requests, and every alert card, menu badge, and report clearly labels verified archive snapshots versus educational samples while keeping NASA data strictly separate from game-balance numbers.

### 5. Core mechanics
Players manage a 2D lunar outpost across **5 days (jornadas)** balancing **Air**, **Power**, and **Shield**:
- Walk across 6 outpost rooms (`Power`, `Greenhouse / O₂`, `Shields`, `Water tank`, `Lobby`, `Shelter`) and complete 3 minigames (`Nodes`, `Valves`, `Shield`).
- Make post-minigame allocation choices where gains in one resource cost another.
- Respond to data-driven events: urgent water leak (Day 2), solar flare alert (Day 3), blackout (Day 4), and strong solar storm (Day 5).
- Review a **Final Report** with earned rank (`Commander`, `Specialist`, `Cadet`, `Astronaut in training`), tough decisions, takeaways, and data stamps (plus a short root-cause report on evacuation).

### 6. Team members & roles
- `[nombre]` — Educational design & kid-friendly writing
- `[nombre]` — Gameplay engineering (TypeScript + Phaser 3)
- `[nombre]` — NASA DONKI data curation & science review
- `[nombre]` — Accessibility, QA testing & demo production

### Award justifications

- **Best Use of Data:** Junior Lunar Trainer embeds curated historical `FLR` and `SEP` space-weather snapshots from NASA DONKI inside a deterministic offline data layer (`eventosLoader.ts`) powering 3 selectable lunar weeks. Every event surfaces its source, date, class/intensity, and an honest archive-checked or sample stamp so real space-weather records are never fabricated or confused with game-balance rules.
- **Best Use of Science:** The game turns space-weather radiation hazards and closed-loop life support into tangible cause-and-effect choices for 7–12-year-olds. By connecting solar alerts, power outages, water recycling, and damaged-module drain across five consecutive days—supported by an in-game glossary—players learn that protecting a lunar habitat always involves trade-offs.

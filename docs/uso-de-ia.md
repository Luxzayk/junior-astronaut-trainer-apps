# Declaración de Uso de Inteligencia Artificial / AI Usage Declaration

> **Proyecto / Project:** Entrenador Lunar Junior / Junior Lunar Trainer (NASA Space Apps 2026)  
> **Aviso:** Proyecto independiente creado para NASA Space Apps 2026; no está afiliado ni respaldado por la NASA.

## Herramientas utilizadas / Tools used
- `[herramientas usadas]` (por ejemplo: asistentes de programación y redacción técnica utilizados por el equipo durante el hackathon).

## En qué se usó la IA / How AI assisted
La asistencia de herramientas de IA se utilizó para acelerar tareas de desarrollo y documentación bajo supervisión directa del equipo humano:
1. **Estructura de código base:** módulos en TypeScript (`strict: true`), escenas de Phaser 3 y pruebas automatizadas en Vitest.
2. **Minijuegos y accesibilidad:** implementación de Nodos, Válvulas, Escudo, gestión de foco por teclado, texto grande y movimiento reducido.
3. **Textos bilingües (ES/EN):** borradores de copys infantiles y diccionario centralizado en `src/i18n.ts`.
4. **Borradores de documentación:** guías de usuario, README y plantillas de entrega en `docs/`.

## Qué revisó, validó y curó el equipo humano / Human curation & verification

- Revisión manual de todos los eventos históricos de clima espacial (`src/data/eventos.json`) y sus fechas/fuentes reales antes de marcar `"verificado": true`.
- Validación pedagógica del lenguaje para niñas y niños de 7 a 12 años en español e inglés.
- Verificación de que **ningún dato de la NASA fue inventado por IA**, que el juego no realiza llamadas de red en ejecución (`tests/no-red.test.ts`), y que las pruebas automatizadas (`npm test`), el chequeo de tipos (`npm run lint`) y la compilación (`npm run build`) pasan completos.

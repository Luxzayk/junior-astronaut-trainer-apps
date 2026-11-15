# Debug y verificación manual

## Activar debug

Añade `?debug=1` a la URL:

```text
http://localhost:3000/?debug=1
http://localhost:3000/?debug=1&perf=1   # también muestra FPS y partículas desde el inicio
```

Sin `?debug=1`, los atajos y overlays de inspección no están disponibles.

## Atajos de teclado (`?debug=1`)

| Tecla | Acción | Conflictos preservados |
| :--- | :--- | :--- |
| `1`, `2`, `3` | Resta `10` de **Aire**, **Energía** o **Escudo** | — |
| `Shift + 1`, `2`, `3` | Suma `10` a **Aire**, **Energía** o **Escudo** | — |
| `Alt + 1` … `Alt + 5` | Salta a **Jornada 1..5** | — |
| `J` | Salta a **Jornada 3** | — |
| `V` | Dispara el evento de la jornada actual | — |
| `B` | Activa / desactiva `aguaBaja` | — |
| `M` | Completa la siguiente misión pendiente (o urgente) | — |
| `X` | Falla / marca perdida la siguiente misión pendiente | — |
| `O` | Muestra / oculta overlay de estado de misiones | — |
| `G` | Daña / repara el módulo de **Energía** | — |
| `T` | Alterna velocidad del reloj y drenaje (`x1` / `x10`) | — |
| `N` | Avanza a la siguiente jornada | — |
| `K` | Fuerza el fin de la jornada (evaluación normal) | — |
| `C` | Fuerza cierre de jornada **completa** | Completa misiones y dispara el cierre |
| `Shift + C` | Fuerza cierre de jornada **incompleta** | Marca misión pendiente/perdida y cierra |
| `I` | Abre el **Informe Final** con datos de prueba en bitácora | Salta a J5 completada → `InformeScene` |
| `L` / `Shift + E` | Fuerza **evacuación inmediata** | `E` sin Shift sigue siendo **Usar estación** |
| `F` | Muestra / oculta contador FPS y partículas | También visible con `?perf=1` |
| `Shift + S` | Activa / silencia **Sonido** | `S` sin Shift sigue siendo bajar (`WASD`) |

## Checklist previa a entrega

- [ ] **Móvil / táctil (`390×844` / Fit):** mover tocando salas, **Usar**, jugar Nodos / Válvulas / Escudo; botones ≥ `56px` sin solaparse
- [ ] **Demo (`?demo=1`):** completar Jornada 3 en `< 4` min, responder a la fulguración y validar pantalla de fin de demo
- [ ] **Semana completa (5 jornadas):** J1 (tutorial), J2 (fuga), J3 (FLR), J4 (apagón), J5 (tormenta) → Informe Final, rango y copiar resultado
- [ ] **Cambio ES / EN en vivo:** Menú, HUD, Ajustes, Glosario, Fuentes, Créditos e Informe; probar **Texto grande ×1.25**
- [ ] **Mute y volumen:** silenciar desde Menú, HUD, Pausa y Ajustes; recargar y comprobar persistencia en `localStorage`; sin audio antes del primer gesto
- [ ] **Movimiento reducido:** sin sacudidas, pulsos ni estelas; se mantienen contornos estáticos y badge `'!'`
- [ ] **Offline:** `npm run build && npm run check`, DevTools en *Offline*, sin fallos de carga ni peticiones de red

## Curación de datos (manual)

1. Editar fechas en `SEMANAS` dentro de `scripts/fetch-donki.mjs`.
2. Ejecutar `NASA_API_KEY=... node scripts/fetch-donki.mjs`.
3. Revisar `textoNinos` en `src/data/eventos.json` y marcar `"verificado": true` solo tras revisión humana.
4. Los `*.raw.json` en `src/data/donki/` **no** se importan desde `src/`.

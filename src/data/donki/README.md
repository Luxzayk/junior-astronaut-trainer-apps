# Datos crudos locales de NASA DONKI

En esta carpeta se guardan únicamente los archivos `<semana>.raw.json` generados de forma manual por `scripts/fetch-donki.mjs` con fines de trazabilidad y archivo.

- **No se importan en `src/`**: el juego en tiempo de ejecución solo lee la lista curada y verificada en `src/data/eventos.json`.
- **Sin llamadas de red en el juego**: este repositorio funciona 100 % sin conexión.

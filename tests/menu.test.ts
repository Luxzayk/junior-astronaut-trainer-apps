import { describe, expect, it } from 'vitest';
import { generarEstrellas } from '../src/art/texturas';
import { crearEventoEjemploFallback, localEventosProvider, type EventoClimaCurado } from '../src/data/eventosLoader';
import { SEMANAS } from '../src/game/semanas';
import { t } from '../src/i18n';
import { MENU, menuLayout, ORDEN_FOCO_MENU, vecinoMenu, type RectMenu } from '../src/ui/menuLayout';
import { menuViewModel, formatearFechaMenu } from '../src/ui/menuViewModel';
import { contrastRatio } from '../src/ui/contrast';
import { COLORES_HEX } from '../src/ui/theme';

const solapan = (a: RectMenu, b: RectMenu): boolean =>
  a.x < b.x + b.ancho && a.x + a.ancho > b.x && a.y < b.y + b.alto && a.y + a.alto > b.y;
const prohibidas = /\b(hoy|today|ahora|live|en vivo|tiempo real|actual)\b/i;
const real: EventoClimaCurado = {
  ...crearEventoEjemploFallback(), esEjemplo: false, verificado: true,
  fecha: '2024-05-10T12:00:00Z', clase: 'X1.0', consultadoEn: '2026-09-01',
  fuenteUrl: 'documento-local', textoNinos: { es: 'Texto verificado', en: 'Verified text' },
};

describe('Menu lunar', () => {
  it('genera estrellas deterministas dentro del lienzo, con márgenes para su radio', () => {
    const estrellas = generarEstrellas(2026, 80);
    expect(estrellas).toEqual(generarEstrellas(2026, 80));
    expect(estrellas).not.toEqual(generarEstrellas(2027, 80));
    expect(estrellas).toHaveLength(80);
    for (const s of estrellas) {
      expect(s.x - s.radio).toBeGreaterThanOrEqual(0);
      expect(s.x + s.radio).toBeLessThanOrEqual(MENU.ancho);
      expect(s.y - s.radio).toBeGreaterThanOrEqual(0);
      expect(s.y + s.radio).toBeLessThanOrEqual(MENU.alto);
      expect(s.radio).toBeGreaterThanOrEqual(1);
      expect(s.radio).toBeLessThanOrEqual(3);
    }
  });

  for (const grande of [false, true]) {
    it(`mantiene geometría accesible en 1280x720, texto grande=${grande}`, () => {
      const layout = menuLayout(grande);
      const rectangulos = [layout.panel, layout.titulo, layout.subtitulo, ...layout.chips,
        layout.frase, layout.ilustracion, layout.tarjeta, layout.mascota, layout.burbuja,
        layout.demoHint, layout.datosTitulo, layout.datosEtiqueta, layout.datosEvento,
        layout.datosFuente, layout.datosSemana, ...Object.values(layout.interactivos)];
      for (const r of rectangulos) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.ancho).toBeLessThanOrEqual(MENU.ancho);
        expect(r.y + r.alto).toBeLessThanOrEqual(MENU.alto);
      }
      const botones = Object.values(layout.interactivos);
      botones.forEach((a, i) => {
        expect(a.ancho).toBeGreaterThanOrEqual(56);
        expect(a.alto).toBeGreaterThanOrEqual(56);
        botones.slice(i + 1).forEach(b => expect(solapan(a, b)).toBe(false));
      });
      const principal = layout.interactivos.jugar;
      for (const id of ['demo', 'glosario', 'fuentes', 'ajustes', 'creditos'] as const) {
        const r = layout.interactivos[id];
        expect(principal.ancho * principal.alto).toBeGreaterThan(r.ancho * r.alto);
      }
      for (const id of ['es', 'en', 'sonido'] as const) expect(solapan(layout.titulo, layout.interactivos[id])).toBe(false);
      expect(solapan(layout.demoHint, layout.interactivos.demo)).toBe(false);
      if (grande) expect(layout.interactivos.ajustes.y).toBeGreaterThan(layout.interactivos.glosario.y);
    });
  }

  it('conserva el orden pedido de Tab y añade al final el enlace de datos', () => {
    expect(ORDEN_FOCO_MENU).toEqual(['jugar', 'demo', 'glosario', 'fuentes', 'ajustes', 'creditos', 'es', 'en', 'sonido', 'origen']);
    const layout = menuLayout(true);
    const rects = ORDEN_FOCO_MENU.map(id => layout.interactivos[id]);
    expect(vecinoMenu(rects, 0, 'ArrowDown')).toBe(1);
    expect(vecinoMenu(rects, 2, 'ArrowRight')).toBe(3);
    expect(vecinoMenu(rects, 2, 'ArrowDown')).toBe(4);
    expect(vecinoMenu(rects, 7, 'ArrowLeft')).toBe(6);
  });

  for (const idioma of ['es', 'en'] as const) {
    it(`muestra fuente y fechas exclusivamente para eventos reales (${idioma})`, () => {
      const vm = menuViewModel(real, SEMANAS[0], idioma);
      expect(vm.esEjemplo).toBe(false);
      expect(vm.titulo).toBe(t('menu.datosReales', undefined, idioma));
      expect(vm.etiqueta).toBe(t('menu.etiquetaArchivo', undefined, idioma));
      expect(vm.linea1).toContain('FLR');
      expect(vm.linea1).toContain('X1.0');
      expect(vm.linea1).toContain(formatearFechaMenu(real.fecha, idioma));
      expect(vm.linea2).toContain('NASA DONKI');
      expect(vm.linea2).toContain(formatearFechaMenu(real.consultadoEn, idioma));
      expect(Object.values(vm).join(' ')).not.toMatch(prohibidas);
    });

    it(`oculta clase, fechas y fuente al faltar verificación o un campo (${idioma})`, () => {
      const casos: Array<EventoClimaCurado | null> = [null, crearEventoEjemploFallback(),
        { ...real, esEjemplo: true }, { ...real, verificado: false },
        { ...real, fecha: '' }, { ...real, clase: '' }, { ...real, consultadoEn: '' },
        { ...real, fuenteUrl: '' }, { ...real, fecha: '2024-02-30' },
        { ...real, textoNinos: { es: '', en: 'text' } },
        { ...real, textoNinos: { es: 'texto', en: '' } }];
      for (const evento of casos) {
        const vm = menuViewModel(evento, SEMANAS[0], idioma);
        expect(vm.esEjemplo).toBe(true);
        expect(vm.titulo).toBe(t('menu.datosEjemplo', undefined, idioma));
        expect(vm.linea1).toBe(t('menu.eventoEjemplo', undefined, idioma));
        expect(vm.linea2).toBe('');
        expect(Object.values(vm).join(' ')).not.toMatch(/NASA|X1\.0|2024|2026/);
      }
    });

    it(`ningún escenario de las semanas ni plantilla afirma tiempo real (${idioma})`, () => {
      for (const semana of SEMANAS) {
        for (const evento of [...localEventosProvider.obtenerTodos().filter(ev => ev.semana === semana.id), real, crearEventoEjemploFallback()]) {
          expect(Object.values(menuViewModel(evento, semana, idioma)).join(' ')).not.toMatch(prohibidas);
        }
      }
    });
  }

  it('garantiza contraste de texto y foco sobre los fondos efectivos más claros', () => {
    // Peor caso para el panel al 97%: fondo blanco debajo.
    const canal = (valor: number): string => Math.round(valor * MENU.alphaPanel + 255 * (1 - MENU.alphaPanel)).toString(16).padStart(2, '0');
    const efectivo = `#${canal(20)}${canal(27)}${canal(52)}`;
    expect(contrastRatio(COLORES_HEX.textoPrincipal, efectivo)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORES_HEX.textoSecundario, efectivo)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORES_HEX.botonTextoOscuro, COLORES_HEX.ok)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORES_HEX.botonTextoOscuro, COLORES_HEX.aire)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(COLORES_HEX.focoMenu, COLORES_HEX.fondoLienzo)).toBeGreaterThanOrEqual(3);
  });
});

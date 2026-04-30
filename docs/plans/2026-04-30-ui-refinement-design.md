# UI Refinement — Design Doc

**Fecha:** 2026-04-30
**Scope:** Pulido visual + UX redesign (preview en tiempo real) + Mobile-first / a11y

## Contexto
La UI actual es funcional pero tiene fricciones:
1. El usuario debe pulsar "Generar QR" cada vez que cambia algo → loop lento
2. Renderiza dependiendo del backend para cada preview → cold start de Render mata UX
3. Layout no optimizado para celular (grid 5 columnas se rompe abajo de lg)
4. Falta de feedback visual al cambiar estilos

## Decisiones

### UX — Preview client-side instantáneo
- Librería: `qr-code-styling` (~30 KB gzip)
- Cualquier cambio (URL, color, estilo, logo) regenera el preview localmente sin red
- Backend solo se invoca al pulsar "Descargar PNG" → genera el archivo con marco PIL renderizado server-side
- Botón principal pasa de "Generar QR" a "Descargar PNG"
- Si no hay URL, el preview muestra un placeholder bonito

**Tradeoff aceptado:** lógica de estilos duplicada (JS + Python). Visualmente coinciden 1:1 en módulos y colores. Marcos PIL solo aparecen en el PNG descargado (preview client-side puede mostrar un mock del marco con CSS).

### Visual — Clean SaaS + glass preview
- Tipografía: Inter (ya cargada)
- Paleta brand: azul `#2563eb` (brand-600), grises slate
- Card principal: blanco puro, sombra suave `shadow-xl`, border 1px slate-100, radius 24px
- Card preview: glass con `backdrop-blur-xl` + `bg-white/60` + `ring-1 ring-white/40`, fondo gradiente sutil detrás
- Sombras: soft, sin offsets duros
- Micro-interacciones:
  - Hover en estilos: `scale-[1.02]` + ring brand
  - Selección: ring-2 brand + bg-brand-50
  - Tabs: animación de barra inferior con `transition-all`
  - Botón principal: hover scale + sombra brand
  - Color picker: transición de fondo al tipear

### A11y / Mobile-first
- Single column en mobile/tablet, grid 3+2 en `lg`+
- Tap targets ≥44px en mobile
- ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- Labels asociados a inputs con `htmlFor`/`id`
- Focus visible: `focus-visible:ring-2 focus-visible:ring-brand-500`
- Drag-drop: también accesible por teclado (Enter/Space activan input)
- Color contrast WCAG AA: textos slate-700+ sobre blanco

## Componentes

### `App.jsx` (refactor)
- State unchanged but añade `debouncedConfig` derivado para feed al preview
- Botón principal cambia a "Descargar PNG"
- Mensaje de estado: "Vista previa actualizada en tiempo real"

### `LiveQrPreview.jsx` (nuevo)
- Wrapper de `qr-code-styling`
- Props: `data, moduleStyle, qrColor, bgColor, logoUrl, frameStyle`
- Mapea moduleStyle → dotsOptions.type (`square`, `rounded`, `dots`, `classy`, `classy-rounded`, `extra-rounded`)
- Para frame: aplica wrapper CSS (border, padding, label "ESCANEAME") sobre el div del QR — visual hint, el real se hace server-side
- Si data está vacía → placeholder

### Mapping module styles JS ↔ Python

| Frontend (qr-code-styling type) | Backend (Python) |
|--------------------------------|------------------|
| `square` | `square` |
| `rounded` | `rounded` |
| `dots` | `circle` |
| `classy` | `gapped` |
| `classy-rounded` | `vertical` (aproximación visual) |
| `extra-rounded` | `horizontal` (aproximación visual) |

(Vertical/horizontal del backend no tienen equivalente directo en qr-code-styling. Mapeo a estilos visualmente similares para preview; el PNG final tendrá la versión exacta del backend.)

### `index.css`
- Añadir clases utility: `.glass-card`, `.shadow-brand`, `.btn-primary`
- Animación sutil al cambiar de tab

## Verificación
- Build pasa sin warnings
- Tests backend siguen verde (sin cambios al backend)
- Inspección visual:
  - Cambiar URL → QR aparece sin tocar botón
  - Cambiar color → QR cambia
  - Subir logo → aparece en centro del preview
  - Pestaña Marco → preview muestra hint de marco
  - Mobile: layout single column funcional
  - Tab por teclado pasa por todos los controles

## Implementación
1. `npm install qr-code-styling`
2. Crear `frontend/src/LiveQrPreview.jsx`
3. Refactor `frontend/src/App.jsx`
4. Update `frontend/src/index.css`
5. `npm run build`
6. Smoke test local con `uvicorn`
7. Commit + push

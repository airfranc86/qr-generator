# QR Generator

Generador de códigos QR personalizables. Backend FastAPI + frontend React/Tailwind, deploy en Render Free Tier.

## Features

- 6 estilos de módulo: cuadrado, redondeado, espaciado, puntos, vertical, horizontal
- 6 estilos de marco: sin marco, simple, redondeado, sombra, scan me, scan top
- Colores hex libres para QR y fondo
- Embed de logo opcional al 25% del centro (con error correction H)
- UI con 3 pestañas: Marco / Logo / Color Y Forma

## Estructura

```
CreadorQR/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── qr_generator.py      # Lógica QR
│   ├── test_api.py          # Tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # UI con 3 pestañas
│   │   ├── main.jsx
│   │   └── index.css
│   ├── dist/                # Build (commiteado para Render)
│   └── package.json
├── render.yaml
└── .gitignore
```

## Desarrollo local

### Backend

```bash
pip install -r backend/requirements.txt
pytest backend/test_api.py -v
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxy a backend en 8000)
```

## Build para deploy

```bash
cd frontend && npm run build && cd ..
git add frontend/dist/
git commit -m "build: update frontend dist"
git push
```

Render reconstruye automáticamente al push a `main`.

## API

### `POST /generate`

Form fields:
- `url` (required): URL destino, debe empezar con `http://` o `https://`
- `module_style`: `square` (default) | `rounded` | `gapped` | `circle` | `vertical` | `horizontal`
- `qr_color`: hex `#RRGGBB` (default `#000000`)
- `bg_color`: hex `#RRGGBB` (default `#FFFFFF`)
- `frame_style`: `none` (default) | `simple` | `rounded` | `shadow` | `scan_me` | `scan_me_top`
- `logo`: archivo de imagen opcional (PNG/JPG/SVG)

Response: `image/png`

### `GET /api/health`
### `GET /api/options`
### `GET /docs` — Swagger UI

## Sistema anti-bot

Defensa en capas sobre `/generate`:

1. **Rate limiting** — 30 req/min por IP (`slowapi`)
2. **Honeypot** — campo invisible `website` que los bots ingenuos llenan
3. **User-Agent check** — UA vacío → 403
4. **Cloudflare Turnstile** — CAPTCHA invisible y gratuito (privacy-first, sin Google)
5. **Límites de payload** — URL ≤2048 chars, logo ≤2 MB

### Configurar Turnstile en producción (gratis, ilimitado)

Por defecto se usan las **test keys** de Cloudflare que siempre pasan (útiles para dev). Para producción real:

1. Crear cuenta gratis en https://dash.cloudflare.com
2. Ir a Turnstile → Add site → Mode "Managed" o "Invisible"
3. Copiar **Site Key** y **Secret Key**
4. Configurar en Render:
   - **Variable de entorno backend:** `TURNSTILE_SECRET_KEY=<tu-secret-key>`
   - **Variable de build frontend:** `VITE_TURNSTILE_SITE_KEY=<tu-site-key>` (definir antes de `npm run build`)
5. Rebuild frontend → commit `dist/` → push

Las test keys siempre devuelven success — dejar las defaults equivale a no tener CAPTCHA real.

## Deploy en Render

1. Push a GitHub
2. Render Dashboard → New → Web Service → conectar repo
3. Render detecta `render.yaml` automáticamente
4. (Opcional) Configurar `TURNSTILE_SECRET_KEY` en Environment del servicio
5. Deploy ≈ 2 min · URL: `https://[name].onrender.com`

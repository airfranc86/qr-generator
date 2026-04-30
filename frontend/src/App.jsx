import { useEffect, useId, useRef, useState } from "react";
import LiveQrPreview from "./LiveQrPreview.jsx";
import ModulePreview from "./ModulePreview.jsx";

const MODULE_STYLES = [
  { id: "square", label: "Cuadrado" },
  { id: "rounded", label: "Redondeado" },
  { id: "gapped", label: "Espaciado" },
  { id: "circle", label: "Puntos" },
  { id: "vertical", label: "Vertical" },
  { id: "horizontal", label: "Horizontal" },
];

const FRAME_STYLES = [
  { id: "none", label: "Sin marco" },
  { id: "simple", label: "Simple" },
  { id: "rounded", label: "Redondeado" },
  { id: "shadow", label: "Sombra" },
  { id: "scan_me", label: "Escaneame" },
  { id: "scan_me_top", label: "Escaneame Arriba" },
];

const TABS = [
  { id: "marco", label: "Marco" },
  { id: "logo", label: "Logo" },
  { id: "color", label: "Color y Forma" },
];

function FrameIcon({ frame }) {
  const stroke = "currentColor";
  if (frame === "none") {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-400" aria-hidden="true">
        <circle cx="16" cy="16" r="12" fill="none" stroke={stroke} strokeWidth="2" />
        <line x1="7" y1="25" x2="25" y2="7" stroke={stroke} strokeWidth="2" />
      </svg>
    );
  }
  const baseRect = (radius = 0) => (
    <rect x="4" y="4" width="24" height="24" rx={radius} fill="none" stroke={stroke} strokeWidth="2" />
  );
  if (frame === "simple") return <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700" aria-hidden="true">{baseRect()}</svg>;
  if (frame === "rounded") return <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700" aria-hidden="true">{baseRect(6)}</svg>;
  if (frame === "shadow") return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700" aria-hidden="true">
      <rect x="7" y="7" width="22" height="22" fill="#cbd5e1" />
      {baseRect()}
    </svg>
  );
  if (frame === "scan_me") return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700" aria-hidden="true">
      <rect x="4" y="4" width="24" height="18" fill="none" stroke={stroke} strokeWidth="2" />
      <text x="16" y="29" textAnchor="middle" fontSize="5.5" fontWeight="800" fill={stroke}>ESCANEAME</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700" aria-hidden="true">
      <text x="16" y="7" textAnchor="middle" fontSize="5.5" fontWeight="800" fill={stroke}>ESCANEAME</text>
      <rect x="4" y="10" width="24" height="18" fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

function Spinner({ className = "" }) {
  return (
    <svg className={`animate-spin h-5 w-5 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState("color");
  const [moduleStyle, setModuleStyle] = useState("square");
  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [frameStyle, setFrameStyle] = useState("none");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const urlId = useId();

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const setLogo = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setLogoFile(file);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setLogo(file);
  };

  const handleDownload = async () => {
    if (!url || !/^https?:\/\//.test(url)) {
      setError("La URL debe empezar con http:// o https://");
      return;
    }
    setError(null);
    setDownloading(true);
    try {
      const form = new FormData();
      form.append("url", url);
      form.append("module_style", moduleStyle);
      form.append("qr_color", qrColor);
      form.append("bg_color", bgColor);
      form.append("frame_style", frameStyle);
      form.append("website", ""); // honeypot — must stay empty
      if (logoFile) form.append("logo", logoFile);

      const res = await fetch("/generate", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = "qr-code.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const canDownload = !!url && !downloading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 gap-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8">
        {/* LEFT: Form */}
        <section className="lg:col-span-3 card-solid p-5 sm:p-8 animate-fade-in" aria-labelledby="form-title">
          <header className="flex items-center gap-3 mb-7">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-[0_8px_20px_-8px_rgba(37,99,235,0.4)] ring-1 ring-slate-200 overflow-hidden">
              <img src="/logo.svg" alt="Mi QR" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 id="form-title" className="text-lg font-bold text-slate-900 leading-tight">
                Mi QR
              </h1>
              <p className="text-xs text-slate-500">Generador de códigos QR personalizados</p>
            </div>
          </header>

          <div className="space-y-6">
            {/* URL */}
            <div>
              <label htmlFor={urlId} className="block text-sm font-semibold text-slate-700 mb-2">
                URL
              </label>
              <input
                id={urlId}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                className="input-base"
                autoComplete="url"
                inputMode="url"
              />
            </div>

            {/* DESIGN TABS */}
            <div>
              <h2 className="text-[11px] font-bold tracking-[0.2em] text-slate-500 mb-3">DISEÑO</h2>
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div role="tablist" aria-label="Pestañas de diseño" className="flex border-b border-slate-200 bg-slate-50">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      data-state={activeTab === t.id ? "active" : "inactive"}
                      aria-selected={activeTab === t.id}
                      aria-controls={`tabpanel-${t.id}`}
                      id={`tab-${t.id}`}
                      onClick={() => setActiveTab(t.id)}
                      className="tab-trigger"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-4 sm:p-5">
                  {activeTab === "marco" && (
                    <div role="tabpanel" id="tabpanel-marco" aria-labelledby="tab-marco" className="grid grid-cols-3 sm:grid-cols-6 gap-2 animate-fade-in">
                      {FRAME_STYLES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          aria-pressed={frameStyle === f.id}
                          aria-label={f.label}
                          onClick={() => setFrameStyle(f.id)}
                          className="frame-tile"
                          title={f.label}
                        >
                          <FrameIcon frame={f.id} />
                          <span className="text-[10px] leading-tight text-center text-slate-600 font-medium">
                            {f.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === "logo" && (
                    <div role="tabpanel" id="tabpanel-logo" aria-labelledby="tab-logo" className="animate-fade-in">
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Subir logo"
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                          dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
                        }`}
                      >
                        {logoPreview ? (
                          <div className="flex flex-col items-center gap-3">
                            <img
                              src={logoPreview}
                              alt="Vista previa del logo"
                              className="h-20 w-20 object-contain rounded-xl bg-white p-1.5 shadow"
                            />
                            <p className="text-sm text-slate-600 break-all">{logoFile?.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <svg className="w-10 h-10 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 7.5m0 0L7.5 12M12 7.5V21" />
                            </svg>
                            <p className="text-sm font-medium text-slate-700">Arrastrá un logo o hacé click</p>
                            <p className="text-xs text-slate-500">PNG, JPG, SVG · se incrusta al 25% del centro</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => setLogo(e.target.files?.[0])}
                        />
                      </div>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="mt-3 text-sm text-red-600 hover:text-red-700 font-semibold focus:outline-none focus-visible:underline"
                        >
                          Eliminar logo
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === "color" && (
                    <div role="tabpanel" id="tabpanel-color" aria-labelledby="tab-color" className="space-y-5 animate-fade-in">
                      <div>
                        <p className="text-[11px] font-bold tracking-[0.18em] text-slate-500 mb-2">FORMA DE MÓDULO</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                          {MODULE_STYLES.map((m) => (
                            <div key={m.id} className="flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                aria-pressed={moduleStyle === m.id}
                                aria-label={m.label}
                                onClick={() => setModuleStyle(m.id)}
                                className="style-tile w-full"
                                title={m.label}
                              >
                                <ModulePreview style={m.id} color={qrColor} bg={bgColor} />
                              </button>
                              <span
                                className={`text-[10px] font-semibold leading-tight text-center transition-colors ${
                                  moduleStyle === m.id ? "text-brand-700" : "text-slate-500"
                                }`}
                              >
                                {m.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold tracking-[0.18em] text-slate-500 mb-2">COLORES</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <ColorField label="Color del código QR" value={qrColor} onChange={setQrColor} />
                          <ColorField label="Color del fondo" value={bgColor} onChange={setBgColor} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Honeypot anti-bot — invisible to humans, visible to naive bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
            />

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!canDownload}
              onClick={handleDownload}
              className="btn-primary"
              aria-label="Descargar el código QR como PNG"
            >
              {downloading ? (
                <>
                  <Spinner /> Generando PNG...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Descargar PNG
                </>
              )}
            </button>

            <p className="text-xs text-center text-slate-500">
              Vista previa actualizada en tiempo real · El PNG final se genera con marco en el servidor
            </p>
          </div>
        </section>

        {/* RIGHT: Live preview (glass) */}
        <aside
          className="lg:col-span-2 card-glass p-6 sm:p-8 flex flex-col items-center justify-center min-h-[320px] animate-fade-in"
          aria-label="Vista previa del código QR"
        >
          <h2 className="text-[11px] font-bold tracking-[0.2em] text-slate-600 self-start mb-5">VISTA PREVIA</h2>
          <LiveQrPreview
            data={url}
            moduleStyle={moduleStyle}
            qrColor={qrColor}
            bgColor={bgColor}
            logoUrl={logoPreview}
            frameStyle={frameStyle}
            size={260}
          />
          <p className="mt-5 text-[11px] text-slate-500 text-center font-medium">
            {url ? "✓ Listo para descargar" : "Esperando una URL..."}
          </p>
        </aside>
      </div>

      <footer className="text-[11px] text-slate-500">
        <a
          href="https://ajconsultingitwebv2.vercel.app/"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-slate-200 hover:border-brand-300 hover:bg-white hover:text-brand-700 transition-all shadow-sm hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span>Creado por</span>
          <span className="font-semibold text-slate-700">Francisco A.</span>
          <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </footer>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  const id = useId();
  const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}
      </label>
      <div className="color-field">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2.5 text-sm font-mono outline-none bg-transparent"
          maxLength={7}
          aria-label={`${label} en formato hexadecimal`}
        />
        <label
          className="relative w-12 cursor-pointer border-l border-slate-300"
          style={{ background: safeValue }}
          aria-label={`Selector visual para ${label}`}
        >
          <input
            type="color"
            value={safeValue}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}

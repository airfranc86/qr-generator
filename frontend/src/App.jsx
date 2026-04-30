import { useEffect, useRef, useState } from "react";

const MODULE_STYLES = [
  { id: "square", label: "Cuadrado" },
  { id: "rounded", label: "Redondeado" },
  { id: "gapped", label: "Espaciado" },
  { id: "circle", label: "Puntos" },
  { id: "vertical", label: "Vertical" },
  { id: "horizontal", label: "Horizontal" },
];

const FRAME_STYLES = [
  { id: "none", label: "Sin marco", icon: "∅" },
  { id: "simple", label: "Simple", icon: "▢" },
  { id: "rounded", label: "Redondeado", icon: "◳" },
  { id: "shadow", label: "Sombra", icon: "❏" },
  { id: "scan_me", label: "Scan Me", icon: "▤" },
  { id: "scan_me_top", label: "Scan Top", icon: "▥" },
];

const TABS = [
  { id: "marco", label: "Marco" },
  { id: "logo", label: "Logo" },
  { id: "color", label: "Color Y Forma" },
];

function ModulePreview({ style, color, bg, selected }) {
  const dot = (cx, cy) => {
    if (style === "circle") return <circle cx={cx} cy={cy} r="2" fill={color} />;
    if (style === "rounded") return <rect x={cx - 2} y={cy - 2} width="4" height="4" rx="1.5" fill={color} />;
    if (style === "gapped") return <rect x={cx - 1.6} y={cy - 1.6} width="3.2" height="3.2" fill={color} />;
    if (style === "vertical") return <rect x={cx - 1} y={cy - 2.2} width="2" height="4.4" fill={color} />;
    if (style === "horizontal") return <rect x={cx - 2.2} y={cy - 1} width="4.4" height="2" fill={color} />;
    return <rect x={cx - 2} y={cy - 2} width="4" height="4" fill={color} />;
  };
  const points = [];
  const pattern = [
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 1, 1, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [0, 0, 1, 1, 0, 1, 0],
    [1, 1, 0, 1, 1, 0, 1],
  ];
  pattern.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) points.push(<g key={`${x}-${y}`}>{dot(x * 6 + 6, y * 6 + 6)}</g>);
    })
  );
  return (
    <svg viewBox="0 0 54 54" className={`w-full h-full rounded ${selected ? "" : ""}`} style={{ background: bg }}>
      {points}
    </svg>
  );
}

function FrameIcon({ frame }) {
  if (frame === "none") {
    return (
      <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-400">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="7" y1="25" x2="25" y2="7" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  const baseRect = (radius = 0) => (
    <rect x="4" y="4" width="24" height="24" rx={radius} fill="none" stroke="currentColor" strokeWidth="2" />
  );
  if (frame === "simple") return <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700">{baseRect()}</svg>;
  if (frame === "rounded") return <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700">{baseRect(5)}</svg>;
  if (frame === "shadow") return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700">
      <rect x="6" y="6" width="22" height="22" fill="#cbd5e1" />
      {baseRect()}
    </svg>
  );
  if (frame === "scan_me") return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700">
      <rect x="4" y="4" width="24" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="16" y="29" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor">SCAN ME</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 32 32" className="w-7 h-7 text-slate-700">
      <text x="16" y="7" textAnchor="middle" fontSize="6" fontWeight="700" fill="currentColor">SCAN ME</text>
      <rect x="4" y="10" width="24" height="18" fill="none" stroke="currentColor" strokeWidth="2" />
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
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (qrImage) URL.revokeObjectURL(qrImage);
    };
  }, [qrImage]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setQrImage(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("url", url);
      form.append("module_style", moduleStyle);
      form.append("qr_color", qrColor);
      form.append("bg_color", bgColor);
      form.append("frame_style", frameStyle);
      if (logoFile) form.append("logo", logoFile);

      const res = await fetch("/generate", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}`);
      }
      const blob = await res.blob();
      setQrImage(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrImage) return;
    const a = document.createElement("a");
    a.href = qrImage;
    a.download = "qr-code.png";
    a.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-3 card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold">QR</div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Generador de QR</h1>
              <p className="text-xs text-slate-500">FastAPI · React · Render</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                required
                className="input-base"
              />
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-widest text-slate-500 mb-3">DISEÑO</h2>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`tab-button ${activeTab === t.id ? "tab-button-active bg-white" : ""}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {activeTab === "marco" && (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {FRAME_STYLES.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setFrameStyle(f.id)}
                          className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                            frameStyle === f.id
                              ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                          title={f.label}
                        >
                          <FrameIcon frame={f.id} />
                          <span className="text-[10px] text-slate-600 font-medium">{f.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTab === "logo" && (
                    <div>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                          dragOver ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400 bg-slate-50"
                        }`}
                      >
                        {logoPreview ? (
                          <div className="flex flex-col items-center gap-3">
                            <img src={logoPreview} alt="Logo preview" className="h-20 w-20 object-contain rounded-lg bg-white p-1 shadow" />
                            <p className="text-sm text-slate-600">{logoFile?.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-3xl">📁</div>
                            <p className="text-sm font-medium text-slate-700">Arrastra un logo aquí o hacé click</p>
                            <p className="text-xs text-slate-500">PNG, JPG, SVG · Se incrustará al 25% del QR</p>
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
                          className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Eliminar logo
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === "color" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {MODULE_STYLES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setModuleStyle(m.id)}
                            className={`aspect-square rounded-lg border-2 p-1.5 transition-all ${
                              moduleStyle === m.id
                                ? "border-brand-500 ring-2 ring-brand-200"
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                            title={m.label}
                          >
                            <ModulePreview style={m.id} color={qrColor} bg={bgColor} selected={moduleStyle === m.id} />
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <ColorField label="Color del código QR" value={qrColor} onChange={setQrColor} />
                        <ColorField label="Color del fondo" value={bgColor} onChange={setBgColor} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !url}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Generando...
                </>
              ) : (
                "Generar código QR"
              )}
            </button>
          </form>
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-2 card p-6 sm:p-8 flex flex-col items-center justify-center min-h-[300px]">
          <h2 className="text-xs font-bold tracking-widest text-slate-500 mb-4 self-start">VISTA PREVIA</h2>
          {qrImage ? (
            <>
              <img src={qrImage} alt="QR generado" className="w-full max-w-xs aspect-square object-contain rounded-xl shadow-md bg-white p-3" />
              <button
                type="button"
                onClick={handleDownload}
                className="mt-5 w-full max-w-xs border-2 border-brand-600 text-brand-600 hover:bg-brand-50 font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Descargar PNG
              </button>
            </>
          ) : (
            <div className="text-center text-slate-400 py-12">
              <div className="text-5xl mb-3">⬜</div>
              <p className="text-sm">El QR aparecerá acá</p>
              <p className="text-xs mt-1">Configurá la URL y el diseño</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  const safeValue = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="flex items-stretch border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="flex-1 px-3 py-2 text-sm font-mono outline-none"
          maxLength={7}
        />
        <label className="relative w-12 cursor-pointer border-l border-slate-300" style={{ background: safeValue }}>
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

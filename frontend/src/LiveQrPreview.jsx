import { useEffect, useMemo, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

const MODULE_TO_DOTS_TYPE = {
  square: "square",
  rounded: "rounded",
  gapped: "classy",
  circle: "dots",
  vertical: "classy-rounded",
  horizontal: "extra-rounded",
};

export default function LiveQrPreview({
  data,
  moduleStyle = "square",
  qrColor = "#000000",
  bgColor = "#FFFFFF",
  logoUrl = null,
  frameStyle = "none",
  size = 280,
}) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);

  const options = useMemo(
    () => ({
      width: size,
      height: size,
      type: "svg",
      data: data || "https://placeholder.local",
      margin: 4,
      qrOptions: {
        errorCorrectionLevel: logoUrl ? "H" : "L",
      },
      dotsOptions: {
        color: qrColor,
        type: MODULE_TO_DOTS_TYPE[moduleStyle] ?? "square",
      },
      backgroundOptions: { color: bgColor },
      cornersSquareOptions: {
        color: qrColor,
        type: ["rounded", "circle"].includes(moduleStyle) ? "extra-rounded" : "square",
      },
      cornersDotOptions: {
        color: qrColor,
        type: moduleStyle === "circle" ? "dot" : "square",
      },
      image: logoUrl || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 4,
        imageSize: 0.25,
        hideBackgroundDots: true,
      },
    }),
    [data, moduleStyle, qrColor, bgColor, logoUrl, size]
  );

  useEffect(() => {
    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        qrRef.current.append(containerRef.current);
      }
    } else {
      qrRef.current.update(options);
    }
  }, [options]);

  const isPlaceholder = !data;
  const showFrame = frameStyle !== "none";
  const showScanText = frameStyle === "scan_me" || frameStyle === "scan_me_top";
  const scanTop = frameStyle === "scan_me_top";
  const rounded = frameStyle === "rounded";
  const shadow = frameStyle === "shadow";

  return (
    <div className="relative w-full max-w-xs mx-auto" aria-label="Vista previa del código QR">
      {isPlaceholder && (
        <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-sm rounded-2xl flex items-center justify-center pointer-events-none">
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            Ingresá una URL
          </p>
        </div>
      )}
      <div
        className={`relative bg-white p-3 transition-all ${
          showFrame ? "border-[6px]" : ""
        } ${rounded ? "rounded-3xl" : "rounded-xl"} ${
          shadow ? "shadow-[8px_8px_0_0_rgba(15,23,42,0.15)]" : ""
        }`}
        style={showFrame ? { borderColor: qrColor } : {}}
      >
        {showScanText && scanTop && (
          <div
            className="text-center font-bold tracking-widest text-xs pb-2 -mt-1"
            style={{ color: qrColor }}
          >
            ESCANEAME
          </div>
        )}
        <div ref={containerRef} className="flex items-center justify-center" />
        {showScanText && !scanTop && (
          <div
            className="text-center font-bold tracking-widest text-xs pt-2 -mb-1"
            style={{ color: qrColor }}
          >
            ESCANEAME
          </div>
        )}
      </div>
    </div>
  );
}

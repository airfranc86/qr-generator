import { memo, useMemo } from "react";

const SIZE = 11;
const CELL = 4;
const VIEWBOX = SIZE * CELL;

const GRID = (() => {
  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  const placeFinder = (offX, offY) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const ring = i === 0 || i === 4 || j === 0 || j === 4;
        const center = i === 2 && j === 2;
        g[offY + i][offX + j] = ring || center ? 1 : 0;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(SIZE - 5, 0);
  placeFinder(0, SIZE - 5);

  const data = "1011010110010110100101101001011010010110100101101001";
  let idx = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const inTL = r < 5 && c < 5;
      const inTR = r < 5 && c >= SIZE - 5;
      const inBL = r >= SIZE - 5 && c < 5;
      if (inTL || inTR || inBL) continue;
      if (data[idx % data.length] === "1") g[r][c] = 1;
      idx++;
    }
  }
  return g;
})();

function renderRuns(axis, color) {
  const out = [];
  const lineThickness = CELL * 0.55;
  const offset = (CELL - lineThickness) / 2;

  if (axis === "vertical") {
    for (let c = 0; c < SIZE; c++) {
      let start = -1;
      for (let r = 0; r <= SIZE; r++) {
        const on = r < SIZE && GRID[r][c] === 1;
        if (on && start === -1) start = r;
        else if (!on && start !== -1) {
          const len = r - start;
          out.push(
            <rect
              key={`v-${c}-${start}`}
              x={c * CELL + offset}
              y={start * CELL + offset}
              width={lineThickness}
              height={len * CELL - 2 * offset}
              rx={lineThickness / 2}
              fill={color}
            />
          );
          start = -1;
        }
      }
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      let start = -1;
      for (let c = 0; c <= SIZE; c++) {
        const on = c < SIZE && GRID[r][c] === 1;
        if (on && start === -1) start = c;
        else if (!on && start !== -1) {
          const len = c - start;
          out.push(
            <rect
              key={`h-${r}-${start}`}
              x={start * CELL + offset}
              y={r * CELL + offset}
              width={len * CELL - 2 * offset}
              height={lineThickness}
              rx={lineThickness / 2}
              fill={color}
            />
          );
          start = -1;
        }
      }
    }
  }
  return out;
}

function renderModules(style, color) {
  const out = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (GRID[r][c] !== 1) continue;
      const x = c * CELL;
      const y = r * CELL;

      if (style === "circle") {
        out.push(
          <circle
            key={`${r}-${c}`}
            cx={x + CELL / 2}
            cy={y + CELL / 2}
            r={CELL * 0.42}
            fill={color}
          />
        );
      } else if (style === "rounded") {
        out.push(
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            rx={CELL * 0.32}
            fill={color}
          />
        );
      } else if (style === "gapped") {
        out.push(
          <rect
            key={`${r}-${c}`}
            x={x + CELL * 0.18}
            y={y + CELL * 0.18}
            width={CELL * 0.64}
            height={CELL * 0.64}
            rx={CELL * 0.05}
            fill={color}
          />
        );
      } else {
        out.push(
          <rect
            key={`${r}-${c}`}
            x={x}
            y={y}
            width={CELL}
            height={CELL}
            fill={color}
          />
        );
      }
    }
  }
  return out;
}

function ModulePreviewBase({ style, color = "#0F172A", bg = "#FFFFFF" }) {
  const elements = useMemo(() => {
    if (style === "vertical" || style === "horizontal") {
      return renderRuns(style, color);
    }
    return renderModules(style, color);
  }, [style, color]);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className="w-full h-full rounded-md"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect x="0" y="0" width={VIEWBOX} height={VIEWBOX} fill={bg} />
      {elements}
    </svg>
  );
}

const ModulePreview = memo(ModulePreviewBase);
export default ModulePreview;

// Debug: every photo shown WHOLE (contain-fit, 2 per row) with a 10% grid and a labelled cyan dot on each anchor.
// Anchors are fractions of the photo, so read the grid, fix the numbers, re-render, and only then animate doodles.
//   npx remotion still src/index.ts AnchorDots out/stills/anchor-dots.png
// For placement inside the actual reel layout (crops, safe areas), render the reel itself with the `guides` prop.
import { AbsoluteFill, staticFile } from "remotion";
import { Photo } from "./Photo";
import { useImageInfo, VIRTUAL, type Box, type Pt } from "./image";
import { PALETTE } from "./theme";

function DotsCell({ k, src, cell, anchors }: { k: string; src: string; cell: Box; anchors: Record<string, Pt> }) {
  const info = useImageInfo(staticFile(src));
  const nat = info?.ok ? info : VIRTUAL;
  const sc = Math.min(cell.w / nat.w, cell.h / nat.h);
  const box = { x: cell.x + (cell.w - nat.w * sc) / 2, y: cell.y + (cell.h - nat.h * sc) / 2, w: nat.w * sc, h: nat.h * sc };
  return (
    <>
      <Photo k={`dots-${k}`} src={src} box={box} crop={[0, 0, 1, 1]} label={src} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} stroke="rgba(255,255,0,0.35)" strokeWidth={1}>
            <line x1={box.x + ((i + 1) * box.w) / 10} x2={box.x + ((i + 1) * box.w) / 10} y1={box.y} y2={box.y + box.h} />
            <line y1={box.y + ((i + 1) * box.h) / 10} y2={box.y + ((i + 1) * box.h) / 10} x1={box.x} x2={box.x + box.w} />
          </g>
        ))}
        <text x={box.x + 6} y={box.y + 22} fontSize={20} fill="#ff0" fontFamily="sans-serif" fontWeight={700}>{k}{info?.ok ? "" : " (no photo: placeholder)"}</text>
        {Object.entries(anchors).map(([n, p]) => {
          const x = box.x + p[0] * box.w, y = box.y + p[1] * box.h;
          return (
            <g key={n}>
              <circle cx={x} cy={y} r={6} fill="cyan" stroke="#000" strokeWidth={2} />
              <text x={x + 9} y={y - 7} fontSize={15} fill="cyan" stroke="#000" strokeWidth={0.6} fontFamily="sans-serif" fontWeight={700}>
                {n} [{p[0].toFixed(2)}, {p[1].toFixed(2)}]
              </text>
            </g>
          );
        })}
      </svg>
    </>
  );
}

export function AnchorDots({ photos, anchors }: { photos: { k: string; src: string }[]; anchors: Record<string, Record<string, Pt>> }) {
  const rows = Math.ceil(photos.length / 2), gap = 20, cw = (1080 - 3 * gap) / 2, ch = (1920 - (rows + 1) * gap) / rows;
  return (
    <AbsoluteFill style={{ background: PALETTE.bg }}>
      {photos.map((ph, i) => (
        <DotsCell key={ph.k} k={ph.k} src={ph.src} anchors={anchors[ph.k] ?? {}}
          cell={{ x: gap + (i % 2) * (cw + gap), y: gap + Math.floor(i / 2) * (ch + gap), w: cw, h: ch }} />
      ))}
    </AbsoluteFill>
  );
}

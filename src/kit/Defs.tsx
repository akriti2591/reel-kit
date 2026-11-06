// SVG filters used across the kit. Render <Defs /> once at the root of every composition.
//   #glow     soft lamp glow behind gold doodles
//   #txtstk   die-cut text sticker: white outline (dilate + round), hairline edge, soft tinted shadow
//   #vblur    vertical motion blur (whip pans)
//   #paper    paper fibre texture (torn paper)
import { PALETTE } from "./theme";

export const Defs = ({ glow = PALETTE.glow, shadow = "#2a1416" }: { glow?: string; shadow?: string }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b" />
        <feFlood floodColor={glow} floodOpacity="0.55" />
        <feComposite in2="b" operator="in" result="g" />
        <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="txtstk" x="-25%" y="-60%" width="150%" height="220%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="14" result="d" />
        <feGaussianBlur in="d" stdDeviation="3" result="db" />
        <feComponentTransfer in="db" result="shape"><feFuncA type="linear" slope="6" intercept="-2.2" /></feComponentTransfer>
        <feMorphology in="shape" operator="dilate" radius="1.2" result="edgeA" />
        <feFlood floodColor="#cdbfae" /><feComposite in2="edgeA" operator="in" result="edge" />
        <feFlood floodColor={PALETTE.paper} /><feComposite in2="shape" operator="in" result="white" />
        <feGaussianBlur in="shape" stdDeviation="6" result="sb" /><feOffset in="sb" dy="7" result="so" />
        <feFlood floodColor={shadow} floodOpacity="0.38" /><feComposite in2="so" operator="in" result="shadow" />
        <feMerge><feMergeNode in="shadow" /><feMergeNode in="edge" /><feMergeNode in="white" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="vblur" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0 8" /></filter>
      <filter id="paper" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="4" seed="3" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.43  0 0 0 0 0.40  0 0 0 0.16 0" result="nc" />
        <feComposite in="nc" in2="SourceAlpha" operator="in" result="tex" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="tex" /></feMerge>
      </filter>
    </defs>
  </svg>
);

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
}

/** Bitarnos brand mark: an isometric cube built from three pixel-block faces with a blocky "B". */
export function Logo({ size = 28, withWordmark = false }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <polygon points="32,4 58,18 32,32 6,18" fill="var(--blue)" />
        <polygon points="6,18 32,32 32,60 6,46" fill="var(--green-dim)" />
        <polygon points="58,18 32,32 32,60 58,46" fill="var(--green)" />
        <path
          d="M22 24 h6 a4 4 0 0 1 0 8 h-6 z m0 8 h7 a4 4 0 0 1 0 8 h-7 z"
          fill="none"
          stroke="#05130a"
          strokeWidth={2.4}
          strokeLinejoin="round"
          transform="translate(0 -4)"
        />
      </svg>
      {withWordmark && <span className="sidebar__brand-name">Bitarnos</span>}
    </div>
  );
}

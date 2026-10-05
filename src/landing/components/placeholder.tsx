import type { CSSProperties, ReactNode } from "react";

/**
 * Content the design leaves open (a price, a plan name, a platform, an address): shown as a marked, dashed
 * placeholder until the real text is supplied (owload-docs/decisions/0024, point 5).
 */
export function Placeholder({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span style={style} className={`rounded-md border border-dashed border-current px-1.5 py-px box-decoration-clone ${className}`}>
      {children}
    </span>
  );
}

/** The small yellow label above a section heading. */
export function SectionTag({ children }: { children: ReactNode }) {
  return (
    <div className="self-start rounded-lg bg-(--lp-yellow) px-2.5 py-1 text-[13px] font-extrabold uppercase tracking-[0.08em] text-(--lp-ink)">
      {children}
    </div>
  );
}

/** The key phrase of a heading: a dark chip with yellow text. */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="rounded-[0.14em] bg-(--lp-ink) px-[0.14em] text-(--lp-yellow) box-decoration-clone">{children}</span>;
}

/** Concentric outlines that decorate the yellow areas. */
export function Rings({ className = "", sizes, offset }: { className?: string; sizes: number[]; offset: (size: number) => { top?: number; right?: number; bottom?: number; left?: number } }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {sizes.map((size) => (
        <div
          key={size}
          className="absolute rounded-full border-2 border-(--lp-yellow-edge)"
          style={{ width: size, height: size, ...offset(size) }}
        />
      ))}
    </div>
  );
}

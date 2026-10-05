export function Logo({ height, className = "" }: { height: number; className?: string }) {
  return <img src="/logo-full.svg" alt="owload" style={{ height }} className={`block w-auto ${className}`} />;
}

export default function IrisMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M2 16C6 8.5 10.7 5 16 5s10 3.5 14 11c-4 7.5-8.7 11-14 11S6 23.5 2 16Z" fill="#fff" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="7.2" fill="#5a3fd9" />
      <circle cx="16" cy="16" r="3.2" fill="#1e1a3a" />
      <circle cx="18.6" cy="13.4" r="1.6" fill="#ffc53d" />
    </svg>
  );
}

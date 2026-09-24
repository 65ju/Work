export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1.5 leading-none ${className}`}>
      <span className="font-serif text-[1.35em] italic tracking-tight">Music</span>
      <span className="text-[0.95em] font-medium tracking-[-0.02em]">Intelligence</span>
    </span>
  );
}

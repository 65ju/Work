import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children, aside }: { eyebrow: string; title: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 text-headline font-semibold text-balance">{title}</h1>
        {children && <div className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-2">{children}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-3">
      <h2 className="eyebrow">{children}</h2>
      {right}
    </div>
  );
}

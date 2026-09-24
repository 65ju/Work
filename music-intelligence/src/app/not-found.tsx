import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-4 px-8">
      <p className="eyebrow">404</p>
      <h1 className="text-5xl font-semibold tracking-tight">
        Nothing <span className="font-serif font-normal italic">playing</span> here.
      </h1>
      <Link href="/overview" className="mt-4 rounded-full border border-line-strong px-5 py-2.5 text-sm hover:bg-white/5">
        Back to your music
      </Link>
    </main>
  );
}

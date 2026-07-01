import Link from "next/link";
// No icons used in JSX

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center text-center px-6">
      <h1 className="font-serif text-8xl text-[var(--color-text-primary)] font-light italic mb-6">404</h1>
      
      <h2 className="font-sans text-[16px] uppercase tracking-[0.2em] text-[var(--color-text-primary)] mb-4">
        Fragrance Not Found
      </h2>
      
      <p className="font-sans text-[13px] text-[var(--color-text-secondary)] max-w-md mx-auto mb-10 leading-relaxed">
        The scent you are looking for has evaporated into thin air. It may have been discontinued, relocated, or temporarily out of stock.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-16">
        <Link 
          href="/all"
          className="inline-block bg-[#1a1410] text-[#ffffff] px-8 py-3.5 font-sans text-[10px] uppercase tracking-[0.25em] hover:bg-[#333333] transition-colors"
        >
          Explore All Scents
        </Link>
        <Link
          href="/"
          className="inline-block border border-[var(--color-border-dark)] text-[var(--color-text-primary)] px-8 py-3.5 font-sans text-[10px] uppercase tracking-[0.25em] hover:border-[var(--color-gold)] transition-colors"
        >
          Return Home
        </Link>
      </div>

    </main>
  );
}

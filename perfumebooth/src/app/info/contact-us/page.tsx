import type { Metadata } from 'next';
import Image from 'next/image';
import InfoHero from '@/components/layout/InfoHero';
import ContactForm from '@/app/help/ContactForm';
import { getContactUs } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Contact Us | PerfumeBooth',
  description: 'Connect with PerfumeBooth. For product inquiries, collaborations, and customer service.',
};

export default async function ContactUsPage() {
  const page = await getContactUs();
  const info = page?.contactInfo || {
    email: 'admin@perfumebooth.com',
    phone: '+91 9266030909 / 011-46604937',
    hours: 'Mon to Sat, 10am to 6pm',
    address: '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015'
  };

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      
      {/* ── Editorial Hero Section ── */}
      <InfoHero 
        title={page?.title || "We're Here For You"} 
        desktopSrc={(page as any)?.hero?.desktopSrc || "/images/fallback-luxury.svg"}
        mobileSrc={(page as any)?.hero?.mobileSrc || (page as any)?.hero?.desktopSrc || "/images/fallback-luxury.svg"}
        pillText="Get In Touch" 
        description="Elevate your senses. Whether it's a question about a fragrance note or your recent order, our bespoke service team awaits."
      />

      {/* ── Contact Info Cards (Overlapping Hero) ── */}
      <section className="relative z-20 max-w-6xl mx-auto px-6 -mt-16 md:-mt-16 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Email Card */}
          <div className="bg-[var(--color-surface)] p-10 flex flex-col items-center text-center shadow-lg border border-[var(--color-border)]">
            <span className="w-12 h-12 rounded-full border border-[var(--color-gold)] text-[var(--color-gold)] flex items-center justify-center mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-2">Email Us</h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-4">For general inquiries</p>
            <a href={`mailto:${info.email}`} className="text-sm font-serif text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors pb-0.5 border-b border-[var(--color-gold)]">
              {info.email || 'admin@perfumebooth.com'}
            </a>
          </div>

          {/* Phone Card */}
          <div className="bg-[var(--color-bg-subtle)] p-10 flex flex-col items-center text-center shadow-lg border border-[var(--color-border)]">
            <span className="w-12 h-12 rounded-full bg-[var(--color-gold)] flex items-center justify-center mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2">Call Us</h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-4">{info.hours || 'Mon to Sat, 10am to 6pm'}</p>
            <div className="flex flex-col gap-2">
              <a href={`tel:${info.phone}`} className="text-sm font-serif hover:text-[var(--color-gold)] transition-colors">
                {info.phone || '+91 9266030909'}
              </a>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-[var(--color-surface)] p-10 flex flex-col items-center text-center shadow-lg border border-[var(--color-border)]">
            <span className="w-12 h-12 rounded-full border border-[var(--color-gold)] text-[var(--color-gold)] flex items-center justify-center mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-primary)] mb-2">Visit Us</h3>
            <p className="text-[var(--color-text-muted)] text-sm mb-4">Head Office</p>
            <p className="text-sm font-serif text-[var(--color-text-primary)] leading-relaxed max-w-[220px]">
              {info.address || '70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Split Form & Editorial Image Section ── */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2">
          
          {/* Editorial Image Left */}
          <div className="relative hidden lg:block h-full min-h-[700px]">
            <Image
              src="/images/banners/contact-us-mobile.png"
              alt="Exclusive Fragrance"
              fill
              className="absolute inset-0 h-full w-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            {/* Subtle Overlay */}
            <div className="absolute inset-0 bg-black/5 mix-blend-multiply" />
          </div>

          {/* Form Right */}
          <div className="px-6 py-20 lg:p-24 flex flex-col justify-center bg-[var(--color-bg)]">
            <h2 className="text-4xl md:text-5xl font-serif text-[var(--color-text-primary)] mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Send a Message
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm mb-12 font-light leading-relaxed max-w-md">
              Fill out the form below with your inquiries, and one of our dedicated fragrance specialists will be in touch shortly.
            </p>

            <ContactForm />

            {/* Social Media Links */}
            <div className="mt-16 pt-8 border-t border-[var(--color-border)] w-full">
              <h4 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.25em] mb-5">Connect With Us</h4>
              <div className="flex items-center gap-4">
                {/* Instagram */}
                <a href="https://www.instagram.com/perfumeboothindia?igsh=ZXNydDBpcnM4Nnlz" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover:text-white transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259 0 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                {/* Facebook */}
                <a href="https://www.facebook.com/perfumeboothin" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover:text-white transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
                {/* X */}
                <a href="https://www.x.com/perfumebooth" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover:text-white transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
                </a>
                {/* YouTube */}
                <a href="https://www.youtube.com/@perfumebooth" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover:text-white transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                {/* Pinterest */}
                <a href="https://www.pinterest.com/perfumeboothin/" target="_blank" rel="noopener noreferrer" aria-label="Pinterest" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover:text-white transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.268-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>



    </main>
  );
}

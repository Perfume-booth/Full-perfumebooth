import type { Metadata } from 'next';
import Image from 'next/image';
import InfoHero from '@/components/layout/InfoHero';

export const metadata: Metadata = {
  title: 'Contact Us | PerfumeBooth',
  description: 'Connect with PerfumeBooth. For product inquiries, collaborations, and customer service.',
};

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      
      {/* ── Editorial Hero Section ── */}
      <InfoHero 
        title="We're Here For You" 
        desktopSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/contact_139b629a-4e56-42a7-9441-4750a1995629.png?v=1779253483" 
        mobileSrc="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/contact_139b629a-4e56-42a7-9441-4750a1995629.png?v=1779253483" 
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
            <a href="mailto:admin@perfumebooth.com" className="text-sm font-serif text-[var(--color-text-primary)] hover:text-[var(--color-gold)] transition-colors pb-0.5 border-b border-[var(--color-gold)]">
              admin@perfumebooth.com
            </a>
          </div>

          {/* Phone Card */}
          <div className="bg-[var(--color-bg-subtle)] p-10 flex flex-col items-center text-center shadow-lg  border border-[var(--color-border)]">
            <span className="w-12 h-12 rounded-full bg-[var(--color-gold)]  flex items-center justify-center mb-6">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </span>
            <h3 className="text-[11px] font-bold uppercase tracking-widest  mb-2">Call Us</h3>
            <p className="/60 text-sm mb-4">Mon to Sat, 10am to 6pm</p>
            <div className="flex flex-col gap-2">
              <a href="tel:+918287791303" className="text-sm font-serif hover:text-[var(--color-gold)] transition-colors ">
              +91 9266030909
              </a>
              <a href="tel:01146604937" className="text-sm font-serif hover:text-[var(--color-gold)] transition-colors ">
                011-46604937
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
            <p className="text-sm font-serif text-[var(--color-text-primary)] leading-relaxed max-w-[200px]">
              70B/35A, 3rd Floor, Rama Road Industrial Area, New Delhi – 110015
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
              src="https://cdn.shopify.com/s/files/1/0718/5786/4996/files/contact_139b629a-4e56-42a7-9441-4750a1995629.png?v=1779253483"
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

            <form className="max-w-xl w-full flex flex-col gap-10">
              
              {/* Modern Minimal Inputs */}
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  placeholder=" "
                  required
                  className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors"
                />
                <label 
                  htmlFor="name" 
                  className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
                >
                  Your Full Name *
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    placeholder=" "
                    required
                    className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors"
                  />
                  <label 
                    htmlFor="email" 
                    className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
                  >
                    Email Address *
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    placeholder=" "
                    className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors"
                  />
                  <label 
                    htmlFor="phone" 
                    className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
                  >
                    Phone Number
                  </label>
                </div>
              </div>

              <div className="relative mt-2">
                <textarea
                  id="message"
                  required
                  rows={4}
                  placeholder=" "
                  className="block w-full pt-4 pb-2 text-sm text-[var(--color-text-primary)] bg-transparent border-0 border-b border-[var(--color-border)] appearance-none focus:outline-none focus:ring-0 focus:border-[var(--color-gold)] peer transition-colors resize-none"
                />
                <label 
                  htmlFor="message" 
                  className="absolute text-sm text-[var(--color-text-muted)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-[var(--color-gold)]"
                >
                  Your Message *
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 w-full sm:w-auto self-start bg-[var(--color-gold)] hover:bg-[var(--color-gold-dark)]  px-12 py-4 text-[10px] font-bold uppercase tracking-[0.25em] transition-all duration-500 hover:shadow-xl hover:shadow-[var(--color-gold)]/20"
              >
                Submit Inquiry
              </button>

            </form>

            {/* Social Media Links */}
            <div className="mt-16 pt-8 border-t border-[var(--color-border)] w-full">
              <h4 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.25em] mb-5">Connect With Us</h4>
              <div className="flex items-center gap-4">
                {/* Instagram */}
                <a href="https://instagram.com/perfumebooth" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover: transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259 0 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                {/* Facebook */}
                <a href="https://facebook.com/perfumebooth" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover: transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
                {/* X */}
                <a href="https://x.com/perfumebooth" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X" className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-gold)] hover:border-[var(--color-gold)] hover: transition-all duration-300 hover:scale-105">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Map Section ── */}
      <section className="w-full h-[50vh] min-h-[400px] border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14006.012557437812!2d77.1352462!3d28.6446869!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d032128a55555%3A0xe6ebd34812a4f4e!2sRama%20Rd%2C%20Block%20B%2C%20Najafgarh%20Road%20Industrial%20Area%2C%20New%20Delhi%2C%20Delhi%20110015!5e0!3m2!1sen!2sin!4v1690000000000!5m2!1sen!2sin"
          className="w-full h-full grayscale-[80%] contrast-[110%] opacity-90 mix-blend-multiply hover:grayscale-0 hover:mix-blend-normal hover:opacity-100 transition-all duration-1000"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </section>

    </main>
  );
}

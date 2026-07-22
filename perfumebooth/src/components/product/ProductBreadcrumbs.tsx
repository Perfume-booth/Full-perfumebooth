'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface ProductBreadcrumbsProps {
  brandName: string;
  brandSlug: string;
  productTitle: string;
}

export default function ProductBreadcrumbs({ brandName, brandSlug, productTitle }: ProductBreadcrumbsProps) {
  const searchParams = useSearchParams();
  const [breadcrumbs, setBreadcrumbs] = useState({ label: brandName, href: `/${brandSlug}` });

  useEffect(() => {
    const fromParam = searchParams.get('from');
    if (fromParam && fromParam.toLowerCase() !== 'all') {
      const parts = fromParam.split('/');
      const lastPart = parts[parts.length - 1];
      const label = lastPart
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setBreadcrumbs({ label, href: `/${fromParam}` });
    } else {
      setBreadcrumbs({ label: brandName, href: `/${brandSlug}` });
    }
  }, [searchParams, brandName, brandSlug]);

  return (
    <div className="max-w-7xl mx-auto md:py-4 px-4 md:px-6 md:mt-3 text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] font-semibold border-l-[3px] border-[#b8924a] bg-gradient-to-r from-[#b8924a]/5">
        <div className="flex flex-wrap items-center">
            <Link href="/" className="hover:text-[var(--color-text-primary)] transition-colors">Home</Link>
            <span className="mx-2 md:mx-3 opacity-50">/</span>
            <Link href={breadcrumbs.href} className="hover:text-[var(--color-text-primary)] transition-colors">{breadcrumbs.label}</Link>
            <span className="mx-2 md:mx-3 opacity-50">/</span>
            <span className="text-[var(--color-text-primary)] truncate max-w-[150px] md:max-w-none">{productTitle}</span>
        </div>
    </div>
  );
}

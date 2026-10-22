'use client';

import Sidebar from './Sidebar';

export default function ResponsiveSidebar() {
  return <>
    <div className="hidden md:block shrink-0"><Sidebar /></div>
    <details className="md:hidden border-b border-border bg-card" onClick={event => {
      if ((event.target as HTMLElement).closest('a')) event.currentTarget.open = false;
    }}>
      <summary className="cursor-pointer px-4 py-3 font-semibold text-sm">Merchant navigation</summary>
      <div className="[&>aside]:w-full [&>aside]:h-auto [&>aside]:max-h-[65vh] [&>aside]:static"><Sidebar /></div>
    </details>
  </>;
}

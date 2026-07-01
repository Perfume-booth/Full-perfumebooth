"use client";

import { useEffect } from "react";

export default function MaterialSymbolsInjector() {
  useEffect(() => {
    // Inject the Material Symbols stylesheet asynchronously 
    // so it NEVER blocks the initial HTML parsing/rendering
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return null;
}

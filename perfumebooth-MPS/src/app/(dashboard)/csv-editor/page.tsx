'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CSVEditorIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/csv-editor/import');
  }, [router]);

  return null;
}

'use client';

import React from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface CKEditorWrapperProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
}

export default function CKEditorWrapper({ value, onChange, placeholder }: CKEditorWrapperProps) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-background text-foreground text-sm">
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        config={{
          placeholder: placeholder || 'Type your content here...',
          toolbar: [
            'heading',
            '|',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            'blockQuote',
            '|',
            'undo',
            'redo'
          ]
        }}
        onChange={(_event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
      <style jsx global>{`
        .ck-editor__editable_inline {
          min-height: 220px;
          background-color: var(--color-background, #121212) !important;
          color: var(--color-foreground, #ffffff) !important;
          padding: 1rem !important;
        }
        .ck-toolbar {
          background-color: var(--color-card, #1a1a1a) !important;
          border-color: var(--color-border, #333333) !important;
        }
        .ck-toolbar__items .ck-button {
          color: var(--color-foreground, #e5e5e5) !important;
        }
        .ck-toolbar__items .ck-button:hover {
          background-color: var(--color-muted, #262626) !important;
        }
        .ck-toolbar__items .ck-button.ck-on {
          background-color: var(--color-primary, #d4af37) !important;
          color: #000000 !important;
        }
        .ck-dropdown__panel {
          background-color: var(--color-card, #1a1a1a) !important;
          border-color: var(--color-border, #333333) !important;
        }
        .ck-list__item .ck-button {
          color: var(--color-foreground, #ffffff) !important;
        }
        .ck-list__item .ck-button:hover {
          background-color: var(--color-muted, #262626) !important;
        }
      `}</style>
    </div>
  );
}

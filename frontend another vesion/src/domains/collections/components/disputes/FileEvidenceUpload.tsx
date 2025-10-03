import { useRef } from 'react';

export function FileEvidenceUpload({ onUpload }: { onUpload: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="font-medium">Upload Evidence (photos, docs)</label>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="block border rounded px-3 py-2"
        onChange={e => {
          if (e.target.files) {
            onUpload(Array.from(e.target.files));
          }
        }}
      />
    </div>
  );
}

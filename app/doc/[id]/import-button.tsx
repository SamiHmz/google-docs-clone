"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_ACCEPT,
  UnsupportedFileError,
  fileExtension,
  parseFileToHtml,
} from "@/lib/parseUpload";

export function ImportButton({ editor }: { editor: Editor | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!["txt", "md", "docx"].includes(fileExtension(file.name))) {
      setError("Only .txt, .md, and .docx files are supported.");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("File is too large (2MB max).");
      return;
    }
    if (!editor) return;

    setImporting(true);
    try {
      const html = await parseFileToHtml(file);
      editor.chain().focus().insertContent(html).run();
    } catch (err) {
      setError(
        err instanceof UnsupportedFileError
          ? "Only .txt, .md, and .docx files are supported."
          : "Something went wrong reading that file."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importing || !editor}
        aria-label="Import file into document"
        title="Insert a .txt, .md, or .docx file at the cursor"
        className="rounded px-2.5 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
      >
        {importing ? "Importing…" : "⭳ Import"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}

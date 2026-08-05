"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_ACCEPT,
  UnsupportedFileError,
  fileExtension,
  parseFileToHtml,
  titleFromFilename,
} from "@/lib/parseUpload";

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

    setUploading(true);
    try {
      const content = await parseFileToHtml(file);
      const title = titleFromFilename(file.name);

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { id } = await res.json();
      router.push(`/doc/${id}`);
    } catch (err) {
      setError(
        err instanceof UnsupportedFileError
          ? "Only .txt, .md, and .docx files are supported."
          : "Something went wrong reading that file."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
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
        disabled={uploading}
        className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload file"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

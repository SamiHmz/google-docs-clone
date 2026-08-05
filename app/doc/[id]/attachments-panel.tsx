"use client";

import { useRef, useState } from "react";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: { name: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  documentId,
  initialAttachments,
}: {
  documentId: string;
  initialAttachments: Attachment[];
}) {
  const [attachments, setAttachments] = useState(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setError("File is too large (2MB max).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${documentId}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const attachment = await res.json();
      setAttachments((prev) => [attachment, ...prev]);
    } catch {
      setError("Something went wrong uploading that file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    await fetch(`/api/documents/${documentId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
  }

  return (
    <div className="mt-4 rounded-lg border border-neutral-200 bg-white px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-900">Attachments</h3>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
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
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "+ Attach file"}
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-xs text-neutral-400">No attachments yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
              <a
                href={`/api/documents/${documentId}/attachments/${a.id}`}
                className="truncate text-neutral-700 hover:underline"
                title={a.filename}
              >
                📎 {a.filename}
              </a>
              <span className="flex shrink-0 items-center gap-2 text-neutral-400">
                {formatSize(a.size)} · {a.uploadedBy.name}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="text-neutral-400 hover:text-red-600"
                  aria-label={`Remove ${a.filename}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function RenameableTitle({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    const trimmed = title.trim() || "Untitled document";
    setTitle(trimmed);
    setEditing(false);
    if (trimmed === initialTitle) return;

    setSaving(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setTitle(initialTitle);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") cancel();
          }}
          className="truncate rounded border border-neutral-300 px-1.5 py-0.5 text-sm font-medium text-neutral-900 outline-none"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label="Save title"
          title="Save"
          className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
        >
          {saving ? "…" : "✓ Save"}
        </button>
        <button
          type="button"
          onClick={cancel}
          aria-label="Cancel rename"
          title="Cancel"
          className="text-xs text-neutral-400 hover:text-neutral-700"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <span className="group flex items-center gap-1.5">
      <Link
        href={`/doc/${documentId}`}
        className="truncate text-sm font-medium text-neutral-900 hover:underline"
      >
        {title || "Untitled document"}
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label="Rename document"
        title="Rename"
        className="opacity-0 transition group-hover:opacity-100 text-xs text-neutral-400 hover:text-neutral-700"
      >
        {saving ? "…" : "✎"}
      </button>
    </span>
  );
}

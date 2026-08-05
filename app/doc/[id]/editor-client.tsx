"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import { ImportButton } from "./import-button";

type Draft = {
  title: string;
  content: string;
  baseUpdatedAt: string;
  savedAt: string;
};

function draftKey(documentId: string) {
  return `doc-draft-${documentId}`;
}

type SaveStatus = "saved" | "saving" | "unsaved" | "error";

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  initialUpdatedAt,
}: {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [recoverable, setRecoverable] = useState<Draft | null>(null);
  const latestUpdatedAt = useRef(initialUpdatedAt);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: initialContent || "<p></p>",
    immediatelyRender: false,
    onUpdate: () => scheduleSave(),
  });

  // On mount: check for a local draft newer than what the server has.
  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey(documentId));
    if (!raw) return;
    try {
      const draft: Draft = JSON.parse(raw);
      if (draft.baseUpdatedAt === latestUpdatedAt.current) {
        setRecoverable(draft);
      } else {
        // server has moved on since this draft was made; drop it
        window.localStorage.removeItem(draftKey(documentId));
      }
    } catch {
      window.localStorage.removeItem(draftKey(documentId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mirrorToLocalStorage(nextTitle: string, editorInstance: Editor) {
    const draft: Draft = {
      title: nextTitle,
      content: editorInstance.getHTML(),
      baseUpdatedAt: latestUpdatedAt.current,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(draftKey(documentId), JSON.stringify(draft));
  }

  function scheduleSave() {
    if (!editor) return;
    setStatus("unsaved");
    mirrorToLocalStorage(title, editor);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 800);
  }

  async function save() {
    if (!editor) return;
    setStatus("saving");
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: editor.getHTML() }),
      });
      if (!res.ok) throw new Error("save failed");
      const updated = await res.json();
      latestUpdatedAt.current = updated.updatedAt;
      window.localStorage.removeItem(draftKey(documentId));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    setStatus("unsaved");
    if (editor) mirrorToLocalStorage(value, editor);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 800);
  }

  function restoreDraft() {
    if (!recoverable || !editor) return;
    editor.commands.setContent(recoverable.content);
    setTitle(recoverable.title);
    setRecoverable(null);
    scheduleSave();
  }

  function discardDraft() {
    window.localStorage.removeItem(draftKey(documentId));
    setRecoverable(null);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {recoverable && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>We found unsaved changes from a previous session.</span>
          <div className="flex gap-3">
            <button onClick={restoreDraft} className="font-medium underline">
              Restore
            </button>
            <button onClick={discardDraft} className="text-amber-700">
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled document"
          className="w-full border-none bg-transparent text-2xl font-semibold text-neutral-900 outline-none"
        />
        <SaveIndicator status={status} />
      </div>

      {editor && (
        <div className="flex items-center justify-between gap-2">
          <Toolbar editor={editor} />
          <ImportButton editor={editor} />
        </div>
      )}

      <div className="mt-4 min-h-[60vh] rounded-lg border border-neutral-200 bg-white px-6 py-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Couldn't save — retrying"
          : "Unsaved changes";
  const color =
    status === "error" ? "text-red-500" : status === "saved" ? "text-neutral-400" : "text-neutral-400";
  return <span className={`shrink-0 text-xs ${color}`}>{label}</span>;
}

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded px-2.5 py-1.5 text-sm font-medium ${
        active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-neutral-200" />
      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-neutral-200" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;
      </ToolbarButton>
    </div>
  );
}

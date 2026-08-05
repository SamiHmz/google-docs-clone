import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getDocumentForUser } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { DocumentEditor } from "./editor-client";
import { AttachmentsPanel } from "./attachments-panel";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const access = await getDocumentForUser(id, user.id);
  if (!access) notFound();

  const { document } = access;

  const attachments = await prisma.attachment.findMany({
    where: { documentId: document.id },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <Link href="/dashboard" className="text-sm text-neutral-400 hover:text-neutral-700">
          ← Back
        </Link>
        <span className="text-xs text-neutral-400">
          Owned by {document.owner.name}
          {document.ownerId === user.id ? " (you)" : ""}
        </span>
      </header>
      <DocumentEditor
        documentId={document.id}
        initialTitle={document.title}
        initialContent={document.content}
        initialUpdatedAt={document.updatedAt.toISOString()}
      />
      <div className="mx-auto max-w-3xl px-6 pb-8">
        <AttachmentsPanel documentId={document.id} initialAttachments={attachments} />
      </div>
    </div>
  );
}

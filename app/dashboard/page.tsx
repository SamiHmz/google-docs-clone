import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  createDocument,
  deleteDocument,
  logout,
  shareDocument,
  unshareDocument,
} from "./actions";
import { RenameableTitle } from "./rename-title";
import { UploadButton } from "./upload-button";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ownedDocuments, sharedDocuments, allUsers] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      include: { shares: { include: { user: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.document.findMany({
      where: { shares: { some: { userId: user.id } } },
      include: { owner: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-8 py-4">
        <h1 className="text-lg font-semibold text-neutral-900">Docs</h1>
        <div className="flex items-center gap-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: user.color }}
          >
            {user.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
          <span className="text-sm text-neutral-600">{user.name}</span>
          <form action={logout}>
            <button className="text-sm text-neutral-400 hover:text-neutral-700" type="submit">
              Switch user
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-8 py-10">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-base font-medium text-neutral-900">My documents</h2>
          <div className="flex items-center gap-2">
            <UploadButton />
            <form action={createDocument}>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                + New document
              </button>
            </form>
          </div>
        </div>

        <ul className="mb-12 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {ownedDocuments.length === 0 && (
            <li className="px-5 py-6 text-sm text-neutral-400">
              No documents yet — create one to get started.
            </li>
          )}
          {ownedDocuments.map((doc) => {
            const sharedUserIds = new Set(doc.shares.map((s) => s.userId));
            const shareable = allUsers.filter(
              (u) => u.id !== user.id && !sharedUserIds.has(u.id)
            );
            return (
              <li key={doc.id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <RenameableTitle documentId={doc.id} initialTitle={doc.title} />
                  <form action={deleteDocument}>
                    <input type="hidden" name="documentId" value={doc.id} />
                    <button
                      type="submit"
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>Shared with:</span>
                  {doc.shares.length === 0 && <span className="text-neutral-300">nobody</span>}
                  {doc.shares.map((share) => (
                    <form key={share.id} action={unshareDocument} className="inline">
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="userId" value={share.userId} />
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-200 px-2 py-0.5 hover:border-red-300 hover:text-red-600"
                        title="Remove access"
                      >
                        {share.user.name} ×
                      </button>
                    </form>
                  ))}
                  {shareable.length > 0 && (
                    <form action={shareDocument} className="inline-flex items-center gap-1">
                      <input type="hidden" name="documentId" value={doc.id} />
                      <select
                        name="userId"
                        defaultValue=""
                        className="rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs"
                        required
                      >
                        <option value="" disabled>
                          + add person
                        </option>
                        {shareable.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-200 px-2 py-0.5 hover:border-neutral-400"
                      >
                        Share
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <h2 className="mb-4 text-base font-medium text-neutral-900">Shared with me</h2>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {sharedDocuments.length === 0 && (
            <li className="px-5 py-6 text-sm text-neutral-400">Nothing shared with you yet.</li>
          )}
          {sharedDocuments.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between px-5 py-4">
              <RenameableTitle documentId={doc.id} initialTitle={doc.title} />
              <span className="text-xs text-neutral-400">owned by {doc.owner.name}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

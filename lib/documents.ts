import { prisma } from "@/lib/prisma";

export async function getDocumentForUser(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      owner: true,
      shares: { include: { user: true } },
    },
  });

  if (!document) return null;

  const isOwner = document.ownerId === userId;
  const isShared = document.shares.some((share) => share.userId === userId);

  if (!isOwner && !isShared) return null;

  return { document, isOwner };
}

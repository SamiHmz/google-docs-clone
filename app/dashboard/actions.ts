"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, clearSessionUser } from "@/lib/session";

export async function createDocument() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const document = await prisma.document.create({
    data: { title: "Untitled document", ownerId: user.id },
  });

  redirect(`/doc/${document.id}`);
}

export async function deleteDocument(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const documentId = formData.get("documentId");
  if (typeof documentId !== "string") return;

  await prisma.document.deleteMany({
    where: { id: documentId, ownerId: user.id },
  });

  revalidatePath("/dashboard");
}

export async function shareDocument(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const documentId = formData.get("documentId");
  const targetUserId = formData.get("userId");
  if (typeof documentId !== "string" || typeof targetUserId !== "string" || !targetUserId) {
    return;
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, ownerId: user.id },
  });
  if (!document) return;

  await prisma.share.upsert({
    where: { documentId_userId: { documentId, userId: targetUserId } },
    update: {},
    create: { documentId, userId: targetUserId },
  });

  revalidatePath("/dashboard");
}

export async function unshareDocument(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const documentId = formData.get("documentId");
  const targetUserId = formData.get("userId");
  if (typeof documentId !== "string" || typeof targetUserId !== "string") return;

  const document = await prisma.document.findFirst({
    where: { id: documentId, ownerId: user.id },
  });
  if (!document) return;

  await prisma.share.deleteMany({
    where: { documentId, userId: targetUserId },
  });

  revalidatePath("/dashboard");
}

export async function logout() {
  await clearSessionUser();
  redirect("/login");
}

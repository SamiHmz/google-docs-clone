import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentForUser } from "@/lib/documents";
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/attachments";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/documents/[id]/attachments">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await prisma.attachment.findMany({
    where: { documentId: id },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(attachments);
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/documents/[id]/attachments">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (2MB max)" }, { status: 413 });
  }

  const data = Buffer.from(await file.arrayBuffer());

  const attachment = await prisma.attachment.create({
    data: {
      documentId: id,
      filename: file.name.slice(0, 255),
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      data,
      uploadedById: user.id,
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      size: true,
      uploadedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

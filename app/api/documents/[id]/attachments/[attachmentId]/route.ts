import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentForUser } from "@/lib/documents";

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/documents/[id]/attachments/[attachmentId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await ctx.params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, documentId: id },
  });
  if (!attachment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
      "Content-Length": String(attachment.size),
    },
  });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/documents/[id]/attachments/[attachmentId]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await ctx.params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.attachment.deleteMany({
    where: { id: attachmentId, documentId: id },
  });

  return NextResponse.json({ ok: true });
}

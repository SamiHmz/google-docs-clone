import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getDocumentForUser } from "@/lib/documents";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/documents/[id]">
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const access = await getDocumentForUser(id, user.id);
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const data: { title?: string; content?: string } = {};
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.content === "string") data.content = body.content;

  const updated = await prisma.document.update({
    where: { id },
    data,
    select: { id: true, title: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

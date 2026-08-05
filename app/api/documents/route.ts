import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : "Untitled document";
  const content = typeof body.content === "string" ? body.content : "";

  const document = await prisma.document.create({
    data: { title, content, ownerId: user.id },
  });

  return NextResponse.json({ id: document.id });
}

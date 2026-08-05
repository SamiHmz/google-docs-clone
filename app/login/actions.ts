"use server";

import { redirect } from "next/navigation";
import { setSessionUser } from "@/lib/session";

export async function loginAs(formData: FormData) {
  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    throw new Error("Missing userId");
  }
  await setSessionUser(userId);
  redirect("/dashboard");
}

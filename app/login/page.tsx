import { prisma } from "@/lib/prisma";
import { loginAs } from "./actions";

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Docs</h1>
        <p className="mb-6 text-sm text-neutral-500">
          This is a take-home demo. Pick a user to continue — there&apos;s no real
          authentication.
        </p>

        <div className="space-y-3">
          {users.map((user) => (
            <form key={user.id} action={loginAs}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                Continue as {user.name}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}

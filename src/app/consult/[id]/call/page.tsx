import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createVideoSession } from "@/lib/video";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";

export default async function CallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string; vet?: string }>;
}) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  const isVet = sp.vet === "true" || session.role === "VET";
  const role = isVet ? "vet" : "owner";

  const consult = await prisma.consult.findUnique({
    where: { id },
    include: { pet: true, vet: { select: { name: true } }, intakeForm: true },
  });
  if (!consult) redirect("/owner/pets");

  const isOwner = consult.ownerId === session.userId;
  const isAssignedVet = consult.vetId === session.userId;
  if (!isOwner && !isAssignedVet && session.role !== "ADMIN") redirect("/unauthorized");

  // Create (or reuse) a video session for this consult
  const recordingConsent = consult.recordingConsentOwner && consult.recordingConsentVet;

  const sessionLink = await createVideoSession({
    consultId: consult.id,
    role,
    jurisdiction: {
      countryCode: consult.countryCode ?? "US",
      regionCode: consult.regionCode ?? "",
    },
    recordingConsent,
  });

  // Persist room info so the other party can rejoin
  await prisma.$executeRaw`
    UPDATE "Consult"
    SET "videoProvider" = ${sessionLink.provider as string},
        "videoRoomId" = ${sessionLink.roomId}
    WHERE "id" = ${consult.id}
  `;

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold mb-4">
            Consulting on <span className="text-brand">{consult.pet?.name ?? "Your pet"}</span>
          </h1>
          {consult.vet && (
            <p className="text-sm text-muted-foreground mb-4">with {consult.vet.name}</p>
          )}

          <div className="aspect-video w-full rounded-lg bg-gray-900 flex items-center justify-center text-white mb-4">
            {sessionLink.provider === "mock" ? (
              <div className="text-center">
                <p className="mb-2">Mock video call (dev mode)</p>
                <a
                  href={sessionLink.joinUrl}
                  className="underline text-cyan-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {sessionLink.joinUrl}
                </a>
              </div>
            ) : (
              <iframe
                src={sessionLink.joinUrl}
                title="Video call"
                className="h-full w-full rounded-md"
                allow="camera; microphone; autoplay; encrypted-media"
              />
            )}
          </div>

          <div className="flex gap-4 mb-4">
            <form action={endCall}>
              <input type="hidden" name="consultId" value={consult.id} />
              <button
                type="submit"
                className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
              >
                End Call &amp; Mark Complete
              </button>
            </form>
            <a
              href={`/consult/${consult.id}/summary`}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Write Visit Summary
            </a>
          </div>

          <form action={addMessage} className="space-y-2">
            <input type="hidden" name="consultId" value={consult.id} />
            <textarea
              name="body"
              rows={2}
              required
              placeholder="Type a message for the vet / owner..."
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand/90"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

async function endCall(formData: FormData) {
  "use server";
  const { getSession: gs } = await import("@/lib/auth/session");
  const { prisma: db } = await import("@/lib/db/prisma");
  const session = await gs();
  const consultId = formData.get("consultId")?.toString() ?? "";
  const consult = await db.consult.findUnique({ where: { id: consultId } });
  if (!consult || (consult.ownerId !== session?.userId && consult.vetId !== session?.userId && session?.role !== "ADMIN")) return;
  await db.consult.update({
    where: { id: consultId },
    data: { status: "COMPLETED", endedAt: new Date() },
  });
  revalidatePath(`/consult/${consultId}`);
  redirect(`/consult/${consultId}`);
}

async function addMessage(formData: FormData) {
  "use server";
  const { getSession: gs } = await import("@/lib/auth/session");
  const { prisma: db } = await import("@/lib/db/prisma");
  const session = await gs();
  if (!session?.userId) return;

  const consultId = formData.get("consultId")?.toString();
  const body = formData.get("body")?.toString();
  if (!consultId || !body) return;

  await db.message.create({
    data: { consultId, senderId: session.userId, body },
  });
}

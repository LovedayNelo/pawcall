"use client";

export default function MockCallPage({
  searchParams,
}: {
  searchParams: { room?: string; role?: string };
}) {
  const { room = "unknown-room", role = "owner" } = searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="p-8">
        <h1 className="text-xl font-bold mb-4">PawCall Mock Video Call</h1>
        <div className="mb-4 space-y-1 text-sm">
          <p><strong>Room:</strong> {room}</p>
          <p><strong>Role:</strong> {role}</p>
          <p className="text-yellow-300">⚠️ This is a dev-only mock. Configure VIDEO_PROVIDER=daily or VIDEO_PROVIDER=twilio for a real call.</p>
        </div>
        <div className="flex gap-4">
          <button className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700" onClick={() => {}}>
            🎤 Unmute
          </button>
          <button className="rounded bg-red-600 px-4 py-2 hover:bg-red-700" onClick={() => {}}>
            🚪 Leave
          </button>
        </div>
      </div>
    </div>
  );
}

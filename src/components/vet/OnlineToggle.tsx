"use client";

import { setOnline } from "@/app/actions/vet";

export default function OnlineToggle({ isOnline }: { isOnline: boolean }) {
  const label = isOnline ? "Go Offline" : "Go Online";

  return (
    <form action={setOnline}>
      <input type="hidden" name="enable" value={String(!isOnline)} />
      <button
        type="submit"
        className={`rounded-md px-4 py-2 text-sm font-medium ${
          isOnline
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        {label}
      </button>
    </form>
  );
}

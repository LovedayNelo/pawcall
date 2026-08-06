/**
 * Video session provider abstraction.
 *
 * Dev/test default: "mock" — returns a deterministic fake room URL so the
 * front end can render a "call in progress" state without any provider SDK
 * or network. Production: "daily" | "twilio" uses the real provider APIs.
 *
 * This is the ONLY module that knows about video providers; swap providers by
 * changing VIDEO_PROVIDER and the matching key.
 */
import { randomUUID } from "crypto";
import { SignJWT } from "jose";

export type VideoProvider = "mock" | "daily" | "twilio";
export type CallRole = "owner" | "vet";

export interface VideoSession {
  roomId: string;
  joinUrl: string;
  provider: VideoProvider;
  recordingConsentRequired: boolean;
  expiresAt: Date;
}

const PROVIDER: VideoProvider = (process.env.VIDEO_PROVIDER as VideoProvider) ?? "mock";
const isTwoParty = () => true; // two-party default per compliance defaults

function mockJoinUrl(roomId: string, role: CallRole): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/debug/mock-call?room=${roomId}&role=${role}`;
}

export async function createVideoSession(opts: {
  consultId: string;
  role: CallRole;
  jurisdiction?: { countryCode: string; regionCode: string };
  recordingConsent: boolean;
}): Promise<VideoSession> {
  const roomId = `${opts.consultId}-${randomUUID().slice(0, 8)}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  const consent = isTwoParty();

  if (PROVIDER === "daily") {
    const url = await createDailyRoom(roomId);
    return { roomId, joinUrl: url, provider: PROVIDER, recordingConsentRequired: consent, expiresAt };
  }

  if (PROVIDER === "twilio") {
    const { joinUrl } = await createTwilioRoom(roomId);
    return { roomId, joinUrl, provider: PROVIDER, recordingConsentRequired: consent, expiresAt };
  }

  // mock default
  return {
    roomId,
    joinUrl: mockJoinUrl(roomId, opts.role),
    provider: "mock",
    recordingConsentRequired: opts.recordingConsent && consent,
    expiresAt,
  };
}

async function createDailyRoom(roomName: string): Promise<string> {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) {
    throw new Error("Daily provider configured but DAILY_API_KEY missing");
  }

  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: { enable_screenshare: true, start_video_off: true, start_audio_off: true },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Daily room creation failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new Error("Daily room creation returned no URL");
  }
  return data.url;
}

async function createTwilioRoom(roomName: string): Promise<{ joinUrl: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio provider configured but credentials missing");
  }

  const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(`https://video.twilio.com/v1/Rooms`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ UniqueName: roomName, Type: "group" }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio room creation failed (${res.status}): ${detail}`);
  }

  // Create a client access token (JWT) so the caller can join the room.
  const apiKey = process.env.TWILIO_API_KEY ?? accountSid;
  const apiSecret = process.env.TWILIO_API_SECRET ?? authToken;
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    grants: { video: { room: roomName } },
    identity: roomName,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT", cty: "twilio-fpa;v=1" })
    .setSubject(accountSid)
    .setIssuer(apiKey)
    .setAudience("https://video.twilio.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(new TextEncoder().encode(apiSecret));

  return { joinUrl: `https://video.twilio.com/?token=${encodeURIComponent(token)}` };
}

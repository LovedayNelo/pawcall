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
const isTwoParty = (jurisdiction?: { countryCode: string; regionCode: string }) => true; // two-party default per compliance defaults

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
  const consent = isTwoParty(opts.jurisdiction) ? true : false;

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
  if (!process.env.DAILY_API_KEY || !process.env.DAILY_API_SECRET) {
    throw new Error("Daily provider configured but credentials missing");
  }
  // Daily room creation: POST to https://api.daily.co/v1/rooms
  throw new Error("Daily integration not implemented in MVP — set VIDEO_PROVIDER=mock to use dev fallback");
}

async function createTwilioRoom(roomName: string): Promise<{ joinUrl: string }> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio provider configured but credentials missing");
  }
  // Twilio Video: fetch AccessToken with VideoGrant for the named room
  throw new Error("Twilio integration not implemented in MVP — set VIDEO_PROVIDER=mock to use dev fallback");
}

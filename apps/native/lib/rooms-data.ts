/**
 * Rooms directory data — Live Rooms Community (ARCHITECTURE.md §2.6).
 *
 * There is no rooms/voice-clubs orpc router in packages/api/src today (only
 * `livekit` — generic token/createRoom/listRooms, not tied to a rooms
 * business table: no category, host bio, follower count, or schedule
 * fields exist server-side). Per the task brief this falls back to a
 * clearly-commented illustrative placeholder catalog rather than fabricating
 * a fake API shape.
 *
 * The catalog below is not invented from nothing: room titles, hosts,
 * capacities, and follower counts are ported verbatim from the old app's
 * real screenshot catalog (`docs/screenshots.md` entries #9-13, #54-56) for
 * copy/flow fidelity. What IS real: joining a listing calls the actual
 * `livekit.token` procedure (same one `app/call/[room].tsx` uses) against a
 * deterministic room name, so the in-session audio in `[id]/live.tsx` is a
 * genuine LiveKit connection — only the directory metadata around it
 * (category, host follower count, schedule) is illustrative until a real
 * rooms table + router lands.
 */

import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface RoomCategory {
  icon: IoniconName;
  id: string;
  label: string;
}

export interface RoomListing {
  capacity: number;
  categoryId: string;
  followers: number;
  /** Rare cosmetic host badge seen in the old app (e.g. "Silver"). */
  hostBadge?: string;
  hostName: string;
  id: string;
  isTrainerRoom?: boolean;
  live: boolean;
  /** Trainer-hosted rooms surface a scheduled time instead of a live count. */
  scheduledLabel?: string;
  title: string;
}

export const ROOM_CATEGORIES: RoomCategory[] = [
  { id: "english", label: "English Room", icon: "chatbubbles-outline" },
  { id: "bilingual", label: "Bilingual Room", icon: "language-outline" },
  {
    id: "content-creator",
    label: "Content Creator",
    icon: "videocam-outline",
  },
  { id: "singing", label: "Singing Room", icon: "musical-notes-outline" },
  { id: "exam-prep", label: "Exam Prep", icon: "school-outline" },
  { id: "tech-talk", label: "Tech Talk", icon: "code-slash-outline" },
];

export const ROOM_LISTINGS: RoomListing[] = [
  {
    id: "speak-without-fear",
    title: "Speak without Fear",
    categoryId: "english",
    hostName: "DK",
    capacity: 10,
    followers: 25,
    live: true,
  },
  {
    id: "productivity",
    title: "Productivity",
    categoryId: "english",
    hostName: "Shresthta",
    capacity: 10,
    followers: 175,
    live: true,
  },
  {
    id: "interview-prep",
    title: "Interview prep",
    categoryId: "english",
    hostName: "Sarah",
    capacity: 12,
    followers: 0,
    live: false,
    scheduledLabel: "Today · 07:30 PM",
    isTrainerRoom: true,
  },
  {
    id: "ludo-room",
    title: "Ludo 😝",
    categoryId: "bilingual",
    hostName: "SweetyDiv",
    capacity: 3,
    followers: 1700,
    live: true,
    hostBadge: "Silver",
  },
  {
    id: "english-learners",
    title: "English learners",
    categoryId: "english",
    hostName: "Amrit",
    capacity: 8,
    followers: 363,
    live: true,
  },
  {
    id: "telugu-frndzz",
    title: "Telugu frndzz only 💚",
    categoryId: "bilingual",
    hostName: "Sana✨",
    capacity: 5,
    followers: 154,
    live: true,
  },
  {
    id: "hello-only-frnds",
    title: "Hello only frnds 🙃",
    categoryId: "english",
    hostName: "Host",
    capacity: 6,
    followers: 277,
    live: true,
  },
  {
    id: "indisposed",
    title: "Indisposed",
    categoryId: "english",
    hostName: "Subham",
    capacity: 3,
    followers: 125,
    live: true,
  },
  {
    id: "singing-gems",
    title: "✨💎✨",
    categoryId: "singing",
    hostName: "Veronica",
    capacity: 7,
    followers: 376,
    live: true,
  },
  {
    id: "hii-room",
    title: "Hii.",
    categoryId: "english",
    hostName: "Shashi Tha…",
    capacity: 3,
    followers: 0,
    live: true,
  },
  {
    id: "laal-peela",
    title: "Laal Peela",
    categoryId: "bilingual",
    hostName: "Kr…",
    capacity: 6,
    followers: 0,
    live: true,
  },
  {
    id: "spontaneous-conversations",
    title: "Spontaneous Conversations",
    categoryId: "english",
    hostName: "Shivyansh",
    capacity: 4,
    followers: 140,
    live: true,
  },
];

export function getRoomById(id: string): RoomListing | undefined {
  return ROOM_LISTINGS.find((room) => room.id === id);
}

export function getCategoryById(id: string): RoomCategory | undefined {
  return ROOM_CATEGORIES.find((category) => category.id === id);
}

export function getLiveRooms(): RoomListing[] {
  return ROOM_LISTINGS.filter((room) => room.live);
}

export function getUpcomingRooms(): RoomListing[] {
  return ROOM_LISTINGS.filter((room) => !room.live && room.scheduledLabel);
}

export function searchRooms(query: string, categoryId: string | null) {
  const q = query.trim().toLowerCase();
  return ROOM_LISTINGS.filter((room) => {
    const matchesQuery =
      q === "" ||
      room.title.toLowerCase().includes(q) ||
      room.hostName.toLowerCase().includes(q);
    const matchesCategory =
      categoryId === null || room.categoryId === categoryId;
    return matchesQuery && matchesCategory;
  });
}

const THOUSAND = 1000;

export function formatCount(value: number): string {
  if (value >= THOUSAND) {
    return `${(value / THOUSAND).toFixed(1)}K`;
  }
  return String(value);
}

/** Deterministic LiveKit room name for a catalog listing — see file header. */
export function toLiveKitRoomName(listingId: string): string {
  return `voice-room-${listingId}`;
}

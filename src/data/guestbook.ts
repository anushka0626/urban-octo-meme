// Shared between the guestbook API and the client.

export const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green', 'lavender'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

// Index 0 = transparent; drawings are 16×16 strings of these indices.
export const PALETTE = ['transparent', '#1f2433', '#ff9ecf', '#d9418a', '#9f88f0', '#3a8ee6', '#5fc77a', '#ffe27a', '#ffffff'];
export const GRID = 16;

export const LIMITS = { name: 24, message: 140 };

export interface GuestEntry {
  id: string;
  name: string;
  message: string;
  color: NoteColor;
  pixels: string; // '' or GRID*GRID chars of 0-8
  ts: number;
}

// New notes wait for approval (scripts/guestbook-admin.mjs) before they show up for everyone.
export const MODERATED = true;

// Type declarations for check-lessons.mjs (consumed by tests/lessons-pairing.test.ts).

export const RULES: string;
export const EVIDENCE: string;

export function slugify(heading: string): string;
export function parseRules(text: string): string[] | null;
export function parseEntries(text: string): string[];
export function checkLessons(rulesText: string, evidenceText: string): string[];
export function readPair(): { rules: string | null; evidence: string | null };

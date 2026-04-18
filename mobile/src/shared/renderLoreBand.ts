// Content template engine for the lore band. Mirror of web renderer — when the
// web version in figurepinner-dev updates, port the changes (and its test cases)
// here. Return shape is a list of inline segments so the UI can highlight line
// names without needing an HTML renderer.

import type { FigureDetailResponse } from './types';
import { cleanFigureName } from './cleanFigureName';

export type LoreSegment =
  | { type: 'text'; value: string }
  | { type: 'emphasis'; value: string };

export interface LoreBandResult {
  segments: LoreSegment[];
  /** Render nothing if false — the caller should hide zone 3 entirely. */
  visible: boolean;
}

export function renderLoreBand(figure: FigureDetailResponse): LoreBandResult {
  const name = cleanFigureName(figure.name, figure.slug);
  const line = figure.line_attributes?.line_name ?? null;
  const era = figure.line_attributes?.era ?? null;
  const notes = figure.character_notes?.trim() ?? null;

  // No lore signal at all — hide zone.
  if (!line && !era && !notes) {
    return { segments: [], visible: false };
  }

  const out: LoreSegment[] = [];

  // Sentence 1: line + era context
  if (line && era) {
    out.push({ type: 'text', value: `${name} was released in ` });
    out.push({ type: 'emphasis', value: line });
    out.push({ type: 'text', value: `, ${era}.` });
  } else if (line) {
    out.push({ type: 'text', value: `${name} is part of ` });
    out.push({ type: 'emphasis', value: line });
    out.push({ type: 'text', value: '.' });
  } else if (era) {
    out.push({ type: 'text', value: `${name} dates to ${era}.` });
  }

  // Sentence 2: character notes (trimmed to first two sentences on mobile).
  if (notes) {
    if (out.length) out.push({ type: 'text', value: ' ' });
    out.push({ type: 'text', value: firstTwoSentences(notes) });
  }

  return { segments: out, visible: out.length > 0 };
}

function firstTwoSentences(s: string): string {
  const parts = s.match(/[^.!?]+[.!?]+/g);
  if (!parts || parts.length === 0) return s.trim();
  return parts.slice(0, 2).join('').trim();
}

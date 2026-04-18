// Lore band content renderer. The web doesn't ship a renderer yet — per the
// mobile handoff this content lands near launch. This module keeps the null-
// matrix contract (zone hides when no signal) and the inline segment shape so
// the UI layer doesn't need to change when real content arrives.

import type { FigureDetail, LineAttributes } from './types';
import { cleanFigureName } from './cleanFigureName';

export type LoreSegment =
  | { type: 'text'; value: string }
  | { type: 'emphasis'; value: string };

export interface LoreBandResult {
  segments: LoreSegment[];
  /** Hide zone 3 when false. */
  visible: boolean;
}

export function renderLoreBand(detail: FigureDetail): LoreBandResult {
  const line: LineAttributes['line_name'] = detail.line_attributes?.line_name ?? null;
  const era: LineAttributes['era'] = detail.line_attributes?.era ?? null;
  const notes = detail.character_notes?.trim() ?? null;

  if (!line && !era && !notes) {
    return { segments: [], visible: false };
  }

  const name = cleanFigureName(detail.figure.name);
  const out: LoreSegment[] = [];

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

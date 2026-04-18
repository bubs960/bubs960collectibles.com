import { Share } from 'react-native';
import type { ApiFigureV1 } from './types';

// Phase 1: plain system share with the marketing URL. Phase 2 will generate
// a branded card image via react-native-view-shot and pass it as `url`.
export async function shareFigure(figure: ApiFigureV1): Promise<'shared' | 'dismissed'> {
  const site = process.env.EXPO_PUBLIC_FIGUREPINNER_SITE ?? 'https://figurepinner.com';
  const url = `${site}/figure/${encodeURIComponent(figure.figure_id)}`;
  const message = `${figure.name} · ${figure.line}${figure.series ? ` Series ${figure.series}` : ''}\n${url}`;
  const result = await Share.share({ message, url, title: figure.name });
  return result.action === Share.sharedAction ? 'shared' : 'dismissed';
}

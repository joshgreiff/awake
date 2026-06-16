export type SyncSlideKind =
  | 'title'
  | 'bullets'
  | 'table'
  | 'decisions'
  | 'two-column'
  | 'close';

export interface SyncSlide {
  kind: SyncSlideKind;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  items?: { label: string; value: string; status?: 'done' | 'pending' | 'warn' }[];
  rows?: { cells: string[] }[];
  headers?: string[];
  left?: { title: string; bullets: string[] };
  right?: { title: string; bullets: string[] };
  footer?: string;
}

export interface SyncDeck {
  id: string;
  date: string;
  title: string;
  founders: string[];
  liveUrl?: string;
  slides: SyncSlide[];
}

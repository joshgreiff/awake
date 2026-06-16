import { notifyCockpitLocalChanged } from './cockpitSyncEvents';

export type ArtifactTier = 'bronze' | 'silver' | 'gold';

export interface Artifact {
  id: string;
  title: string;
  tier: ArtifactTier;
  createdAt: string;
  note?: string;
}

const STORAGE_KEY = 'awake_artifacts';

export function readArtifacts(): Artifact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeArtifacts(artifacts: Artifact[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
  notifyCockpitLocalChanged();
}

export function addArtifact(input: {
  title: string;
  tier?: ArtifactTier;
  note?: string;
}): Artifact {
  const artifact: Artifact = {
    id: `art-${Date.now()}`,
    title: input.title.trim(),
    tier: input.tier ?? 'bronze',
    createdAt: new Date().toISOString(),
    note: input.note?.trim() || undefined,
  };
  const next = [artifact, ...readArtifacts()];
  writeArtifacts(next);
  return artifact;
}

export function hasArtifactToday(): boolean {
  const today = new Date().toDateString();
  return readArtifacts().some(
    (a) => new Date(a.createdAt).toDateString() === today
  );
}

export function tierLabel(tier: ArtifactTier): string {
  switch (tier) {
    case 'bronze':
      return 'Bronze';
    case 'silver':
      return 'Silver';
    case 'gold':
      return 'Gold';
  }
}

export function tierColor(tier: ArtifactTier): string {
  switch (tier) {
    case 'bronze':
      return '#cd7f32';
    case 'silver':
      return '#94a3b8';
    case 'gold':
      return '#f59e0b';
  }
}

/**
 * Snapshot of cockpit + related local data for Supabase `profiles.user_data`.
 * Syncs across browsers when the user is signed in.
 */

export interface CockpitSyncState {
  ritualHistory: unknown[];
  todayTasks: unknown[];
  widgets: unknown[];
  cockpitSliders: { id: string; value: number }[];
  playbook: unknown | null;
  activePaths: unknown[];
  loaToday: { date: string; advice: string } | null;
  reflections: unknown[];
  sessions: unknown[];
  reflectionStreak: { count: number; lastDate: string } | null;
  /** Multi-chat v1 object or legacy flat message[] */
  chatHistory: unknown;
  artifacts: unknown[];
  updatedAt: string;
}

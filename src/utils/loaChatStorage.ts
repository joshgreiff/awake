import { notifyCockpitLocalChanged } from './cockpitSyncEvents';

export const LOA_CHATS_STORAGE_KEY = 'awake_chat_history';

export interface LoaChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface LoaConversationRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: LoaChatMessageRecord[];
}

export interface LoaChatsState {
  v: 1;
  activeId: string | null;
  conversations: LoaConversationRecord[];
}

const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONVERSATION = 120;

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyLoaChatsState(): LoaChatsState {
  return { v: 1, activeId: null, conversations: [] };
}

export function deriveConversationTitle(messages: LoaChatMessageRecord[]): string {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  const t = firstUser.content.trim().replace(/\s+/g, ' ');
  if (t.length <= 44) return t;
  return `${t.slice(0, 41)}…`;
}

function migrateLegacyMessageArray(arr: unknown[]): LoaChatsState {
  const messages: LoaChatMessageRecord[] = arr.map((m: any, i: number) => ({
    id: String(m?.id ?? `m-${Date.now()}-${i}`),
    role: m?.role === 'user' || m?.role === 'assistant' ? m.role : 'assistant',
    content: String(m?.content ?? ''),
    timestamp:
      typeof m?.timestamp === 'string'
        ? m.timestamp
        : m?.timestamp
          ? new Date(m.timestamp).toISOString()
          : new Date().toISOString(),
  }));
  const id = newId('c');
  const now = new Date().toISOString();
  const title = deriveConversationTitle(messages);
  return {
    v: 1,
    activeId: id,
    conversations: [{ id, title, createdAt: now, updatedAt: now, messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION) }],
  };
}

function normalizeState(raw: LoaChatsState): LoaChatsState {
  const conversations = (raw.conversations || []).map((c) => ({
    id: String(c.id),
    title: String(c.title || 'Chat'),
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
    updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
    messages: Array.isArray(c.messages)
      ? c.messages.map((m: any, i: number) => ({
          id: String(m?.id ?? `m-${i}`),
          role: m?.role === 'user' ? 'user' : 'assistant',
          content: String(m?.content ?? ''),
          timestamp:
            typeof m?.timestamp === 'string'
              ? m.timestamp
              : new Date().toISOString(),
        }))
      : [],
  }));
  let activeId = raw.activeId && conversations.some((c) => c.id === raw.activeId) ? raw.activeId : null;
  if (!activeId && conversations.length > 0) activeId = conversations[0].id;
  return { v: 1, activeId, conversations };
}

/** Parse localStorage value: v1 object or legacy flat message array */
export function parseLoaChatsStorage(raw: string | null): LoaChatsState {
  if (!raw) return emptyLoaChatsState();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return migrateLegacyMessageArray(parsed);
    if (parsed && typeof parsed === 'object' && parsed.v === 1 && Array.isArray(parsed.conversations)) {
      return normalizeState(parsed as LoaChatsState);
    }
  } catch {
    /* ignore */
  }
  return emptyLoaChatsState();
}

export function trimConversations(state: LoaChatsState): LoaChatsState {
  const sorted = [...state.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const trimmed = sorted.slice(0, MAX_CONVERSATIONS).map((c) => ({
    ...c,
    messages: c.messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
  }));
  let activeId = state.activeId;
  if (activeId && !trimmed.some((c) => c.id === activeId)) {
    activeId = trimmed[0]?.id ?? null;
  }
  return { v: 1, activeId, conversations: trimmed };
}

export function persistLoaChats(state: LoaChatsState): void {
  const trimmed = trimConversations(state);
  localStorage.setItem(LOA_CHATS_STORAGE_KEY, JSON.stringify(trimmed));
  notifyCockpitLocalChanged();
}

/** Smaller payload for Supabase `cockpitSync` */
export function trimLoaChatsForCloud(state: LoaChatsState, maxConvs = 12, maxMsgsPerConv = 28): LoaChatsState {
  const sorted = [...state.conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const conversations = sorted.slice(0, maxConvs).map((c) => ({
    ...c,
    messages: c.messages.slice(-maxMsgsPerConv),
  }));
  let activeId = state.activeId;
  if (activeId && !conversations.some((c) => c.id === activeId)) {
    activeId = conversations[0]?.id ?? null;
  }
  return { v: 1, activeId, conversations };
}

export function createConversation(title = 'New chat'): LoaConversationRecord {
  const now = new Date().toISOString();
  return {
    id: newId('c'),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function getActiveConversation(state: LoaChatsState): LoaConversationRecord | null {
  if (!state.activeId) return null;
  return state.conversations.find((c) => c.id === state.activeId) ?? null;
}

/** If there are no conversations, add one. Fix invalid activeId. */
export function ensureActiveConversation(state: LoaChatsState): LoaChatsState {
  if (state.conversations.length === 0) {
    const c = createConversation();
    return { v: 1, activeId: c.id, conversations: [c] };
  }
  if (!state.activeId || !state.conversations.some((c) => c.id === state.activeId)) {
    return { ...state, activeId: state.conversations[0].id };
  }
  return state;
}

export function appendMessageToActiveLoaChat(
  state: LoaChatsState,
  msg: Omit<LoaChatMessageRecord, 'timestamp'> & { timestamp?: string }
): LoaChatsState {
  const withActive = ensureActiveConversation(state);
  const activeId = withActive.activeId!;
  const ts = msg.timestamp ?? new Date().toISOString();
  const record: LoaChatMessageRecord = {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: ts,
  };
  const conversations = withActive.conversations.map((c) => {
    if (c.id !== activeId) return c;
    const messages = [...c.messages, record].slice(-MAX_MESSAGES_PER_CONVERSATION);
    const title = c.title === 'New chat' && messages.length ? deriveConversationTitle(messages) : c.title;
    return { ...c, title, messages, updatedAt: ts };
  });
  return trimConversations({ v: 1, activeId, conversations });
}

export function patchActiveConversation(
  state: LoaChatsState,
  fn: (c: LoaConversationRecord) => LoaConversationRecord
): LoaChatsState {
  const id = state.activeId;
  if (!id) return state;
  return {
    ...state,
    conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)),
  };
}

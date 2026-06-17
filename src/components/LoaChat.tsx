/**
 * Loa Chat Component
 *
 * Multi-conversation storage (local): each thread keeps its own context.
 * Legacy flat `awake_chat_history` arrays are migrated on first read.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, X, Loader2, Settings, MessageSquarePlus, Trash2, List, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import aiService, { type Message } from '../services/aiService';
import type { UserData } from './OnboardingFlow';
import {
  LOA_CHATS_STORAGE_KEY,
  parseLoaChatsStorage,
  persistLoaChats,
  ensureActiveConversation,
  createConversation,
  patchActiveConversation,
  deriveConversationTitle,
  trimConversations,
  type LoaChatsState,
  type LoaChatMessageRecord,
} from '../utils/loaChatStorage';
import { tryParseShowUpLog } from '../utils/cockpitActions';
import { notifyCockpitLocalChanged } from '../utils/cockpitCloudSync';
import { triggerSmallCelebration } from '../utils/confetti';

interface LoaChatProps {
  userData: UserData;
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function toUiMessage(m: LoaChatMessageRecord): ChatMessage {
  return {
    ...m,
    timestamp: new Date(m.timestamp),
  };
}

export function LoaChat({ userData, isOpen, onClose, onOpenSettings }: LoaChatProps) {
  const [chats, setChats] = useState<LoaChatsState>(() =>
    parseLoaChatsStorage(
      typeof localStorage !== 'undefined' ? localStorage.getItem(LOA_CHATS_STORAGE_KEY) : null
    )
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clearMenuOpen, setClearMenuOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const greetedConvIds = useRef<Set<string>>(new Set());

  const userName = userData.identity?.name || 'Traveler';
  const isConfigured = aiService.isConfigured();

  const activeId = chats.activeId;
  const activeConv = useMemo(
    () => (activeId ? chats.conversations.find((c) => c.id === activeId) ?? null : null),
    [chats.conversations, activeId]
  );
  const messages = useMemo(() => (activeConv ? activeConv.messages.map(toUiMessage) : []), [activeConv]);

  const sortedConversations = useMemo(
    () => [...chats.conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [chats.conversations]
  );

  useEffect(() => {
    persistLoaChats(chats);
  }, [chats]);

  useEffect(() => {
    if (!isOpen) return;
    setChats((prev) => ensureActiveConversation(prev));
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeId]);

  const applyAssistantMessage = useCallback((content: string) => {
    const now = new Date().toISOString();
    const assistantMessage: LoaChatMessageRecord = {
      id: `${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: now,
    };
    setChats((prev) =>
      trimConversations(
        patchActiveConversation(ensureActiveConversation(prev), (c) => ({
          ...c,
          messages: [...c.messages, assistantMessage],
          updatedAt: now,
          title: c.title === 'New chat' ? deriveConversationTitle([...c.messages, assistantMessage]) : c.title,
        }))
      )
    );
  }, []);

  const generateGreeting = useCallback(async () => {
    setIsLoading(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      );

      const greeting = await Promise.race([
        aiService.chatWithContext(
          `This is the start of our conversation. Greet me warmly as ${userName}, acknowledge my core intention ("${userData.intention || 'evolving'}"), and ask how I'm doing today. Keep it brief and genuine.`,
          userData
        ),
        timeoutPromise,
      ]);

      applyAssistantMessage(greeting);
    } catch (err) {
      console.error('Failed to generate greeting:', err);
      applyAssistantMessage(
        `Hey ${userName}! I'm Loa, your companion on this journey. How are you feeling today?`
      );
    } finally {
      setIsLoading(false);
    }
  }, [userName, userData, applyAssistantMessage]);

  useEffect(() => {
    if (!isOpen || !isConfigured || !activeId) return;
    if (messages.length > 0) return;
    if (greetedConvIds.current.has(activeId)) return;
    greetedConvIds.current.add(activeId);
    generateGreeting();
  }, [isOpen, isConfigured, activeId, messages.length, generateGreeting]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: LoaChatMessageRecord = {
      id: `${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const prevForHistory = activeConv?.messages ?? [];
    const history: Message[] = [
      ...prevForHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage.content },
    ];

    setChats((prev) =>
      trimConversations(
        patchActiveConversation(ensureActiveConversation(prev), (c) => ({
          ...c,
          messages: [...c.messages, userMessage],
          updatedAt: userMessage.timestamp,
          title: c.title === 'New chat' ? deriveConversationTitle([...c.messages, userMessage]) : c.title,
        }))
      )
    );
    setInput('');
    setError(null);

    const showUp = tryParseShowUpLog(userMessage.content);
    if (showUp.action === 'log') {
      notifyCockpitLocalChanged();
      triggerSmallCelebration();
      const assistantMessage: LoaChatMessageRecord = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: `Logged show-up for **${showUp.challengeTitle}**. Minimum bar counts — you're in the container.`,
        timestamp: new Date().toISOString(),
      };
      setChats((prev) =>
        trimConversations(
          patchActiveConversation(prev, (c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: assistantMessage.timestamp,
          }))
        )
      );
      return;
    }
    if (showUp.action === 'unlog') {
      notifyCockpitLocalChanged();
      const assistantMessage: LoaChatMessageRecord = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: `Undid today's show-up for **${showUp.challengeTitle}**.`,
        timestamp: new Date().toISOString(),
      };
      setChats((prev) =>
        trimConversations(
          patchActiveConversation(prev, (c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: assistantMessage.timestamp,
          }))
        )
      );
      return;
    }
    if (showUp.challengeTitle && showUp.action === 'none' && /\bshow[\s-]?up\b/i.test(userMessage.content)) {
      const assistantMessage: LoaChatMessageRecord = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: `You already logged show-up for **${showUp.challengeTitle}** today.`,
        timestamp: new Date().toISOString(),
      };
      setChats((prev) =>
        trimConversations(
          patchActiveConversation(prev, (c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: assistantMessage.timestamp,
          }))
        )
      );
      return;
    }

    setIsLoading(true);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), 30000)
      );

      const response = await Promise.race([
        aiService.chatWithContext(userMessage.content, userData, history),
        timeoutPromise,
      ]);

      const assistantMessage: LoaChatMessageRecord = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      };

      setChats((prev) =>
        trimConversations(
          patchActiveConversation(prev, (c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
            updatedAt: assistantMessage.timestamp,
          }))
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);

      const errorMessage: LoaChatMessageRecord = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: `I'm having trouble connecting right now. ${message.includes('API key') ? 'Please check your AI settings.' : message.includes('timeout') ? 'The request timed out.' : 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      };
      setChats((prev) =>
        trimConversations(
          patchActiveConversation(prev, (c) => ({
            ...c,
            messages: [...c.messages, errorMessage],
            updatedAt: errorMessage.timestamp,
          }))
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    const c = createConversation();
    setChats((prev) =>
      trimConversations({
        v: 1,
        activeId: c.id,
        conversations: [c, ...prev.conversations],
      })
    );
    setSidebarOpen(false);
  };

  const selectConversation = (id: string) => {
    setChats((prev) => ({ ...prev, activeId: id }));
    setSidebarOpen(false);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats((prev) => {
      const conversations = prev.conversations.filter((c) => c.id !== id);
      greetedConvIds.current.delete(id);
      let activeId = prev.activeId;
      if (activeId === id) {
        activeId = conversations[0]?.id ?? null;
      }
      const next = { v: 1 as const, activeId, conversations };
      if (conversations.length === 0) {
        const c = createConversation();
        return trimConversations({ v: 1, activeId: c.id, conversations: [c] });
      }
      const fixed =
        !activeId || !conversations.some((c) => c.id === activeId)
          ? { v: 1 as const, activeId: conversations[0].id, conversations }
          : next;
      return trimConversations(fixed);
    });
  };

  const clearThisChat = () => {
    if (!activeId) return;
    greetedConvIds.current.delete(activeId);
    const now = new Date().toISOString();
    setChats((prev) =>
      trimConversations(
        patchActiveConversation(prev, (c) => ({
          ...c,
          messages: [],
          title: 'New chat',
          updatedAt: now,
        }))
      )
    );
    setClearMenuOpen(false);
  };

  const clearAllChats = () => {
    const c = createConversation();
    greetedConvIds.current = new Set();
    setChats(trimConversations({ v: 1, activeId: c.id, conversations: [c] }));
    setClearMenuOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/80 backdrop-blur-sm [scrollbar-gutter:stable]"
        onClick={onClose}
      >
        <div
          className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col items-center justify-center box-border px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:min-h-screen sm:px-4 sm:py-5 md:px-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative flex min-h-0 w-full min-w-0 max-w-[min(100%,56rem)] flex-1 flex-col overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#1a1025] to-[#0a0514] shadow-2xl sm:max-h-[min(88dvh,52rem)] sm:flex-none md:max-h-[min(90dvh,56rem)] md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
          {sidebarOpen && (
            <button
              type="button"
              className="absolute inset-0 z-[15] bg-black/55 md:hidden rounded-2xl"
              aria-label="Close chat list"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            className={`absolute md:static inset-y-0 left-0 z-20 md:z-0 flex w-[min(100%,16rem)] sm:w-56 flex-col shrink-0 border-r border-primary/20 bg-[#120a1a] md:bg-transparent min-h-0 overflow-hidden ${
              sidebarOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="p-3 border-b border-primary/10 flex items-center justify-between md:justify-start gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chats</span>
              <Button variant="ghost" size="sm" className="md:hidden h-8 px-2" onClick={() => setSidebarOpen(false)}>
                Done
              </Button>
            </div>
            <div className="p-2">
              <Button variant="secondary" size="sm" className="w-full justify-start gap-2 text-xs" onClick={startNewChat}>
                <MessageSquarePlus className="w-3.5 h-3.5" />
                New chat
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
              {sortedConversations.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectConversation(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && selectConversation(c.id)}
                  className={`group flex items-start gap-1 rounded-lg px-2 py-2 text-left cursor-pointer transition-colors ${
                    c.id === activeId ? 'bg-primary/15 border border-primary/25' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="text-xs line-clamp-2 flex-1 min-w-0">{c.title}</span>
                  <button
                    type="button"
                    className="opacity-40 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 shrink-0"
                    title="Delete chat"
                    onClick={(e) => deleteConversation(c.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <div className="relative z-[5] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Header */}
            <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-2 border-b border-primary/20 p-3 sm:p-4">
              <div className="flex min-w-0 max-w-full flex-1 basis-[min(100%,12rem)] items-center gap-2 sm:basis-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden shrink-0 h-9 w-9 p-0"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open chats"
                >
                  <List className="w-4 h-4" />
                </Button>
                <LoaCompanion size={40} animated={!isLoading} />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">Loa</h2>
                  <p className="text-xs text-muted-foreground truncate">{activeConv?.title || 'Chat'}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden h-9 px-2 text-muted-foreground hover:text-foreground md:inline-flex"
                  onClick={startNewChat}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenSettings}
                  className="text-muted-foreground hover:text-foreground h-9 w-9 p-0"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearMenuOpen((o) => !o)}
                    className="text-muted-foreground hover:text-foreground h-9 gap-1 px-2"
                  >
                    <span className="text-xs hidden sm:inline">Clear</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${clearMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {clearMenuOpen && (
                    <>
                      <button type="button" className="fixed inset-0 z-[19]" aria-hidden onClick={() => setClearMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-primary/20 bg-[#1a1025] py-1 shadow-lg min-w-[160px]">
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs hover:bg-white/10"
                          onClick={clearThisChat}
                        >
                          Clear this chat
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs hover:bg-white/10 text-red-300/90"
                          onClick={clearAllChats}
                        >
                          Clear all chats
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground h-9 w-9 p-0">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {!isConfigured && (
              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-x-hidden p-6 sm:p-8">
                <div className="text-center max-w-md">
                  <LoaCompanion size={80} animated={false} />
                  <h3 className="text-xl font-semibold mt-4 mb-2">Set Up AI Connection</h3>
                  <p className="text-muted-foreground mb-4">
                    To chat with Loa, you need to configure an AI provider. You can use your own API key or run a local model with
                    Ollama.
                  </p>
                  <Button onClick={onOpenSettings} className="gap-2">
                    <Settings className="w-4 h-4" />
                    Open AI Settings
                  </Button>
                </div>
              </div>
            )}

            {isConfigured && (
              <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] p-3 pr-2 sm:p-4 sm:pr-3">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[min(100%,20rem)] rounded-2xl px-3 py-2.5 sm:max-w-[85%] sm:px-4 sm:py-3 ${
                        message.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-secondary/10 text-foreground'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="mb-1 flex items-center gap-2">
                          <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                          <span className="text-xs font-medium text-primary">Loa</span>
                        </div>
                      )}
                      <p className="break-words text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground opacity-50">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-w-0 justify-start">
                    <div className="max-w-[min(100%,20rem)] rounded-2xl bg-secondary/10 px-4 py-3 sm:max-w-[85%]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loa is thinking...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && <div className="text-center text-sm text-red-400 py-2">{error}</div>}

                <div ref={messagesEndRef} />
              </div>
            )}

            {isConfigured && (
              <div className="min-w-0 shrink-0 border-t border-primary/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-3 pr-2 pt-3 sm:p-4 sm:pr-3">
                <div className="flex min-w-0 items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Talk to Loa..."
                    rows={1}
                    className="box-border min-h-0 min-w-0 flex-1 resize-none rounded-xl border border-primary/20 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 sm:px-4 sm:py-3"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="h-10 shrink-0 px-3 sm:h-11 sm:px-4"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">Press Enter to send • Shift+Enter for new line</p>
              </div>
            )}
          </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

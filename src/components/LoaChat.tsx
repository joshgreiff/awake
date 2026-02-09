/**
 * Loa Chat Component
 * 
 * The main interface for talking to Loa - your AI adventure partner.
 * Inspired by OpenClaw's approach: Loa knows you and helps you evolve.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, X, Loader2, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { LoaCompanion } from './LoaCompanion';
import aiService, { type Message } from '../services/aiService';
import type { UserData } from './OnboardingFlow';

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

export function LoaChat({ userData, isOpen, onClose, onOpenSettings }: LoaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userName = userData.identity?.name || 'Traveler';
  const isConfigured = aiService.isConfigured();

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('awake_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('awake_chat_history', JSON.stringify(messages.slice(-50))); // Keep last 50
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Generate greeting if no messages
  useEffect(() => {
    if (isOpen && messages.length === 0 && isConfigured) {
      generateGreeting();
    }
  }, [isOpen, messages.length, isConfigured]);

  const generateGreeting = async () => {
    setIsLoading(true);
    try {
      const greeting = await aiService.chatWithContext(
        `This is the start of our conversation. Greet me warmly as ${userName}, acknowledge my core intention ("${userData.intention || 'evolving'}"), and ask how I'm doing today. Keep it brief and genuine.`,
        userData
      );
      
      setMessages([{
        id: `${Date.now()}`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Failed to generate greeting:', err);
      // Fallback greeting
      setMessages([{
        id: `${Date.now()}`,
        role: 'assistant',
        content: `Hey ${userName}! I'm Loa, your companion on this journey. How are you feeling today?`,
        timestamp: new Date()
      }]);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      // Convert messages to API format
      const history: Message[] = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await aiService.chatWithContext(
        userMessage.content,
        userData,
        history
      );

      const assistantMessage: ChatMessage = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `${Date.now() + 1}`,
        role: 'assistant',
        content: `I'm having trouble connecting right now. ${message.includes('API key') ? 'Please check your AI settings.' : 'Please try again.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('awake_chat_history');
    if (isConfigured) {
      generateGreeting();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="absolute inset-4 md:inset-8 lg:inset-16 bg-gradient-to-br from-[#1a1025] to-[#0a0514] rounded-2xl border border-primary/20 flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <LoaCompanion size={40} animated={!isLoading} />
              <div>
                <h2 className="text-lg font-semibold text-foreground">Loa</h2>
                <p className="text-xs text-muted-foreground">Your AI Companion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSettings}
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Not Configured State */}
          {!isConfigured && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <LoaCompanion size={80} animated={false} />
                <h3 className="text-xl font-semibold mt-4 mb-2">Set Up AI Connection</h3>
                <p className="text-muted-foreground mb-4">
                  To chat with Loa, you need to configure an AI provider. You can use your own API key
                  or run a local model with Ollama.
                </p>
                <Button onClick={onOpenSettings} className="gap-2">
                  <Settings className="w-4 h-4" />
                  Open AI Settings
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {isConfigured && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary/20 text-foreground ml-8'
                        : 'bg-secondary/10 text-foreground mr-8'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-xs text-primary font-medium">Loa</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 opacity-50">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-secondary/10 rounded-2xl px-4 py-3 mr-8">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loa is thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-center text-sm text-red-400 py-2">
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {isConfigured && (
            <div className="p-4 border-t border-primary/20">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Talk to Loa...`}
                  rows={1}
                  className="flex-1 bg-background/50 border border-primary/20 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="px-4"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

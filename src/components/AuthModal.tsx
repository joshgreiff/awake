/**
 * Auth Modal Component
 *
 * Sign in / Sign up with email
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth, formatAuthError, isSupabaseConfigured, type SignUpOutcome } from '../services/supabase';
import { AwakeLogo } from './AwakeLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setPendingConfirmEmail(null);
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmEmail) return;
    setError(null);
    setIsLoading(true);
    try {
      await auth.resendConfirmation(pendingConfirmEmail);
      setSuccessMessage('Confirmation email sent — check your inbox and spam folder.');
    } catch (err) {
      setError(formatAuthError(err));
    }
    setIsLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormMessages();
    setIsLoading(true);

    const normalizedEmail = email.trim();

    try {
      if (mode === 'signup') {
        const outcome: SignUpOutcome = await auth.signUp(normalizedEmail, password);

        if (outcome === 'signed_in') {
          setEmail('');
          setPassword('');
          onSuccess();
          return;
        }

        if (outcome === 'already_registered') {
          setError('This email already has an account. Sign in instead.');
          setMode('signin');
          return;
        }

        setPendingConfirmEmail(normalizedEmail);
        setSuccessMessage(
          'Check your email for a confirmation link. If nothing arrives in a few minutes, resend below or try signing in.'
        );
        setEmail('');
        setPassword('');
      } else {
        await auth.signIn(normalizedEmail, password);
        onSuccess();
      }
    } catch (err) {
      const message = formatAuthError(err);
      setError(message);
      if (message.toLowerCase().includes('confirm your email')) {
        setPendingConfirmEmail(normalizedEmail);
      }
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormMessages();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await auth.requestPasswordReset(normalizedEmail);
      setSuccessMessage(
        'Reset link sent — check your inbox and spam folder. The link opens Awake so you can set a new password.'
      );
    } catch (err) {
      setError(formatAuthError(err));
    }
    setIsLoading(false);
  };

  // If Supabase isn't configured, show setup notice
  if (!isSupabaseConfigured()) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-gradient-to-br from-[#1a1025] to-[#0a0514] rounded-2xl border border-primary/20 p-8 text-center"
          onClick={e => e.stopPropagation()}
        >
          <AwakeLogo size="medium" />
          <h2 className="text-xl font-semibold mt-6 mb-2">Sign-in unavailable</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Cloud sync is not configured for this environment.
          </p>
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-gradient-to-br from-[#1a1025] to-[#0a0514] rounded-2xl border border-primary/20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 text-center border-b border-primary/20">
          <AwakeLogo size="medium" />
          <h2 className="text-xl font-semibold mt-4">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Begin Your Journey'}
            {mode === 'forgot' && 'Reset password'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'signin' && 'Sign in to sync your progress'}
            {mode === 'signup' && 'Create an account to save your journey'}
            {mode === 'forgot' && 'We\'ll email you a link to set a new password'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                />
              </div>

              {successMessage && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="text-sm text-green-400">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send reset link
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    resetFormMessages();
                  }}
                  className="text-primary hover:underline"
                >
                  Back to sign in
                </button>
              </p>
            </form>
          ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      resetFormMessages();
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {successMessage && (
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 space-y-2">
                <p className="text-sm text-green-400">{successMessage}</p>
                {pendingConfirmEmail && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                    className="text-sm text-green-300 hover:underline disabled:opacity-50"
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 space-y-2">
                <p className="text-sm text-red-400">{error}</p>
                {pendingConfirmEmail && !successMessage && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                    className="text-sm text-red-300 hover:underline disabled:opacity-50"
                  >
                    Resend confirmation email
                  </button>
                )}
              </div>
            )}

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          )}

          {mode !== 'forgot' && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    resetFormMessages();
                  }}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('signin');
                    resetFormMessages();
                  }}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

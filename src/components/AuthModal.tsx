/**
 * Auth Modal Component
 * 
 * Sign in / Sign up with email or Google
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Mail, Loader2, Chrome, User, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth, isSupabaseConfigured } from '../services/supabase';
import { AwakeLogo } from './AwakeLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onContinueAsGuest: () => void;
}

type Mode = 'signin' | 'signup';

export function AuthModal({ isOpen, onClose, onSuccess, onContinueAsGuest }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await auth.signUp(email, password);
        // Supabase sends confirmation email by default
        setSuccessMessage('Check your email for a confirmation link!');
        setEmail('');
        setPassword('');
      } else {
        await auth.signIn(email, password);
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }

    setIsLoading(false);
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await auth.signInWithGoogle();
      // Will redirect to Google, then back
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  // If Supabase isn't configured, just show guest option
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
          <h2 className="text-xl font-semibold mt-6 mb-2">Welcome to Awake</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your journey to becoming a conscious author begins here.
          </p>
          <Button onClick={onContinueAsGuest} className="w-full gap-2">
            <ArrowRight className="w-4 h-4" />
            Begin Journey
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Data saved locally on this device
          </p>
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
            {mode === 'signin' ? 'Welcome Back' : 'Begin Your Journey'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'signin' 
              ? 'Sign in to sync your progress' 
              : 'Create an account to save your journey'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Google Sign In */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleAuth}
            disabled={isLoading}
          >
            <Chrome className="w-4 h-4" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-primary/20" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0a0514] px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Email Form */}
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
              <Label htmlFor="password">Password</Label>
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
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                <p className="text-sm text-green-400">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-sm text-red-400">{error}</p>
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

          {/* Toggle Mode */}
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Guest Option */}
          <div className="pt-4 border-t border-primary/20">
            <button
              onClick={onContinueAsGuest}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <User className="w-4 h-4" />
              Continue as Guest
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your data will only be saved on this device
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

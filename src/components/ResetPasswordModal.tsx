/**
 * Set a new password after the user opens the reset link from email.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, KeyRound } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { auth, formatAuthError } from '../services/supabase';
import { clearAuthCallbackFromUrl, clearPasswordResetPending } from '../utils/authRecovery';
import { AwakeLogo } from './AwakeLogo';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function ResetPasswordModal({ isOpen, onComplete }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await auth.updatePassword(password);
      clearPasswordResetPending();
      clearAuthCallbackFromUrl();
      setPassword('');
      setConfirm('');
      onComplete();
    } catch (err) {
      setError(formatAuthError(err));
    }
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-[#1a1025] to-[#0a0514]"
      >
        <div className="border-b border-primary/20 p-6 text-center">
          <AwakeLogo size="medium" />
          <h2 className="mt-4 text-xl font-semibold">Set a new password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a password for your Awake account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Update password
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Sparkles, Lock, Info } from 'lucide-react';

interface MatheticsActivationProps {
  onContinue: (data: { enabled: boolean; birthData?: { date: string; time: string; place: string } }) => void;
}

export function MatheticsActivation({ onContinue }: MatheticsActivationProps) {
  const [enabled, setEnabled] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [birthPlace, setBirthPlace] = useState('');

  const handleContinue = () => {
    if (enabled && birthDate && birthTime && birthPlace) {
      onContinue({
        enabled: true,
        birthData: { date: birthDate, time: birthTime, place: birthPlace }
      });
    } else {
      onContinue({ enabled: false });
    }
  };

  const canContinue = !enabled || (birthDate && birthTime && birthPlace);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-8">
      {/* Animated star field */}
      {enabled && (
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{
                x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500,
                y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500,
                opacity: 0
              }}
              animate={{
                opacity: [0, Math.random(), 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
      )}

      {/* Background gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: enabled
            ? "radial-gradient(circle at center, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.1))"
            : "radial-gradient(circle at center, rgba(99, 102, 241, 0.1), transparent)"
        }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 max-w-lg w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={enabled ? { rotate: 360, scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: enabled ? Infinity : 0, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-16 h-16 mx-auto" style={{
              color: enabled ? '#8b5cf6' : '#6366f1',
              filter: enabled ? 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.8))' : 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.4))'
            }} />
          </motion.div>

          <h2 className="text-3xl mb-3" style={{
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Mathetics Engine
          </h2>
          <p className="text-sm opacity-70">
            Optional: Deeper pattern insights using energetic mapping
          </p>
        </motion.div>

        {/* Main toggle card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-xl mb-6"
          style={{
            background: enabled ? 'rgba(139, 92, 246, 0.15)' : 'rgba(99, 102, 241, 0.1)',
            border: enabled ? '2px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: enabled ? '0 0 40px rgba(139, 92, 246, 0.2)' : 'none'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" style={{ color: enabled ? '#8b5cf6' : '#6366f1' }} />
              <span>Enable Mathetics Engine</span>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="flex items-start gap-2 text-xs opacity-70">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              This feature offers deeper pattern insights using your birth data and cognitive rhythms. 
              All data is processed in private-insight mode for early testers.
            </p>
          </div>
        </motion.div>

        {/* Birth data inputs */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 mb-6"
            >
              {/* Birth Date */}
              <div className="space-y-2">
                <label className="text-sm opacity-70 block tracking-wide">BIRTH DATE</label>
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                />
              </div>

              {/* Birth Time */}
              <div className="space-y-2">
                <label className="text-sm opacity-70 block tracking-wide">BIRTH TIME</label>
                <Input
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                />
              </div>

              {/* Birth Place */}
              <div className="space-y-2">
                <label className="text-sm opacity-70 block tracking-wide">BIRTH PLACE</label>
                <Input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 rounded-lg"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}
                />
              </div>

              {/* Privacy notice */}
              <div
                className="p-3 rounded-lg flex items-start gap-2 text-xs"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)'
                }}
              >
                <Lock className="w-4 h-4 mt-0.5 flex-shrink-0 text-grid-cyan" />
                <p className="opacity-80">
                  Your birth data is encrypted and stored with private-insight protocols. 
                  It will only be used to generate your personalized energy map.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full py-6 rounded-full cursor-pointer"
            style={{
              background: canContinue 
                ? "linear-gradient(135deg, #8b5cf6, #06b6d4)" 
                : "rgba(99, 102, 241, 0.2)",
              boxShadow: canContinue ? "0 0 30px rgba(139, 92, 246, 0.4)" : "none",
              opacity: canContinue ? 1 : 0.5
            }}
          >
            {enabled ? 'Activate Mathetics Engine' : 'Continue Without Mathetics'}
          </Button>
        </motion.div>

        {/* Loa's guidance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-center mt-6 italic opacity-50"
        >
          {enabled 
            ? "Your cosmic blueprint will reveal hidden patterns of potential..." 
            : "You can always enable this later in your settings..."}
        </motion.p>
      </div>
    </div>
  );
}

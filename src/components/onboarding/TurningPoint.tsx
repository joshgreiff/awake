import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { RefreshCw } from 'lucide-react';

interface TurningPointProps {
  onContinue: (data: { changes: string[]; reflection: string }) => void;
}

const changeOptions = [
  { id: 'overthink', label: 'I overthink and want clarity' },
  { id: 'trust', label: 'I want to trust myself more' },
  { id: 'focus', label: 'I need better focus and discipline' },
  { id: 'love', label: 'I want to open my heart again' },
  { id: 'purpose', label: 'I\'m searching for purpose' },
  { id: 'connect', label: 'I want deeper connections' },
  { id: 'create', label: 'I need to express my creativity' },
  { id: 'heal', label: 'I\'m ready to heal old wounds' },
  { id: 'grow', label: 'I want to evolve beyond my limits' },
  { id: 'balance', label: 'I seek better life balance' }
];

export function TurningPoint({ onContinue }: TurningPointProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [reflection, setReflection] = useState('');

  const toggleSelection = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const canContinue = selected.length > 0;

  return (
    <div className="relative w-full h-full overflow-y-auto flex items-center justify-center p-8">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1), transparent 50%)",
            "radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.1), transparent 50%)",
            "radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.1), transparent 50%)"
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Turning point symbol */}
      <motion.div
        className="absolute left-1/2 top-20 -translate-x-1/2"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <RefreshCw className="w-16 h-16 opacity-10" style={{ color: '#8b5cf6' }} />
      </motion.div>

      <div className="relative z-10 max-w-2xl w-full py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl mb-3" style={{
            background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            The Turning Point
          </h2>
          <p className="opacity-70 mb-2">What do you wish to evolve?</p>
          <p className="text-sm opacity-50">Select all that resonate</p>
        </motion.div>

        {/* Change options */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8"
        >
          {changeOptions.map((option, i) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              onClick={() => toggleSelection(option.id)}
              className="p-4 rounded-lg cursor-pointer transition-all"
              style={{
                background: selected.includes(option.id) 
                  ? 'rgba(139, 92, 246, 0.15)' 
                  : 'rgba(99, 102, 241, 0.05)',
                border: selected.includes(option.id)
                  ? '2px solid rgba(139, 92, 246, 0.5)'
                  : '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: selected.includes(option.id) 
                  ? '0 0 20px rgba(139, 92, 246, 0.2)' 
                  : 'none'
              }}
            >
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selected.includes(option.id)}
                  onCheckedChange={() => toggleSelection(option.id)}
                />
                <span className={selected.includes(option.id) ? 'opacity-100' : 'opacity-70'}>
                  {option.label}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Optional reflection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <label className="block text-sm opacity-70 mb-3 tracking-wide">
            SHARE MORE (OPTIONAL)
          </label>
          <Textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What else would you like to share about your journey..."
            className="w-full p-4 rounded-xl min-h-[120px] resize-none"
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          />
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={() => onContinue({ changes: selected, reflection })}
            disabled={!canContinue}
            className="w-full py-6 rounded-full cursor-pointer"
            style={{
              background: canContinue 
                ? "linear-gradient(135deg, #8b5cf6, #6366f1)" 
                : "rgba(99, 102, 241, 0.2)",
              boxShadow: canContinue ? "0 0 30px rgba(139, 92, 246, 0.4)" : "none",
              opacity: canContinue ? 1 : 0.5
            }}
          >
            Continue Your Journey
          </Button>
        </motion.div>

        {/* Loa's guidance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.9 }}
          className="text-xs text-center mt-6 italic opacity-50"
        >
          "Every transformation begins with recognizing what no longer serves you..."
        </motion.p>
      </div>
    </div>
  );
}

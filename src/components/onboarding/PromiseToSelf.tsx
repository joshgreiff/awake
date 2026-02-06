import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Pen } from 'lucide-react';

interface PromiseToSelfProps {
  userData: Record<string, unknown>;
  onContinue: (intention: string) => void;
}

export function PromiseToSelf({ onContinue }: PromiseToSelfProps) {
  const [intention, setIntention] = useState('');

  const exampleIntentions = [
    "I am ready to trust my inner voice",
    "I choose growth over comfort",
    "I embrace my journey with compassion",
    "I am becoming who I'm meant to be"
  ];

  const handleExample = (example: string) => {
    setIntention(example);
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-8">
      {/* Gentle background glow */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.1), transparent 60%)",
            "radial-gradient(circle at 60% 60%, rgba(245, 158, 11, 0.1), transparent 60%)",
            "radial-gradient(circle at 40% 40%, rgba(99, 102, 241, 0.1), transparent 60%)"
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating light particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-soft-amber"
          initial={{
            x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500,
            y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500,
            opacity: 0
          }}
          animate={{
            y: [null, typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3
          }}
          style={{
            boxShadow: "0 0 10px rgba(245, 158, 11, 0.6)"
          }}
        />
      ))}

      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-4"
          >
            <Pen className="w-16 h-16 mx-auto" style={{
              color: '#f59e0b',
              filter: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.6))'
            }} />
          </motion.div>

          <h2 className="text-3xl md:text-4xl mb-3" style={{
            background: "linear-gradient(135deg, #f59e0b, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Promise to Self
          </h2>
          <p className="opacity-70">
            In one sentence, what are you ready to embody?
          </p>
        </motion.div>

        {/* Main input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="Write your intention here..."
            className="w-full p-6 rounded-2xl min-h-[160px] text-center text-lg resize-none"
            style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '2px solid rgba(245, 158, 11, 0.2)',
              boxShadow: intention ? '0 0 40px rgba(245, 158, 11, 0.15)' : 'none'
            }}
            autoFocus
          />

          {/* Character count */}
          <p className="text-xs text-right mt-2 opacity-50">
            {intention.length} characters
          </p>
        </motion.div>

        {/* Example prompts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs opacity-60 mb-3 text-center">NEED INSPIRATION?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exampleIntentions.map((example, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleExample(example)}
                className="p-3 rounded-lg text-left text-sm italic cursor-pointer"
                style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}
              >
                "{example}"
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Preview how it will appear */}
        {intention && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-6 rounded-xl text-center"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '2px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 0 30px rgba(245, 158, 11, 0.2)'
            }}
          >
            <p className="text-xs opacity-60 mb-3 tracking-widest">YOUR CORE MANTRA</p>
            <motion.p
              animate={{
                textShadow: [
                  '0 0 20px rgba(245, 158, 11, 0.3)',
                  '0 0 40px rgba(245, 158, 11, 0.5)',
                  '0 0 20px rgba(245, 158, 11, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-xl md:text-2xl italic"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #6366f1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              "{intention}"
            </motion.p>
          </motion.div>
        )}

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={() => onContinue(intention)}
            disabled={!intention.trim() || intention.trim().length < 10}
            className="w-full py-6 rounded-full cursor-pointer"
            style={{
              background: intention.trim() && intention.trim().length >= 10
                ? "linear-gradient(135deg, #f59e0b, #6366f1)" 
                : "rgba(99, 102, 241, 0.2)",
              boxShadow: intention.trim() && intention.trim().length >= 10
                ? "0 0 40px rgba(245, 158, 11, 0.4)" 
                : "none",
              opacity: intention.trim() && intention.trim().length >= 10 ? 1 : 0.5
            }}
          >
            Seal Your Intention
          </Button>
        </motion.div>

        {/* Loa's final guidance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
          className="text-xs text-center mt-6 italic opacity-50"
        >
          "Words spoken from the heart become the architecture of your reality..."
        </motion.p>
      </div>
    </div>
  );
}

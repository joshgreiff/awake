import { motion } from 'motion/react';
import { LoaCompanion } from '../LoaCompanion';

interface TheAwakeningProps {
  onContinue: () => void;
}

export function TheAwakening({ onContinue }: TheAwakeningProps) {
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* Floating light shards background */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{
              x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500,
              y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500,
              rotate: Math.random() * 360,
              opacity: 0
            }}
            animate={{
              y: [null, typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500],
              x: [null, typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500],
              rotate: [null, Math.random() * 360 + 360],
              opacity: [0, 0.6, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5
            }}
            style={{
              width: 2 + Math.random() * 4,
              height: 40 + Math.random() * 100,
              background: `linear-gradient(180deg, ${
                ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 4)]
              }, transparent)`,
              boxShadow: `0 0 20px currentColor`,
              filter: "blur(1px)"
            }}
          />
        ))}
      </div>

      {/* Breathing pulse effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.05, 1]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        style={{
          background: "radial-gradient(circle at center, rgba(99, 102, 241, 0.2), transparent 60%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <LoaCompanion size={140} withLabel={false} animated={true} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1.2 }}
          className="mt-12"
        >
          <h2 className="text-3xl md:text-4xl mb-6" style={{
            background: "linear-gradient(135deg, #6366f1, #14b8a6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Welcome, Traveler
          </h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="text-lg md:text-xl mb-4 leading-relaxed opacity-90"
          >
            You've arrived in the in-between — a luminous void where fragments of memory, 
            emotion, and sound float in suspension.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="text-base md:text-lg opacity-70 italic mb-12"
          >
            Let's remember who you are... and who you're becoming.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.8 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99, 102, 241, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onContinue}
            className="px-10 py-4 rounded-full cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #6366f1, #14b8a6)",
              boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)"
            }}
          >
            Begin Your Awakening
          </motion.button>
        </motion.div>

        {/* Ambient sound indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ delay: 3, duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs opacity-50"
        >
          <div className="flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-electric-indigo rounded-full"
                animate={{ height: [8, 16, 8] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
            <span className="ml-2">ambient resonance active</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

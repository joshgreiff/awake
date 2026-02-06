import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface LoaCompanionProps {
  size?: number;
  withLabel?: boolean;
  animated?: boolean;
}

export function LoaCompanion({ size = 80, withLabel = false, animated = true }: LoaCompanionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={animated ? {
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* Outer glow rings */}
        <motion.div
          animate={animated ? {
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)",
            filter: "blur(10px)"
          }}
        />
        
        <motion.div
          animate={animated ? {
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: 0.5
          }}
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(20, 184, 166, 0.4), transparent 70%)",
            filter: "blur(8px)"
          }}
        />

        {/* Core orb */}
        <motion.div
          animate={animated ? { rotate: 360 } : {}}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #6366f1, #14b8a6, #8b5cf6)",
            boxShadow: `
              0 0 30px rgba(99, 102, 241, 0.6),
              inset 0 0 20px rgba(255, 255, 255, 0.2)
            `
          }}
        >
          <Sparkles className="w-1/2 h-1/2 text-white opacity-80" />
        </motion.div>

        {/* Inner highlight */}
        <div
          className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent)",
            filter: "blur(4px)"
          }}
        />
      </motion.div>

      {withLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-sm tracking-widest" style={{
            background: "linear-gradient(90deg, #6366f1, #14b8a6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            LOA
          </p>
          <p className="text-xs opacity-60 mt-1">AI Companion</p>
        </motion.div>
      )}
    </div>
  );
}

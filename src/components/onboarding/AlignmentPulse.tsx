import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface AlignmentPulseProps {
  userData: Record<string, unknown>;
  onComplete: () => void;
}

export function AlignmentPulse({ userData, onComplete }: AlignmentPulseProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 1000);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Generate user's color palette based on their attributes
  const getColorFromStats = () => {
    const stats = (userData.stats || {}) as Record<string, number>;
    const { creativity = 0, empathy = 0, vitality = 0 } = stats;
    const r = Math.round((creativity / 50) * 245 + (1 - creativity / 50) * 99);
    const g = Math.round((empathy / 50) * 184 + (1 - empathy / 50) * 102);
    const b = Math.round((vitality / 50) * 129 + (1 - vitality / 50) * 241);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const userColor = getColorFromStats();

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* Pulsing background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at center, rgba(99, 102, 241, 0.1), transparent)",
            `radial-gradient(circle at center, ${userColor}40, transparent)`,
            "radial-gradient(circle at center, rgba(99, 102, 241, 0.1), transparent)"
          ]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Energy waves */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          initial={{
            width: 100,
            height: 100,
            opacity: 0.8
          }}
          animate={{
            width: [100, 800],
            height: [100, 800],
            opacity: [0.8, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
          style={{
            left: '50%',
            top: '50%',
            marginLeft: -50,
            marginTop: -50,
            border: `2px solid ${userColor}`,
            boxShadow: `0 0 20px ${userColor}`
          }}
        />
      ))}

      {/* Central content */}
      <div className="relative z-10 text-center max-w-2xl px-8">
        {/* Core orb */}
        <motion.div
          className="w-32 h-32 mx-auto mb-8 rounded-full relative"
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: [
              `0 0 40px ${userColor}60`,
              `0 0 80px ${userColor}80`,
              `0 0 40px ${userColor}60`
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: `radial-gradient(circle, ${userColor}, transparent)`,
          }}
        >
          {/* Inner rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              animate={{
                rotate: i % 2 === 0 ? 360 : -360,
                scale: [1, 1.1, 1]
              }}
              transition={{
                rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, delay: i * 0.3 }
              }}
              style={{
                inset: i * 10,
                border: `1px solid ${userColor}`,
                borderStyle: 'dashed'
              }}
            />
          ))}
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl md:text-4xl mb-4"
          style={{
            background: `linear-gradient(135deg, #6366f1, ${userColor})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          Alignment Pulse
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-base md:text-lg opacity-80 mb-8"
        >
          Your pattern is awakening...
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="w-full max-w-md mx-auto mb-6"
        >
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              style={{
                background: `linear-gradient(90deg, #6366f1, ${userColor})`,
                boxShadow: `0 0 10px ${userColor}`
              }}
            />
          </div>
          <p className="text-xs mt-2 opacity-60">{Math.round(progress)}% synchronized</p>
        </motion.div>

        {/* Data integration messages */}
        <motion.div
          className="space-y-2 text-sm opacity-70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {progress > 20 && (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.7, x: 0 }}
            >
              ✓ Identity resonance locked
            </motion.p>
          )}
          {progress > 40 && (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.7, x: 0 }}
            >
              ✓ Consciousness constellation mapped
            </motion.p>
          )}
          {progress > 60 && (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.7, x: 0 }}
            >
              ✓ Magnetic field calibrated
            </motion.p>
          )}
          {progress > 80 && (
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 0.7, x: 0 }}
            >
              ✓ Evolution pathways illuminated
            </motion.p>
          )}
          {progress === 100 && (
            <motion.p
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-base mt-4"
              style={{ color: userColor }}
            >
              ⚡ Alignment complete
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

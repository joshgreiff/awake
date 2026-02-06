import { motion } from 'motion/react';

export function AwakeLogo({ size = "large" }: { size?: "small" | "medium" | "large" }) {
  const sizeClasses = {
    small: "text-2xl",
    medium: "text-4xl",
    large: "text-6xl md:text-7xl"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative"
    >
      <div className={`${sizeClasses[size]} tracking-[0.2em] relative`}>
        {/* Glow effect behind text */}
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.6), transparent 70%)"
          }}
        />
        
        {/* Main text */}
        <div className="relative flex items-center justify-center gap-2">
          <span 
            className="font-bold"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #14b8a6 50%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 0 40px rgba(99, 102, 241, 0.5)"
            }}
          >
            AWAKE
          </span>
          
          {/* Geometric accent */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-electric-indigo to-aurora-blue"
            style={{
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.8)"
            }}
          />
        </div>
      </div>
      
      {/* Tagline */}
      {size === "large" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-4 text-sm md:text-base tracking-[0.3em] text-center opacity-70"
          style={{
            background: "linear-gradient(90deg, #14b8a6, #e8e4f3, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
        >
          CONSCIOUSNESS EVOLVED
        </motion.p>
      )}
    </motion.div>
  );
}

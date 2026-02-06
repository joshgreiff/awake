import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { LoaCompanion } from '../LoaCompanion';
import { Sparkles } from 'lucide-react';

interface UserData {
  identity?: { name?: string };
  intention?: string;
  preferences?: { attractions?: string[] };
  growth?: { changes?: string[] };
}

interface DashboardUnlockProps {
  userData: UserData;
  onEnter: () => void;
}

export function DashboardUnlock({ userData, onEnter }: DashboardUnlockProps) {
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* Planet visualization background */}
      <div className="absolute inset-0">
        {/* Planet core */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            rotate: 360
          }}
          transition={{
            scale: { duration: 2, ease: "easeOut" },
            opacity: { duration: 1.5 },
            rotate: { duration: 40, repeat: Infinity, ease: "linear" }
          }}
          style={{
            width: 400,
            height: 400,
            background: 'radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.3), rgba(99, 102, 241, 0.2), rgba(20, 184, 166, 0.2))',
            boxShadow: `
              0 0 60px rgba(99, 102, 241, 0.4),
              0 0 120px rgba(245, 158, 11, 0.3),
              inset 0 0 80px rgba(255, 255, 255, 0.1)
            `
          }}
        />

        {/* Orbital rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 0.6,
              rotate: i % 2 === 0 ? 360 : -360
            }}
            transition={{
              scale: { duration: 2, delay: 0.3 + i * 0.2 },
              opacity: { duration: 1, delay: 0.3 + i * 0.2 },
              rotate: { duration: 20 + i * 10, repeat: Infinity, ease: "linear" }
            }}
            style={{
              width: 450 + i * 80,
              height: 450 + i * 80,
              border: '1px dashed rgba(99, 102, 241, 0.3)',
            }}
          />
        ))}

        {/* Energy particles orbiting */}
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const orbitRadius = 250;
          const x = Math.cos(angle) * orbitRadius;
          const y = Math.sin(angle) * orbitRadius;
          
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
              initial={{ 
                x: x - 4,
                y: y - 4,
                opacity: 0 
              }}
              animate={{ 
                x: [x - 4, x - 4],
                y: [y - 4, y - 4],
                opacity: [0, 1, 0],
                scale: [1, 1.5, 1]
              }}
              transition={{
                opacity: { duration: 2, repeat: Infinity, delay: i * 0.2 },
                scale: { duration: 2, repeat: Infinity, delay: i * 0.2 }
              }}
              style={{
                background: ['#6366f1', '#14b8a6', '#f59e0b'][i % 3],
                boxShadow: `0 0 10px ${['#6366f1', '#14b8a6', '#f59e0b'][i % 3]}`
              }}
            />
          );
        })}
      </div>

      {/* Content overlay */}
      <div className="relative z-10 text-center max-w-2xl px-8">
        {/* Loa companion */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
        >
          <LoaCompanion size={100} withLabel={false} animated={true} />
        </motion.div>

        {/* Main message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mt-8 mb-8"
        >
          <h2 className="text-3xl md:text-4xl mb-4" style={{
            background: "linear-gradient(135deg, #f59e0b, #6366f1, #14b8a6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Your Realm is Forming
          </h2>

          <p className="text-lg opacity-80 mb-6">
            {userData.identity?.name || 'Traveler'}, your consciousness has taken shape.
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="p-4 rounded-xl mb-6 max-w-md mx-auto"
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <p className="text-sm italic opacity-90">
              {userData.intention || "Your journey begins now."}
            </p>
          </motion.div>
        </motion.div>

        {/* Stats summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          className="flex gap-4 justify-center mb-8 flex-wrap"
        >
          <div
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)'
            }}
          >
            <Sparkles className="w-4 h-4 text-electric-indigo" />
            <span className="text-sm">Constellation Mapped</span>
          </div>
          
          <div
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: 'rgba(20, 184, 166, 0.1)',
              border: '1px solid rgba(20, 184, 166, 0.3)'
            }}
          >
            <Sparkles className="w-4 h-4 text-aurora-blue" />
            <span className="text-sm">
              {userData.preferences?.attractions?.length || 0} Attractions
            </span>
          </div>
          
          <div
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}
          >
            <Sparkles className="w-4 h-4 text-soft-amber" />
            <span className="text-sm">
              {userData.growth?.changes?.length || 0} Evolution Paths
            </span>
          </div>
        </motion.div>

        {/* Enter button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          <Button
            onClick={onEnter}
            className="px-12 py-7 rounded-full text-lg cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #6366f1, #14b8a6, #f59e0b)",
              boxShadow: "0 0 60px rgba(99, 102, 241, 0.6)"
            }}
          >
            <motion.span
              animate={{
                textShadow: [
                  '0 0 10px rgba(255, 255, 255, 0.5)',
                  '0 0 20px rgba(255, 255, 255, 0.8)',
                  '0 0 10px rgba(255, 255, 255, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Enter The Grid
            </motion.span>
          </Button>
        </motion.div>

        {/* Loa's final words */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 3 }}
          className="text-sm mt-6 italic opacity-60"
        >
          "Loa will guide you. Your evolution begins now..."
        </motion.p>
      </div>
    </div>
  );
}

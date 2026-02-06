import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Lightbulb, Brain, User, Heart, Zap, Target } from 'lucide-react';

interface InnerConstellationProps {
  onContinue: (stats: Record<string, number>) => void;
}

const attributes = [
  { id: 'creativity', name: 'Creativity', icon: Lightbulb, color: '#f59e0b', angle: 0 },
  { id: 'logic', name: 'Logic', icon: Brain, color: '#6366f1', angle: 60 },
  { id: 'presence', name: 'Presence', icon: User, color: '#14b8a6', angle: 120 },
  { id: 'empathy', name: 'Empathy', icon: Heart, color: '#8b5cf6', angle: 180 },
  { id: 'vitality', name: 'Vitality', icon: Zap, color: '#10b981', angle: 240 },
  { id: 'discipline', name: 'Discipline', icon: Target, color: '#06b6d4', angle: 300 }
];

export function InnerConstellation({ onContinue }: InnerConstellationProps) {
  const totalPoints = 100;
  const [stats, setStats] = useState<Record<string, number>>({
    creativity: 15,
    logic: 15,
    presence: 20,
    empathy: 20,
    vitality: 15,
    discipline: 15
  });

  const usedPoints = Object.values(stats).reduce((sum, val) => sum + val, 0);
  const remainingPoints = totalPoints - usedPoints;

  const adjustStat = (id: string, delta: number) => {
    const newValue = stats[id] + delta;
    if (newValue >= 0 && newValue <= 50 && remainingPoints - delta >= 0) {
      setStats({ ...stats, [id]: newValue });
    }
  };

  const radius = 180;

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-8">
      {/* Animated constellation background */}
      <div className="absolute inset-0">
        {attributes.map((attr, i) => (
          <motion.div
            key={attr.id}
            className="absolute rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.2, 1],
              x: Math.cos((attr.angle * Math.PI) / 180) * (radius + 100),
              y: Math.sin((attr.angle * Math.PI) / 180) * (radius + 100)
            }}
            transition={{
              opacity: { duration: 4, repeat: Infinity, delay: i * 0.5 },
              scale: { duration: 4, repeat: Infinity, delay: i * 0.5 },
              x: { duration: 0.8, delay: i * 0.1 },
              y: { duration: 0.8, delay: i * 0.1 }
            }}
            style={{
              width: 300,
              height: 300,
              left: '50%',
              top: '50%',
              marginLeft: -150,
              marginTop: -150,
              background: `radial-gradient(circle, ${attr.color}30, transparent 70%)`,
              filter: "blur(40px)"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl mb-3" style={{
            background: "linear-gradient(135deg, #6366f1, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Inner Constellation
          </h2>
          <p className="opacity-70 mb-2">Distribute your energy across six dimensions</p>
          <p className="text-sm opacity-50">
            Remaining energy: <span style={{ color: remainingPoints > 0 ? "#10b981" : "#ef4444" }}>
              {remainingPoints}
            </span> / {totalPoints}
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8"
        >
          {attributes.map((attr) => (
            <div
              key={attr.id}
              className="p-3 rounded-lg"
              style={{
                background: `${attr.color}10`,
                border: `1px solid ${attr.color}30`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <attr.icon className="w-4 h-4" style={{ color: attr.color }} />
                <span className="text-xs">{attr.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => adjustStat(attr.id, -5)}
                  className="px-2 py-1 rounded text-xs cursor-pointer"
                  style={{
                    background: `${attr.color}20`,
                    border: `1px solid ${attr.color}40`
                  }}
                >
                  -
                </button>
                <span className="flex-1 text-center" style={{ color: attr.color }}>
                  {stats[attr.id]}
                </span>
                <button
                  onClick={() => adjustStat(attr.id, 5)}
                  className="px-2 py-1 rounded text-xs cursor-pointer"
                  style={{
                    background: `${attr.color}20`,
                    border: `1px solid ${attr.color}40`
                  }}
                  disabled={remainingPoints < 5}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Continue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={() => onContinue(stats)}
            disabled={remainingPoints !== 0}
            className="w-full max-w-md mx-auto block py-6 rounded-full cursor-pointer"
            style={{
              background: remainingPoints === 0 
                ? "linear-gradient(135deg, #6366f1, #14b8a6)" 
                : "rgba(99, 102, 241, 0.2)",
              boxShadow: remainingPoints === 0 ? "0 0 30px rgba(99, 102, 241, 0.4)" : "none",
              opacity: remainingPoints === 0 ? 1 : 0.5
            }}
          >
            {remainingPoints === 0 ? "Seal Your Constellation" : `Distribute ${remainingPoints} more points`}
          </Button>
        </motion.div>

        {/* Loa's guidance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
          className="text-xs text-center mt-6 italic opacity-50"
        >
          "Balance shapes your world. Extremes create new possibilities..."
        </motion.p>
      </div>
    </div>
  );
}

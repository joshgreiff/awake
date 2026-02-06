import { useState } from 'react';
import { motion, PanInfo } from 'motion/react';
import { Button } from '../ui/button';
import { Plus, Minus } from 'lucide-react';

interface MagneticFieldProps {
  onContinue: (data: { attractions: string[]; resistances: string[] }) => void;
}

const topics = [
  'Art', 'Science', 'Travel', 'Routine', 'Solitude', 'Connection',
  'Nature', 'Technology', 'Music', 'Silence', 'Adventure', 'Stability',
  'Learning', 'Teaching', 'Creating', 'Observing'
];

type Zone = 'unassigned' | 'attraction' | 'resistance';

export function MagneticField({ onContinue }: MagneticFieldProps) {
  const [assignments, setAssignments] = useState<Record<string, Zone>>(
    Object.fromEntries(topics.map(t => [t, 'unassigned' as Zone]))
  );

  const handleDragEnd = (topic: string, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { y } = info.offset;
    
    if (y < -80) {
      setAssignments({ ...assignments, [topic]: 'attraction' });
    } else if (y > 80) {
      setAssignments({ ...assignments, [topic]: 'resistance' });
    }
  };

  const handleQuickAssign = (topic: string, zone: Zone) => {
    setAssignments({ ...assignments, [topic]: zone });
  };

  const attractions = topics.filter(t => assignments[t] === 'attraction');
  const resistances = topics.filter(t => assignments[t] === 'resistance');
  const canContinue = attractions.length > 0 || resistances.length > 0;

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-8">
      {/* Background gradient zones */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, 
              rgba(16, 185, 129, 0.15) 0%, 
              transparent 40%, 
              transparent 60%, 
              rgba(239, 68, 68, 0.15) 100%
            )
          `
        }}
      />

      {/* Attraction zone (top) */}
      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <div
            className="py-4 px-6 rounded-2xl border-2 border-dashed"
            style={{
              borderColor: 'rgba(16, 185, 129, 0.4)',
              background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.1), transparent)',
              minHeight: '80px'
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-aurora-green" />
              <span className="text-sm" style={{ color: '#10b981' }}>Attractions</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {attractions.map(topic => (
                <span
                  key={topic}
                  onClick={() => handleQuickAssign(topic, 'unassigned')}
                  className="px-3 py-1 rounded-full text-xs cursor-pointer hover:opacity-70"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981'
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Center content */}
      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl mb-3" style={{
            background: "linear-gradient(135deg, #10b981, #ef4444)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Magnetic Field
          </h2>
          <p className="text-sm opacity-70">
            Drag topics up/down or tap +/- to assign
          </p>
        </motion.div>

        {/* Topic pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-3 justify-center mb-8"
        >
          {topics.filter(t => assignments[t] === 'unassigned').map((topic, i) => (
            <motion.div
              key={topic}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.7}
              onDragEnd={(event, info) => handleDragEnd(topic, event, info)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-full cursor-move relative group"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                touchAction: 'none'
              }}
            >
              <span className="text-sm">{topic}</span>
              
              {/* Quick assign buttons */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickAssign(topic, 'attraction'); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                  style={{
                    background: 'rgba(16, 185, 129, 0.3)',
                    border: '1px solid rgba(16, 185, 129, 0.5)'
                  }}
                >
                  <Plus className="w-3 h-3 text-aurora-green" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickAssign(topic, 'resistance'); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                  style={{
                    background: 'rgba(239, 68, 68, 0.3)',
                    border: '1px solid rgba(239, 68, 68, 0.5)'
                  }}
                >
                  <Minus className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Button
            onClick={() => onContinue({ attractions, resistances })}
            disabled={!canContinue}
            className="px-8 py-6 rounded-full cursor-pointer"
            style={{
              background: canContinue 
                ? "linear-gradient(135deg, #10b981, #6366f1)" 
                : "rgba(99, 102, 241, 0.2)",
              boxShadow: canContinue ? "0 0 30px rgba(16, 185, 129, 0.3)" : "none",
              opacity: canContinue ? 1 : 0.5
            }}
          >
            Continue
          </Button>
        </motion.div>

        {/* Loa's guidance */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.7 }}
          className="text-xs text-center mt-6 italic opacity-50"
        >
          "Your curiosities and aversions paint the boundaries of your exploration..."
        </motion.p>
      </div>

      {/* Resistance zone (bottom) */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <div
            className="py-4 px-6 rounded-2xl border-2 border-dashed"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.4)',
              background: 'radial-gradient(ellipse at bottom, rgba(239, 68, 68, 0.1), transparent)',
              minHeight: '80px'
            }}
          >
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              {resistances.map(topic => (
                <span
                  key={topic}
                  onClick={() => handleQuickAssign(topic, 'unassigned')}
                  className="px-3 py-1 rounded-full text-xs cursor-pointer hover:opacity-70"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#ef4444'
                  }}
                >
                  {topic}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2">
              <Minus className="w-4 h-4 text-destructive" />
              <span className="text-sm" style={{ color: '#ef4444' }}>Resistances</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

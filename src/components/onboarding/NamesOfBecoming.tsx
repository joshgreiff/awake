import { useState } from 'react';
import { motion } from 'motion/react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Sparkles, User } from 'lucide-react';

interface NamesOfBecomingProps {
  onContinue: (data: { name: string; pronouns: string; generatedAlias?: string }) => void;
}

export function NamesOfBecoming({ onContinue }: NamesOfBecomingProps) {
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [showAlias, setShowAlias] = useState(false);

  const generatedAliases = [
    "Eclipse Wanderer",
    "Aurora Seeker",
    "Quantum Dreamer",
    "Celestial Navigator",
    "Prism Keeper",
    "Void Dancer"
  ];

  const randomAlias = generatedAliases[Math.floor(Math.random() * generatedAliases.length)];

  const handleContinue = () => {
    if (name.trim()) {
      onContinue({
        name: name.trim(),
        pronouns: pronouns.trim() || 'they/them',
        generatedAlias: showAlias ? randomAlias : undefined
      });
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center p-8">
      {/* Soft glow background */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(circle at 30% 50%, rgba(99, 102, 241, 0.15), transparent 50%)",
            "radial-gradient(circle at 70% 50%, rgba(20, 184, 166, 0.15), transparent 50%)",
            "radial-gradient(circle at 30% 50%, rgba(99, 102, 241, 0.15), transparent 50%)"
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-md w-full"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <User className="w-16 h-16 mx-auto mb-4" style={{
            color: "#6366f1",
            filter: "drop-shadow(0 0 20px rgba(99, 102, 241, 0.6))"
          }} />
          
          <h2 className="text-3xl mb-3" style={{
            background: "linear-gradient(135deg, #6366f1, #14b8a6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Names of Becoming
          </h2>
          
          <p className="opacity-70">
            How shall we call you in this realm?
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm opacity-70 block tracking-wide">YOUR NAME</label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your preferred name..."
                className="w-full px-6 py-6 rounded-2xl text-center text-lg"
                style={{
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "2px solid rgba(99, 102, 241, 0.3)",
                  boxShadow: "0 0 30px rgba(99, 102, 241, 0.1)"
                }}
                autoFocus
              />
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={{
                  boxShadow: name ? "0 0 40px rgba(99, 102, 241, 0.3)" : "0 0 0px transparent"
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Pronouns Input */}
          <div className="space-y-2">
            <label className="text-sm opacity-70 block tracking-wide">PRONOUNS (OPTIONAL)</label>
            <Input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              placeholder="they/them, she/her, he/him..."
              className="w-full px-6 py-4 rounded-2xl text-center"
              style={{
                background: "rgba(20, 184, 166, 0.1)",
                border: "2px solid rgba(20, 184, 166, 0.2)",
              }}
            />
          </div>

          {/* Generated Alias Option */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="pt-4"
          >
            <button
              onClick={() => setShowAlias(!showAlias)}
              className="w-full flex items-center justify-between px-6 py-4 rounded-xl cursor-pointer"
              style={{
                background: showAlias ? "rgba(245, 158, 11, 0.15)" : "rgba(99, 102, 241, 0.05)",
                border: `1px solid ${showAlias ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.2)'}`,
              }}
            >
              <span className="text-sm opacity-80">Receive a Grid Alias</span>
              <Sparkles className="w-5 h-5" style={{ color: showAlias ? "#f59e0b" : "#6366f1" }} />
            </button>

            {showAlias && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-4 rounded-xl text-center"
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)"
                }}
              >
                <p className="text-xs opacity-60 mb-2">YOUR GRID ALIAS</p>
                <p className="text-lg" style={{ color: "#f59e0b" }}>{randomAlias}</p>
              </motion.div>
            )}
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="pt-4"
          >
            <Button
              onClick={handleContinue}
              disabled={!name.trim()}
              className="w-full py-6 rounded-full text-base cursor-pointer"
              style={{
                background: name.trim() 
                  ? "linear-gradient(135deg, #6366f1, #14b8a6)" 
                  : "rgba(99, 102, 241, 0.2)",
                boxShadow: name.trim() ? "0 0 30px rgba(99, 102, 241, 0.4)" : "none",
                opacity: name.trim() ? 1 : 0.5
              }}
            >
              Continue
            </Button>
          </motion.div>
        </motion.div>

        {/* Loa's voice */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
          className="text-xs text-center mt-8 italic opacity-50"
        >
          "A name is the first thread of your pattern..."
        </motion.p>
      </motion.div>
    </div>
  );
}

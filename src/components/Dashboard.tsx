import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lightbulb, Brain, User, Heart, Zap, Target,
  Sparkles, TrendingUp, Calendar, MessageCircle,
  Settings, LogOut, Plus, Minus
} from 'lucide-react';
import { AwakeLogo } from './AwakeLogo';
import { LoaCompanion } from './LoaCompanion';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { LoaChat } from './LoaChat';
import { AISettings } from './AISettings';
import type { UserData } from './OnboardingFlow';

interface DashboardProps {
  userData: UserData;
  onReset: () => void;
  onSettings?: () => void;
}

const statConfig = [
  { id: 'creativity', name: 'Creativity', icon: Lightbulb, color: '#f59e0b' },
  { id: 'logic', name: 'Logic', icon: Brain, color: '#6366f1' },
  { id: 'presence', name: 'Presence', icon: User, color: '#14b8a6' },
  { id: 'empathy', name: 'Empathy', icon: Heart, color: '#8b5cf6' },
  { id: 'vitality', name: 'Vitality', icon: Zap, color: '#10b981' },
  { id: 'discipline', name: 'Discipline', icon: Target, color: '#06b6d4' }
];

export function Dashboard({ userData, onReset }: DashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const stats = userData.stats || {};
  const attractions = userData.preferences?.attractions || [];
  const resistances = userData.preferences?.resistances || [];
  const evolutionFocuses = userData.growth?.changes || [];

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4" style={{
        background: 'rgba(10, 5, 20, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <AwakeLogo size="small" />
          
          <div className="flex items-center gap-4">
            <div className="text-right mr-4">
              <p className="text-sm opacity-70">Welcome back,</p>
              <p className="font-medium">{userData.identity?.name || 'Traveler'}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-60 hover:opacity-100"
              onClick={onReset}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Hero Section - Intention */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <button
              onClick={() => setIsChatOpen(true)}
              className="group cursor-pointer transition-transform hover:scale-105"
              title="Talk to Loa"
            >
              <LoaCompanion size={80} withLabel={false} animated={true} />
              <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to talk to Loa
              </p>
            </button>
            
            {userData.intention && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-6 max-w-2xl mx-auto"
              >
                <p className="text-xs tracking-widest opacity-50 mb-2">YOUR CORE INTENTION</p>
                <p className="text-xl md:text-2xl italic" style={{
                  background: "linear-gradient(135deg, #f59e0b, #6366f1)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}>
                  "{userData.intention}"
                </p>
              </motion.div>
            )}
          </motion.section>

          {/* Stats Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-lg mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-electric-indigo" />
              <span>Inner Constellation</span>
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statConfig.map((stat, i) => {
                const value = stats[stat.id] || 0;
                const Icon = stat.icon;
                
                return (
                  <motion.div
                    key={stat.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: `${stat.color}10`,
                      border: `1px solid ${stat.color}30`
                    }}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: stat.color }} />
                    <p className="text-2xl font-bold mb-1" style={{ color: stat.color }}>
                      {value}
                    </p>
                    <p className="text-xs opacity-60">{stat.name}</p>
                    <div className="mt-2">
                      <Progress value={value * 2} className="h-1" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            
            {/* Magnetic Field */}
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(30, 21, 51, 0.5)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <h2 className="text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-aurora-green" />
                <span>Magnetic Field</span>
              </h2>
              
              {/* Attractions */}
              <div className="mb-4">
                <p className="text-xs tracking-wide opacity-50 mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3 text-aurora-green" /> ATTRACTIONS
                </p>
                <div className="flex flex-wrap gap-2">
                  {attractions.length > 0 ? attractions.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981'
                      }}
                    >
                      {item}
                    </span>
                  )) : (
                    <span className="text-xs opacity-40">None selected</span>
                  )}
                </div>
              </div>
              
              {/* Resistances */}
              <div>
                <p className="text-xs tracking-wide opacity-50 mb-2 flex items-center gap-1">
                  <Minus className="w-3 h-3 text-destructive" /> RESISTANCES
                </p>
                <div className="flex flex-wrap gap-2">
                  {resistances.length > 0 ? resistances.map((item) => (
                    <span
                      key={item}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444'
                      }}
                    >
                      {item}
                    </span>
                  )) : (
                    <span className="text-xs opacity-40">None selected</span>
                  )}
                </div>
              </div>
            </motion.section>

            {/* Evolution Focuses */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-xl"
              style={{
                background: 'rgba(30, 21, 51, 0.5)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <h2 className="text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyber-purple" />
                <span>Evolution Focuses</span>
              </h2>
              
              <div className="space-y-2">
                {evolutionFocuses.length > 0 ? evolutionFocuses.map((focus) => (
                  <div
                    key={focus}
                    className="p-3 rounded-lg flex items-center gap-3"
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)'
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-cyber-purple" />
                    <span className="text-sm capitalize">{focus.replace(/_/g, ' ')}</span>
                  </div>
                )) : (
                  <span className="text-xs opacity-40">None selected</span>
                )}
              </div>
              
              {userData.growth?.reflection && (
                <div className="mt-4 p-3 rounded-lg" style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.1)'
                }}>
                  <p className="text-xs opacity-50 mb-1">YOUR REFLECTION</p>
                  <p className="text-sm italic opacity-80">"{userData.growth.reflection}"</p>
                </div>
              )}
            </motion.section>
          </div>

          {/* Quick Actions Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid md:grid-cols-3 gap-4"
          >
            {/* Talk to Loa */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => setIsChatOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: '#6366f108',
                border: '1px solid #6366f130'
              }}
            >
              <MessageCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#6366f1' }} />
              <p className="font-medium mb-1">Talk to Loa</p>
              <p className="text-xs opacity-50">Your AI companion</p>
            </motion.button>

            {/* Quests - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="p-6 rounded-xl text-center opacity-60"
              style={{
                background: '#14b8a608',
                border: '1px dashed #14b8a630'
              }}
            >
              <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" style={{ color: '#14b8a6' }} />
              <p className="font-medium mb-1">Quests</p>
              <p className="text-xs opacity-50">Coming soon</p>
            </motion.div>

            {/* AI Settings */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: '#f59e0b08',
                border: '1px solid #f59e0b30'
              }}
            >
              <Settings className="w-8 h-8 mx-auto mb-3" style={{ color: '#f59e0b' }} />
              <p className="font-medium mb-1">AI Settings</p>
              <p className="text-xs opacity-50">Configure your AI</p>
            </motion.button>
          </motion.section>

        </div>
      </main>

      {/* Loa Chat Modal */}
      <LoaChat
        userData={userData}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenSettings={() => {
          setIsChatOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* AI Settings Modal */}
      <AISettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lightbulb, Brain, User, Heart, Zap, Target,
  Sparkles, TrendingUp, MessageCircle,
  Settings, LogOut, Plus, Minus, Compass, BookOpen, Flame, ListChecks
} from 'lucide-react';
import { AwakeLogo } from './AwakeLogo';
import { LoaCompanion } from './LoaCompanion';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { LoaChat } from './LoaChat';
import { AISettings } from './AISettings';
import { ArchetypeAssessment } from './ArchetypeAssessment';
import { DomainMapping } from './DomainMapping';
import { DailyReflection, type ReflectionEntry } from './DailyReflection';
import { Playbook, type PlaybookData } from './Playbook';
import type { UserData } from './OnboardingFlow';
import { 
  type Archetype,
  COGNITIVE_ORIENTATIONS,
  MOTIVATIONAL_DRIVERS,
  DEVELOPMENTAL_STATES,
  getArchetypeName 
} from '../types/archetype';
import { DOMAINS, type DomainId, type DomainState, calculateOverallAlignment } from '../types/domains';

interface DashboardProps {
  userData: UserData;
  onReset: () => void;
  onSettings?: () => void;
  onUpdateUserData?: (data: Partial<UserData>) => void;
}

const statConfig = [
  { id: 'creativity', name: 'Creativity', icon: Lightbulb, color: '#f59e0b' },
  { id: 'logic', name: 'Logic', icon: Brain, color: '#6366f1' },
  { id: 'presence', name: 'Presence', icon: User, color: '#14b8a6' },
  { id: 'empathy', name: 'Empathy', icon: Heart, color: '#8b5cf6' },
  { id: 'vitality', name: 'Vitality', icon: Zap, color: '#10b981' },
  { id: 'discipline', name: 'Discipline', icon: Target, color: '#06b6d4' }
];

export function Dashboard({ userData, onReset, onUpdateUserData }: DashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isArchetypeOpen, setIsArchetypeOpen] = useState(false);
  const [isDomainsOpen, setIsDomainsOpen] = useState(false);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [isPlaybookOpen, setIsPlaybookOpen] = useState(false);
  
  const stats = userData.stats || {};
  const attractions = userData.preferences?.attractions || [];
  const resistances = userData.preferences?.resistances || [];
  const evolutionFocuses = userData.growth?.changes || [];
  const archetype = userData.archetype as Archetype | undefined;
  const domains = userData.domains as Record<DomainId, DomainState> | undefined;
  
  // Safe calculation with fallback
  let overallAlignment: number | null = null;
  try {
    if (domains && typeof domains === 'object') {
      overallAlignment = calculateOverallAlignment(domains);
    }
  } catch (e) {
    console.error('Error calculating alignment:', e);
  }

  const handleArchetypeComplete = (newArchetype: Archetype) => {
    if (onUpdateUserData) {
      onUpdateUserData({ archetype: newArchetype });
    }
    setIsArchetypeOpen(false);
  };

  const handleDomainsComplete = (newDomains: Record<DomainId, DomainState>) => {
    if (onUpdateUserData) {
      onUpdateUserData({ domains: newDomains });
    }
    setIsDomainsOpen(false);
  };

  const handleSaveReflection = (reflection: ReflectionEntry) => {
    const existingReflections = JSON.parse(localStorage.getItem('awake_reflections') || '[]');
    const updated = [reflection, ...existingReflections].slice(0, 100);
    localStorage.setItem('awake_reflections', JSON.stringify(updated));
  };

  // Get reflection streak
  const getReflectionStreak = (): number => {
    try {
      const streakData = localStorage.getItem('awake_reflection_streak');
      if (!streakData) return 0;
      const { count, lastDate } = JSON.parse(streakData);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (lastDate === today || lastDate === yesterday) return count;
      return 0;
    } catch {
      return 0;
    }
  };

  const reflectionStreak = getReflectionStreak();

  // Get playbook progress
  const getPlaybookProgress = () => {
    try {
      const saved = localStorage.getItem('awake_playbook');
      if (!saved) return { completed: 0, total: 0, hasProject: false };
      const data = JSON.parse(saved) as PlaybookData;
      
      // Reset if new day
      const today = new Date().toDateString();
      if (data.lastUpdated !== today) {
        return { completed: 0, total: data.dailyLevers?.length || 0, hasProject: !!data.currentProject };
      }
      
      return {
        completed: data.completedToday?.length || 0,
        total: data.dailyLevers?.length || 0,
        hasProject: !!data.currentProject,
      };
    } catch {
      return { completed: 0, total: 0, hasProject: false };
    }
  };

  const playbookProgress = getPlaybookProgress();

  const handleSavePlaybook = (_playbook: PlaybookData) => {
    // Could sync to Supabase here
  };

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
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            {/* Daily Reflection - Primary Action */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              onClick={() => setIsReflectionOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(20, 184, 166, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              <BookOpen className="w-8 h-8 mx-auto mb-3" style={{ color: '#6366f1' }} />
              <p className="font-medium mb-1">Daily Reflection</p>
              {reflectionStreak > 0 ? (
                <p className="text-xs opacity-70 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" /> {reflectionStreak} day streak
                </p>
              ) : (
                <p className="text-xs opacity-50">Check in with Loa</p>
              )}
            </motion.button>

            {/* Playbook */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.68 }}
              onClick={() => setIsPlaybookOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: playbookProgress.hasProject 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(20, 184, 166, 0.1))'
                  : 'rgba(16, 185, 129, 0.05)',
                border: playbookProgress.hasProject 
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px dashed rgba(16, 185, 129, 0.3)'
              }}
            >
              <ListChecks className="w-8 h-8 mx-auto mb-3" style={{ color: '#10b981' }} />
              <p className="font-medium mb-1">Playbook</p>
              {playbookProgress.total > 0 ? (
                <p className="text-xs opacity-70">
                  {playbookProgress.completed}/{playbookProgress.total} levers
                </p>
              ) : (
                <p className="text-xs opacity-50">Set your focus</p>
              )}
            </motion.button>

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
              <p className="text-xs opacity-50">Open chat</p>
            </motion.button>

            {/* Archetype */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={() => setIsArchetypeOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: archetype ? '#14b8a608' : '#14b8a608',
                border: archetype ? '1px solid #14b8a630' : '1px dashed #14b8a630'
              }}
            >
              <Compass className="w-8 h-8 mx-auto mb-3" style={{ color: '#14b8a6' }} />
              {archetype ? (
                <>
                  <p className="font-medium mb-1 text-sm">{getArchetypeName(archetype)}</p>
                  <p className="text-xs opacity-50">Your archetype</p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">Archetype</p>
                  <p className="text-xs opacity-50">Discover yours</p>
                </>
              )}
            </motion.button>

            {/* Life Domains */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 }}
              onClick={() => setIsDomainsOpen(true)}
              className="p-6 rounded-xl text-center cursor-pointer hover:scale-[1.02] transition-transform"
              style={{
                background: domains ? '#8b5cf608' : '#8b5cf608',
                border: domains ? '1px solid #8b5cf630' : '1px dashed #8b5cf630'
              }}
            >
              <Target className="w-8 h-8 mx-auto mb-3" style={{ color: '#8b5cf6' }} />
              {overallAlignment !== null ? (
                <>
                  <p className="font-medium mb-1">{overallAlignment}% Aligned</p>
                  <p className="text-xs opacity-50">Life domains</p>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">Life Domains</p>
                  <p className="text-xs opacity-50">Map yours</p>
                </>
              )}
            </motion.button>

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
              <p className="text-xs opacity-50">Configure</p>
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

      {/* Archetype Assessment Modal */}
      {isArchetypeOpen && (
        <ArchetypeAssessment
          onComplete={handleArchetypeComplete}
          onClose={() => setIsArchetypeOpen(false)}
        />
      )}

      {/* Domain Mapping Modal */}
      {isDomainsOpen && (
        <DomainMapping
          onComplete={handleDomainsComplete}
          onClose={() => setIsDomainsOpen(false)}
        />
      )}

      {/* Daily Reflection Modal */}
      <DailyReflection
        userData={userData}
        isOpen={isReflectionOpen}
        onClose={() => setIsReflectionOpen(false)}
        onSaveReflection={handleSaveReflection}
      />

      {/* Playbook Modal */}
      <Playbook
        userData={userData}
        isOpen={isPlaybookOpen}
        onClose={() => setIsPlaybookOpen(false)}
        onSave={handleSavePlaybook}
      />
    </div>
  );
}

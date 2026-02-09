import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AwakeLogo } from './components/AwakeLogo';
import { Button } from './components/ui/button';
import { OnboardingFlow, type UserData } from './components/OnboardingFlow';

type ViewMode = 'landing' | 'onboarding' | 'dashboard';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [userData, setUserData] = useState<UserData | null>(null);

  // Check for existing user data and auto-redirect to dashboard
  useEffect(() => {
    const savedData = localStorage.getItem('awake_user_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setUserData(parsed);
        // If user has completed onboarding, go straight to dashboard
        if (parsed.identity?.name) {
          setViewMode('dashboard');
        }
      } catch (e) {
        console.error('Failed to parse saved user data:', e);
      }
    }
    
    // Also check for in-progress onboarding
    const onboardingProgress = localStorage.getItem('awake_onboarding_progress');
    if (onboardingProgress && !savedData) {
      // Resume onboarding if they were in the middle of it
      setViewMode('onboarding');
    }
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = (data: UserData) => {
    setUserData(data);
    setViewMode('dashboard');
  };

  // Show onboarding flow
  if (viewMode === 'onboarding') {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Reset user data and start fresh
  const handleReset = () => {
    localStorage.removeItem('awake_user_data');
    localStorage.removeItem('awake_onboarding_progress');
    setUserData(null);
    setViewMode('landing');
  };

  // Show dashboard (placeholder for now)
  if (viewMode === 'dashboard') {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <AwakeLogo size="medium" />
          <h2 className="text-2xl mt-8 mb-4" style={{
            background: "linear-gradient(135deg, #6366f1, #14b8a6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Welcome, {userData?.identity?.name || 'Traveler'}!
          </h2>
          <p className="opacity-70 mb-4">
            Dashboard coming soon. Your profile has been saved.
          </p>
          
          {/* Show some user data */}
          {userData && (
            <div className="mb-8 p-4 rounded-xl text-left text-sm" style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <p className="opacity-60 text-xs mb-2 text-center">YOUR PROFILE</p>
              {userData.intention && (
                <p className="italic text-center mb-3" style={{ color: '#f59e0b' }}>
                  "{userData.intention}"
                </p>
              )}
              {userData.stats && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {Object.entries(userData.stats).map(([key, value]) => (
                    <div key={key} className="text-center p-2 rounded" style={{
                      background: 'rgba(99, 102, 241, 0.1)'
                    }}>
                      <p className="text-xs opacity-60 capitalize">{key}</p>
                      <p className="text-lg" style={{ color: '#6366f1' }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => setViewMode('landing')}
              variant="outline"
              className="px-6 py-4 rounded-full cursor-pointer"
              style={{
                borderColor: "rgba(99, 102, 241, 0.3)",
                background: "rgba(99, 102, 241, 0.05)"
              }}
            >
              Back to Landing
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="px-6 py-4 rounded-full cursor-pointer"
              style={{
                borderColor: "rgba(239, 68, 68, 0.3)",
                background: "rgba(239, 68, 68, 0.05)",
                color: "#ef4444"
              }}
            >
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen w-full bg-background overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-8 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.15), transparent 50%)"
          }} />
          
          {/* Animated grid */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              backgroundPosition: ["0px 0px", "50px 50px"]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              backgroundImage: `
                linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px"
            }}
          />

          {/* Floating orbs */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              initial={{
                x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
                y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
              }}
              animate={{
                y: [null, typeof window !== 'undefined' ? Math.random() * window.innerHeight : 500],
                x: [null, typeof window !== 'undefined' ? Math.random() * window.innerWidth : 500],
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 10 + Math.random() * 10,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5
              }}
              style={{
                width: 150 + Math.random() * 200,
                height: 150 + Math.random() * 200,
                background: `radial-gradient(circle, ${
                  ["#6366f1", "#14b8a6", "#f59e0b", "#8b5cf6"][i % 4]
                }30, transparent)`,
                filter: "blur(60px)"
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mb-16">
          <AwakeLogo size="large" />
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-8 text-base md:text-lg opacity-80 leading-relaxed px-4"
          >
            A consciousness-driven experience about human evolution, self-discovery, 
            and emotional intelligence. Your journey to becoming the conscious author 
            of your own life starts here.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 flex gap-4 flex-wrap justify-center text-xs md:text-sm opacity-60"
          >
            {["Gamified Growth", "AI Companion", "Daily Quests", "Vision Builder", "Trait Leveling"].map((keyword, i) => (
              <span key={i} className="px-3 py-1 rounded-full" style={{
                border: "1px solid rgba(99, 102, 241, 0.3)"
              }}>
                {keyword}
              </span>
            ))}
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="mt-12 flex gap-4 justify-center flex-wrap"
          >
            <Button
              onClick={() => setViewMode('onboarding')}
              className="px-8 py-6 rounded-full text-base cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #6366f1, #14b8a6)",
                boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)"
              }}
            >
              Begin Your Awakening
            </Button>
            
            {userData?.identity?.name && (
              <Button
                onClick={() => setViewMode('dashboard')}
                variant="outline"
                className="px-8 py-6 rounded-full text-base cursor-pointer"
                style={{
                  borderColor: "rgba(99, 102, 241, 0.3)",
                  background: "rgba(99, 102, 241, 0.05)"
                }}
              >
                Welcome back, {userData.identity.name}
              </Button>
            )}
          </motion.div>
        </div>

        {/* Version indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 text-xs"
        >
          Awake v2.0 - Phase 1 Setup Complete
        </motion.div>
      </div>
    </div>
  );
}

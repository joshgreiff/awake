import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import simpleAuth from '../services/simpleAuth';
import SimpleAuthModal from './SimpleAuthModal';
import DailyReflectionChat from './DailyReflectionChat';
import VisionCreationChat from './VisionCreationChat';
import ProgressInsights from './ProgressInsights';
import { addTraitXP, createTrait, getTraitScore, getTraitColor, TRAIT_SUGGESTIONS } from '../utils/traitSystem';
import { saveDailySnapshot } from '../utils/dataTracking';
import './AwakeDashboard.css';

const AwakeDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('local'); // Default to 'local' for localStorage
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Core data
  const [curiosities, setCuriosities] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [dailyPlaybook, setDailyPlaybook] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [vision, setVision] = useState('');
  const [profile, setProfile] = useState({ name: '', gender: 'other' });

  // UI state
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [newCuriosity, setNewCuriosity] = useState('');
  const [editingCuriosity, setEditingCuriosity] = useState(null);

  // Vision editing state
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [visionText, setVisionText] = useState('');

  // Daily Reflection state
  const [showReflection, setShowReflection] = useState(false);
  const [showVisionCreation, setShowVisionCreation] = useState(false);
  const [existingVisionSections, setExistingVisionSections] = useState(null);
  const [reflectionHistory, setReflectionHistory] = useState([]);
  const [reflectionStreak, setReflectionStreak] = useState(0);
  const [lastReflectionDate, setLastReflectionDate] = useState(null);

  // Trait customization state
  const [showTraitModal, setShowTraitModal] = useState(false);
  const [customTraitName, setCustomTraitName] = useState('');

  // Character progress
  const [character, setCharacter] = useState({ level: 1, xp: 0, xpToNext: 100 });
  const [showCelebration, setShowCelebration] = useState(false);

  // Initialize authentication and load user data
  useEffect(() => {
    const initializeAuth = () => {
      setIsLoading(true);
      
      // Clean up old Nostr data on first load with new auth system
      if (!localStorage.getItem('awake_migrated_to_simple_auth')) {
        console.log('Migrating from Nostr to Simple Auth...');
        localStorage.removeItem('awake-user-data'); // Old global key
        localStorage.removeItem('awake_nostr_private_key');
        localStorage.removeItem('awake_user_profile');
        localStorage.setItem('awake_migrated_to_simple_auth', 'true');
      }
      
      // Check if user exists
      const userExists = simpleAuth.initialize();
      
      if (userExists) {
        const user = simpleAuth.getUserInfo();
        setUserId(user.id);
        setCurrentUserId(user.id);
        setUserInfo(user);
        setIsAuthenticated(true);
        
        // Load user data
        loadUserData(user.id);
      } else {
        // Show auth modal for new users
        setShowAuthModal(true);
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();
    
    // Initialize AI service with stored API key
    const storedApiKey = localStorage.getItem('awake-claude-api-key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      aiService.initialize(storedApiKey);
    }
    
    // Load reflection history
    const storedHistory = localStorage.getItem('awake-reflection-history');
    if (storedHistory) {
      try {
        setReflectionHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Failed to parse reflection history:', e);
      }
    }
    
    // Migrate old attribute structure to new trait system
    const migrateTraits = () => {
      const storedData = localStorage.getItem('awake-user-data');
      if (storedData) {
        const data = JSON.parse(storedData);
        if (data.attributes && data.attributes.length > 0) {
          const needsMigration = data.attributes.some(attr => 
            attr.score !== undefined && attr.level === undefined
          );
          
          if (needsMigration) {
            console.log('Migrating old trait structure to new leveling system...');
            const migratedAttributes = data.attributes.map(attr => {
              if (attr.score !== undefined && attr.level === undefined) {
                // Convert old score (0-10) to approximate XP
                const approximateXP = Math.floor(Math.pow(attr.score / 1.5, 2) * 100);
                return createTrait(attr.name, approximateXP);
              }
              return attr;
            });
            
            setAttributes(migratedAttributes);
            saveUserData({ ...data, attributes: migratedAttributes });
            console.log('Migration complete!');
          }
        }
      }
    };
    
    migrateTraits();
    
    // Set loading to false after initialization
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  // Initialize AI service
  useEffect(() => {
    if (apiKey) {
      aiService.initialize(apiKey);
      localStorage.setItem('claude_api_key', apiKey);
    }
  }, [apiKey]);

  // Don't auto-generate playbook - only from daily reflection
  // useEffect(() => {
  //   if (isAuthenticated && curiosities.length > 0) {
  //     generateDailyPlaybook();
  //   }
  // }, [curiosities, attributes, needs, isAuthenticated]);

  // Initialize chat and load history
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      loadChatHistory();
    }
  }, [isAuthenticated, currentUserId]);
  
  const loadChatHistory = () => {
    const historyKey = `awake-chat-history-${currentUserId}`;
    const savedHistory = localStorage.getItem(historyKey);
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setChatHistory(history);
        // Load the most recent chat if exists
        if (history.length > 0) {
          const latestChat = history[0];
          setCurrentChatId(latestChat.id);
          setChatMessages(latestChat.messages || []);
        }
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  };
  
  const saveChatHistory = (updatedHistory) => {
    const historyKey = `awake-chat-history-${currentUserId}`;
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    setChatHistory(updatedHistory);
  };
  
  const startNewChat = () => {
    const newChatId = Date.now().toString();
    setCurrentChatId(newChatId);
    setChatMessages([]);
  };
  
  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chat.id);
      setChatMessages(chat.messages || []);
    }
  };

  // Auto-save dailyPlaybook whenever it changes
  useEffect(() => {
    if (isAuthenticated && currentUserId && dailyPlaybook.length > 0) {
      console.log('Saving daily playbook:', dailyPlaybook.length, 'items');
      saveUserData({ curiosities, attributes, needs, vision, profile, dailyPlaybook });
    }
  }, [dailyPlaybook]);

  const calculateStreak = (lastDate) => {
    if (!lastDate) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const last = new Date(lastDate);
    last.setHours(0, 0, 0, 0);
    
    const diffTime = today - last;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // If last reflection was today, streak continues
    // If last reflection was yesterday, streak continues
    // If more than 1 day ago, streak is broken
    if (diffDays <= 1) {
      return diffDays;
    }
    return -1; // Streak broken
  };

  const loadUserData = async (userId) => {
    // Load from localStorage using user-specific key
    const userDataKey = `awake-user-data-${userId}`;
    const savedData = localStorage.getItem(userDataKey);
    
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setCuriosities(data.curiosities || []);
        setAttributes(data.attributes || []);
        setNeeds(data.needs || []);
        
        // Load vision - try user-specific first, then fall back to global
        let visionText = data.vision || '';
        if (!visionText) {
          // Try loading from global awake-full-vision as fallback
          const fullVisionData = localStorage.getItem('awake-full-vision');
          if (fullVisionData) {
            try {
              const visionObj = JSON.parse(fullVisionData);
              visionText = visionObj.compiledVision || visionObj.identity || '';
              
              // If we found vision in global storage, save it to user-specific storage
              if (visionText) {
                data.vision = visionText;
                localStorage.setItem(userDataKey, JSON.stringify(data));
                console.log('Migrated vision from global to user-specific storage');
              }
            } catch (e) {
              console.log('Could not parse full vision data');
            }
          }
        }
        setVision(visionText);
        
        setProfile(data.profile || { name: '', gender: 'other' });
        setDailyPlaybook(data.dailyPlaybook || []);
        
        // Load streak data
        const streakData = data.reflectionStreak || { count: 0, lastDate: null };
        const streakStatus = calculateStreak(streakData.lastDate);
        
        if (streakStatus === -1) {
          // Streak broken, reset to 0
          setReflectionStreak(0);
          setLastReflectionDate(null);
        } else {
          setReflectionStreak(streakData.count || 0);
          setLastReflectionDate(streakData.lastDate);
        }
      } catch (e) {
        console.error('Error loading user data:', e);
        // Fall through to defaults
      }
    } else {
      // Initialize with defaults
      const defaultData = {
        curiosities: [
          { id: 1, text: "Learning a new skill", inspiration: 70 },
          { id: 2, text: "Building something meaningful", inspiration: 85 },
          { id: 3, text: "Connecting with others", inspiration: 60 },
          { id: 4, text: "Personal growth & development", inspiration: 75 }
        ],
        attributes: [
          createTrait('Creativity', 0),
          createTrait('Discipline', 0),
          createTrait('Communication', 0),
          createTrait('Consistency', 0)
        ],
        needs: [
          { id: 1, name: "Energy", value: 65, color: "#FF6B6B" },
          { id: 2, name: "Focus", value: 72, color: "#4ECDC4" },
          { id: 3, name: "Joy", value: 55, color: "#FFE66D" },
          { id: 4, name: "Connection", value: 40, color: "#A8E6CF" }
        ],
        vision: "",
        profile: { name: '', gender: 'other' }
      };
      
      setCuriosities(defaultData.curiosities);
      setAttributes(defaultData.attributes);
      setNeeds(defaultData.needs);
      setVision(defaultData.vision);
      setProfile(defaultData.profile);
      saveUserData(defaultData);
    }
  };

  const saveUserData = (data) => {
    if (!currentUserId) return;
    
    const userDataKey = `awake-user-data-${currentUserId}`;
    localStorage.setItem(userDataKey, JSON.stringify(data || {
      curiosities,
      attributes,
      needs,
      vision,
      profile,
      dailyPlaybook,
      reflectionStreak: {
        count: reflectionStreak,
        lastDate: lastReflectionDate
      }
    }));
  };

  const generateDailyPlaybook = () => {
    const playbook = [];
    
    // Focus on needs below 70%
    needs.forEach(need => {
      if (need.value < 70) {
        let suggestion = "";
        switch(need.name) {
          case "Energy":
            suggestion = need.value < 50 ? 
              "Take a 15-min power nap or step outside for fresh air" : 
              "Do 5 jumping jacks or drink a glass of water";
            break;
          case "Focus":
            const topCuriosity = curiosities.reduce((prev, current) => 
              (prev.inspiration > current.inspiration) ? prev : current
            );
            suggestion = `Leverage momentum: spend 20 minutes on ${topCuriosity.text}`;
            break;
          case "Joy":
            suggestion = "Revisit a playful project or watch something that makes you laugh";
            break;
          case "Connection":
            suggestion = "Send a quick message to one close friend or family member";
            break;
          default:
            suggestion = `Focus on improving your ${need.name.toLowerCase()}`;
        }
        
        playbook.push({
          id: need.id,
          category: need.name,
          suggestion: suggestion,
          priority: 100 - need.value,
          color: need.color
        });
      }
    });

    // Add curiosity-based suggestion
    const highestInspiration = Math.max(...curiosities.map(c => c.inspiration));
    const topCuriosity = curiosities.find(c => c.inspiration === highestInspiration);
    if (topCuriosity) {
      playbook.push({
        id: `curiosity-${topCuriosity.id}`,
        category: "Inspiration",
        suggestion: `Your ${topCuriosity.text} inspiration is at ${topCuriosity.inspiration}% - take one small action on this today`,
        priority: topCuriosity.inspiration,
        color: "#7F5AF0"
      });
    }

    setDailyPlaybook(playbook.sort((a, b) => b.priority - a.priority).slice(0, 5));
  };

  const updateNeed = (id, value) => {
    const updatedNeeds = needs.map(need => 
      need.id === id ? { ...need, value: parseInt(value) } : need
    );
    setNeeds(updatedNeeds);
    saveUserData({ curiosities, attributes, needs: updatedNeeds, vision });
  };

  // Traits now level up automatically from completing tasks
  // No more manual updating!

  const updateInspiration = (id, value) => {
    const updatedCuriosities = curiosities.map(c => 
      c.id === id ? { ...c, inspiration: value } : c
    );
    setCuriosities(updatedCuriosities);
    saveUserData({ curiosities: updatedCuriosities, attributes, needs, vision });
  };

  const addCuriosity = () => {
    if (newCuriosity.trim()) {
      const newCuriosityItem = {
        id: Date.now(),
        text: newCuriosity.trim(),
        inspiration: 50
      };
      const updatedCuriosities = [...curiosities, newCuriosityItem];
      setCuriosities(updatedCuriosities);
      saveUserData({ curiosities: updatedCuriosities, attributes, needs, vision });
      setNewCuriosity('');
    }
  };

  const deleteCuriosity = (id) => {
    const updatedCuriosities = curiosities.filter(c => c.id !== id);
    setCuriosities(updatedCuriosities);
    saveUserData({ curiosities: updatedCuriosities, attributes, needs, vision });
  };

  const startEditingCuriosity = (curiosity) => {
    setEditingCuriosity({ ...curiosity });
  };

  const saveEditingCuriosity = () => {
    if (editingCuriosity && editingCuriosity.text.trim()) {
      const updatedCuriosities = curiosities.map(c => 
        c.id === editingCuriosity.id ? editingCuriosity : c
      );
      setCuriosities(updatedCuriosities);
      saveUserData({ curiosities: updatedCuriosities, attributes, needs, vision });
      setEditingCuriosity(null);
    }
  };

  // Trait Management
  const addTrait = (traitName) => {
    // Check if trait already exists
    if (attributes.some(attr => attr.name === traitName)) {
      alert('You already have this trait!');
      return;
    }
    
    const newTrait = createTrait(traitName, 0);
    const updatedAttributes = [...attributes, newTrait];
    setAttributes(updatedAttributes);
    saveUserData({ curiosities, attributes: updatedAttributes, needs, vision });
    setShowTraitModal(false);
    setCustomTraitName('');
  };

  const removeTrait = (traitName) => {
    if (window.confirm(`Remove ${traitName} from your traits?`)) {
      const updatedAttributes = attributes.filter(attr => attr.name !== traitName);
      setAttributes(updatedAttributes);
      saveUserData({ curiosities, attributes: updatedAttributes, needs, vision });
    }
  };

  const cancelEditingCuriosity = () => {
    setEditingCuriosity(null);
  };

  // Vision editing functions
  const startEditingVision = () => {
    // Load existing vision sections if they exist
    const fullVisionData = localStorage.getItem('awake-full-vision');
    if (fullVisionData) {
      try {
        const parsed = JSON.parse(fullVisionData);
        if (parsed.sections) {
          setExistingVisionSections(parsed.sections);
          setShowVisionCreation(true);
          return;
        }
      } catch (e) {
        console.error('Error loading vision sections:', e);
      }
    }
    
    // Fallback to old simple text editing
    setVisionText(vision);
    setIsEditingVision(true);
  };

  const saveVision = () => {
    setVision(visionText);
    saveUserData({ curiosities, attributes, needs, vision: visionText });
    setIsEditingVision(false);
  };

  const cancelEditingVision = () => {
    setVisionText('');
    setIsEditingVision(false);
  };

  // Daily Reflection handlers
  const startDailyReflection = () => {
    setShowReflection(true);
  };

  const handleReflectionComplete = async (reflectionSummary) => {
    // Close reflection modal
    setShowReflection(false);
    
    // Only save and generate playbook if reflection was completed, not cancelled
    if (!reflectionSummary.cancelled) {
      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const lastDate = lastReflectionDate ? new Date(lastReflectionDate).toISOString().split('T')[0] : null;
      
      let newStreak = reflectionStreak;
      let streakMessage = '';
      
      if (!lastDate || lastDate !== today) {
        // Only increment if we haven't reflected today yet
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        if (lastDate === yesterday || !lastDate) {
          // Streak continues or starts
          newStreak = reflectionStreak + 1;
          setReflectionStreak(newStreak);
          
          // Milestone messages
          if (newStreak === 7) {
            streakMessage = ' 🔥 7 day streak! You\'re building a powerful habit!';
          } else if (newStreak === 30) {
            streakMessage = ' 🔥🔥 30 day streak! You\'re unstoppable!';
          } else if (newStreak === 100) {
            streakMessage = ' 🔥🔥🔥 100 day streak! Legendary commitment!';
          } else if (newStreak > 1) {
            streakMessage = ` 🔥 ${newStreak} day streak!`;
          }
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
          setReflectionStreak(1);
        }
        
        setLastReflectionDate(today);
      }
      
      // Save reflection to history
      const updatedHistory = [...reflectionHistory, reflectionSummary];
      setReflectionHistory(updatedHistory);
      
      // Store in localStorage
      localStorage.setItem('awake-reflection-history', JSON.stringify(updatedHistory));
      
      // Show loading message
      setChatMessages([
        { sender: 'LOA', text: `Great reflection!${streakMessage} I'm generating your personalized daily playbook... ⏳` }
      ]);
      
      try {
        // Generate playbook from AI analysis of reflection
        if (apiKey && reflectionSummary.messages.length > 1) {
          const aiPlaybook = await aiService.generatePlaybookFromReflection(
            reflectionSummary.messages,
            { curiosities, attributes, needs, vision }
          );
          
          if (aiPlaybook && aiPlaybook.length > 0) {
            console.log('Generated playbook from reflection:', aiPlaybook);
            setDailyPlaybook(aiPlaybook);
            
            // Save playbook to localStorage immediately
            const updatedData = { 
              curiosities, 
              attributes, 
              needs, 
              vision, 
              profile, 
              dailyPlaybook: aiPlaybook 
            };
            saveUserData(updatedData);
            console.log('Playbook saved to localStorage');
            
            // Show success message
            setChatMessages([
              { sender: 'LOA', text: "✨ Perfect! I've generated your personalized daily playbook based on your reflection. Check it out below! Each task includes trait improvements to help you level up. 🎯" }
            ]);
          } else {
            // Fallback to static playbook
            generateDailyPlaybook();
            setChatMessages([
              { sender: 'LOA', text: "I've generated your daily playbook! 🎯" }
            ]);
          }
        } else {
          // Fallback to static playbook if no API key
          generateDailyPlaybook();
          setChatMessages([
            { sender: 'LOA', text: "Great reflection! I've generated your daily playbook. Check it out below! 🎯" }
          ]);
        }
      } catch (error) {
        console.error('Error generating AI playbook:', error);
        // Fallback to static playbook on error
        generateDailyPlaybook();
        setChatMessages([
          { sender: 'LOA', text: "I've generated your daily playbook! 🎯" }
        ]);
      }
      
      // Save daily snapshot for historical tracking
      saveDailySnapshot(currentUserId, {
        needs,
        attributes,
        curiosities,
        character,
        reflectionDone: true,
        dailyTasksCompleted: dailyPlaybook.filter(t => t.completed).length
      });
    }
    // If cancelled, just close without saving or showing messages
  };

  const sendMessage = async (messageText = currentMessage) => {
    if (!messageText.trim()) return;
    
    // Start a new chat if none exists
    if (!currentChatId) {
      startNewChat();
    }
    
    const userMessage = { sender: 'You', text: messageText, timestamp: Date.now() };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
      const userContext = { curiosities, attributes, needs, dailyPlaybook, vision, profile };

      let aiResponse;
      if (!apiKey) {
        aiResponse = "I'd love to provide personalized coaching, but I need a Claude API key first. Click the settings button to add your key!";
      } else {
        aiResponse = await aiService.sendMessage(messageText, userContext, chatMessages);
        
        // Extract tasks from AI response
        if (messageText.toLowerCase().includes('add task:') || messageText.toLowerCase().includes('task:')) {
          const taskMatch = messageText.match(/(?:add task:|task:)\s*(.+)/i);
          if (taskMatch) {
            const taskText = taskMatch[1].trim();
            setTasks(prev => [...prev, { id: Date.now(), text: taskText, completed: false }]);
          }
        }
      }

      const finalMessages = [...newMessages, { sender: 'LOA', text: aiResponse, timestamp: Date.now() }];
      setChatMessages(finalMessages);
      
      // Save chat to history
      const updatedHistory = [...chatHistory];
      const existingChatIndex = updatedHistory.findIndex(c => c.id === currentChatId);
      
      const chatToSave = {
        id: currentChatId || Date.now().toString(),
        title: newMessages[0]?.text.substring(0, 50) || 'New Chat',
        messages: finalMessages,
        lastUpdated: Date.now()
      };
      
      if (existingChatIndex >= 0) {
        updatedHistory[existingChatIndex] = chatToSave;
      } else {
        updatedHistory.unshift(chatToSave);
      }
      
      // Keep only last 50 chats
      if (updatedHistory.length > 50) {
        updatedHistory.splice(50);
      }
      
      saveChatHistory(updatedHistory);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!",
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const completePlaybookItem = (itemId) => {
    // Find the item first to get its XP value
    const item = dailyPlaybook.find(p => p.id === itemId);
    
    setDailyPlaybook(playbook => playbook.map(item => 
      item.id === itemId ? { ...item, completed: true } : item
    ));
    
    // XP gain (use item's xpGain or default to 35)
    const xpGain = item?.xpGain || 35;
    const newXp = character.xp + xpGain;
    let newLevel = character.level;
    let newXpToNext = character.xpToNext;
    
    if (newXp >= character.xpToNext) {
      newLevel++;
      newXpToNext = newLevel * 100;
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
    
    setCharacter({ level: newLevel, xp: newXp % newXpToNext, xpToNext: newXpToNext });

    // Improve the related need
    if (item && item.category) {
      setNeeds(needs => needs.map(need => 
        need.name === item.category ? 
          { ...need, value: Math.min(100, need.value + 10) } : need
      ));
    }
    
    // Level up traits based on completed task
    if (item && item.traits && item.traits.length > 0) {
      const traitXPPerTrait = Math.floor((item.xpGain || 20) / item.traits.length);
      const updatedAttributes = attributes.map(attr => {
        if (item.traits.includes(attr.name)) {
          const updatedTrait = addTraitXP(attr, traitXPPerTrait);
          
          // Show level up celebration if trait leveled up
          if (updatedTrait.leveledUp) {
            setTimeout(() => {
              setChatMessages(prev => [...prev, {
                sender: 'LOA',
                text: `🎉 Your ${attr.name} leveled up to Level ${updatedTrait.level}! Keep going! 🚀`
              }]);
            }, 500);
          }
          
          return updatedTrait;
        }
        return attr;
      });
      
      setAttributes(updatedAttributes);
      saveUserData({ curiosities, attributes: updatedAttributes, needs, vision });
    }
  };

  // Handle authentication success
  const handleAuthSuccess = (username) => {
    const success = simpleAuth.createUser(username);
    
    if (success) {
      const user = simpleAuth.getUserInfo();
      setUserId(user.id);
      setCurrentUserId(user.id);
      setUserInfo(user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      
      // Set profile name
      setProfile({ name: username, gender: 'other' });
      
      // Load user data (will use defaults for new user)
      loadUserData(user.id);
    }
  };

  const startVisionCreation = () => {
    setExistingVisionSections(null); // Clear any existing sections for new creation
    setShowVisionCreation(true);
  };

  const handleVisionComplete = (visionResult) => {
    setShowVisionCreation(false);
    setExistingVisionSections(null); // Clear after closing
    
    if (!visionResult.cancelled) {
      // Save the compiled vision
      const finalVision = visionResult.compiledVision || visionResult.identity || '';
      setVision(finalVision);
      
      // Save full vision data to localStorage
      localStorage.setItem('awake-full-vision', JSON.stringify(visionResult));
      
      // Update user data
      saveUserData({ curiosities, attributes, needs, vision: finalVision });
      
      // Show celebration message
      setChatMessages([
        { sender: 'LOA', text: "🎉 Your vision is alive! You can edit it anytime or listen to it daily to reinforce your path. Your curiosities and daily actions will now align with this powerful vision!" }
      ]);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner">🚀</div>
          <h2>Loading Awake Dashboard...</h2>
        </div>
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {showAuthModal && (
          <SimpleAuthModal onAuthSuccess={handleAuthSuccess} />
        )}
      </>
    );
  }

  return (
    <div className="awake-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-section">
          <h1>Awake Dashboard</h1>
          <p className="user-stats">
            {userInfo?.username || profile.name || 'User'} | Level: {character.level} | Tokens: {Math.floor(character.xp / 10)}
          </p>
        </div>
        <div className="header-actions">
          <button className="reflection-btn" onClick={startDailyReflection}>
            📝 Daily Reflection
          </button>
          <button 
            className="community-btn" 
            onClick={() => window.open('https://www.skool.com/awake', '_blank')}
            title="Join Community"
          >
            👥 Community
          </button>
          <button className="profile-btn" onClick={() => setShowProfileModal(true)} title="Edit Profile">
            👤
          </button>
          {!apiKey && (
            <button className="setup-ai-btn" onClick={() => setShowApiKeyModal(true)}>
              🤖 Setup AI
            </button>
          )}
          <button className="settings-btn" onClick={() => setShowApiKeyModal(true)}>⚙️</button>
        </div>
      </div>

      {showCelebration && (
        <div className="celebration">🎉 LEVEL UP! 🎉</div>
      )}

      {/* Main Dashboard Grid */}
      <div className="dashboard-grid">
        
        {/* Your Vision Card */}
        <div className="dashboard-card vision-card">
          <div className="card-header">
            <h3>Your Vision</h3>
            <button className="edit-btn" onClick={startEditingVision} title="Edit Vision">✏️</button>
            <button className="create-vision-btn" onClick={startVisionCreation} title="Create Vision">🔮 Create Vision</button>
          </div>
          
          {isEditingVision ? (
            <div className="vision-editing">
              <textarea
                value={visionText}
                onChange={(e) => setVisionText(e.target.value)}
                placeholder="Describe who you're becoming more and more each day. What does your ideal life look like? What traits are you developing? Use 'more and more' language for believability..."
                className="vision-textarea"
                rows={6}
              />
              <div className="vision-actions">
                <button onClick={saveVision} className="save-btn">💾 Save</button>
                <button onClick={cancelEditingVision} className="cancel-btn">✕ Cancel</button>
              </div>
            </div>
          ) : (
            <div className="vision-display">
              {vision ? (
                <p className="vision-text">{vision}</p>
              ) : (
                <p className="vision-placeholder">
                  Click the edit button to craft your vision. Describe who you're becoming more and more each day...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Current State */}
        <div className="dashboard-card needs-card">
          <h3>Current State</h3>
          <div className="needs-list">
            {needs.map(need => (
              <div key={need.id} className="need-item">
                <div className="need-header">
                  <span>{need.name}</span>
                  <span className="need-value">{need.value}%</span>
                </div>
                <div className="need-bar">
                  <div 
                    className="need-fill"
                    style={{ 
                      width: `${need.value}%`,
                      backgroundColor: need.color
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={need.value}
                  onChange={(e) => updateNeed(need.id, e.target.value)}
                  className="need-slider"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Attributes */}
        <div className="dashboard-card attributes-card">
          <div className="card-header">
            <h3>Traits & Levels</h3>
            <button className="add-btn" onClick={() => setShowTraitModal(true)} title="Customize Traits">⚙️</button>
          </div>
          <p className="traits-subtitle">Level up by completing daily actions</p>
          <div className="attributes-list">
            {attributes.map(attr => (
              <div key={attr.id} className="attribute-item">
                <div className="attribute-header">
                  <span className="trait-name" style={{ color: getTraitColor(attr.name) }}>
                    {attr.name}
                  </span>
                  <div className="trait-actions">
                    <span className="attribute-level">
                      Level {attr.level || 0} <span className="attribute-score">({getTraitScore(attr.level || 0).toFixed(1)}/10)</span>
                    </span>
                    <button 
                      className="remove-trait-btn" 
                      onClick={() => removeTrait(attr.name)}
                      title="Remove trait"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="attribute-bar">
                  <div 
                    className="attribute-fill"
                    style={{ 
                      width: `${attr.progress}%`,
                      background: `linear-gradient(90deg, ${getTraitColor(attr.name)}, ${getTraitColor(attr.name)}dd)`
                    }}
                  />
                </div>
                <div className="attribute-xp">
                  {attr.currentXP} / {attr.xpToNext} XP
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curiosities */}
        <div className="dashboard-card curiosities-card">
          <div className="card-header">
            <h3>Your Curiosities</h3>
            <button className="add-btn" onClick={() => setNewCuriosity('')} title="Add Curiosity">+</button>
          </div>
          <p className="section-description">
            Curiosities are the passions, projects, and interests that energize you. 
            They could be creative pursuits, career goals, hobbies, or areas you want to explore.
          </p>
          
          {/* Add New Curiosity */}
          <div className="add-curiosity-section">
            <div className="add-curiosity-input">
              <input
                type="text"
                value={newCuriosity}
                onChange={(e) => setNewCuriosity(e.target.value)}
                placeholder="What are you curious about?"
                onKeyPress={(e) => e.key === 'Enter' && addCuriosity()}
              />
              <button onClick={addCuriosity} disabled={!newCuriosity.trim()}>Add</button>
            </div>
          </div>

          <div className="curiosities-list">
            {curiosities.map(curiosity => (
              <div key={curiosity.id} className="curiosity-item">
                {editingCuriosity && editingCuriosity.id === curiosity.id ? (
                  // Editing mode
                  <div className="editing-curiosity">
                    <input
                      type="text"
                      value={editingCuriosity.text}
                      onChange={(e) => setEditingCuriosity({...editingCuriosity, text: e.target.value})}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditingCuriosity()}
                      className="edit-input"
                    />
                    <div className="edit-actions">
                      <button onClick={saveEditingCuriosity} className="save-btn">✓</button>
                      <button onClick={cancelEditingCuriosity} className="cancel-btn">✕</button>
                    </div>
                  </div>
                ) : (
                  // Display mode
                  <>
                    <div className="curiosity-header">
                      <span className="curiosity-title">{curiosity.text}</span>
                      <div className="curiosity-actions">
                        <span className="inspiration-value">{curiosity.inspiration}%</span>
                        <button 
                          className="edit-curiosity-btn" 
                          onClick={() => startEditingCuriosity(curiosity)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          className="delete-curiosity-btn" 
                          onClick={() => deleteCuriosity(curiosity.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="inspiration-bar">
                      <div 
                        className="inspiration-fill"
                        style={{ width: `${curiosity.inspiration}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={curiosity.inspiration}
                      onChange={(e) => updateInspiration(curiosity.id, parseInt(e.target.value))}
                      className="inspiration-slider"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* LOA Chat */}
        <div className="dashboard-card chat-card">
          <div className="chat-header-row">
            <h3>Chat with LOA</h3>
            <button className="new-chat-btn" onClick={startNewChat} title="Start New Chat">
              ➕ New Chat
            </button>
          </div>
          
          {chatHistory.length > 0 && (
            <details className="chat-history-dropdown">
              <summary>Chat History ({chatHistory.length})</summary>
              <div className="chat-history-list">
                {chatHistory.map(chat => (
                  <div 
                    key={chat.id}
                    className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="chat-history-title">{chat.title}...</div>
                    <div className="chat-history-date">
                      {new Date(chat.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
          
          {chatMessages.length === 0 && (
            <div className="chat-prompts">
              <p className="prompts-label">Deep Dive Prompts:</p>
              <div className="prompt-buttons">
                <button 
                  className="prompt-btn"
                  onClick={() => sendMessage("Help me explore what I truly want in life. Ask me deep questions about my desires and aspirations.")}
                >
                  🎯 Explore Your Desires
                </button>
                <button 
                  className="prompt-btn"
                  onClick={() => sendMessage("I want to understand my motivations better. Help me dig into why I'm pursuing my current goals.")}
                >
                  💭 Understand Your Why
                </button>
                <button 
                  className="prompt-btn"
                  onClick={() => sendMessage("Help me identify what's holding me back from becoming who I want to be.")}
                >
                  🔍 Find Your Blocks
                </button>
                <button 
                  className="prompt-btn"
                  onClick={() => sendMessage("Let's explore how my daily actions connect to my bigger vision.")}
                >
                  🔗 Connect Actions to Vision
                </button>
              </div>
            </div>
          )}
          
          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender.toLowerCase()}`}>
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
            {isChatLoading && <div className="message loading">LOA is thinking...</div>}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="What's on your mind?"
              onKeyPress={(e) => e.key === 'Enter' && !isChatLoading && sendMessage()}
            />
            <button onClick={() => sendMessage()} disabled={isChatLoading}>
              Send
            </button>
          </div>
        </div>

        {/* Daily Playbook - The Centerpiece */}
        <div className="dashboard-card playbook-card featured">
          <div className="playbook-header-with-streak">
            <h3>LOA's Daily Playbook</h3>
            {reflectionStreak > 0 && (
              <div className="reflection-streak">
                <span className="streak-flame">🔥</span>
                <span className="streak-count">{reflectionStreak}</span>
                <span className="streak-label">day streak</span>
              </div>
            )}
          </div>
          <div className="playbook-items">
            {dailyPlaybook.map(item => (
              <div key={item.id} className={`playbook-item ${item.completed ? 'completed' : ''}`}>
                <div className="playbook-content">
                  <div className="playbook-header">
                    <span className="playbook-emoji">{item.emoji || '🎯'}</span>
                    <div className="playbook-category" style={{ color: item.color }}>
                      {item.category.toUpperCase()}
                    </div>
                  </div>
                  <div className="playbook-suggestion">{item.suggestion}</div>
                  {item.traits && item.traits.length > 0 && (
                    <div className="playbook-traits">
                      {item.traits.map((trait, idx) => (
                        <span key={idx} className="trait-badge">{trait}</span>
                      ))}
                    </div>
                  )}
                </div>
                {!item.completed ? (
                  <button 
                    className="complete-btn"
                    onClick={() => completePlaybookItem(item.id)}
                  >
                    ✓ Done
                  </button>
                ) : (
                  <span className="completed-badge">+{item.xpGain || 35} XP</span>
                )}
              </div>
            ))}
          </div>
          {dailyPlaybook.length === 0 && (
            <div className="empty-playbook">
              <p>📝 Complete your Daily Reflection to generate your playbook</p>
            </div>
          )}
        </div>

        {/* Progress Insights */}
        <ProgressInsights 
          userId={currentUserId}
          needs={needs}
          attributes={attributes}
          curiosities={curiosities}
        />

      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>AI Setup</h3>
            <p>Add your Claude API key:</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
            <div className="modal-actions">
              <button onClick={() => setShowApiKeyModal(false)}>Save</button>
              <button onClick={() => setShowApiKeyModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Reflection Modal */}
      {showReflection && (
        <DailyReflectionChat
          onComplete={handleReflectionComplete}
          userContext={{ curiosities, attributes, needs, vision, profile, dailyPlaybook }}
          apiKey={apiKey}
        />
      )}

      {/* Vision Creation Modal */}
      {showVisionCreation && (
        <VisionCreationChat
          onComplete={handleVisionComplete}
          userContext={{ curiosities, attributes, needs, vision, profile }}
          existingSections={existingVisionSections}
          apiKey={apiKey}
        />
      )}

      {/* Trait Customization Modal */}
      {showTraitModal && (
        <div className="modal-overlay" onClick={() => setShowTraitModal(false)}>
          <div className="modal-content trait-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Customize Your Traits</h2>
              <button className="close-btn" onClick={() => setShowTraitModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Choose traits that matter to you. These represent the areas where you want to grow and level up.
              </p>

              <div className="trait-suggestions">
                <h3>Suggested Traits</h3>
                <div className="trait-grid">
                  {TRAIT_SUGGESTIONS.map(trait => {
                    const isActive = attributes.some(attr => attr.name === trait.name);
                    return (
                      <button
                        key={trait.name}
                        className={`trait-suggestion-btn ${isActive ? 'active' : ''}`}
                        onClick={() => isActive ? removeTrait(trait.name) : addTrait(trait.name)}
                        title={trait.description}
                      >
                        {trait.name} {isActive && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="custom-trait-section">
                <h3>Add Custom Trait</h3>
                <div className="custom-trait-input">
                  <input
                    type="text"
                    placeholder="Enter trait name..."
                    value={customTraitName}
                    onChange={(e) => setCustomTraitName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && customTraitName.trim()) {
                        addTrait(customTraitName.trim());
                      }
                    }}
                  />
                  <button 
                    onClick={() => customTraitName.trim() && addTrait(customTraitName.trim())}
                    disabled={!customTraitName.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="current-traits">
                <h3>Your Current Traits ({attributes.length})</h3>
                <div className="current-trait-list">
                  {attributes.map(attr => (
                    <div key={attr.id} className="current-trait-item">
                      <span style={{ color: getTraitColor(attr.name) }}>{attr.name}</span>
                      <button onClick={() => removeTrait(attr.name)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="primary-btn" onClick={() => setShowTraitModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Your Profile</h2>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Set your name and gender so LOA can personalize your vision and conversations.
              </p>

              <div className="profile-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <div className="gender-options">
                    {[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ].map(g => (
                      <button
                        key={g.value}
                        className={`gender-btn ${profile.gender === g.value ? 'active' : ''}`}
                        onClick={() => setProfile({ ...profile, gender: g.value })}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="primary-btn" 
                onClick={() => {
                  // Update username in simpleAuth if changed
                  if (profile.name && profile.name !== userInfo?.username) {
                    simpleAuth.updateUsername(profile.name);
                    setUserInfo({ ...userInfo, username: profile.name });
                  }
                  saveUserData({ curiosities, attributes, needs, vision, profile });
                  setShowProfileModal(false);
                }}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AwakeDashboard;

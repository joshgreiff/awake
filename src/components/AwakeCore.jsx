import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import nostrAuth from '../services/nostrAuth';
import awakeDB from '../storage/awakeDB';
import NostrAuthModal from './NostrAuthModal';
import './AwakeCore.css';

const AwakeCore = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [curiosities, setCuriosities] = useState([]);
  
  // Enhanced attributes system based on Aurora's design
  const [attributes, setAttributes] = useState([
    { id: 1, name: "Creativity", score: 7.8, maxScore: 10, description: "Innovation and artistic expression" },
    { id: 2, name: "Discipline", score: 6.1, maxScore: 10, description: "Self-control and consistency" },
    { id: 3, name: "Communication", score: 8.5, maxScore: 10, description: "Expression and connection with others" },
    { id: 4, name: "Emotional Regulation", score: 6.4, maxScore: 10, description: "Managing emotions effectively" },
    { id: 5, name: "Social Connection", score: 5.7, maxScore: 10, description: "Building meaningful relationships" },
    { id: 6, name: "Focus", score: 7.2, maxScore: 10, description: "Sustained attention and concentration" },
    { id: 7, name: "Energy", score: 6.5, maxScore: 10, description: "Physical and mental vitality" }
  ]);

  // Current needs/state tracking
  const [needs, setNeeds] = useState([
    { id: 1, name: "Energy", value: 65, color: "#FF6B6B" },
    { id: 2, name: "Focus", value: 72, color: "#4ECDC4" },
    { id: 3, name: "Joy", value: 55, color: "#FFE66D" },
    { id: 4, name: "Connection", value: 40, color: "#A8E6CF" },
    { id: 5, name: "Health", value: 70, color: "#FF8B94" }
  ]);

  const [dailyPlaybook, setDailyPlaybook] = useState([]);
  const [newCuriosity, setNewCuriosity] = useState('');
  const [newAttribute, setNewAttribute] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'LOA', text: "Hey Josh! I've analyzed your current state and prepared your daily playbook. What would you like to explore today?" }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [tasks, setTasks] = useState([]);
  const [character, setCharacter] = useState({ level: 1, xp: 0, xpToNext: 100 });
  const [showCelebration, setShowCelebration] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPlaybook, setShowPlaybook] = useState(true);

  // Initialize authentication and load user data
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      
      // Initialize Nostr authentication
      const authSuccess = await nostrAuth.initialize();
      
      if (authSuccess) {
        const userInfo = nostrAuth.getUserInfo();
        setIsAuthenticated(true);
        setUserId(userInfo.publicKey);
        setUserInfo(userInfo);
        
        // Initialize database for this user
        await awakeDB.initializeUser(userInfo.publicKey, userInfo);
        
        // Load user data
        await loadUserData(userInfo.publicKey);
      } else {
        // Show auth modal for new users
        setShowAuthModal(true);
      }
      
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Initialize AI service when API key is available
  useEffect(() => {
    if (apiKey) {
      aiService.initialize(apiKey);
      localStorage.setItem('claude_api_key', apiKey);
    }
  }, [apiKey]);

  // Load user data from IndexedDB
  const loadUserData = async (userId) => {
    try {
      const [
        loadedCuriosities,
        loadedAttributes, 
        loadedNeeds
      ] = await Promise.all([
        awakeDB.getCuriosities(userId),
        awakeDB.getAttributes(userId),
        awakeDB.getNeeds(userId)
      ]);

      // Set loaded data or use defaults
      if (loadedCuriosities.length > 0) {
        setCuriosities(loadedCuriosities);
      } else {
        // Initialize with default curiosities for new users
        const defaultCuriosities = [
          { title: "Pokemon TCG competing", inspiration: 70 },
          { title: "AnyLingo app creation", inspiration: 85 },
          { title: "Wander Studios building/administration", inspiration: 60 },
          { title: "Bitcoin education/advocacy", inspiration: 75 }
        ];
        
        for (const curiosity of defaultCuriosities) {
          await awakeDB.addCuriosity(curiosity, userId);
        }
        setCuriosities(await awakeDB.getCuriosities(userId));
      }

      if (loadedAttributes.length > 0) {
        setAttributes(loadedAttributes);
      } else {
        // Initialize with default attributes
        const defaultAttributes = [
          { name: "Creativity", score: 7.8, maxScore: 10, description: "Innovation and artistic expression" },
          { name: "Discipline", score: 6.1, maxScore: 10, description: "Self-control and consistency" },
          { name: "Communication", score: 8.5, maxScore: 10, description: "Expression and connection with others" },
          { name: "Emotional Regulation", score: 6.4, maxScore: 10, description: "Managing emotions effectively" },
          { name: "Social Connection", score: 5.7, maxScore: 10, description: "Building meaningful relationships" },
          { name: "Focus", score: 7.2, maxScore: 10, description: "Sustained attention and concentration" },
          { name: "Energy", score: 6.5, maxScore: 10, description: "Physical and mental vitality" }
        ];
        
        for (const attribute of defaultAttributes) {
          await awakeDB.addAttribute(attribute, userId);
        }
        setAttributes(await awakeDB.getAttributes(userId));
      }

      if (loadedNeeds.length > 0) {
        setNeeds(loadedNeeds);
      } else {
        // Initialize with default needs
        const defaultNeeds = [
          { name: "Energy", value: 65, color: "#FF6B6B" },
          { name: "Focus", value: 72, color: "#4ECDC4" },
          { name: "Joy", value: 55, color: "#FFE66D" },
          { name: "Connection", value: 40, color: "#A8E6CF" },
          { name: "Health", value: 70, color: "#FF8B94" }
        ];
        
        for (const need of defaultNeeds) {
          await awakeDB.addNeed(need, userId);
        }
        setNeeds(await awakeDB.getNeeds(userId));
      }

    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Handle successful authentication
  const handleAuthSuccess = async () => {
    const userInfo = nostrAuth.getUserInfo();
    setIsAuthenticated(true);
    setUserId(userInfo.publicKey);
    setUserInfo(userInfo);
    setShowAuthModal(false);
    
    // Initialize database and load data
    await awakeDB.initializeUser(userInfo.publicKey, userInfo);
    await loadUserData(userInfo.publicKey);
  };

  // Generate daily playbook on component mount and when state changes
  useEffect(() => {
    if (isAuthenticated && curiosities.length > 0) {
      generateDailyPlaybook();
    }
  }, [curiosities, attributes, needs, isAuthenticated]);

  const generateDailyPlaybook = () => {
    const playbook = [];
    
    // Analyze needs and provide specific suggestions
    needs.forEach(need => {
      if (need.value < 70) { // Focus on needs below 70%
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
          case "Health":
            suggestion = "Take a 5-minute stretch break or drink more water";
            break;
          default:
            suggestion = `Focus on improving your ${need.name.toLowerCase()}`;
        }
        
        playbook.push({
          id: need.id,
          category: need.name,
          suggestion: suggestion,
          priority: 100 - need.value, // Lower values = higher priority
          color: need.color
        });
      }
    });

    // Add curiosity-based suggestions
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

    // Sort by priority and take top 5
    setDailyPlaybook(playbook.sort((a, b) => b.priority - a.priority).slice(0, 5));
  };

  const updateNeed = async (id, value) => {
    const updatedNeeds = needs.map(need => 
      need.id === id ? { ...need, value: parseInt(value) } : need
    );
    setNeeds(updatedNeeds);
    
    if (userId) {
      await awakeDB.updateNeed(id, { value: parseInt(value) }, userId);
    }
  };

  const updateAttributeScore = async (id, score) => {
    const updatedAttributes = attributes.map(attr => 
      attr.id === id ? { ...attr, score: parseFloat(score) } : attr
    );
    setAttributes(updatedAttributes);
    
    if (userId) {
      await awakeDB.updateAttribute(id, { score: parseFloat(score) }, userId);
    }
  };

  const addCuriosity = () => {
    if (newCuriosity.trim()) {
      setCuriosities([...curiosities, {
        id: Date.now(),
        text: newCuriosity.trim(),
        inspiration: 50
      }]);
      setNewCuriosity('');
    }
  };

  const addAttribute = () => {
    if (newAttribute.trim()) {
      setAttributes([...attributes, {
        id: Date.now(),
        name: newAttribute.trim(),
        score: 5.0,
        maxScore: 10,
        description: "Custom attribute"
      }]);
      setNewAttribute('');
    }
  };

  const updateInspiration = (id, value) => {
    setCuriosities(curiosities.map(c => 
      c.id === id ? { ...c, inspiration: value } : c
    ));
  };

  const sendMessage = async (messageText = currentMessage, isPreset = false) => {
    if (!messageText.trim()) return;
    
    const userMessage = { sender: 'You', text: messageText };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    
    if (!isPreset) {
      setCurrentMessage('');
    }
    setIsLoading(true);

    try {
      const userContext = {
        curiosities,
        attributes,
        needs,
        dailyPlaybook,
        recentReflections: []
      };

      let aiResponse;
      if (!apiKey) {
        aiResponse = "I'd love to provide personalized coaching, but I need a Claude API key first. Click the settings button to add your key and unlock my full potential!";
      } else {
        aiResponse = await aiService.sendMessage(messageText, userContext, chatMessages);
        
        // Check if the message contains a task to add
        if (messageText.toLowerCase().includes('add task:') || messageText.toLowerCase().includes('task:')) {
          const taskMatch = messageText.match(/(?:add task:|task:)\s*(.+)/i);
          if (taskMatch) {
            const taskText = taskMatch[1].trim();
            setTasks(prev => [...prev, { id: Date.now(), text: taskText, completed: false }]);
          }
        }
      }

      setChatMessages([...newMessages, { sender: 'LOA', text: aiResponse }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPresetPrompt = (promptType) => {
    const userContext = { curiosities, attributes, needs, dailyPlaybook };
    let prompt;
    
    switch (promptType) {
      case 'daily-reflection':
        prompt = aiService.getDailyReflectionPrompt(userContext);
        break;
      case 'holistic-overview':
        prompt = aiService.getHolisticOverviewPrompt(userContext);
        break;
      case 'playbook-analysis':
        prompt = `Based on my current daily playbook: ${dailyPlaybook.map(item => `${item.category}: ${item.suggestion}`).join(', ')}, what insights do you have about my current state and priorities?`;
        break;
      default:
        prompt = "Let's explore what's on your mind today.";
    }
    
    sendMessage(prompt, true);
  };

  const completePlaybookItem = (itemId) => {
    setDailyPlaybook(playbook => playbook.map(item => 
      item.id === itemId ? { ...item, completed: true } : item
    ));
    
    // XP and leveling logic
    const xpGain = 35; // More XP for playbook items
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

    // Improve related need/attribute
    const item = dailyPlaybook.find(p => p.id === itemId);
    if (item && item.category) {
      // Improve the related need
      setNeeds(needs => needs.map(need => 
        need.name === item.category ? 
          { ...need, value: Math.min(100, need.value + 10) } : need
      ));
    }
  };

  const completeTask = (taskId) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: true } : t
    ));
    
    // Standard task XP
    const xpGain = 25;
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

    // Level up a random attribute slightly
    const randomAttribute = attributes[Math.floor(Math.random() * attributes.length)];
    setAttributes(attrs => attrs.map(attr => {
      if (attr.id === randomAttribute.id) {
        return { ...attr, score: Math.min(attr.maxScore, attr.score + 0.1) };
      }
      return attr;
    }));
  };

  const getInspirationColor = (level) => {
    if (level >= 80) return '#2CB67D';
    if (level >= 60) return '#FFD803';
    if (level >= 40) return '#FF6F61';
    return '#6C6F85';
  };

  const getNeedColor = (value) => {
    if (value >= 80) return '#2CB67D';
    if (value >= 60) return '#FFD803';
    if (value >= 40) return '#FF6F61';
    return '#FF4757';
  };

  // Show loading screen during initialization
  if (isLoading) {
    return (
      <div className="awake-core loading-screen">
        <div className="loading-content">
          <div className="loading-spinner">🚀</div>
          <h2>Initializing Awake...</h2>
          <p>Setting up your decentralized personal development system</p>
        </div>
      </div>
    );
  }

  // Show authentication modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="awake-core">
        {showAuthModal && (
          <NostrAuthModal
            onAuthSuccess={handleAuthSuccess}
            onClose={() => setShowAuthModal(false)}
          />
        )}
        <div className="welcome-screen">
          <h1>🌟 Welcome to Awake</h1>
          <p>Your decentralized personal development companion</p>
          <button 
            className="auth-btn primary"
            onClick={() => setShowAuthModal(true)}
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="awake-core">
      {/* User Identity Banner */}
      <div className="user-identity-banner">
        <div className="user-info">
          <span className="user-icon">🔐</span>
          <div>
            <div className="user-name">{userInfo?.displayName}</div>
            <div className="user-id">{userInfo?.displayId}</div>
          </div>
        </div>
        <div className="identity-actions">
          {!apiKey && (
            <button 
              className="setup-ai-btn"
              onClick={() => setShowApiKeyModal(true)}
            >
              🤖 Setup AI
            </button>
          )}
          <button className="settings-btn" onClick={() => setShowApiKeyModal(true)}>⚙️</button>
        </div>
      </div>

      {/* Character Status */}
      <div className="character-status">
        <div className="character-avatar">🚀</div>
        <div className="character-info">
          <div className="character-level">Level {character.level}</div>
          <div className="xp-bar">
            <div 
              className="xp-fill" 
              style={{ width: `${(character.xp / character.xpToNext) * 100}%` }}
            />
          </div>
          <div className="xp-text">{character.xp} / {character.xpToNext} XP</div>
        </div>
        <button className="settings-btn" onClick={() => setShowApiKeyModal(true)}>⚙️</button>
      </div>

      {showCelebration && (
        <div className="celebration">🎉 LEVEL UP! 🎉</div>
      )}

      {/* Daily Playbook */}
      {showPlaybook && (
        <div className="daily-playbook-section">
          <div className="playbook-header">
            <h2>🎯 LOA's Daily Playbook</h2>
            <button 
              className="toggle-btn"
              onClick={() => setShowPlaybook(false)}
            >
              Hide
            </button>
          </div>
          <div className="playbook-items">
            {dailyPlaybook.map(item => (
              <div 
                key={item.id} 
                className={`playbook-item ${item.completed ? 'completed' : ''}`}
                style={{ borderLeftColor: item.color }}
              >
                <div className="playbook-content">
                  <div className="playbook-category">{item.category}</div>
                  <div className="playbook-suggestion">{item.suggestion}</div>
                </div>
                <div className="playbook-actions">
                  {!item.completed ? (
                    <button 
                      className="complete-btn"
                      onClick={() => completePlaybookItem(item.id)}
                    >
                      ✓ Done
                    </button>
                  ) : (
                    <span className="completed-badge">+35 XP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button 
            className="regenerate-btn"
            onClick={generateDailyPlaybook}
          >
            🔄 Refresh Playbook
          </button>
        </div>
      )}

      {!showPlaybook && (
        <button 
          className="show-playbook-btn"
          onClick={() => setShowPlaybook(true)}
        >
          📋 Show Daily Playbook
        </button>
      )}

      {/* Preset Prompts */}
      <div className="preset-prompts">
        <button 
          className="preset-btn daily-reflection"
          onClick={() => sendPresetPrompt('daily-reflection')}
          disabled={isLoading}
        >
          📝 Daily Reflection
        </button>
        <button 
          className="preset-btn holistic-overview"
          onClick={() => sendPresetPrompt('holistic-overview')}
          disabled={isLoading}
        >
          🔍 Holistic Overview
        </button>
        <button 
          className="preset-btn playbook-analysis"
          onClick={() => sendPresetPrompt('playbook-analysis')}
          disabled={isLoading}
        >
          🎯 Analyze Playbook
        </button>
      </div>

      {/* LOA Chat */}
      <div className="loa-chat">
        <h2>Chat with LOA {isLoading && <span className="loading-spinner">🤔</span>}</h2>
        <div className="chat-messages">
          {chatMessages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender.toLowerCase()}`}>
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="What's on your mind?"
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            disabled={isLoading}
          />
          <button onClick={() => sendMessage()} disabled={isLoading}>
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Current Needs */}
      <div className="needs-section">
        <h2>Current State</h2>
        <div className="needs-grid">
          {needs.map(need => (
            <div key={need.id} className="need-item">
              <div className="need-header">
                <span className="need-name">{need.name}</span>
                <span className="need-value">{need.value}%</span>
              </div>
              <div className="need-bar">
                <div 
                  className="need-fill"
                  style={{ 
                    width: `${need.value}%`,
                    background: getNeedColor(need.value)
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

      {/* Attributes Section */}
      <div className="attributes-section">
        <h2>Attributes & Traits</h2>
        
        <div className="add-attribute">
          <input
            type="text"
            value={newAttribute}
            onChange={(e) => setNewAttribute(e.target.value)}
            placeholder="Add custom attribute..."
            onKeyPress={(e) => e.key === 'Enter' && addAttribute()}
          />
          <button onClick={addAttribute}>Add</button>
        </div>

        <div className="attributes-grid">
          {attributes.map(attribute => (
            <div key={attribute.id} className="attribute-item">
              <div className="attribute-header">
                <div className="attribute-name">{attribute.name}</div>
                <div className="attribute-score">{attribute.score.toFixed(1)}/{attribute.maxScore}</div>
              </div>
              <div className="attribute-description">{attribute.description}</div>
              <div className="attribute-bar">
                <div 
                  className="attribute-fill"
                  style={{ width: `${(attribute.score / attribute.maxScore) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max={attribute.maxScore}
                step="0.1"
                value={attribute.score}
                onChange={(e) => updateAttributeScore(attribute.id, e.target.value)}
                className="attribute-slider"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Curiosities Section */}
      <div className="curiosities-section">
        <h2>Your Curiosities</h2>
        
        <div className="add-curiosity">
          <input
            type="text"
            value={newCuriosity}
            onChange={(e) => setNewCuriosity(e.target.value)}
            placeholder="What are you curious about?"
            onKeyPress={(e) => e.key === 'Enter' && addCuriosity()}
          />
          <button onClick={addCuriosity}>Add</button>
        </div>

        <div className="curiosities-list">
          {curiosities.map(curiosity => (
            <div key={curiosity.id} className="curiosity-item">
              <div className="curiosity-text">{curiosity.text}</div>
              <div className="inspiration-slider">
                <label>Inspiration: {curiosity.inspiration}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={curiosity.inspiration}
                  onChange={(e) => updateInspiration(curiosity.id, parseInt(e.target.value))}
                  style={{ 
                    background: `linear-gradient(to right, ${getInspirationColor(curiosity.inspiration)} 0%, ${getInspirationColor(curiosity.inspiration)} ${curiosity.inspiration}%, #ddd ${curiosity.inspiration}%, #ddd 100%)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks Section */}
      {tasks.length > 0 && (
        <div className="tasks-section">
          <h2>Additional Tasks</h2>
          {tasks.map(task => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => completeTask(task.id)}
              />
              <span>{task.text}</span>
              {task.completed && <span className="xp-gain">+25 XP</span>}
            </div>
          ))}
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>AI Setup</h3>
            <p>Add your Claude API key to unlock intelligent coaching:</p>
            <ol>
              <li>Go to <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
              <li>Create an account (you get $5 free credit)</li>
              <li>Generate an API key</li>
              <li>Paste it below:</li>
            </ol>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ width: '100%', marginBottom: '15px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowApiKeyModal(false)}>Save</button>
              <button onClick={() => setShowApiKeyModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <NostrAuthModal
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};

export default AwakeCore; 
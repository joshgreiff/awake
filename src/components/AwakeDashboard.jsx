import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import nostrAuth from '../services/nostrAuth';
import awakeDB from '../storage/awakeDB';
import NostrAuthModal from './NostrAuthModal';
import './AwakeDashboard.css';

const AwakeDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Core data
  const [curiosities, setCuriosities] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [needs, setNeeds] = useState([]);
  const [dailyPlaybook, setDailyPlaybook] = useState([]);
  const [tasks, setTasks] = useState([]);

  // UI state
  const [apiKey, setApiKey] = useState(localStorage.getItem('claude_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [newCuriosity, setNewCuriosity] = useState('');
  const [editingCuriosity, setEditingCuriosity] = useState(null);

  // Character progress
  const [character, setCharacter] = useState({ level: 1, xp: 0, xpToNext: 100 });
  const [showCelebration, setShowCelebration] = useState(false);

  // Initialize authentication and load user data
  useEffect(() => {
    const initializeApp = async () => {
      setIsLoading(true);
      
      // For now, skip Nostr auth and use a simple approach
      setIsAuthenticated(true);
      setUserId('demo-user');
      setUserInfo({ displayName: 'Awake User', displayId: 'demo...user' });
      
      await loadUserData('demo-user');
      setIsLoading(false);
    };

    initializeApp();
  }, []);

  // Initialize AI service
  useEffect(() => {
    if (apiKey) {
      aiService.initialize(apiKey);
      localStorage.setItem('claude_api_key', apiKey);
    }
  }, [apiKey]);

  // Generate daily playbook when data changes
  useEffect(() => {
    if (isAuthenticated && curiosities.length > 0) {
      generateDailyPlaybook();
    }
  }, [curiosities, attributes, needs, isAuthenticated]);

  // Initialize chat
  useEffect(() => {
    if (isAuthenticated) {
      setChatMessages([
        { sender: 'LOA', text: "Hey! I can see your curiosities and current state. What's calling to you today?" }
      ]);
    }
  }, [isAuthenticated]);

  const loadUserData = async (userId) => {
    // Load from localStorage for now (simpler than IndexedDB for MVP)
    const savedData = localStorage.getItem('awake-user-data');
    
    if (savedData) {
      const data = JSON.parse(savedData);
      setCuriosities(data.curiosities || []);
      setAttributes(data.attributes || []);
      setNeeds(data.needs || []);
    } else {
      // Initialize with defaults
      const defaultData = {
        curiosities: [
          { id: 1, text: "Pokemon TCG competing", inspiration: 70 },
          { id: 2, text: "AnyLingo app creation", inspiration: 85 },
          { id: 3, text: "Wander Studios building/administration", inspiration: 60 },
          { id: 4, text: "Bitcoin education/advocacy", inspiration: 75 }
        ],
        attributes: [
          { id: 1, name: "Creativity", score: 7.8, maxScore: 10 },
          { id: 2, name: "Discipline", score: 6.1, maxScore: 10 },
          { id: 3, name: "Communication", score: 8.5, maxScore: 10 },
          { id: 4, name: "Focus", score: 7.2, maxScore: 10 }
        ],
        needs: [
          { id: 1, name: "Energy", value: 65, color: "#FF6B6B" },
          { id: 2, name: "Focus", value: 72, color: "#4ECDC4" },
          { id: 3, name: "Joy", value: 55, color: "#FFE66D" },
          { id: 4, name: "Connection", value: 40, color: "#A8E6CF" }
        ]
      };
      
      setCuriosities(defaultData.curiosities);
      setAttributes(defaultData.attributes);
      setNeeds(defaultData.needs);
      saveUserData(defaultData);
    }
  };

  const saveUserData = (data) => {
    localStorage.setItem('awake-user-data', JSON.stringify(data || {
      curiosities,
      attributes,
      needs
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
    saveUserData({ curiosities, attributes, needs: updatedNeeds });
  };

  const updateAttribute = (id, score) => {
    const updatedAttributes = attributes.map(attr => 
      attr.id === id ? { ...attr, score: parseFloat(score) } : attr
    );
    setAttributes(updatedAttributes);
    saveUserData({ curiosities, attributes: updatedAttributes, needs });
  };

  const updateInspiration = (id, value) => {
    const updatedCuriosities = curiosities.map(c => 
      c.id === id ? { ...c, inspiration: value } : c
    );
    setCuriosities(updatedCuriosities);
    saveUserData({ curiosities: updatedCuriosities, attributes, needs });
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
      saveUserData({ curiosities: updatedCuriosities, attributes, needs });
      setNewCuriosity('');
    }
  };

  const deleteCuriosity = (id) => {
    const updatedCuriosities = curiosities.filter(c => c.id !== id);
    setCuriosities(updatedCuriosities);
    saveUserData({ curiosities: updatedCuriosities, attributes, needs });
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
      saveUserData({ curiosities: updatedCuriosities, attributes, needs });
      setEditingCuriosity(null);
    }
  };

  const cancelEditingCuriosity = () => {
    setEditingCuriosity(null);
  };

  const sendMessage = async (messageText = currentMessage) => {
    if (!messageText.trim()) return;
    
    const userMessage = { sender: 'You', text: messageText };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setCurrentMessage('');
    setIsChatLoading(true);

    try {
      const userContext = { curiosities, attributes, needs, dailyPlaybook };

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

      setChatMessages([...newMessages, { sender: 'LOA', text: aiResponse }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!" 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const completePlaybookItem = (itemId) => {
    setDailyPlaybook(playbook => playbook.map(item => 
      item.id === itemId ? { ...item, completed: true } : item
    ));
    
    // XP gain
    const xpGain = 35;
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
    const item = dailyPlaybook.find(p => p.id === itemId);
    if (item && item.category) {
      setNeeds(needs => needs.map(need => 
        need.name === item.category ? 
          { ...need, value: Math.min(100, need.value + 10) } : need
      ));
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

  return (
    <div className="awake-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-section">
          <h1>Awake Dashboard</h1>
          <p>User: {userInfo?.displayName} | Level: {character.level} | Tokens: {Math.floor(character.xp / 10)}</p>
        </div>
        <div className="header-actions">
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
        
        {/* Current Needs */}
        <div className="dashboard-card needs-card">
          <h3>Current Needs</h3>
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
          <h3>Traits & Levels</h3>
          <div className="attributes-list">
            {attributes.map(attr => (
              <div key={attr.id} className="attribute-item">
                <div className="attribute-header">
                  <span>{attr.name}</span>
                  <span className="attribute-score">{attr.score.toFixed(1)}/10</span>
                </div>
                <div className="attribute-bar">
                  <div 
                    className="attribute-fill"
                    style={{ width: `${(attr.score / attr.maxScore) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={attr.score}
                  onChange={(e) => updateAttribute(attr.id, e.target.value)}
                  className="attribute-slider"
                />
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
          <h3>Chat with LOA</h3>
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
          <h3>LOA's Daily Playbook</h3>
          <div className="playbook-items">
            {dailyPlaybook.map(item => (
              <div key={item.id} className={`playbook-item ${item.completed ? 'completed' : ''}`}>
                <div className="playbook-content">
                  <div className="playbook-category" style={{ color: item.color }}>
                    {item.category.toUpperCase()}
                  </div>
                  <div className="playbook-suggestion">{item.suggestion}</div>
                </div>
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
            ))}
          </div>
          <button className="refresh-playbook-btn" onClick={generateDailyPlaybook}>
            🔄 Refresh Playbook
          </button>
        </div>

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
    </div>
  );
};

export default AwakeDashboard; 
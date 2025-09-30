import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import './DailyReflectionChat.css';

const DailyReflectionChat = ({ onComplete, userContext, apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reflectionComplete, setReflectionComplete] = useState(false);
  const [reflectionData, setReflectionData] = useState({});

  // Start the reflection with LOA's first message
  useEffect(() => {
    // Initialize AI service with API key
    if (apiKey) {
      aiService.initialize(apiKey);
    }
    
    const startReflection = async () => {
      const welcomeMessage = {
        sender: 'LOA',
        text: "Hey! Let's take a moment to reflect. I'll ask you a few questions to help us create your perfect day. Ready?"
      };
      setMessages([welcomeMessage]);
    };
    
    startReflection();
  }, [apiKey]);

  const sendMessage = async (messageText = currentMessage) => {
    if (!messageText.trim()) return;
    
    const userMessage = { sender: 'You', text: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Create reflection context with vision and current state
      const reflectionContext = {
        ...userContext,
        conversationHistory: newMessages,
        isReflection: true,
        reflectionData: reflectionData
      };

      let aiResponse;
      if (!apiKey) {
        aiResponse = "I need a Claude API key to help with your reflection. Please set it up in settings!";
      } else {
        aiResponse = await aiService.sendReflectionMessage(
          messageText, 
          reflectionContext, 
          newMessages
        );
        
        // Check if LOA indicates reflection is complete
        if (aiResponse.toLowerCase().includes('i have all the info') || 
            aiResponse.toLowerCase().includes('ready to generate')) {
          setReflectionComplete(true);
        }
      }

      setMessages([...newMessages, { sender: 'LOA', text: aiResponse }]);
    } catch (error) {
      console.error('Error in reflection:', error);
      setMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const completeReflection = () => {
    // Save reflection data and generate daily playbook
    const reflectionSummary = {
      timestamp: new Date().toISOString(),
      messages: messages,
      completed: true
    };
    
    onComplete(reflectionSummary);
  };

  const handleClose = () => {
    if (messages.length > 1) {
      // If there's conversation progress, confirm before closing
      if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
        onComplete({
          timestamp: new Date().toISOString(),
          messages: messages,
          completed: false,
          cancelled: true
        });
      }
    } else {
      // If just started, close immediately
      onComplete({
        timestamp: new Date().toISOString(),
        messages: messages,
        completed: false,
        cancelled: true
      });
    }
  };

  return (
    <div className="daily-reflection-modal">
      <div className="reflection-backdrop" onClick={handleClose}></div>
      <div className="reflection-content">
        <div className="reflection-header">
          <button className="reflection-close-btn" onClick={handleClose} title="Close reflection">
            ✕
          </button>
          <h2>Daily Reflection</h2>
          <p className="reflection-subtitle">Let's create your perfect day together</p>
        </div>

        <div className="reflection-chat">
          <div className="reflection-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`reflection-message ${msg.sender.toLowerCase()}`}>
                <div className="message-sender">{msg.sender}</div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="reflection-message loa">
                <div className="message-sender">LOA</div>
                <div className="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="reflection-input">
            <div className="input-row">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Share your thoughts..."
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                disabled={isLoading}
              />
              <button 
                onClick={() => sendMessage()} 
                disabled={isLoading || !currentMessage.trim()}
                className="send-btn"
              >
                Send
              </button>
            </div>
            {reflectionComplete && (
              <button 
                onClick={completeReflection}
                className="complete-reflection-btn"
              >
                ✨ Generate My Daily Playbook
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReflectionChat; 
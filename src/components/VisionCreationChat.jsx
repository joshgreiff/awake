import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import './VisionCreationChat.css';

const VisionCreationChat = ({ onComplete, userContext, apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize AI service with API key
    if (apiKey) {
      aiService.initialize(apiKey);
    }
    
    // Start with welcome message
    const welcomeMessage = {
      sender: 'LOA',
      text: "Hey! I'm excited to help you create your Vision. This is your chance to design the life you want to live - with no limitations. Let's explore what matters most to you - your goals, dreams, the person you're becoming. Ready to begin?"
    };
    setMessages([welcomeMessage]);
  }, [apiKey]);

  const sendMessage = async (messageText = currentMessage) => {
    if (!messageText.trim()) return;
    
    const userMessage = { sender: 'You', text: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      let aiResponse;
      
      if (!apiKey) {
        aiResponse = "I need a Claude API key to help with your vision. Please set it up in settings!";
      } else {
        // Send to AI with vision context
        const contextMessages = newMessages.slice(-6); // Last 3 exchanges
        aiResponse = await aiService.sendVisionMessage(
          messageText,
          {
            ...userContext,
            conversationHistory: contextMessages
          }
        );
      }

      setMessages([...newMessages, { sender: 'LOA', text: aiResponse }]);
    } catch (error) {
      console.error('Error in vision creation:', error);
      setMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVision = async () => {
    setIsLoading(true);
    
    try {
      // Extract the conversation into a vision
      const conversationText = messages
        .filter(m => m.sender === 'You')
        .map(m => m.text)
        .join('\n\n');
      
      let compiledVision = conversationText;
      
      // If we have API key, let AI compile it nicely
      if (apiKey && messages.length > 2) {
        try {
          compiledVision = await aiService.compileVision(
            { conversation: conversationText },
            userContext
          );
        } catch (err) {
          console.error('Failed to compile, using raw conversation:', err);
        }
      }
      
      const visionResult = {
        compiledVision,
        conversationHistory: messages,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      onComplete(visionResult);
    } catch (error) {
      console.error('Error saving vision:', error);
      // Save anyway with just the conversation
      onComplete({
        compiledVision: messages.filter(m => m.sender === 'You').map(m => m.text).join('\n\n'),
        conversationHistory: messages,
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (messages.length > 2) {
      if (window.confirm('Save your vision progress? You can continue editing later.')) {
        saveVision();
      } else {
        onComplete({ cancelled: true });
      }
    } else {
      onComplete({ cancelled: true });
    }
  };

  return (
    <div className="vision-creation-modal">
      <div className="vision-backdrop" onClick={handleClose}></div>
      <div className="vision-content">
        <div className="vision-header">
          <button className="vision-close-btn" onClick={handleClose} title="Save & close">
            ✕
          </button>
          <div className="vision-header-content">
            <h2>Create Your Vision</h2>
            <p className="vision-subtitle">Explore your dreams and goals with LOA</p>
          </div>
        </div>

        <div className="vision-chat">
          <div className="vision-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`vision-message ${msg.sender.toLowerCase()}`}>
                <div className="message-sender">{msg.sender}</div>
                <div className="message-text">{msg.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="vision-message loa">
                <div className="message-sender">LOA</div>
                <div className="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
          </div>

          <div className="vision-input">
            <div className="vision-input-row">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Share your thoughts..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading}
                rows={3}
              />
              <div className="vision-button-group">
                <button 
                  onClick={() => sendMessage()} 
                  disabled={isLoading || !currentMessage.trim()}
                  className="vision-send-btn"
                >
                  Send
                </button>
                {messages.length > 2 && (
                  <button 
                    onClick={saveVision}
                    disabled={isLoading}
                    className="vision-save-btn"
                  >
                    ✅ Save Vision
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionCreationChat; 
import React, { useState, useEffect, useRef } from 'react';
import aiService from '../services/aiService';
import './DailyReflectionChat.css';

const DailyReflectionChat = ({ onComplete, userContext, apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reflectionComplete, setReflectionComplete] = useState(false);
  const [reflectionData, setReflectionData] = useState({});
  const inputRef = useRef(null);
  const [questionCount, setQuestionCount] = useState(0);

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
      
      // Increment question count when LOA asks a question
      if (aiResponse.includes('?')) {
        setQuestionCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error in reflection:', error);
      setMessages([...newMessages, { 
        sender: 'LOA', 
        text: "I'm having trouble connecting right now. Let me know if you'd like to try again!" 
      }]);
    } finally {
      setIsLoading(false);
      // Auto-focus input after LOA responds
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const completeReflection = () => {
    // Add a completion message before closing
    setMessages(prev => [...prev, {
      sender: 'LOA',
      text: '🎉 You completed your daily reflection! Great job taking time for yourself. Generating your personalized playbook now...'
    }]);
    
    // Save reflection data and generate daily playbook
    setTimeout(() => {
      const reflectionSummary = {
        timestamp: new Date().toISOString(),
        messages: messages,
        completed: true
      };
      
      onComplete(reflectionSummary);
    }, 1500); // Small delay to show completion message
  };

  const handleClose = () => {
    // Save progress regardless of how far the user got
    // This allows them to resume or at least keeps their data
    onComplete({
      timestamp: new Date().toISOString(),
      messages: messages,
      completed: false,
      cancelled: true,
      partialProgress: messages.length > 1 // Flag to indicate there was some progress
    });
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
          <p className="reflection-subtitle">
            {!reflectionComplete && questionCount > 0 && questionCount < 5 && (
              <span className="progress-indicator">Question {questionCount} of ~4-5</span>
            )}
            {reflectionComplete && <span className="progress-complete">✓ Complete</span>}
            {questionCount === 0 && "Let's create your perfect day together"}
          </p>
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
                ref={inputRef}
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
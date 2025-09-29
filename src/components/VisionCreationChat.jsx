import React, { useState, useEffect } from 'react';
import aiService from '../services/aiService';
import './VisionCreationChat.css';

const VisionCreationChat = ({ onComplete, userContext, apiKey }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visionData, setVisionData] = useState({
    materialDesires: [],
    lifePurpose: '',
    lifePurposeShort: '',
    identity: '',
    identitySubtitle: '',
    bucketList: [],
    yearlyGoal: '',
    monthlyGoal: '',
    perfectDay: ''
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Your Vision',
      prompt: "Hey! I'm excited to help you create your Master Vision. This is your chance to design the life you want to live - with no limitations. We'll go through 9 steps together to craft a powerful vision of your future self. Ready to begin?"
    },
    {
      id: 'materialDesires',
      title: 'Step 1: Material Desires',
      prompt: "Let's start with your material desires for the next 6-12 months. If there were no limitations in your imagination and therefore no limitations in reality, what would you want? Paint a clear picture. Be specific and include dates. Don't hold back!\n\nFor example: 'A Tesla Model 3 by June 2025' or 'A beachfront condo in Miami by December 2025'.\n\nWhat material desires call to you?"
    },
    {
      id: 'lifePurpose',
      title: 'Step 2: Your Life Purpose',
      prompt: "Now, let's get to what really matters. How do you intend to make the world a better place? If there was only ONE thing you could do to improve the world, what would it be?\n\nWrite in third person, as if you're writing a Forbes article about yourself. For example: '{Your name} is building a transformational mindset app that helps millions of people improve their lives.'\n\nIf you're not sure yet, you can say: '{Your name} is becoming increasingly clear about their purpose every day.'\n\nWhat's your purpose?"
    },
    {
      id: 'lifePurposeShort',
      title: 'Step 3: Purpose (Simplified)',
      prompt: "Beautiful! Now let's simplify that. Rewrite your purpose in 5 words or less. Make it massive - something to strive towards.\n\nWhat's your purpose in 5 words?"
    },
    {
      id: 'identity',
      title: 'Step 4: Your New Identity',
      prompt: "Who is the future version of you that accomplishes these goals with ease? Describe this super-powered version in detail:\n\n• What values and principles do they live by?\n• What habits and routines do they follow?\n• How do they make money?\n• What's their relationship life like?\n• What are their personal standards?\n\nYou can describe a role model who embodies these qualities, then replace their name with yours. Write in third person.\n\nWho are you becoming?"
    },
    {
      id: 'identitySubtitle',
      title: 'Step 5: Identity Subtitle',
      prompt: "Perfect! Now distill that into one powerful sentence. What would be the subtitle of your Forbes article?\n\nFor example: '{Your name} is a creative genius entrepreneur who changes millions of people's lives.'\n\nWhat's your one-sentence identity?"
    },
    {
      id: 'bucketList',
      title: 'Step 6: Your Bucket List',
      prompt: "Imagine you have $100 million in the bank. What does the super-powered version of you do regularly? What are you planning to do in the near future?\n\nList experiences and goals with timeframes:\n• 1 month from now\n• 3 months from now\n• 6 months from now\n• 1 year from now\n• Even up to 5 years!\n\nBe specific and include dates.\n\nWhat's on your bucket list?"
    },
    {
      id: 'yearlyGoal',
      title: 'Step 7: This Year\'s Focus',
      prompt: "What's the ONE thing that, if accomplished this year, would make the entire year a success?\n\nMake it measurable with an end date. At the end of the year, you should be able to answer 'yes' or 'no' - did I do it?\n\nUse this format: 'By December 31, 2025, {your name} is [achieving specific result].'\n\nFor example: 'By December 31, 2025, Sarah is generating $10,000 per month from her creative business.'\n\nWhat's your key focus this year?"
    },
    {
      id: 'monthlyGoal',
      title: 'Step 8: This Month\'s Focus',
      prompt: "Almost there! What's the ONE focus this month that would make the entire month a success?\n\nMake it clear, measurable, and specific. It should connect to your yearly goal.\n\nUse this format: 'By the end of this month, {your name} is [achieving specific milestone].'\n\nWhat's your focus this month?"
    },
    {
      id: 'perfectDay',
      title: 'Step 9: Your Perfect Day',
      prompt: "Final step! Describe a day in the life of this new, improved version of you. What does your perfect day look like from morning to night?\n\nDesign your lifestyle so that if you follow these habits and routines consistently, you'll accomplish your 6-12 month goals with ease.\n\nRemember to write in third person.\n\nWhat does your perfect day look like?"
    }
  ];

  useEffect(() => {
    // Start with welcome message
    const welcomeMessage = {
      sender: 'LOA',
      text: steps[0].prompt,
      step: 0
    };
    setMessages([welcomeMessage]);
  }, []);

  const sendMessage = async (messageText = currentMessage) => {
    if (!messageText.trim()) return;
    
    const userMessage = { sender: 'You', text: messageText, step: currentStep };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Store user's response in visionData
      updateVisionData(steps[currentStep].id, messageText);

      let aiResponse;
      
      if (!apiKey) {
        aiResponse = "I need a Claude API key to help with your vision. Please set it up in settings!";
      } else {
        // Check if user is ready to move to next step or needs more guidance
        const contextMessages = newMessages.slice(-6); // Last 3 exchanges
        aiResponse = await aiService.sendVisionMessage(
          messageText,
          {
            ...userContext,
            currentStep: steps[currentStep],
            visionData,
            conversationHistory: contextMessages
          }
        );
      }

      // Check if response indicates we should move to next step
      const shouldAdvance = 
        aiResponse.toLowerCase().includes("let's move") ||
        aiResponse.toLowerCase().includes("next step") ||
        aiResponse.toLowerCase().includes("ready for");

      const loaMessage = { 
        sender: 'LOA', 
        text: aiResponse,
        step: currentStep
      };
      
      setMessages([...newMessages, loaMessage]);

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

  const updateVisionData = (stepId, response) => {
    setVisionData(prev => ({
      ...prev,
      [stepId]: response
    }));
  };

  const advanceStep = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      const nextMessage = {
        sender: 'LOA',
        text: steps[nextStep].prompt,
        step: nextStep
      };
      
      setMessages(prev => [...prev, nextMessage]);
    } else {
      // Vision complete!
      completeVision();
    }
  };

  const goBackStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setMessages(prev => [...prev, {
        sender: 'LOA',
        text: `Let's revisit: ${steps[currentStep - 1].prompt}`,
        step: currentStep - 1
      }]);
    }
  };

  const completeVision = async () => {
    setIsLoading(true);
    
    try {
      // Generate final vision with "more and more" language using AI
      let compiledVision = '';
      
      if (apiKey) {
        compiledVision = await aiService.compileVision(visionData, userContext);
      } else {
        // Fallback: basic compilation without AI
        compiledVision = generateBasicVision(visionData);
      }
      
      const finalVision = {
        ...visionData,
        compiledVision,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      onComplete(finalVision);
    } catch (error) {
      console.error('Error compiling vision:', error);
      // Still save even if compilation fails
      onComplete({
        ...visionData,
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateBasicVision = (data) => {
    // Basic fallback if AI isn't available
    return `${data.lifePurpose}\n\n${data.identity}\n\n${data.perfectDay}`;
  };

  const handleClose = () => {
    if (messages.length > 2) {
      if (window.confirm('Save your progress? You can return to finish your vision later.')) {
        onComplete({
          ...visionData,
          draft: true,
          currentStep,
          lastUpdated: new Date().toISOString()
        });
      } else {
        onComplete({ cancelled: true });
      }
    } else {
      onComplete({ cancelled: true });
    }
  };

  const progress = currentStep === 0 ? 0 : ((currentStep) / (steps.length - 1)) * 100;

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
            {currentStep > 0 && (
              <p className="vision-step-title">{steps[currentStep].title}</p>
            )}
          </div>
          {currentStep > 0 && (
            <div className="vision-progress">
              <div className="vision-progress-bar">
                <div 
                  className="vision-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="vision-progress-text">
                Step {currentStep} of {steps.length - 1}
              </span>
            </div>
          )}
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
            <div className="vision-controls">
              {currentStep > 0 && currentStep < steps.length - 1 && (
                <button 
                  onClick={goBackStep}
                  className="vision-back-btn"
                  disabled={isLoading}
                >
                  ← Back
                </button>
              )}
              {currentStep > 0 && (
                <button 
                  onClick={advanceStep}
                  className="vision-next-btn"
                  disabled={isLoading}
                >
                  {currentStep === steps.length - 1 ? '✨ Complete Vision' : 'Next Step →'}
                </button>
              )}
            </div>
            
            <div className="vision-input-row">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder={currentStep === 0 ? "Type 'yes' to begin your vision journey..." : "Share your thoughts..."}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading}
                rows={3}
              />
              <button 
                onClick={() => sendMessage()} 
                disabled={isLoading || !currentMessage.trim()}
                className="vision-send-btn"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionCreationChat; 
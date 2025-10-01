import React, { useState } from 'react';
import './VisionCreationChat.css';

const VisionCreationChat = ({ onComplete, userContext }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visionSections, setVisionSections] = useState({
    career: '',
    health: '',
    relationships: '',
    personal: '',
    financial: '',
    creative: ''
  });

  const steps = [
    {
      title: 'Career & Professional Life',
      key: 'career',
      prompt: 'Describe your ideal professional life. What are you working on? What skills are you mastering? How do you spend your work time?',
      placeholder: 'Example: "Josh is becoming more and more skilled as a developer. He builds products that help thousands of people..."'
    },
    {
      title: 'Health & Wellness',
      key: 'health',
      prompt: 'What does your ideal physical and mental health look like? How do you feel in your body?',
      placeholder: 'Example: "Josh is becoming more and more fit and energized. He exercises regularly, eats nourishing foods..."'
    },
    {
      title: 'Relationships & Connection',
      key: 'relationships',
      prompt: 'Describe your ideal relationships. Who are you connecting with? How do you show up for others?',
      placeholder: 'Example: "Josh is becoming more and more connected to the people he loves. He makes time for..."'
    },
    {
      title: 'Personal Growth',
      key: 'personal',
      prompt: 'What personal qualities are you developing? What kind of person are you becoming?',
      placeholder: 'Example: "Josh is becoming more and more confident and self-assured. He trusts his instincts..."'
    },
    {
      title: 'Financial Abundance',
      key: 'financial',
      prompt: 'What does financial freedom look like for you? Be specific about lifestyle, not just numbers.',
      placeholder: 'Example: "Josh is becoming more and more financially abundant. His fridge is always stocked with..."'
    },
    {
      title: 'Creative Expression',
      key: 'creative',
      prompt: 'How are you expressing your creativity? What are you building or creating?',
      placeholder: 'Example: "Josh is becoming more and more creative and innovative. He brings ideas to life through..."'
    }
  ];

  const currentStepData = steps[currentStep];

  const handleTextChange = (value) => {
    setVisionSections({
      ...visionSections,
      [currentStepData.key]: value
    });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    // Compile all sections into one vision
    const compiledVision = Object.entries(visionSections)
      .filter(([_, text]) => text.trim())
      .map(([_, text]) => text.trim())
      .join('\n\n');

    onComplete({
      compiledVision,
      sections: visionSections,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  };

  const handleClose = () => {
    const hasContent = Object.values(visionSections).some(text => text.trim());
    
    if (hasContent) {
      if (window.confirm('Save your vision before closing?')) {
        handleSave();
      } else {
        onComplete({ cancelled: true });
      }
    } else {
      onComplete({ cancelled: true });
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const hasAnyContent = Object.values(visionSections).some(text => text.trim());

  return (
    <div className="vision-creation-modal">
      <div className="vision-backdrop" onClick={handleClose}></div>
      <div className="vision-content">
        <div className="vision-header">
          <button className="vision-close-btn" onClick={handleClose}>×</button>
          <div className="vision-header-content">
            <h2>Create Your Vision</h2>
            <div className="vision-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="progress-text">Step {currentStep + 1} of {steps.length}</span>
            </div>
          </div>
        </div>

        <div className="vision-form">
          <div className="step-header">
            <h3>{currentStepData.title}</h3>
            <p className="step-prompt">{currentStepData.prompt}</p>
            <div className="tip-box">
              💡 <strong>Tip:</strong> Write in third person, present tense. Use "more and more" language. 
              (e.g., "[Your name] is becoming more and more...")
            </div>
          </div>

          <div className="vision-textarea-container">
            <textarea
              value={visionSections[currentStepData.key]}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={currentStepData.placeholder}
              rows={8}
              autoFocus
            />
            <div className="char-count">
              {visionSections[currentStepData.key].length} characters
            </div>
          </div>

          <div className="vision-navigation">
            <button 
              className="nav-btn secondary"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              ← Back
            </button>
            
            <div className="nav-center">
              <button 
                className="skip-btn"
                onClick={handleNext}
                disabled={currentStep === steps.length - 1}
              >
                Skip this section
              </button>
            </div>

            {currentStep < steps.length - 1 ? (
              <button 
                className="nav-btn primary"
                onClick={handleNext}
              >
                Next →
              </button>
            ) : (
              <button 
                className="nav-btn primary save-btn"
                onClick={handleSave}
                disabled={!hasAnyContent}
              >
                ✓ Save Vision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionCreationChat; 
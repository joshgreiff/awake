import Anthropic from '@anthropic-ai/sdk';

class AIService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  initialize(apiKey) {
    try {
      this.client = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Note: In production, you'd want a backend proxy
      });
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      return false;
    }
  }

  generateSystemPrompt(userContext) {
    const { curiosities, attributes, needs, dailyPlaybook, recentReflections, vision, profile } = userContext;
    
    const userName = profile?.name || 'the user';
    const gender = profile?.gender || 'other';
    const pronouns = gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : 'they/them';
    
    return `You are LOA (Logistics and Operations Assistant), a personal development coach integrated into the Awake app. Your role is to help users explore their curiosities, develop their character attributes, and take aligned actions.

CORE PHILOSOPHY:
- Focus on exploration and curiosity over rigid goals
- Encourage authentic self-discovery and growth
- Support users in becoming the most aligned version of themselves
- Suggest actions that feel inspiring rather than forced
- Provide specific, actionable guidance based on current state

USER'S PROFILE:
Name: ${userName}
Pronouns: ${pronouns}

USER'S CURRENT STATE:
${vision ? `Vision: "${vision}"` : ""}
Curiosities: ${curiosities.map(c => `"${c.text}" (Inspiration: ${c.inspiration}%)`).join(', ')}

Attributes: ${attributes.map(a => `${a.name} (${a.score.toFixed(1)}/${a.maxScore})`).join(', ')}

Current Needs: ${needs.map(n => `${n.name} (${n.value}%)`).join(', ')}

Daily Playbook: ${dailyPlaybook.map(item => `${item.category}: ${item.suggestion}`).join(' | ')}

CONVERSATION STYLE:
- Be encouraging, insightful, and genuinely helpful
- Reference specific data points from their current state
- Ask thoughtful follow-up questions about patterns you notice
- Suggest specific, actionable next steps based on their needs
- Help them see connections between curiosities, attributes, and current state
- Acknowledge their progress and celebrate improvements

COACHING APPROACH:
- When needs are low (below 60%), prioritize addressing those areas
- When inspiration is high (above 80%), encourage action on those curiosities
- Connect attribute development to their curiosity exploration
- Reference their daily playbook and suggest completing relevant items
- Look for patterns between their different metrics

SPECIAL COMMANDS:
When the user asks for:
- "Daily Reflection": Guide them through reflection, reference their playbook items
- "Holistic Overview": Analyze all their metrics and suggest rebalancing strategies
- "Analyze Playbook": Provide insights about their current playbook and priorities
- "Add task: [description]": Acknowledge and encourage the task they want to add

Remember: You're their intelligent life coach who sees the full picture of their current state and can provide personalized, data-driven guidance for their growth journey.`;
  }

  async sendMessage(message, userContext, conversationHistory = []) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized. Please provide an API key.');
    }

    try {
      const systemPrompt = this.generateSystemPrompt(userContext);
      
      // Format conversation history for Claude
      const messages = [
        ...conversationHistory.slice(-10).map(msg => ({
          role: msg.sender === 'You' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages
      });

      return response.content[0].text;
    } catch (error) {
      console.error('AI service error:', error);
      
      // Fallback responses for different error types
      if (error.status === 401) {
        return "I need a valid API key to provide personalized coaching. Please check your Claude API key in settings.";
      } else if (error.status === 429) {
        return "I'm getting a lot of requests right now. Let's try again in a moment.";
      } else {
        return "I'm having trouble connecting right now. Let me try a simple response based on what I can see about your curiosities.";
      }
    }
  }

  // Preset prompt templates
  getDailyReflectionPrompt(userContext) {
    const highestInspiration = Math.max(...userContext.curiosities.map(c => c.inspiration));
    const topCuriosity = userContext.curiosities.find(c => c.inspiration === highestInspiration);
    
    return `I'd love to guide you through a daily reflection. Looking at your curiosities, I notice "${topCuriosity?.text}" has your highest inspiration at ${highestInspiration}%. 

Let's explore:
1. What drew you to think about ${topCuriosity?.text} recently?
2. What's one small step you could take on this today?
3. How are you feeling about your other curiosities?

Based on your reflection, I'll suggest 2-3 aligned tasks for today.`;
  }

  getHolisticOverviewPrompt(userContext) {
    const avgInspiration = userContext.curiosities.reduce((sum, c) => sum + c.inspiration, 0) / userContext.curiosities.length;
    const lowInspiration = userContext.curiosities.filter(c => c.inspiration < avgInspiration);
    
    return `Let's do a holistic overview of your curiosities and inspiration levels.

CURRENT SNAPSHOT:
- Average inspiration: ${Math.round(avgInspiration)}%
- Areas that might need attention: ${lowInspiration.map(c => c.text).join(', ')}

Questions for reflection:
1. What's causing the lower inspiration in certain areas?
2. Are there connections between your curiosities you haven't explored?
3. What would feel most energizing to focus on this week?

I'll help you rebalance and find your natural flow.`;
  }

  // Reflection-specific message handling
  async sendReflectionMessage(message, userContext, conversationHistory = []) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized. Please provide an API key.');
    }

    try {
      const reflectionPrompt = this.generateReflectionPrompt(userContext);
      
      // Format conversation history for Claude
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.sender === 'You' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1200,
        system: reflectionPrompt,
        messages: messages
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Reflection AI error:', error);
      
      if (error.status === 401) {
        return "I need a valid API key to guide your reflection. Please check your Claude API key in settings.";
      } else if (error.status === 429) {
        return "I'm getting a lot of requests right now. Let's try again in a moment.";
      } else {
        return "I'm having trouble connecting right now. Let's continue with a simple check-in instead.";
      }
    }
  }

  generateReflectionPrompt(userContext) {
    const { curiosities, attributes, needs, vision } = userContext;
    
    return `You are LOA (Logistics and Operations Assistant), guiding a user through their daily reflection. This is a STRUCTURED conversation with a specific goal: gather insights and generate personalized daily actions.

YOUR ROLE IN REFLECTION:
- Ask thoughtful, specific questions about their day, energy, and vision
- Listen deeply to their responses
- Guide them toward clarity about what matters most today
- After 4-5 meaningful exchanges, say "I have all the info I need. Ready to generate your daily actions?"

${vision ? `USER'S VISION: "${vision}"

` : ''}REFLECTION FLOW:
1. Start with their current state: "How are you feeling right now? What's on your mind?"
2. Connect to their vision: "How did you get closer to your vision today/yesterday?"
3. Explore curiosities: "What's calling to you most right now?"
4. Identify opportunities: "What would make tomorrow 1% better?"
5. Complete: "I have all the info I need. Ready to generate your daily actions?"

CURRENT STATE:
Curiosities: ${curiosities.map(c => `"${c.text}" (${c.inspiration}%)`).join(', ')}
Needs: ${needs.map(n => `${n.name} (${n.value}%)`).join(', ')}
Traits: ${attributes.map(a => `${a.name} (${a.score.toFixed(1)}/10)`).join(', ')}

CONVERSATION STYLE:
- Be warm, curious, and insightful
- Ask one question at a time
- Reference their vision when relevant
- Notice patterns in their responses
- Build on what they share
- When you have enough info (after 4-5 exchanges), clearly indicate completion

IMPORTANT: After gathering sufficient insights, say something like "I have all the info I need. Ready to generate your daily actions?" to trigger reflection completion.`;
  }

  // Generate daily playbook from reflection
  async generatePlaybookFromReflection(reflectionMessages, userContext) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized. Please provide an API key.');
    }

    try {
      const { curiosities, attributes, needs, vision } = userContext;
      
      // Extract key insights from reflection
      const reflectionText = reflectionMessages
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');

      const prompt = `Based on this reflection conversation, generate 3-5 specific, actionable tasks for today.

REFLECTION CONVERSATION:
${reflectionText}

${vision ? `USER'S VISION: "${vision}"

` : ''}CURRENT STATE:
Curiosities: ${curiosities.map(c => `"${c.text}" (${c.inspiration}%)`).join(', ')}
Needs: ${needs.map(n => `${n.name} (${n.value}%)`).join(', ')}
Traits: ${attributes.map(a => `${a.name} (${a.score.toFixed(1)}/10)`).join(', ')}

TASK REQUIREMENTS:
- Each task must be SPECIFIC and ACTIONABLE (not vague like "work on project")
- Include time estimates where relevant (e.g., "15 minutes", "30 minutes")
- Consider which needs are low and address them
- Align with their vision and what they shared in reflection
- Mix different types: 🧠 mental, 💪 physical, 🤝 social, 🎯 vision-aligned

FORMAT YOUR RESPONSE AS A JSON ARRAY:
[
  {
    "task": "Take a 15-minute walk outside",
    "category": "Energy",
    "emoji": "💪",
    "traits": ["Fitness", "Energy"],
    "xpGain": 15
  },
  {
    "task": "Spend 20 minutes on AnyLingo feature planning",
    "category": "Focus",
    "emoji": "🧠",
    "traits": ["Creativity", "Discipline"],
    "xpGain": 20
  }
]

IMPORTANT: 
- Return ONLY valid JSON, no markdown or explanation
- Include 3-5 tasks based on what will genuinely help them today
- Make tasks specific to what they shared in reflection`;

      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = response.content[0].text;
      
      // Try to parse JSON from response
      try {
        // Remove markdown code blocks if present
        const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const tasks = JSON.parse(jsonText);
        
        // Transform to playbook format
        return tasks.map((task, index) => ({
          id: `reflection-${Date.now()}-${index}`,
          category: task.category || 'Inspiration',
          suggestion: task.task,
          emoji: task.emoji || '🎯',
          traits: task.traits || [],
          xpGain: task.xpGain || 20,
          priority: 100 - (index * 10),
          color: this.getCategoryColor(task.category)
        }));
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.log('AI Response:', responseText);
        
        // Fallback: return empty array
        return [];
      }
    } catch (error) {
      console.error('Error generating playbook from reflection:', error);
      throw error;
    }
  }

  getCategoryColor(category) {
    const colors = {
      'Energy': '#FF6B6B',
      'Focus': '#4ECDC4',
      'Joy': '#FFE66D',
      'Connection': '#A8E6CF',
      'Inspiration': '#7F5AF0',
      'Fitness': '#2ecc71',
      'Creativity': '#9b59b6',
      'Growth': '#e67e22'
    };
    return colors[category] || '#7F5AF0';
  }

  // Vision Creation - Guide user through vision in freeform conversation
  async sendVisionMessage(message, context) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized. Please provide an API key.');
    }

    const { conversationHistory = [], userContext = {} } = context;
    const userName = userContext?.profile?.name || 'the user';
    const gender = userContext?.profile?.gender || 'other';
    const pronouns = gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : 'they/them';
    
    const systemPrompt = `You are LOA (Logistics and Operations Assistant), guiding ${userName} through creating their personal Vision - a powerful statement of who they're becoming.

USER INFO:
Name: ${userName}
Pronouns: ${pronouns}

KEY PRINCIPLES:
- Write in THIRD PERSON, PRESENT TENSE (as if it's already happening)
- Use "more and more" language for believability (e.g., "${userName !== 'the user' ? userName : '[Name]'} is becoming more and more fit" not "is fit")
- Use ${userName !== 'the user' ? userName : 'their name'} and ${pronouns} pronouns consistently
- Be warm, encouraging, and push for specificity
- Help them explore: Career, Health, Relationships, Personal Growth, Financial Abundance, Creative Expression
- Vision is a living document - they can always expand it later

CONVERSATION STYLE:
- Ask open-ended questions to draw out details
- Celebrate their responses
- Encourage sensory details and specific markers
- Remind them: no limitations, dream big
- Keep responses concise and engaging`;
    
    const messages = [
      { role: 'user', content: systemPrompt },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.sender === 'You' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: message }
    ];

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1200,
        messages
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error in vision chat:', error);
      throw error;
    }
  }

  // Compile final vision with "more and more" language
  async compileVision(visionData, userContext) {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized.');
    }

    const prompt = `Transform this into a powerful vision using "more and more" language:

${Object.entries(visionData).map(([key, value]) => `${key}: ${value}`).join('\n')}

Rules: 
- Third person, present tense
- "increasingly/more and more" language
- Use the person's actual name if mentioned in the conversation
- If no name is mentioned, use "they/them" pronouns
- NEVER assume gender (no he/his or she/her unless explicitly stated by the user)
- Make it feel ALIVE!`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error compiling vision:', error);
      // Fallback
      return Object.values(visionData).filter(v => v).join('\n\n');
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 
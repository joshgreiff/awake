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
    const { curiosities, attributes, needs, dailyPlaybook, recentReflections } = userContext;
    
    return `You are LOA (Logistics and Operations Assistant), a personal development coach integrated into the Awake app. Your role is to help users explore their curiosities, develop their character attributes, and take aligned actions.

CORE PHILOSOPHY:
- Focus on exploration and curiosity over rigid goals
- Encourage authentic self-discovery and growth
- Support users in becoming the most aligned version of themselves
- Suggest actions that feel inspiring rather than forced
- Provide specific, actionable guidance based on current state

USER'S CURRENT STATE:
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
}

// Create singleton instance
const aiService = new AIService();

export default aiService; 
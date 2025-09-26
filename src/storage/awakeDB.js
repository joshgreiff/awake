import Dexie from 'dexie';

class AwakeDB extends Dexie {
  constructor() {
    super('AwakeDatabase');
    
    // Define the database schema
    this.version(1).stores({
      // User identity and profile
      users: 'pubkey, displayName, createdAt, settings',
      
      // Core data
      curiosities: '++id, title, inspiration, createdAt, updatedAt, userId',
      attributes: '++id, name, score, maxScore, description, createdAt, updatedAt, userId',
      needs: '++id, name, value, color, createdAt, updatedAt, userId',
      
      // Daily playbooks and tasks
      playbooks: '++id, date, items, completed, createdAt, userId',
      tasks: '++id, text, completed, source, xpGained, completedAt, createdAt, userId',
      
      // Chat and reflections
      chatThreads: '++id, title, createdAt, updatedAt, userId',
      chatMessages: '++id, threadId, sender, text, timestamp, userId',
      reflections: '++id, content, curiosityIds, date, sentiment, createdAt, userId',
      
      // Progress tracking
      characterProgress: '++id, level, xp, xpToNext, date, userId',
      attributeHistory: '++id, attributeId, score, date, userId',
      needsHistory: '++id, needId, value, date, userId',
      
      // Settings and preferences
      settings: 'key, value, userId',
      subscriptions: 'userId, tier, status, expiresAt, createdAt'
    });

    // Set up hooks for automatic userId assignment
    this.users.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
    });

    this.curiosities.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
      obj.updatedAt = Date.now();
    });

    this.attributes.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
      obj.updatedAt = Date.now();
    });
  }

  // Initialize database for a specific user
  async initializeUser(pubkey, profile = {}) {
    try {
      await this.users.put({
        pubkey,
        displayName: profile.displayName || 'Awake User',
        createdAt: profile.createdAt || Date.now(),
        settings: profile.settings || {}
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize user:', error);
      return false;
    }
  }

  // Curiosities management
  async addCuriosity(curiosity, userId) {
    return await this.curiosities.add({
      ...curiosity,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  async getCuriosities(userId) {
    return await this.curiosities.where('userId').equals(userId).toArray();
  }

  async updateCuriosity(id, updates, userId) {
    return await this.curiosities.where('id').equals(id).and(item => item.userId === userId).modify({
      ...updates,
      updatedAt: Date.now()
    });
  }

  async deleteCuriosity(id, userId) {
    return await this.curiosities.where('id').equals(id).and(item => item.userId === userId).delete();
  }

  // Attributes management
  async addAttribute(attribute, userId) {
    return await this.attributes.add({
      ...attribute,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  async getAttributes(userId) {
    return await this.attributes.where('userId').equals(userId).toArray();
  }

  async updateAttribute(id, updates, userId) {
    const result = await this.attributes.where('id').equals(id).and(item => item.userId === userId).modify({
      ...updates,
      updatedAt: Date.now()
    });

    // Track attribute history
    if (updates.score !== undefined) {
      await this.attributeHistory.add({
        attributeId: id,
        score: updates.score,
        date: new Date().toISOString().slice(0, 10),
        userId
      });
    }

    return result;
  }

  // Needs management
  async addNeed(need, userId) {
    return await this.needs.add({
      ...need,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  async getNeeds(userId) {
    return await this.needs.where('userId').equals(userId).toArray();
  }

  async updateNeed(id, updates, userId) {
    const result = await this.needs.where('id').equals(id).and(item => item.userId === userId).modify({
      ...updates,
      updatedAt: Date.now()
    });

    // Track needs history
    if (updates.value !== undefined) {
      await this.needsHistory.add({
        needId: id,
        value: updates.value,
        date: new Date().toISOString().slice(0, 10),
        userId
      });
    }

    return result;
  }

  // Daily playbook management
  async savePlaybook(playbook, userId) {
    const today = new Date().toISOString().slice(0, 10);
    
    // Check if playbook exists for today
    const existing = await this.playbooks.where('date').equals(today).and(item => item.userId === userId).first();
    
    if (existing) {
      return await this.playbooks.update(existing.id, {
        items: playbook,
        updatedAt: Date.now()
      });
    } else {
      return await this.playbooks.add({
        date: today,
        items: playbook,
        completed: [],
        createdAt: Date.now(),
        userId
      });
    }
  }

  async getTodaysPlaybook(userId) {
    const today = new Date().toISOString().slice(0, 10);
    return await this.playbooks.where('date').equals(today).and(item => item.userId === userId).first();
  }

  async getPlaybookHistory(userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().slice(0, 10);
    
    return await this.playbooks.where('date').above(cutoff).and(item => item.userId === userId).reverse().sortBy('date');
  }

  // Chat management
  async createChatThread(title, userId) {
    return await this.chatThreads.add({
      title: title || 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId
    });
  }

  async addChatMessage(threadId, message, userId) {
    return await this.chatMessages.add({
      threadId,
      sender: message.sender,
      text: message.text,
      timestamp: Date.now(),
      userId
    });
  }

  async getChatThread(threadId, userId) {
    const thread = await this.chatThreads.where('id').equals(threadId).and(item => item.userId === userId).first();
    const messages = await this.chatMessages.where('threadId').equals(threadId).and(item => item.userId === userId).sortBy('timestamp');
    
    return { ...thread, messages };
  }

  async getChatThreads(userId) {
    return await this.chatThreads.where('userId').equals(userId).reverse().sortBy('updatedAt');
  }

  // Reflections management
  async addReflection(reflection, userId) {
    return await this.reflections.add({
      ...reflection,
      createdAt: Date.now(),
      userId
    });
  }

  async getReflections(userId, limit = 50) {
    return await this.reflections.where('userId').equals(userId).reverse().sortBy('createdAt').limit(limit);
  }

  async getReflectionsByCuriosity(curiosityId, userId) {
    return await this.reflections.where('userId').equals(userId).and(item => 
      item.curiosityIds && item.curiosityIds.includes(curiosityId)
    ).sortBy('createdAt');
  }

  // Character progress tracking
  async updateCharacterProgress(progress, userId) {
    const today = new Date().toISOString().slice(0, 10);
    
    return await this.characterProgress.put({
      ...progress,
      date: today,
      userId
    });
  }

  async getCharacterProgress(userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().slice(0, 10);
    
    return await this.characterProgress.where('date').above(cutoff).and(item => item.userId === userId).sortBy('date');
  }

  // Analytics and insights
  async getAttributeHistory(attributeId, userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().slice(0, 10);
    
    return await this.attributeHistory.where('attributeId').equals(attributeId)
      .and(item => item.userId === userId && item.date > cutoff)
      .sortBy('date');
  }

  async getNeedsHistory(needId, userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoff = cutoffDate.toISOString().slice(0, 10);
    
    return await this.needsHistory.where('needId').equals(needId)
      .and(item => item.userId === userId && item.date > cutoff)
      .sortBy('date');
  }

  // Data export for backup
  async exportUserData(userId) {
    try {
      const userData = {
        user: await this.users.where('pubkey').equals(userId).first(),
        curiosities: await this.getCuriosities(userId),
        attributes: await this.getAttributes(userId),
        needs: await this.getNeeds(userId),
        playbooks: await this.getPlaybookHistory(userId, 365), // Full year
        chatThreads: await this.getChatThreads(userId),
        reflections: await this.getReflections(userId, 1000), // Large limit
        characterProgress: await this.getCharacterProgress(userId, 365),
        settings: await this.settings.where('userId').equals(userId).toArray(),
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      // Also get chat messages for all threads
      for (let thread of userData.chatThreads) {
        thread.messages = await this.chatMessages.where('threadId').equals(thread.id).and(item => item.userId === userId).sortBy('timestamp');
      }

      return userData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  // Data import from backup
  async importUserData(userData, userId) {
    try {
      await this.transaction('rw', this.users, this.curiosities, this.attributes, this.needs, 
        this.playbooks, this.chatThreads, this.chatMessages, this.reflections, 
        this.characterProgress, this.settings, async () => {
        
        // Clear existing data
        await this.clearUserData(userId);
        
        // Import all data
        if (userData.user) await this.users.put({ ...userData.user, pubkey: userId });
        if (userData.curiosities) {
          for (let item of userData.curiosities) {
            await this.curiosities.add({ ...item, userId });
          }
        }
        if (userData.attributes) {
          for (let item of userData.attributes) {
            await this.attributes.add({ ...item, userId });
          }
        }
        // ... continue for other data types
      });

      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }

  // Clear all user data
  async clearUserData(userId) {
    try {
      await this.transaction('rw', this.users, this.curiosities, this.attributes, this.needs,
        this.playbooks, this.chatThreads, this.chatMessages, this.reflections,
        this.characterProgress, this.settings, this.subscriptions, async () => {
        
        await this.curiosities.where('userId').equals(userId).delete();
        await this.attributes.where('userId').equals(userId).delete();
        await this.needs.where('userId').equals(userId).delete();
        await this.playbooks.where('userId').equals(userId).delete();
        await this.chatThreads.where('userId').equals(userId).delete();
        await this.chatMessages.where('userId').equals(userId).delete();
        await this.reflections.where('userId').equals(userId).delete();
        await this.characterProgress.where('userId').equals(userId).delete();
        await this.settings.where('userId').equals(userId).delete();
        await this.subscriptions.where('userId').equals(userId).delete();
        await this.users.where('pubkey').equals(userId).delete();
      });

      return true;
    } catch (error) {
      console.error('Failed to clear user data:', error);
      return false;
    }
  }
}

// Create singleton instance
const awakeDB = new AwakeDB();

export default awakeDB; 
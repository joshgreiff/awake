// Simple local authentication service
// Uses localStorage for user data - no backend required

class SimpleAuthService {
  constructor() {
    this.currentUser = null;
    this.storageKey = 'awake_user';
  }

  // Initialize - check if user exists
  initialize() {
    try {
      const storedUser = localStorage.getItem(this.storageKey);
      
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return true; // User exists
      }
      
      return false; // No user found
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      return false;
    }
  }

  // Create new user account
  createUser(username) {
    try {
      if (!username || username.trim().length === 0) {
        throw new Error('Username is required');
      }

      const user = {
        id: this.generateUserId(),
        username: username.trim(),
        createdAt: Date.now(),
        version: '1.0.0'
      };

      localStorage.setItem(this.storageKey, JSON.stringify(user));
      this.currentUser = user;
      
      return true;
    } catch (error) {
      console.error('Failed to create user:', error);
      return false;
    }
  }

  // Generate unique user ID
  generateUserId() {
    // Use crypto.randomUUID if available, fallback to timestamp-based
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback: timestamp + random string
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get current user info
  getUserInfo() {
    if (!this.currentUser) {
      return null;
    }

    return {
      id: this.currentUser.id,
      username: this.currentUser.username,
      createdAt: this.currentUser.createdAt
    };
  }

  // Update username
  updateUsername(newUsername) {
    try {
      if (!this.currentUser) {
        throw new Error('No user logged in');
      }

      if (!newUsername || newUsername.trim().length === 0) {
        throw new Error('Username is required');
      }

      this.currentUser.username = newUsername.trim();
      this.currentUser.updatedAt = Date.now();
      
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
      
      return true;
    } catch (error) {
      console.error('Failed to update username:', error);
      return false;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Logout (clear user data)
  logout() {
    try {
      localStorage.removeItem(this.storageKey);
      this.currentUser = null;
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  }

  // Export user data (for backup)
  exportUserData() {
    if (!this.currentUser) {
      return null;
    }

    return {
      user: this.currentUser,
      exportedAt: Date.now()
    };
  }

  // Import user data (for restore)
  importUserData(data) {
    try {
      if (!data || !data.user || !data.user.id) {
        throw new Error('Invalid user data');
      }

      this.currentUser = data.user;
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentUser));
      
      return true;
    } catch (error) {
      console.error('Failed to import user data:', error);
      return false;
    }
  }
}

// Create singleton instance
const simpleAuth = new SimpleAuthService();

export default simpleAuth; 
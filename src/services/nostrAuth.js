import * as nostrTools from 'nostr-tools';

class NostrAuthService {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
    this.isAuthenticated = false;
    this.userProfile = null;
  }

  // Initialize or load existing Nostr identity
  async initialize() {
    try {
      // Check if user already has keys
      const storedPrivateKey = localStorage.getItem('awake_nostr_private_key');
      
      if (storedPrivateKey) {
        this.privateKey = storedPrivateKey;
        this.publicKey = getPublicKey(storedPrivateKey);
        this.isAuthenticated = true;
        await this.loadUserProfile();
      }
      
      return this.isAuthenticated;
    } catch (error) {
      console.error('Failed to initialize Nostr auth:', error);
      return false;
    }
  }

  // Generate new Nostr identity
  async createIdentity(displayName = 'Awake User') {
    try {
      this.privateKey = nostrTools.generatePrivateKey();
      this.publicKey = nostrTools.getPublicKey(this.privateKey);
      
      // Create initial user profile
      this.userProfile = {
        pubkey: this.publicKey,
        displayName: displayName,
        createdAt: Date.now(),
        version: '1.0.0'
      };

      // Store securely
      localStorage.setItem('awake_nostr_private_key', this.privateKey);
      localStorage.setItem('awake_user_profile', JSON.stringify(this.userProfile));
      
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Failed to create Nostr identity:', error);
      return false;
    }
  }

  // Import existing Nostr identity
  async importIdentity(privateKeyInput) {
    try {
      let privateKey;
      
      // Handle different input formats
      if (privateKeyInput.startsWith('nsec')) {
        // Bech32 encoded private key
        const decoded = nostrTools.nip19.decode(privateKeyInput);
        privateKey = decoded.data;
      } else if (privateKeyInput.length === 64) {
        // Raw hex private key
        privateKey = privateKeyInput;
      } else {
        throw new Error('Invalid private key format');
      }

      // Validate the key
      const publicKey = nostrTools.getPublicKey(privateKey);
      
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      
      // Create profile for imported key
      this.userProfile = {
        pubkey: this.publicKey,
        displayName: 'Imported User',
        createdAt: Date.now(),
        imported: true,
        version: '1.0.0'
      };

      // Store securely
      localStorage.setItem('awake_nostr_private_key', this.privateKey);
      localStorage.setItem('awake_user_profile', JSON.stringify(this.userProfile));
      
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Failed to import Nostr identity:', error);
      return false;
    }
  }

  // Load user profile
  async loadUserProfile() {
    try {
      const storedProfile = localStorage.getItem('awake_user_profile');
      if (storedProfile) {
        this.userProfile = JSON.parse(storedProfile);
      } else {
        // Create default profile
        this.userProfile = {
          pubkey: this.publicKey,
          displayName: 'Awake User',
          createdAt: Date.now(),
          version: '1.0.0'
        };
        localStorage.setItem('awake_user_profile', JSON.stringify(this.userProfile));
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      this.userProfile = { ...this.userProfile, ...updates };
      localStorage.setItem('awake_user_profile', JSON.stringify(this.userProfile));
      return true;
    } catch (error) {
      console.error('Failed to update profile:', error);
      return false;
    }
  }

  // Get user's public key in different formats
  getPublicKey(format = 'hex') {
    if (!this.publicKey) return null;
    
    switch (format) {
      case 'npub':
        return nostrTools.nip19.npubEncode(this.publicKey);
      case 'hex':
      default:
        return this.publicKey;
    }
  }

  // Get user's private key (for backup purposes)
  getPrivateKey(format = 'hex') {
    if (!this.privateKey) return null;
    
    switch (format) {
      case 'nsec':
        return nostrTools.nip19.nsecEncode(this.privateKey);
      case 'hex':
      default:
        return this.privateKey;
    }
  }

  // Export user data for backup
  async exportUserData() {
    try {
      const userData = {
        identity: {
          publicKey: this.getPublicKey('npub'),
          profile: this.userProfile
        },
        backup: {
          privateKey: this.getPrivateKey('nsec'), // For complete backup
          createdAt: Date.now(),
          version: '1.0.0'
        }
      };

      return userData;
    } catch (error) {
      console.error('Failed to export user data:', error);
      return null;
    }
  }

  // Sign out and clear data
  async signOut() {
    try {
      // Clear sensitive data
      localStorage.removeItem('awake_nostr_private_key');
      localStorage.removeItem('awake_user_profile');
      
      // Reset state
      this.privateKey = null;
      this.publicKey = null;
      this.isAuthenticated = false;
      this.userProfile = null;
      
      return true;
    } catch (error) {
      console.error('Failed to sign out:', error);
      return false;
    }
  }

  // Get short display ID for UI
  getDisplayId() {
    if (!this.publicKey) return 'No Identity';
    return `${this.publicKey.slice(0, 8)}...${this.publicKey.slice(-8)}`;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated && this.publicKey && this.privateKey;
  }

  // Get user info for display
  getUserInfo() {
    return {
      isAuthenticated: this.isAuthenticated,
      publicKey: this.publicKey,
      displayName: this.userProfile?.displayName || 'Unknown',
      displayId: this.getDisplayId(),
      npub: this.getPublicKey('npub'),
      createdAt: this.userProfile?.createdAt
    };
  }
}

// Create singleton instance
const nostrAuth = new NostrAuthService();

export default nostrAuth; 
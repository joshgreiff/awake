# Awake 🌅

**A consciousness operating system that gamifies personal growth.**

Awake transforms self-development into an engaging journey where your daily reflections become personalized action plans, your traits level up through real actions, and your vision manifests into reality.

---

## ✨ What Makes Awake Different

Traditional self-improvement apps are glorified to-do lists. Awake is a **living game** where:

- 🎯 **Your Vision Becomes Your Quest** - Define your ideal self and let it guide your daily actions
- 🎮 **Traits Level Up Through Action** - Creativity, Discipline, Focus, etc. evolve as you complete tasks
- 🤖 **AI That Actually Knows You** - LOA (Law of Attraction AI) learns your patterns and generates personalized playbooks
- 📊 **Progress You Can See** - Watch your traits grow, track curiosities, and see your transformation in real-time
- 🌐 **Nostr-Powered Identity** - Own your data with decentralized authentication
- 🧘 **Consciousness-First Design** - Built on principles of manifestation, identity formation, and authentic growth

---

## 🎮 Core Features

### 1. **Daily Reflection Chat**
- Have a conversation with LOA about your day
- AI analyzes your state and generates insights
- Discovers patterns and recommends focus areas

### 2. **Intelligent Playbook Generation**
- Personalized daily tasks based on your reflections
- Tasks target specific traits (Creativity, Discipline, Focus, etc.)
- Complete tasks to earn XP and level up

### 3. **Trait Leveling System**
- 12+ character traits that level up through actions
- Logarithmic XP curves keep progress rewarding
- Visual progress bars with real-time updates
- Earn your growth instead of manually tracking

### 4. **Vision Creation**
- Guided AI conversation to build your Master Vision
- Third-person, present-tense language for manifestation
- "More and more" phrasing for believability
- Audio playback for daily vision reinforcement

### 5. **Curiosity Tracking**
- Track what you're genuinely interested in
- See patterns in your explorations
- Connect curiosities to your larger vision

### 6. **Ready Player Me Avatar**
- Create a 3D avatar that represents you
- Visual representation of your journey
- Customize anytime

### 7. **Progress Insights**
- See trait progression over time
- Identify patterns in your behavior
- Understand what's working

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Claude API key ([get one here](https://console.anthropic.com/))

### Installation

   ```bash
# Clone the repository
git clone https://github.com/yourusername/awake.git
cd awake

# Install dependencies
npm install

# Start the development server
npm run dev
```

### First-Time Setup

1. **Open the app** in your browser (usually `http://localhost:5173`)
2. **Connect with Nostr**:
   - Use a browser extension like [Alby](https://getalby.com/) or [nos2x](https://github.com/fiatjaf/nos2x)
   - Or generate a new Nostr keypair in the app
3. **Add your Claude API key**:
   - Click the settings icon
   - Paste your API key
   - Key is stored locally in your browser
4. **Start your first reflection**:
   - Chat with LOA about your day
   - Complete the guided conversation
   - Receive your first personalized playbook

---

## 🏗️ Built With

- **React** - UI framework
- **Vite** - Build tool
- **Claude AI (Anthropic)** - Conversational AI for reflections and insights
- **Nostr** - Decentralized identity and authentication
- **IndexedDB** - Local-first data storage
- **Ready Player Me** - Avatar creation

---

## 📊 Current Status: Private Beta

Awake is currently in **private beta testing** with a small community of consciousness explorers.

**What this means:**
- ✅ Core features are functional and tested
- ✅ Regular updates and improvements
- ⚠️ Using client-side API keys (temporary for beta)
- 🔜 Backend + subscriptions coming soon
- 🔜 Mobile app in development

**Interested in joining the beta?**
- Join our [Skool community](https://your-skool-link-here)
- Get early access + lifetime premium when we launch
- Help shape the future of Awake

---

## 🎯 Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Daily reflection chat with AI
- [x] Trait leveling system
- [x] Playbook generation
- [x] Nostr authentication
- [x] Curiosity tracking
- [x] Avatar integration

### Phase 2: Enhancement 🚧 (In Progress)
- [ ] Vision creation chat (full guided flow)
- [ ] Advanced trait insights
- [ ] Historical pattern recognition
- [ ] Weekly/monthly challenges
- [ ] Enhanced UI/UX polish

### Phase 3: Backend & Monetization 📋 (Planned)
- [ ] Backend API for AI calls
- [ ] Subscription tiers ($4.99 - $19.99/mo)
- [ ] Usage analytics
- [ ] Data sync across devices
- [ ] Admin dashboard

### Phase 4: Community 🌐 (Future)
- [ ] Anonymous progress sharing
- [ ] Shared curiosities feed
- [ ] Community challenges
- [ ] Mentorship matching
- [ ] Public vision sharing (opt-in)

### Phase 5: Expansion 🚀 (Vision)
- [ ] Mobile apps (iOS/Android)
- [ ] Local AI support (privacy mode)
- [ ] Voice reflections
- [ ] Wearable integrations
- [ ] API for third-party apps

---

## 🧠 Philosophy

Awake is built on a few core beliefs:

1. **Identity is a choice** - You become what you repeatedly do
2. **Consciousness > circumstances** - Your state creates your reality
3. **Progress needs feedback** - Gamification makes growth tangible
4. **Privacy matters** - Your data should be yours
5. **Community accelerates** - We rise together

We're not building another productivity app. We're building a **consciousness operating system** for people who want to wake up to their potential.

---

## 🛠️ Development

### Project Structure
```
awake/
├── src/
│   ├── components/        # React components
│   ├── services/          # AI, auth, and API services
│   ├── storage/           # IndexedDB and data management
│   ├── utils/             # Trait system, helpers
│   └── context/           # React context providers
├── public/                # Static assets
├── scripts/               # Utility scripts
└── package.json
```

### Key Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Environment Variables
Create a `.env.local` file:
```
VITE_CLAUDE_API_KEY=your_key_here  # Optional: default API key
```

---

## 🤝 Contributing

We're in private beta, but we welcome feedback and bug reports from beta testers!

**How to help:**
1. Use the app regularly and share your experience
2. Report bugs in our Skool community
3. Suggest features that would enhance your journey
4. Share wins and insights with the community

**For developers:**
- Fork the repo and submit PRs for bug fixes
- Follow the existing code style
- Add comments for complex logic
- Test thoroughly before submitting

---

## 🔒 Privacy & Security

- **Local-first**: All data stored in your browser (IndexedDB)
- **Nostr identity**: You own your keys and identity
- **No tracking**: No analytics, no third-party trackers
- **API keys**: Currently client-side (beta only)
- **Future**: Backend will use secure server-side keys

---

## 📄 License

Copyright © 2025 Awake. All rights reserved.

Currently proprietary during beta phase. License details coming with public launch.

---

## 🌟 Join the Journey

Awake isn't just software - it's a movement of people waking up to their potential.

**Ready to level up your consciousness?**

- 🌐 [Join Skool Community](https://your-skool-link-here)
- 🐦 [Follow on Twitter/X](https://twitter.com/yourhandle)
- 📺 [Watch on YouTube](https://youtube.com/@yourchannel)
- 🎙️ [Listen to the Podcast](your-podcast-link)

---

<div align="center">

**Built with 💜 for conscious creators**

*The game is your life. The prize is becoming who you were always meant to be.*

</div>

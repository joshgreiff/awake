# Upcoming Features - Roadmap

## 1. Vision Creation Chat (Similar to Daily Reflection)
**Goal:** Create a guided, conversational vision creation process inspired by Maxi's Master Vision template.

### Implementation Plan:
- [ ] Create `VisionCreationChat.jsx` component (similar to `DailyReflectionChat`)
- [ ] Design specialized AI prompts for vision creation
- [ ] Multi-step guided process:
  - Step 1: Life areas exploration (career, relationships, health, creativity, etc.)
  - Step 2: Ideal day visualization
  - Step 3: Character traits & values
  - Step 4: Specific goals & milestones
  - Step 5: "More and more" language transformation
- [ ] Save completed vision to localStorage
- [ ] Option to revisit and refine vision over time
- [ ] Integrate vision audio playback (text-to-speech)

### Key Features:
- **Guided questions** from LOA
- **Progress indicator** (Step 1 of 5)
- **Draft saving** - can exit and return
- **Vision preview** before finalizing
- **Celebration** when complete

### Technical Notes:
- Use same modal pattern as Daily Reflection
- Longer conversation (15-20 exchanges vs 5-7 for reflection)
- Store vision as structured data (not just text) for better AI context
- Consider adding voice input for authenticity

---

## 2. Ready Player Me Avatar Integration
**Goal:** Let users create and display personalized 3D avatars.

### Implementation Plan:
- [ ] Research Ready Player Me SDK/API
- [ ] Add avatar creation button in user settings
- [ ] Embed Ready Player Me iframe for avatar creation
- [ ] Save avatar URL to user profile
- [ ] Display avatar in dashboard header
- [ ] Optional: Animated avatar reactions (level up, task complete)

### Key Features:
- **Avatar creation** via Ready Player Me
- **Avatar display** in header/profile
- **Avatar customization** anytime
- **Avatar celebrations** for achievements

### Technical Notes:
- Ready Player Me provides:
  - Iframe embed for avatar creation
  - GLB/GLTF 3D model URL
  - Avatar can be displayed with Three.js or simple image
- Store avatar URL in localStorage with user data
- Consider using `@react-three/fiber` for 3D rendering
- Fallback to 2D image if 3D rendering fails

### Resources:
- Ready Player Me Docs: https://docs.readyplayer.me/
- React integration example: https://docs.readyplayer.me/ready-player-me/integration-guides/web-sdk

---

## 3. Community Features
**Goal:** Create connection and shared growth among Awake users.

### Brainstorming:
**What could this look like?**
- Anonymous progress sharing ("Someone just leveled up Creativity!")
- Shared curiosities feed ("5 people are exploring Bitcoin education")
- Trait challenges ("Gain 100 Fitness XP this week")
- Reflection prompts from the community
- Optional profile sharing (link-based, not searchable)
- Group goals/challenges
- Badges and achievements
- Leaderboards (optional, opt-in)

### Implementation Considerations:
**Privacy-First Approach:**
- All sharing is **opt-in**
- No mandatory social features
- Anonymous by default
- Can use Nostr for decentralized identity
- No central user database (Nostr relays instead?)

### Technical Architecture Options:

**Option A: Nostr-Based Community**
- Use Nostr relays for community posts
- Each user has their Nostr identity (already implemented)
- Post reflections/progress as Nostr events
- Subscribe to community relay
- Benefits: Decentralized, privacy-preserving, censorship-resistant
- Challenges: Moderation, spam prevention

**Option B: Awake Backend + API**
- Build simple backend for community features
- User accounts with optional public profiles
- Moderated community space
- Benefits: More control, easier moderation
- Challenges: Centralized, requires server costs

**Option C: Hybrid**
- Core app stays local-first
- Optional community features via backend
- Can work without backend (full offline mode)

### Priority Features:
1. **Shared Inspiration Feed** - See what others are curious about
2. **Anonymous Progress Milestones** - Celebrate wins together
3. **Community Challenges** - Weekly/monthly growth challenges
4. **Trait Comparisons** - "Your Creativity is higher than 75% of users"

---

## Implementation Priority:

### Phase 1 (Next)
1. ✅ Fix add button styling
2. ✅ Fix loading state issue
3. ✅ Add curiosities description
4. **Vision Creation Chat** - Most impactful, builds on existing system

### Phase 2
5. **Ready Player Me Avatars** - Fun, engaging, unique differentiator

### Phase 3
6. **Community Features** - Requires more architecture decisions
   - Need to decide: Nostr vs Backend vs Hybrid
   - Start with simple shared feed
   - Iterate based on feedback

---

## Questions to Explore:

1. **Vision Creation:**
   - Should vision be a one-time thing or revisited regularly?
   - Should LOA remind users to update their vision?
   - Should vision have multiple "versions" (past visions tracked)?

2. **Avatars:**
   - Just display or also animate?
   - Should avatar "level up" with character level?
   - Avatar in reflection chat too?

3. **Community:**
   - How much privacy vs connection?
   - Moderation approach?
   - Nostr or traditional backend?
   - Should community be core or optional add-on?

---

## Awaiting Maxi Master Vision Template
**Next Step:** Josh will share Maxi's master vision template content to inspire the vision creation flow.

This will help us design:
- The question flow
- The language/tone
- The structure of the final vision document
- How to make it feel authentic and powerful 
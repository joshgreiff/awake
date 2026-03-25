# Awake Project Status

**Last Updated:** March 2026  
**Live Site:** https://www.awakeapp.space

---

## Quick Links

| Resource | Link |
|----------|------|
| Live Web App | [awakeapp.space](https://www.awakeapp.space) |
| GitHub Repo | [github.com/joshgreiff/awake](https://github.com/joshgreiff/awake) |
| Supabase Dashboard | [supabase.com/dashboard](https://supabase.com/dashboard) |
| Design Framework | [awake-v2-framework.md](./awake-v2-framework.md) |
| Loa AI Design | [loa-accountability-design.md](./loa-accountability-design.md) |

---

## Current State

### What's Built & Working

| Feature | Status | Notes |
|---------|--------|-------|
| **Onboarding Flow** | ✅ Working | 9-stage flow with cosmic UI |
| **User Auth** | ✅ Working | Email signup via Supabase |
| **Cloud Sync** | ✅ Working | Data syncs across devices |
| **Dashboard** | ✅ Basic | Shows stats, intentions, attractions |
| **Loa Chat** | ⚠️ Partial | UI works, needs AI backend deployed |
| **Desktop App** | ⚠️ Partial | Tauri setup done, builds locally |
| **AI Providers** | ⚠️ Partial | BYOK works, cloud proxy not deployed |

### What's NOT Built Yet

| Feature | Priority | Notes |
|---------|----------|-------|
| Anti-Vision / Vision System | HIGH | Core to Koe framework |
| Boss Fights (Monthly Projects) | HIGH | Core gamification |
| Daily Quests | HIGH | Core loop |
| XP / Leveling System | MEDIUM | Gamification |
| Streaks | MEDIUM | Accountability |
| Constraints System | MEDIUM | Koe framework |
| Google Sign-In | LOW | Needs OAuth setup |
| Push Notifications | LOW | Future |

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind v4
- **UI Components:** shadcn/ui + Framer Motion
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Desktop:** Tauri (Rust-based, not Electron)
- **AI:** Claude (via Supabase Edge Function or BYOK)

---

## Key Design Documents

### 1. [Awake V2 Framework](./awake-v2-framework.md)
The core game design based on Dan Koe's protocol:
- Anti-Vision (Nightmare) vs Vision (Dream)
- Boss Fights (Monthly Projects)
- Daily Quests & Constraints
- Chapter System & Progression

### 2. [Loa Accountability Design](./loa-accountability-design.md)
How Loa (the AI companion) works:
- Knows the user's full context
- Guides daily reflections
- Tracks patterns and provides accountability
- Personality evolves with user's chapter

---

## Next Steps (Suggested Priority)

### Phase 1: Core Loop (1-2 weeks)
1. [ ] Build Vision Creation flow (Anti-Vision + Vision)
2. [ ] Add Boss Fight system (monthly projects)
3. [ ] Implement Daily Quests
4. [ ] Deploy AI edge function (Loa works without API key)

### Phase 2: Gamification (1-2 weeks)
5. [ ] XP system with trait leveling
6. [ ] Streak tracking with protection
7. [ ] Momentum meter visualization
8. [ ] Quest completion celebrations

### Phase 3: Polish (1 week)
9. [ ] Morning/Evening reflection flows
10. [ ] Onboarding improvements (Aurora's changes)
11. [ ] Mobile responsiveness pass
12. [ ] Desktop app distribution

---

## Development Notes

### Running Locally
```bash
cd /Users/josh/Desktop/awake-1
npm install
npm run dev
```

### Building Desktop App
```bash
# Requires Rust installed
npm run tauri:dev    # Dev mode
npm run tauri:build  # Build distributable
```

### Environment Variables
Create `.env` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Deploying AI Edge Function
```bash
supabase login
supabase link --project-ref your-project-ref
supabase secrets set CLAUDE_API_KEY=your-key
supabase functions deploy chat
```

---

## Questions / Decisions Needed

1. **AI Cost Model:** How do we handle AI costs at scale? Rate limiting? Subscription?
2. **Mobile App:** Web-only for now, or prioritize mobile?
3. **Community Features:** When do we add social/community aspects?
4. **Monetization:** Free tier limits? Pro features?

---

*This doc lives at `docs/PROJECT-STATUS.md` - keep it updated!*

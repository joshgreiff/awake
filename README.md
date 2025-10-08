# Awake Mission

A personalized, evolving, self-development system that helps users become the most aligned version of themselves through accountability, habit-building, community, and intelligent guidance.

## Beta Testing Setup

### API Key Setup
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
2. Get your Claude API key from: https://console.anthropic.com/
3. Add it to `.env.local`:
   ```
   VITE_CLAUDE_API_KEY=sk-ant-your-actual-key-here
   ```
4. Restart your dev server: `npm run dev`

**Security Note:** 
- `.env.local` is already in `.gitignore` - your key won't be committed
- The key is visible in browser (client-side) - only use for beta with trusted users
- For production, you'll need a backend proxy

### Usage Tracking
- **Daily Limit**: 50 AI messages per user per day
- **Resets**: Automatically at midnight
- **Monitoring**: Check browser console for usage logs (`AI Usage: X messages today`)

### Cost Estimate (with Claude Haiku)
- ~$0.02 per user per day (reflection + playbook + casual chat)
- 10 beta users = ~$6/month
- 50 beta users = ~$30/month
- 100 beta users = ~$60/month

### Admin Monitoring

**Option 1: Run the usage checker:**
```bash
node scripts/check-usage.js
```
This will show you instructions for checking usage in browser.

**Option 2: Manual check in browser console:**
```javascript
// See all users' usage (in localStorage)
Object.keys(localStorage).filter(k => k.includes('awake-user-data')).forEach(key => {
  const data = JSON.parse(localStorage.getItem(key));
  const username = data.profile?.name || 'Unknown';
  console.log(`👤 ${username}: ${data.dailyUsage?.messages || 0}/50 messages`);
});

// Calculate total cost estimate
const total = Object.keys(localStorage)
  .filter(k => k.includes('awake-user-data'))
  .reduce((sum, key) => {
    const data = JSON.parse(localStorage.getItem(key));
    return sum + (data.dailyUsage?.messages || 0);
  }, 0);
console.log(`💰 Estimated cost today: $${(total * 0.0004).toFixed(2)}`);
```

**Option 3: Check Anthropic Dashboard:**
- https://console.anthropic.com/settings/usage
- Set budget alerts ($50 warning, $100 hard limit recommended)
- Check daily to monitor costs

### Enabling Premium for Beta Users

**Method 1: Whitelist (Recommended)**
1. Open `src/components/AwakeDashboard.jsx`
2. Find `BETA_PREMIUM_USERNAMES` array (line ~30)
3. Add their username:
   ```javascript
   const BETA_PREMIUM_USERNAMES = [
     'josh',
     'sayer',
     'aurora',
     'new-user-here',  // Add here
   ];
   ```
4. Commit & deploy
5. User gets automatic premium access when they log in

**Method 2: Manual Toggle (Temporary)**
1. User opens upgrade modal
2. Clicks "Enable Premium" in beta testing section
3. This only works in their current browser (not persistent across devices)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

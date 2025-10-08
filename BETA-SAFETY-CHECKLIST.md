# 🛡️ Beta Safety Checklist

Protect yourself from unexpected costs during beta testing.

## ✅ Before Going Live:

### 1. Set Spending Limits in Anthropic
- [ ] Go to https://console.anthropic.com/settings/billing
- [ ] Set monthly budget: **$100 hard limit**
- [ ] Enable email alerts at 50%, 75%, 90%
- [ ] Add your credit card (required for monitoring)

### 2. Configure Claude API Settings
- [ ] Go to https://console.anthropic.com/settings/keys
- [ ] Note your API key (you'll need it for `.env.local`)
- [ ] Check **Usage** tab regularly (daily for first week)

### 3. Local Environment
- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Add your Claude API key to `.env.local`
- [ ] Test locally: `npm run dev`
- [ ] Verify AI features work

### 4. Vercel Deployment
- [ ] Add `VITE_CLAUDE_API_KEY` to Vercel environment variables
- [ ] Set for: Production, Preview, Development
- [ ] Redeploy after adding the variable
- [ ] Test on deployed URL

### 5. Beta User Management
- [ ] Start with 5-10 trusted users
- [ ] Manually enable premium for each beta tester
- [ ] Share clear expectations: "Beta testing, 50 msg/day limit"
- [ ] Get their consent that this is a beta (bugs expected)

## 📊 Daily Monitoring (First Week):

### Morning Routine:
1. **Check Anthropic Usage Dashboard**
   - https://console.anthropic.com/settings/usage
   - Look for unexpected spikes

2. **Check User Usage in App**
   - Open your deployed app
   - Press F12 → Console
   - Run: `node scripts/check-usage.js` instructions

3. **Cost Calculation**
   ```
   Total messages × $0.0004 = Daily cost
   Daily cost × 30 = Monthly estimate
   ```

### Red Flags 🚨:
- Single user exceeding 50 messages/day (rate limit broken?)
- Total cost exceeding $3/day ($90/month)
- Unknown users appearing (security issue?)

## 🔥 Emergency Actions:

### If Costs Spike:
1. **Immediately**: Delete the API key in Anthropic console
2. Generate a new key
3. Update `.env.local` and Vercel env vars
4. Investigate which user caused the spike

### If Key Is Compromised:
1. Rotate the key immediately
2. Check Anthropic usage logs for suspicious activity
3. Contact Anthropic support if needed

## 📈 Growth Milestones:

- **10 users** (~$6/mo): Monitor weekly
- **25 users** (~$15/mo): Monitor every 3 days
- **50 users** (~$30/mo): Monitor daily
- **100 users** (~$60/mo): **BUILD BACKEND PROXY BEFORE THIS**

## 🎯 When to Build Backend:

You MUST build a backend proxy when:
- [ ] You have 50+ beta users
- [ ] You're launching publicly
- [ ] You're taking payments (Stripe integration)
- [ ] Any untrusted users have access
- [ ] Monthly costs exceed $50

## 📞 Support:

- **Anthropic Support**: support@anthropic.com
- **Vercel Support**: https://vercel.com/help
- **Emergency**: Disable the API key in console immediately

---

**Remember**: This setup is for **trusted beta only**. Before public launch, you need a backend proxy!


# Multi-Tier AI System - Implementation Roadmap

## Overview
Build a flexible AI system that allows users to choose their level of service, from bring-your-own-key to premium Claude Opus access.

---

## Phase 1: Current State (MVP - In Progress)

### ✅ **What's Working:**
- User provides their own Claude API key
- Stored in localStorage
- Direct browser → Claude API calls
- Full feature access (reflection, vision, playbook generation)

### **Use Case:**
- Testing and validation
- Early adopters
- Privacy-focused users

### **Limitations:**
- API key visible in browser
- No usage tracking
- No cost control
- High friction (users need API key)

---

## Phase 2: Backend Foundation (Next 2-4 weeks)

### **Goal:** 
Build backend infrastructure to manage AI calls and prepare for subscriptions.

### **Technical Stack:**
```
Frontend (React) 
    ↓
Backend API (Node.js/Express or Python/FastAPI)
    ↓
AI Services (Claude, OpenAI, etc.)
    ↓
Database (PostgreSQL or Supabase)
    ↓
Payment (Stripe)
```

### **Backend Endpoints:**

```javascript
POST /api/ai/chat
- Body: { message, context, conversationType }
- Returns: AI response
- Auth: JWT token
- Rate limit: Based on user tier

POST /api/ai/generate-playbook
- Body: { reflectionData, userContext }
- Returns: Playbook tasks array
- Auth: JWT token

POST /api/ai/compile-vision
- Body: { visionData }
- Returns: Compiled vision text
- Auth: JWT token

GET /api/usage/current
- Returns: User's current usage stats
- Auth: JWT token
```

### **Database Schema:**

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  nostr_pubkey VARCHAR(255) UNIQUE,
  tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP,
  stripe_customer_id VARCHAR(255)
);

-- Usage tracking
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  request_type VARCHAR(50), -- 'reflection', 'playbook', 'vision', 'chat'
  tokens_used INTEGER,
  cost_cents INTEGER,
  timestamp TIMESTAMP,
  tier VARCHAR(50)
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tier VARCHAR(50),
  status VARCHAR(50), -- 'active', 'canceled', 'past_due'
  stripe_subscription_id VARCHAR(255),
  current_period_end TIMESTAMP
);
```

---

## Phase 3: Tier System Design

### **🆓 Free Tier** (Testing/Trial)
**Price:** Free  
**Features:**
- 10 AI interactions total (one-time)
- Access to all core features during trial
- Daily reflection (up to 3)
- Vision creation (one-time)
- Basic playbook generation

**Limitations:**
- No historical data beyond 7 days
- Basic AI model (Claude Haiku)
- Rate limit: 10 requests/day max

**Purpose:** Let users test the full experience before committing

---

### **💎 Basic Tier** - "Starter"
**Price:** $4.99/month  
**Features:**
- Unlimited daily reflections
- AI playbook generation
- Vision creation & editing
- Claude Haiku model
- 30 days historical data
- Progress insights & charts
- Up to 300 AI requests/month (~10/day)

**Use Case:** 
- Daily journaling
- Casual self-development
- Budget-conscious users

**AI Costs:** ~$0.30-0.50/month per user  
**Margin:** ~$4.50/month per user

---

### **🚀 Pro Tier** - "Accelerator"
**Price:** $9.99/month  
**Features:**
- Everything in Basic, plus:
- Claude Sonnet model (smarter AI)
- Unlimited AI requests
- 90 days historical data
- Advanced insights & patterns
- Community features (optional sharing)
- Priority support
- Multiple visions (work, personal, etc.)

**Use Case:**
- Serious self-development
- Entrepreneurs building businesses
- People achieving big goals

**AI Costs:** ~$1-2/month per user  
**Margin:** ~$8/month per user

---

### **⭐ Elite Tier** - "Visionary"
**Price:** $19.99/month  
**Features:**
- Everything in Pro, plus:
- Claude Opus model (best AI)
- Unlimited everything
- Lifetime historical data
- Advanced analytics & predictions
- Weekly personalized insights
- 1-on-1 vision coaching calls (monthly)
- Early access to new features
- Custom trait creation
- Export all data

**Use Case:**
- High performers
- Executives & founders
- Life transformation projects

**AI Costs:** ~$3-5/month per user  
**Margin:** ~$15/month per user

---

### **🔧 Developer Tier** (Optional)
**Price:** Free (self-hosted)  
**Features:**
- Bring your own API key (any provider)
- Local AI support (Ollama, LM Studio)
- Self-hosted backend option
- API access for custom integrations

**Use Case:**
- Privacy maximalists
- Hackers & tinkerers
- Open source advocates

**Purpose:** Community building, word-of-mouth marketing

---

## Phase 4: Implementation Details

### **Frontend Changes:**

```javascript
// Add tier-based feature gating
const canUseFeature = (feature, userTier) => {
  const tierFeatures = {
    free: ['reflection', 'vision', 'basic_playbook'],
    basic: ['reflection', 'vision', 'playbook', 'insights_30d'],
    pro: ['reflection', 'vision', 'playbook', 'insights_90d', 'community', 'multiple_visions'],
    elite: ['reflection', 'vision', 'playbook', 'insights_lifetime', 'community', 'coaching', 'custom_traits']
  };
  
  return tierFeatures[userTier]?.includes(feature);
};

// Show upgrade prompts
const UpgradePrompt = ({ feature, requiredTier }) => (
  <div className="upgrade-banner">
    <p>Unlock {feature} with {requiredTier} tier!</p>
    <button onClick={openUpgradeModal}>Upgrade Now →</button>
  </div>
);
```

### **Backend Rate Limiting:**

```javascript
// Rate limit by tier
const rateLimits = {
  free: { daily: 10, monthly: 10 },
  basic: { daily: 50, monthly: 300 },
  pro: { daily: 999, monthly: 9999 },
  elite: { daily: 9999, monthly: 99999 }
};

// Middleware
const checkRateLimit = async (userId) => {
  const usage = await getUsageToday(userId);
  const tier = await getUserTier(userId);
  
  if (usage >= rateLimits[tier].daily) {
    throw new Error('Daily limit reached. Upgrade for more!');
  }
};
```

### **Stripe Integration:**

```javascript
// Create subscription
const createSubscription = async (userId, tier) => {
  const priceIds = {
    basic: 'price_xxx', // Stripe price ID
    pro: 'price_yyy',
    elite: 'price_zzz'
  };
  
  const subscription = await stripe.subscriptions.create({
    customer: user.stripe_customer_id,
    items: [{ price: priceIds[tier] }],
    trial_period_days: 7 // Optional
  });
  
  return subscription;
};
```

---

## Phase 5: Pricing Psychology

### **Value Anchoring:**
```
Elite: $19.99/month (anchor - makes others look cheap)
Pro:   $9.99/month  (middle - most popular)
Basic: $4.99/month  (entry - gets people in)
```

### **Comparison:**
```
"Less than your Netflix subscription"
"$0.33/day for personal transformation"
"Compare to $100-300/session therapy"
"Cheaper than ChatGPT Plus, but personalized"
```

### **Upsell Path:**
```
Free trial → Basic ($4.99) → Pro ($9.99) → Elite ($19.99)
              ↓                  ↓               ↓
         Good for most      Power users     Transformers
```

---

## Phase 6: Cost Analysis

### **Monthly Costs Per User:**

| Tier | AI Cost | Server Cost | Total Cost | Price | Margin |
|------|---------|-------------|------------|-------|--------|
| Free | $0.10 | $0.05 | $0.15 | $0 | -$0.15 |
| Basic | $0.40 | $0.10 | $0.50 | $4.99 | $4.49 |
| Pro | $1.50 | $0.15 | $1.65 | $9.99 | $8.34 |
| Elite | $4.00 | $0.20 | $4.20 | $19.99 | $15.79 |

### **Break-Even Analysis:**
```
Server costs: ~$50/month (Railway/Render)
Stripe fees: 2.9% + $0.30/transaction

Break-even with:
- 15 Basic users ($74.85 revenue - $50 server = $24.85 profit)
- 10 Pro users ($99.90 revenue - $50 server = $49.90 profit)
- 5 Elite users ($99.95 revenue - $50 server = $49.95 profit)
```

---

## Phase 7: Migration Plan

### **Step 1: Add Backend (Week 1-2)**
- Set up server (Railway/Render)
- Create API endpoints
- Add authentication (JWT)
- Keep frontend working with current setup

### **Step 2: Add Stripe (Week 3)**
- Integrate Stripe Checkout
- Add subscription webhooks
- Create pricing page
- Test payment flow

### **Step 3: Soft Launch (Week 4)**
- Grandfather existing users (free pro tier)
- Show pricing to new users
- Add upgrade prompts
- Monitor usage & costs

### **Step 4: Full Launch (Week 5+)**
- Marketing push
- Onboarding flow
- Email campaigns
- Community building

---

## Phase 8: Future Enhancements

### **Additional Revenue Streams:**
1. **Annual Plans** (save 20%) - $47/year, $95/year, $191/year
2. **Team Plans** - $14.99/user/month for 5+ users
3. **Lifetime Access** - $499 one-time (limited offer)
4. **Coaching Add-on** - $99/month for weekly calls
5. **Custom Integrations** - Enterprise pricing

### **Cost Optimization:**
1. Cache common AI responses
2. Use cheaper models for simple tasks
3. Batch requests when possible
4. Implement smart rate limiting
5. Monitor and optimize prompts

---

## Next Steps (In Order):

1. ✅ **Current:** Testing with user API keys
2. **Next (2 weeks):** Build backend proxy
3. **After (1 week):** Add Stripe integration
4. **After (1 week):** Create pricing page
5. **After (ongoing):** Launch & iterate

---

## Questions to Answer:

1. **Which tier do we launch with first?** (Recommend: Basic only, add tiers later)
2. **What's the free trial?** (Recommend: 7 days or 10 interactions)
3. **Annual discounts?** (Recommend: Yes, 20% off)
4. **Grandfather early users?** (Recommend: Yes, free Basic for life)
5. **Support local AI?** (Recommend: Phase 2, after paid tiers work)

Ready to start building the backend when you are! 🚀 
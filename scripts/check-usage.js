#!/usr/bin/env node

/**
 * Quick usage checker for beta testing
 * Run: node scripts/check-usage.js
 * 
 * This logs all users' AI usage from localStorage exports
 */

console.log('\n🔍 AWAKE BETA USAGE REPORT\n');
console.log('=' .repeat(50));

// Instructions for manual check
console.log('\n📊 To check usage:');
console.log('\n1. Open your deployed Awake app in browser');
console.log('2. Open DevTools (F12) → Console');
console.log('3. Paste this code:\n');

console.log(`
// Get all users' daily usage
Object.keys(localStorage)
  .filter(k => k.includes('awake-user-data'))
  .forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    const usage = data.dailyUsage || { messages: 0, date: 'unknown' };
    const username = data.profile?.name || 'Unknown User';
    console.log(\`👤 \${username}: \${usage.messages}/50 messages (Date: \${usage.date})\`);
  });

// Calculate total
const total = Object.keys(localStorage)
  .filter(k => k.includes('awake-user-data'))
  .reduce((sum, key) => {
    const data = JSON.parse(localStorage.getItem(key));
    return sum + (data.dailyUsage?.messages || 0);
  }, 0);

console.log(\`\\n📈 TOTAL MESSAGES TODAY: \${total}\`);
console.log(\`💰 Estimated Cost Today: $\${(total * 0.0004).toFixed(2)}\`);
`);

console.log('\n' + '='.repeat(50));
console.log('\n📋 Cost Estimates:');
console.log('   ~$0.0004 per message');
console.log('   ~$0.02 per user per day');
console.log('   ~$0.60 per user per month\n');


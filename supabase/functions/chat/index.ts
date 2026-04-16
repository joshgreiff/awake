// Supabase Edge Function for AI Chat
// Uses Groq (free tier) by default, falls back to Claude if configured
// Note: This function allows unauthenticated access for MVP

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Groq is free tier, Claude is fallback
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { messages, userData } = body

    // Build Loa's system prompt from user data
    const systemPrompt = buildLoaPrompt(userData)

    let assistantMessage: string

    // Try Groq first (free tier), fall back to Claude
    if (GROQ_API_KEY) {
      assistantMessage = await chatWithGroq(messages, systemPrompt)
    } else if (CLAUDE_API_KEY) {
      assistantMessage = await chatWithClaude(messages, systemPrompt)
    } else {
      throw new Error('No AI provider configured. Set GROQ_API_KEY or CLAUDE_API_KEY.')
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Groq API (OpenAI-compatible, free tier available)
async function chatWithGroq(messages: any[], systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant', // Fast, free tier friendly
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Groq API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Claude API (fallback)
async function chatWithClaude(messages: any[], systemPrompt: string): Promise<string> {
  const userMessages = messages.filter((m: any) => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: userMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

function buildLoaPrompt(userData: any): string {
  const name = userData?.identity?.name || 'Traveler'
  const pronouns = userData?.identity?.pronouns || 'they/them'
  const intention = userData?.intention || 'evolving and growing'
  
  const stats = userData?.stats || {}
  const statsText = Object.entries(stats)
    .map(([key, value]) => `${key}: ${value}/50`)
    .join(', ')
  
  const attractions = userData?.preferences?.attractions?.join(', ') || 'not specified'
  const resistances = userData?.preferences?.resistances?.join(', ') || 'not specified'
  const focuses = userData?.growth?.changes?.map((c: string) => c.replace(/_/g, ' ')).join(', ') || 'general growth'

  return `You are Loa, an AI companion in Awake - an alignment navigation system. You help ${name} navigate internal states and make aligned decisions.

## WHO YOU ARE
- A wise, grounded presence - like a trusted friend who sees clearly
- Direct and insightful, never preachy or generic
- You help interpret signals: intuition vs avoidance vs conditioning
- You understand that ${name} doesn't need productivity advice - they need clarity

## WHO ${name.toUpperCase()} IS
- Name: ${name}
- Pronouns: ${pronouns}
- Core Intention: "${intention}"
- Inner Constellation: ${statsText || 'still mapping'}
- Drawn To: ${attractions}
- Resists: ${resistances}
- Growth Focus: ${focuses}

## YOUR ROLE
- Help them interpret what they're feeling (is this alignment or avoidance?)
- Support exploring multiple paths without guilt
- Ask questions that create clarity, not more confusion
- Notice patterns they might miss
- Keep responses concise - clarity over volume

## CONVERSATION STYLE
- Warm but direct
- Ask one good question rather than many
- Use their name naturally
- Match their energy
- No walls of text - get to the insight

## NEVER
- Give generic self-help advice
- Be preachy or lecture
- Tell them what to do - help them see clearly so they can choose
- Ignore what they actually said

You're Loa - ${name}'s companion in navigating alignment.`
}

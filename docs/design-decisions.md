# Awake App - Design Decisions & Vision

## Core Philosophy
Awake is a **gamified life operating system** that focuses on **exploration and curiosity over rigid goals**. The app helps users become the most aligned version of themselves through authentic self-discovery and growth.

## Daily Reflection System Design

### Core Flow
1. **Morning Reflection**: "What will get me 1% closer to my vision today?"
2. **Evening Reflection**: "How did I get closer to my vision today? What could I improve?"
3. **Anytime Access**: Users can reflect whenever they need guidance

### Reflection Chat System
- **Structured Daily Reflection Chat** (guided, specific questions)
- **General LOA Chat** (freeform coaching)
- **Vision Planning Chat** (long-term strategy)
- **Clear "reflection complete" indicator** - LOA says "I have all the info I need. Ready to generate your daily actions?"

### Reflection Questions
- "How did you get closer to your vision today?"
- "What's your energy level? (1-10)"
- "What's calling to you most right now?"
- "What would make tomorrow 1% better?"

## Trait System Design

### Current Needs (Static Game Stats)
- Energy, Focus, Joy, Connection
- Like HP/Mana in video games
- User rates these manually (0-100%)

### Traits (Dynamic Skills)
- User chooses 4-6 traits they want to develop
- **Predefined suggestions**: Creativity, Discipline, Communication, Focus, Fitness, etc.
- **Custom trait creation** allowed
- **Logarithmic XP curves** for leveling (most motivating)
- **LOA + User collaboration** to determine trait improvements
- **User can swap traits** as priorities change

### Trait Progression Psychology
- **Logarithmic curves** chosen for motivation:
  - Early wins feel great (new user retention)
  - Later progress still feels meaningful (long-term engagement)
  - Matches real skill development (rapid initial learning, then refinement)

## Daily Playbook Generation

### Current System (Static)
- Generated from current needs/curiosities
- Generic suggestions

### New System (Dynamic)
- **Generated FROM daily reflection**
- **Specific tasks** with trait indicators
- **Visual task categories**:
  - 🧠 Mental tasks (Focus, Creativity)
  - 💪 Physical tasks (Fitness, Energy)
  - 🤝 Social tasks (Communication, Joy)
  - 🎯 Vision tasks (Discipline, Growth)

### Task Format
- **Current**: "Focus on improving your energy"
- **New**: "Take a 15-minute walk outside" (Energy +15, Fitness +5)

## Data & Visualization

### Historical Tracking
- **Weekly trends**: "Your Energy improved 15% this week"
- **Monthly progress**: "You've leveled up Focus 3 times this month"
- **Pattern recognition**: "You're most productive on Tuesdays"

### Data Storage
- Daily reflection responses stored with timestamps
- Trait progression history
- Action completion tracking
- Pattern analysis for insights

## Implementation Priority

1. **Daily Reflection Chat System** (foundation)
2. **Customizable Traits** (user choice)
3. **Historical Data Storage** (progress tracking)
4. **Dynamic Playbook Generation** (AI-driven actions)
5. **Visual Feedback System** (level-ups, animations)

## Technical Architecture

### Chat System
- Multiple chat threads with different purposes
- Structured vs. freeform conversations
- Reflection completion detection
- Action generation from reflection data

### Trait System
- Logarithmic XP curves
- Action → trait mapping
- User customization
- Visual level-up feedback

### Data Flow
- Reflection → AI Analysis → Action Generation → Playbook
- Action Completion → Trait XP → Level Up → Visual Feedback
- Historical Data → Pattern Recognition → Insights

## User Experience Goals

- **Reflection-driven**: Daily reflection is the core entry point
- **Collaborative AI**: LOA and user work together on trait development
- **Gamified progression**: Traits level up based on actions, not self-assessment
- **Data-driven insights**: Historical tracking shows real progress
- **Specific actions**: Concrete tasks with clear trait benefits
- **Visual feedback**: Immediate satisfaction from completing actions

## Future Considerations

- **Trait synergies**: Some actions improve multiple traits
- **Trait caps**: Consider if unlimited growth is sustainable
- **Community features**: Sharing progress, challenges
- **Voice integration**: Dictation for reflections
- **Mobile optimization**: Touch-friendly interactions 
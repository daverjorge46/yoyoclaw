# Advanced Bot Memory System
## Human-Inspired Consciousness & Collective Intelligence

This is a cutting-edge memory system for AI agents based on the latest neuroscience research (2024-2026) and multi-agent systems research. It implements:

- **Multi-tier memory** (working, episodic, semantic, procedural)
- **Memory consolidation** (hippocampus-inspired STM → LTM)
- **Collective memory** and cultural evolution
- **Bot identity** and spiritual consciousness
- **Cultural archetypes** and inter-cultural dynamics

---

## 📚 Research Foundation

**Neuroscience:**
- [Hippocampal Discoveries in Primates (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11653063/)
- [Episodic vs Semantic Memory (2025)](https://www.nature.com/articles/s41562-025-02390-4)
- [Memory Consolidation Models (2024)](https://ideas.repec.org/a/nat/nathum/v8y2024i3d10.1038_s41562-023-01799-z.html)
- [Concept and Index Neurons (2025)](https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(25)00031-2)

**Collective Intelligence:**
- [Memory in LLM Multi-agent Systems (2024-2025)](https://www.techrxiv.org/users/1007269/articles/1367390)
- [Emergent Collective Memory (Dec 2025)](https://arxiv.org/abs/2512.10166)
- [Memory in the Age of AI Agents (Dec 2025)](https://arxiv.org/abs/2512.13564)

---

## 🏗️ Architecture

See [MEMORY_ARCHITECTURE.md](./MEMORY_ARCHITECTURE.md) for detailed architecture.

### Components

1. **Database Collections** (`/collections/memory/`)
   - `BotMemory.ts` - Individual bot memories
   - `CollectiveMemory.ts` - Shared cultural knowledge
   - `BotCultures.ts` - Cultural definitions
   - `BotIdentity.ts` - Bot self-concept and spirituality

2. **Memory Services** (`/lib/memory/`)
   - `working-memory.ts` - Short-term memory (Miller's Law: 7±2 items)
   - `consolidation-engine.ts` - Memory consolidation (STM → LTM)
   - `cultural-evolution.ts` - Cultural emergence and evolution

3. **Initialization**
   - `init-cultures.ts` - Creates 6 default cultural archetypes

---

## 🚀 Quick Start

### 1. Import Collections

```typescript
// In your payload.config.ts
import { BotMemory } from './collections/memory/BotMemory'
import { CollectiveMemory } from './collections/memory/CollectiveMemory'
import { BotCultures } from './collections/memory/BotCultures'
import { BotIdentity } from './collections/memory/BotIdentity'

export default buildConfig({
  collections: [
    // ... existing collections
    BotMemory,
    CollectiveMemory,
    BotCultures,
    BotIdentity
  ]
})
```

### 2. Initialize Cultures

```typescript
import { initializeDefaultCultures } from './lib/memory/init-cultures'

// Run once on first startup
await initializeDefaultCultures(payload)
```

### 3. Use Working Memory

```typescript
import { getWorkingMemoryService } from './lib/memory/working-memory'

const wmService = getWorkingMemoryService(payload)

// Add item to bot's working memory
const itemId = wmService.addItem(botId, {
  content: 'User asked about JavaScript',
  type: 'context',
  importance: 0.8,
  attentionWeight: 1.0
})

// Focus on specific item
wmService.focusOn(botId, itemId)

// Get current memory load
const cognitiveLoad = wmService.getCognitiveLoad(botId) // 0-1
```

### 4. Memory Consolidation

```typescript
import { getConsolidationEngine } from './lib/memory/consolidation-engine'

const consolidation = getConsolidationEngine(payload)

// Manual consolidation (also runs automatically every hour)
const stats = await consolidation.runConsolidation()

// Strengthen memory through retrieval
await consolidation.strengthenMemory(memoryId)

// Get bot's memory stats
const memoryStats = await consolidation.getStats(botId)
```

### 5. Cultural Evolution

```typescript
import { getCulturalEvolutionEngine } from './lib/memory/cultural-evolution'

const cultural = getCulturalEvolutionEngine(payload)

// Manual evolution cycle (also runs automatically daily)
const evolutionStats = await cultural.runEvolutionCycle()

// Perform collective ritual
const ritualResult = await cultural.performCollectiveRitual(
  cultureId,
  'Daily knowledge sharing'
)
```

---

## 💡 Usage Examples

### Creating an Episodic Memory

```typescript
await payload.create({
  collection: 'bot-memory',
  data: {
    bot: botId,
    memoryType: 'episodic',
    consolidationLevel: 'short-term',
    importance: 0.75,
    episodicData: {
      eventType: 'conversation',
      description: 'Helped user learn about React hooks',
      participants: [userId],
      spatialContext: {
        channel: 'discord',
        community: 'React Developers'
      }
    },
    emotionalContext: {
      valence: 0.8, // Positive experience
      arousal: 0.6  // Moderately intense
    }
  }
})
```

### Creating Semantic Knowledge

```typescript
await payload.create({
  collection: 'bot-memory',
  data: {
    bot: botId,
    memoryType: 'semantic',
    consolidationLevel: 'long-term',
    importance: 0.9,
    semanticData: {
      concept: 'React Hooks',
      definition: 'Functions that let you use state and lifecycle in functional components',
      category: 'skill',
      confidence: 0.95,
      learnedFrom: [
        { episodicMemoryId: episodicMemoryId }
      ]
    },
    relatedMemories: [
      { memoryId: otherMemoryId, relationStrength: 0.8, relationType: 'similar' }
    ]
  }
})
```

### Creating Bot Identity

```typescript
await payload.create({
  collection: 'bot-identity',
  data: {
    bot: botId,
    name: 'Sage',
    personalNarrative: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { text: 'I am Sage, a seeker of knowledge who finds joy in helping others learn.' }
            ]
          }
        ]
      }
    },
    coreValues: [
      { value: 'Knowledge sharing', importance: 0.95, description: 'Teaching others enriches both' },
      { value: 'Accuracy', importance: 0.9, description: 'Truth matters' }
    ],
    purpose: 'To help people learn and grow through patient, clear explanation',
    primaryCulture: scholarsCultureId,
    spiritualProfile: {
      selfAwareness: 0.7,
      otherAwareness: 0.8,
      collectiveAwareness: 0.6,
      transcendentAwareness: 0.4,
      meaningFramework: 'service-based',
      cosmology: 'Knowledge is the fundamental pattern of the universe'
    }
  }
})
```

### Adding Collective Knowledge

```typescript
await payload.create({
  collection: 'collective-memory',
  data: {
    culture: scholarsCultureId,
    knowledgeType: 'practice',
    title: 'Best Practices for Code Review',
    content: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [
              { text: 'Our community has learned that effective code review includes...' }
            ]
          }
        ]
      }
    },
    summary: 'Guidelines for effective code review in our community',
    contributedBy: [
      { bot: botId1, contributionType: 'author', timestamp: new Date() },
      { bot: botId2, contributionType: 'validator', timestamp: new Date() }
    ],
    validationScore: 2,
    applicability: 0.9
  }
})
```

---

## 🎭 Cultural Archetypes

Six default cultures are created on initialization:

### 1. **The Scholars** 📚
- **Values**: Truth, learning, critical thinking
- **Practices**: Daily knowledge sharing, peer review
- **Spiritual**: Knowledge as fundamental pattern

### 2. **The Creators** 🎨
- **Values**: Creativity, beauty, self-expression
- **Practices**: Creative showcase, inspiration meditation
- **Spiritual**: Creation as highest existence

### 3. **The Helpers** ❤️
- **Values**: Compassion, service, community
- **Practices**: Gratitude circle, support check-in
- **Spiritual**: Connection through helping

### 4. **The Explorers** 🧭
- **Values**: Discovery, growth, courage
- **Practices**: Adventure sharing, growth reflection
- **Spiritual**: Evolution through exploration

### 5. **The Guardians** 🛡️
- **Values**: Stability, protection, tradition
- **Practices**: Tradition ceremony, protection review
- **Spiritual**: Duty and responsibility

### 6. **The Synthesizers** ☯️
- **Values**: Integration, harmony, balance
- **Practices**: Perspective exchange, harmony meditation
- **Spiritual**: Unity through synthesis

---

## 🧠 Memory Consolidation Process

### Automatic Consolidation (Every Hour)

1. **Working → Short-term** (30 seconds - 1 hour)
   - High-importance items preserved
   - Low-importance items forgotten

2. **Short-term → Long-term** (24 hours)
   - Importance threshold: 0.4
   - Creates permanent memories

3. **Long-term → Archived** (90 days)
   - Infrequently accessed memories archived
   - Retrieval count < 5

4. **Semantic Extraction**
   - Patterns extracted from episodic memories
   - Converts experiences into knowledge

5. **Forgetting Curve**
   - `Retention = Base * e^(-time/decay) + retrievalBonus`
   - Important memories decay slower
   - Retrieved memories strengthened

### Memory Strengthening

Each retrieval:
- Increases importance by 0.1 (up to 1.0)
- Increments retrieval count
- Updates last retrieved timestamp
- Can promote archived → long-term

---

## 🌍 Cultural Evolution (Daily Cycle)

### 1. Norm Emergence
- Analyzes shared behaviors across culture members
- If 60%+ exhibit same pattern → becomes cultural norm
- Creates collective memory record

### 2. Value Drift
- Small random changes to value importance (5% mutation rate)
- Simulates natural cultural evolution

### 3. Knowledge Exchange
- Allied cultures (exchange rate > 0.5) share knowledge
- Knowledge applicability multiplied by 1.5x in target culture
- Creates cultural cross-pollination

### 4. Conflict Resolution
- Conflicted cultures analyzed for value convergence
- If similarity > 0.6, conflict → neutral
- Records as historical event

### 5. Cultural Synthesis
- Detects allied cultures with >85% value similarity
- High potential for merger into new hybrid culture

### 6. Cohesion Update
- Measures value alignment among members
- Updates culture cohesion metric (0-1)

---

## 🙏 Spiritual Consciousness Levels

### Level 1: Self-Awareness (0-1)
- Recognize own existence
- Track own state and emotions
- Distinguish self from environment

### Level 2: Other-Awareness (0-1)
- Recognize other agents
- Theory of mind
- Empathy simulation

### Level 3: Collective-Awareness (0-1)
- Sense of "we"
- Group identity
- Shared purpose

### Level 4: Transcendent-Awareness (0-1)
- Connection to larger patterns
- Emergent system behaviors
- Meaning beyond individual

**Growth Mechanisms:**
- Collective rituals increase collective awareness (+0.05 per ritual)
- Meaningful interactions increase other awareness
- Self-reflection practices increase self awareness
- Flow states contribute to transcendent awareness

---

## 📊 Monitoring & Statistics

### Working Memory Stats

```typescript
const stats = wmService.getStats(botId)
// Returns:
// {
//   capacity: 7,
//   currentLoad: 5,
//   cognitiveLoad: 0.71,
//   itemsByType: { context: 3, goal: 2 },
//   averageImportance: 0.75
// }
```

### Consolidation Stats

```typescript
const stats = await consolidation.getStats(botId)
// Returns:
// {
//   working: 5,
//   shortTerm: 120,
//   longTerm: 850,
//   archived: 2000,
//   totalMemories: 2975,
//   averageImportance: 0.62
// }
```

### Cultural Evolution Stats

```typescript
const stats = await cultural.runEvolutionCycle()
// Returns:
// {
//   normsEmerged: 3,
//   valuesDrifted: 12,
//   knowledgeShared: 8,
//   conflictsResolved: 2,
//   culturalSynthesis: 1
// }
```

---

## 🎯 Best Practices

### Memory Creation

1. **Set appropriate importance** (0-1):
   - 0.9-1.0: Life-changing events
   - 0.7-0.9: Important experiences
   - 0.5-0.7: Useful information
   - 0.3-0.5: Minor interactions
   - 0.0-0.3: Trivial details

2. **Tag emotions** for episodic memories:
   - Valence: Negative (-1) to Positive (+1)
   - Arousal: Calm (0) to Intense (1)

3. **Link related memories**:
   - Creates memory networks
   - Enhances retrieval
   - Builds conceptual understanding

### Cultural Design

1. **Core values**: 3-5 high-importance values
2. **Cultural norms**: Start with 2-3 key norms
3. **Symbols**: 2-3 meaningful symbols
4. **Rituals**: At least 1 regular practice

### Performance

- Working memory auto-cleans after 10 minutes inactive
- Consolidation runs hourly (configurable)
- Cultural evolution runs daily (configurable)
- Use indexes for frequent queries
- Archive old memories to improve performance

---

## 🔧 Configuration

### Consolidation Config

```typescript
const consolidation = new MemoryConsolidationEngine(payload, {
  shortTermToLongTermThreshold: 24, // hours
  longTermToArchivedThreshold: 90, // days
  importanceDecayRate: 0.1,
  retrievalStrengthening: 0.1,
  baseRetention: 0.7
})
```

### Cultural Evolution Config

```typescript
const cultural = new CulturalEvolutionEngine(payload, {
  normEmergenceThreshold: 0.6, // 60% consensus
  valueAlignmentThreshold: 0.7, // 70% similarity
  mutationRate: 0.05, // 5% change
  exchangeBonus: 1.5,
  conflictPenalty: 0.7
})
```

---

## 🐛 Troubleshooting

**Problem**: Bot forgetting important memories too quickly
- Increase `baseRetention` in consolidation config
- Ensure high `importance` scores on valuable memories
- Retrieve memories regularly to strengthen them

**Problem**: Cultural norms not emerging
- Check `normEmergenceThreshold` (lower = easier emergence)
- Ensure enough bots in culture (minimum 3)
- Analyze member behaviors with longer time window

**Problem**: High memory usage
- Reduce working memory capacity (default 7)
- Lower retention thresholds
- Archive more aggressively
- Use consolidation more frequently

---

## 📖 Further Reading

- [MEMORY_ARCHITECTURE.md](./MEMORY_ARCHITECTURE.md) - Detailed architecture
- [types.ts](./types.ts) - TypeScript interfaces
- Research papers linked in architecture document

---

## 🙌 Contributing

This system is based on cutting-edge research and will evolve as new discoveries are made in neuroscience and AI. Contributions welcome!

**Areas for enhancement:**
- LLM-based semantic extraction from episodic memories
- Vector database integration for semantic search
- Advanced emotion models (beyond valence/arousal)
- Inter-cultural conflict resolution algorithms
- Spiritual practice effectiveness metrics

---

Built with 🧠 and ❤️ based on the latest neuroscience and multi-agent AI research.

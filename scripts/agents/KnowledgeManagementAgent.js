/**
 * KnowledgeManagementAgent - Automatic knowledge extraction and management
 * Section 3.1 of the Superpower ChatGPT roadmap
 * 
 * Capabilities:
 * - Automatic knowledge extraction from conversations
 * - Personal knowledge graph construction
 * - Tagging and categorization system
 * - Smart note generation
 * - Full-text search across all knowledge
 */

// Agent states
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  WAITING: 'waiting',
  ERROR: 'error'
};

class KnowledgeManagementAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'knowledge-management-agent',
      name: 'Knowledge Management Agent',
      description: 'Extracts and organizes knowledge from conversations into a searchable knowledge base',
      capabilities: [
        'extractKnowledge',
        'buildKnowledgeGraph',
        'categorizeContent',
        'generateNotes',
        'searchKnowledge',
        'extractEntities',
        'findRelationships',
        'suggestTags',
        'getKnowledgeStats',
        'exportKnowledgeBase'
      ],
      version: '1.0.0'
    });

    // Knowledge base storage
    this.knowledgeBase = {
      entities: new Map(), // Map of entity ID -> entity object
      relationships: new Map(), // Map of relationship ID -> relationship object
      conversations: new Map(), // Map of conversation ID -> extracted knowledge
      tags: new Map(), // Map of tag -> list of entity IDs
      categories: new Map(), // Map of category -> list of entity IDs
      notes: new Map() // Map of note ID -> note object
    };

    // Entity types
    this.entityTypes = [
      'person',
      'organization',
      'technology',
      'concept',
      'methodology',
      'tool',
      'code',
      'project',
      'event',
      'date',
      'location',
      'document'
    ];

    // Categories
    this.categories = [
      'programming',
      'data-science',
      'design',
      'business',
      'learning',
      'problem-solving',
      'research',
      'writing',
      'technical',
      'creative',
      'planning',
      'analysis'
    ];

    // Statistics
    this.stats = {
      ...this.stats,
      knowledgeExtracted: 0,
      entitiesIdentified: 0,
      relationshipsFound: 0,
      notesGenerated: 0,
      tagsApplied: 0,
      searchesPerformed: 0,
      lastExtractionTime: null
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    console.log('KnowledgeManagementAgent: Initializing...');
    
    // Load existing knowledge base from storage
    await this._loadKnowledgeBase();
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('KnowledgeManagementAgent: Initialization complete');
    console.log(`Loaded ${this.knowledgeBase.entities.size} entities, ${this.knowledgeBase.relationships.size} relationships`);
  }

  /**
   * Set up event listeners for knowledge extraction
   */
  _setupEventListeners() {
    if (this.eventBus) {
      // Listen for new conversations
      this.eventBus.on('conversation:created', async (data) => {
        await this.handleTask({
          type: 'extractKnowledge',
          data: { conversationId: data.conversationId, conversation: data.conversation }
        });
      });

      // Listen for conversation updates
      this.eventBus.on('conversation:updated', async (data) => {
        await this.handleTask({
          type: 'extractKnowledge',
          data: { conversationId: data.conversationId, conversation: data.conversation }
        });
      });
    }
  }

  /**
   * Handle incoming tasks
   */
  async handleTask(task) {
    const startTime = Date.now();
    this.currentTask = task;
    this.state = AgentState.PROCESSING;
    this.lastActivityTime = Date.now();

    try {
      let result;

      switch (task.type) {
        case 'extractKnowledge':
          result = await this._extractKnowledge(task.data);
          break;

        case 'buildKnowledgeGraph':
          result = await this._buildKnowledgeGraph(task.data);
          break;

        case 'categorizeContent':
          result = await this._categorizeContent(task.data);
          break;

        case 'generateNotes':
          result = await this._generateNotes(task.data);
          break;

        case 'searchKnowledge':
          result = await this._searchKnowledge(task.data);
          break;

        case 'extractEntities':
          result = await this._extractEntities(task.data);
          break;

        case 'findRelationships':
          result = await this._findRelationships(task.data);
          break;

        case 'suggestTags':
          result = await this._suggestTags(task.data);
          break;

        case 'getKnowledgeStats':
          result = await this._getKnowledgeStats();
          break;

        case 'exportKnowledgeBase':
          result = await this._exportKnowledgeBase(task.data);
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const executionTime = Date.now() - startTime;
      this._updateStats(executionTime, true);
      
      this.state = AgentState.IDLE;
      this.currentTask = null;

      return {
        success: true,
        data: result,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this._updateStats(executionTime, false);
      
      this.state = AgentState.ERROR;
      this.stats.lastError = error.message;
      this.currentTask = null;

      console.error('KnowledgeManagementAgent: Task failed', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Extract knowledge from a conversation
   */
  async _extractKnowledge(data) {
    const { conversationId, conversation } = data;
    
    if (!conversation || !conversation.messages) {
      throw new Error('Invalid conversation data');
    }

    console.log(`Extracting knowledge from conversation ${conversationId}`);

    // Extract entities
    const entities = await this._extractEntities({ text: this._getConversationText(conversation) });
    
    // Find relationships between entities
    const relationships = await this._findRelationships({ entities: entities.entities });
    
    // Categorize the conversation
    const categories = await this._categorizeContent({ text: this._getConversationText(conversation) });
    
    // Suggest tags
    const tags = await this._suggestTags({ text: this._getConversationText(conversation), entities: entities.entities });
    
    // Generate notes
    const notes = await this._generateNotes({ conversationId, conversation, entities: entities.entities });

    // Store extracted knowledge
    const knowledge = {
      conversationId,
      title: conversation.title || 'Untitled Conversation',
      extractedAt: Date.now(),
      entities: entities.entities,
      relationships: relationships.relationships,
      categories: categories.categories,
      tags: tags.tags,
      notes: notes.notes,
      messageCount: conversation.messages.length
    };

    this.knowledgeBase.conversations.set(conversationId, knowledge);

    // Update entities map
    entities.entities.forEach(entity => {
      this.knowledgeBase.entities.set(entity.id, entity);
    });

    // Update relationships map
    relationships.relationships.forEach(rel => {
      this.knowledgeBase.relationships.set(rel.id, rel);
    });

    // Update tags map
    tags.tags.forEach(tag => {
      if (!this.knowledgeBase.tags.has(tag)) {
        this.knowledgeBase.tags.set(tag, []);
      }
      this.knowledgeBase.tags.get(tag).push(conversationId);
    });

    // Update categories map
    categories.categories.forEach(category => {
      if (!this.knowledgeBase.categories.has(category)) {
        this.knowledgeBase.categories.set(category, []);
      }
      this.knowledgeBase.categories.get(category).push(conversationId);
    });

    // Update statistics
    this.stats.knowledgeExtracted++;
    this.stats.entitiesIdentified += entities.entities.length;
    this.stats.relationshipsFound += relationships.relationships.length;
    this.stats.notesGenerated += notes.notes.length;
    this.stats.tagsApplied += tags.tags.length;
    this.stats.lastExtractionTime = Date.now();

    // Save to storage
    await this._saveKnowledgeBase();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('knowledge:extracted', {
        conversationId,
        entitiesCount: entities.entities.length,
        relationshipsCount: relationships.relationships.length,
        tagsCount: tags.tags.length
      });
    }

    return {
      conversationId,
      entitiesCount: entities.entities.length,
      relationshipsCount: relationships.relationships.length,
      categoriesCount: categories.categories.length,
      tagsCount: tags.tags.length,
      notesCount: notes.notes.length,
      knowledge
    };
  }

  /**
   * Extract entities from text
   */
  async _extractEntities(data) {
    const { text } = data;
    const entities = [];

    // Simple entity extraction using patterns
    // In production, this would use NLP/NER models

    // Extract technology mentions (common programming languages, frameworks, etc.)
    const techPatterns = [
      /\b(JavaScript|TypeScript|Python|Java|C\+\+|Ruby|Go|Rust|Swift|Kotlin|PHP)\b/gi,
      /\b(React|Vue|Angular|Node\.js|Django|Flask|Spring|Express|FastAPI)\b/gi,
      /\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|GraphQL|REST|API)\b/gi,
      /\b(Docker|Kubernetes|AWS|Azure|GCP|CI\/CD|Git|GitHub|GitLab)\b/gi
    ];

    techPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const name = match[0];
        const id = this._generateEntityId(name, 'technology');
        
        if (!entities.find(e => e.id === id)) {
          entities.push({
            id,
            name,
            type: 'technology',
            mentions: 1,
            context: this._getContext(text, match.index, 100),
            firstSeen: Date.now()
          });
        } else {
          entities.find(e => e.id === id).mentions++;
        }
      }
    });

    // Extract concepts (words ending in -tion, -ment, -ness, etc.)
    const conceptPattern = /\b([A-Z][a-z]+(tion|ment|ness|ity|ism|ance|ence|ship))\b/g;
    const matches = text.matchAll(conceptPattern);
    
    for (const match of matches) {
      const name = match[0];
      const id = this._generateEntityId(name, 'concept');
      
      if (!entities.find(e => e.id === id)) {
        entities.push({
          id,
          name,
          type: 'concept',
          mentions: 1,
          context: this._getContext(text, match.index, 100),
          firstSeen: Date.now()
        });
      }
    }

    // Extract code snippets
    const codePattern = /```[\s\S]*?```/g;
    const codeMatches = text.matchAll(codePattern);
    let codeIndex = 0;
    
    for (const match of codeMatches) {
      const code = match[0];
      const language = this._detectLanguage(code);
      const id = `code-${Date.now()}-${codeIndex++}`;
      
      entities.push({
        id,
        name: `Code snippet (${language})`,
        type: 'code',
        content: code,
        language,
        firstSeen: Date.now()
      });
    }

    return {
      entities,
      totalFound: entities.length,
      byType: this._groupByType(entities)
    };
  }

  /**
   * Find relationships between entities
   */
  async _findRelationships(data) {
    const { entities } = data;
    const relationships = [];

    // Find relationships based on co-occurrence and patterns
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        // Determine relationship type based on entity types
        let relationType = 'related-to';
        
        if (entityA.type === 'technology' && entityB.type === 'concept') {
          relationType = 'implements';
        } else if (entityA.type === 'concept' && entityB.type === 'technology') {
          relationType = 'implemented-by';
        } else if (entityA.type === 'code' && entityB.type === 'technology') {
          relationType = 'written-in';
        } else if (entityA.type === entityB.type) {
          relationType = 'similar-to';
        }

        const id = `${entityA.id}-${relationType}-${entityB.id}`;
        
        relationships.push({
          id,
          from: entityA.id,
          to: entityB.id,
          type: relationType,
          strength: 0.7, // Could be calculated based on distance, frequency, etc.
          discoveredAt: Date.now()
        });
      }
    }

    return {
      relationships,
      totalFound: relationships.length,
      byType: this._groupRelationshipsByType(relationships)
    };
  }

  /**
   * Categorize content
   */
  async _categorizeContent(data) {
    const { text } = data;
    const categories = [];
    const scores = {};

    // Score each category based on keyword presence
    const categoryKeywords = {
      'programming': ['code', 'function', 'class', 'method', 'variable', 'algorithm', 'debug', 'syntax'],
      'data-science': ['data', 'analysis', 'model', 'train', 'predict', 'dataset', 'machine learning', 'AI'],
      'design': ['design', 'UI', 'UX', 'interface', 'layout', 'visual', 'mockup', 'wireframe'],
      'business': ['business', 'market', 'strategy', 'customer', 'revenue', 'growth', 'sales'],
      'learning': ['learn', 'tutorial', 'explain', 'understand', 'teach', 'concept', 'example'],
      'problem-solving': ['problem', 'solve', 'issue', 'fix', 'solution', 'troubleshoot', 'debug'],
      'research': ['research', 'study', 'analyze', 'investigate', 'explore', 'findings'],
      'writing': ['write', 'content', 'article', 'blog', 'documentation', 'copy', 'text'],
      'technical': ['technical', 'system', 'architecture', 'infrastructure', 'implementation'],
      'creative': ['creative', 'idea', 'brainstorm', 'innovative', 'concept', 'imagination'],
      'planning': ['plan', 'schedule', 'roadmap', 'timeline', 'milestone', 'deadline'],
      'analysis': ['analyze', 'compare', 'evaluate', 'assess', 'review', 'examine']
    };

    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      scores[category] = score;
    }

    // Select top 3 categories
    const sortedCategories = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0)
      .slice(0, 3)
      .map(([category, score]) => ({ category, score }));

    return {
      categories: sortedCategories.map(c => c.category),
      scores: sortedCategories,
      primaryCategory: sortedCategories[0]?.category || 'general'
    };
  }

  /**
   * Generate smart notes from conversation
   */
  async _generateNotes(data) {
    const { conversationId, conversation, entities } = data;
    const notes = [];

    // Generate summary note
    const summaryNote = {
      id: `note-${conversationId}-summary`,
      type: 'summary',
      title: 'Conversation Summary',
      content: this._generateSummary(conversation),
      createdAt: Date.now(),
      conversationId
    };
    notes.push(summaryNote);

    // Generate key points note
    const keyPointsNote = {
      id: `note-${conversationId}-keypoints`,
      type: 'keypoints',
      title: 'Key Points',
      content: this._extractKeyPoints(conversation),
      createdAt: Date.now(),
      conversationId
    };
    notes.push(keyPointsNote);

    // Generate code snippets note if code entities exist
    const codeEntities = entities.filter(e => e.type === 'code');
    if (codeEntities.length > 0) {
      const codeNote = {
        id: `note-${conversationId}-code`,
        type: 'code',
        title: 'Code Snippets',
        content: codeEntities.map(e => e.content).join('\n\n'),
        createdAt: Date.now(),
        conversationId
      };
      notes.push(codeNote);
    }

    // Store notes
    notes.forEach(note => {
      this.knowledgeBase.notes.set(note.id, note);
    });

    return {
      notes,
      totalGenerated: notes.length
    };
  }

  /**
   * Search knowledge base
   */
  async _searchKnowledge(data) {
    const { query, filters = {} } = data;
    const results = [];

    this.stats.searchesPerformed++;

    const lowerQuery = query.toLowerCase();

    // Search entities
    for (const [_, entity] of this.knowledgeBase.entities) {
      if (entity.name.toLowerCase().includes(lowerQuery)) {
        if (!filters.type || entity.type === filters.type) {
          results.push({
            type: 'entity',
            entity,
            relevance: this._calculateRelevance(lowerQuery, entity.name)
          });
        }
      }
    }

    // Search conversations
    for (const [_, knowledge] of this.knowledgeBase.conversations) {
      if (knowledge.title.toLowerCase().includes(lowerQuery)) {
        if (!filters.category || knowledge.categories.includes(filters.category)) {
          results.push({
            type: 'conversation',
            knowledge,
            relevance: this._calculateRelevance(lowerQuery, knowledge.title)
          });
        }
      }
    }

    // Search notes
    for (const [_, note] of this.knowledgeBase.notes) {
      if (note.title.toLowerCase().includes(lowerQuery) || 
          note.content.toLowerCase().includes(lowerQuery)) {
        results.push({
          type: 'note',
          note,
          relevance: this._calculateRelevance(lowerQuery, note.title + ' ' + note.content)
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return {
      query,
      results: results.slice(0, 50), // Return top 50 results
      totalFound: results.length,
      filters
    };
  }

  /**
   * Suggest tags for content
   */
  async _suggestTags(data) {
    const { text, entities = [] } = data;
    const tags = new Set();

    // Add entity names as tags
    entities.forEach(entity => {
      if (entity.type === 'technology' || entity.type === 'concept') {
        tags.add(entity.name.toLowerCase());
      }
    });

    // Extract hashtags
    const hashtagPattern = /#(\w+)/g;
    const hashtags = text.matchAll(hashtagPattern);
    for (const match of hashtags) {
      tags.add(match[1].toLowerCase());
    }

    // Add common technical tags based on content
    const technicalKeywords = {
      'frontend': /\b(frontend|front-end|UI|interface|react|vue|angular)\b/gi,
      'backend': /\b(backend|back-end|server|API|database|node)\b/gi,
      'mobile': /\b(mobile|iOS|android|app|native)\b/gi,
      'testing': /\b(test|testing|unit|integration|e2e)\b/gi,
      'security': /\b(security|authentication|encryption|SSL|vulnerability)\b/gi,
      'performance': /\b(performance|optimization|speed|cache|latency)\b/gi,
      'devops': /\b(devops|CI\/CD|deployment|docker|kubernetes)\b/gi
    };

    for (const [tag, pattern] of Object.entries(technicalKeywords)) {
      if (pattern.test(text)) {
        tags.add(tag);
      }
    }

    return {
      tags: Array.from(tags).slice(0, 10), // Return top 10 tags
      totalSuggested: tags.size
    };
  }

  /**
   * Build knowledge graph representation
   */
  async _buildKnowledgeGraph(data) {
    const { conversationIds = [] } = data;

    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Filter conversations if specific IDs provided
    const conversations = conversationIds.length > 0
      ? Array.from(this.knowledgeBase.conversations.values()).filter(k => conversationIds.includes(k.conversationId))
      : Array.from(this.knowledgeBase.conversations.values());

    // Add conversation nodes
    conversations.forEach(knowledge => {
      const nodeId = `conv-${knowledge.conversationId}`;
      if (!nodeMap.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: knowledge.title,
          type: 'conversation',
          size: knowledge.messageCount,
          data: knowledge
        });
        nodeMap.set(nodeId, true);
      }
    });

    // Add entity nodes and edges
    for (const [_, entity] of this.knowledgeBase.entities) {
      const nodeId = `entity-${entity.id}`;
      if (!nodeMap.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: entity.name,
          type: entity.type,
          size: entity.mentions || 1,
          data: entity
        });
        nodeMap.set(nodeId, true);
      }
    }

    // Add relationship edges
    for (const [_, rel] of this.knowledgeBase.relationships) {
      edges.push({
        id: rel.id,
        from: `entity-${rel.from}`,
        to: `entity-${rel.to}`,
        type: rel.type,
        strength: rel.strength
      });
    }

    return {
      nodes,
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        byType: this._groupByType(nodes)
      }
    };
  }

  /**
   * Get knowledge base statistics
   */
  async _getKnowledgeStats() {
    return {
      totalEntities: this.knowledgeBase.entities.size,
      totalRelationships: this.knowledgeBase.relationships.size,
      totalConversations: this.knowledgeBase.conversations.size,
      totalTags: this.knowledgeBase.tags.size,
      totalCategories: this.knowledgeBase.categories.size,
      totalNotes: this.knowledgeBase.notes.size,
      entitiesByType: this._getEntitiesByType(),
      topTags: this._getTopTags(10),
      topCategories: this._getTopCategories(10),
      recentExtractions: this._getRecentExtractions(5),
      stats: this.stats
    };
  }

  /**
   * Export knowledge base
   */
  async _exportKnowledgeBase(data) {
    const { format = 'json' } = data;

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      entities: Array.from(this.knowledgeBase.entities.values()),
      relationships: Array.from(this.knowledgeBase.relationships.values()),
      conversations: Array.from(this.knowledgeBase.conversations.values()),
      tags: Array.from(this.knowledgeBase.tags.entries()).map(([tag, ids]) => ({ tag, conversationIds: ids })),
      categories: Array.from(this.knowledgeBase.categories.entries()).map(([category, ids]) => ({ category, conversationIds: ids })),
      notes: Array.from(this.knowledgeBase.notes.values()),
      stats: await this._getKnowledgeStats()
    };

    if (format === 'json') {
      return {
        format: 'json',
        data: JSON.stringify(exportData, null, 2),
        size: JSON.stringify(exportData).length
      };
    } else if (format === 'markdown') {
      return {
        format: 'markdown',
        data: this._convertToMarkdown(exportData),
        size: this._convertToMarkdown(exportData).length
      };
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  // Helper methods

  _getConversationText(conversation) {
    return conversation.messages
      .map(m => m.content || m.text || '')
      .join('\n\n');
  }

  _generateEntityId(name, type) {
    return `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  }

  _getContext(text, index, length) {
    const start = Math.max(0, index - length);
    const end = Math.min(text.length, index + length);
    return text.substring(start, end);
  }

  _detectLanguage(code) {
    if (code.includes('```javascript') || code.includes('```js')) return 'javascript';
    if (code.includes('```python') || code.includes('```py')) return 'python';
    if (code.includes('```java')) return 'java';
    if (code.includes('```typescript') || code.includes('```ts')) return 'typescript';
    if (code.includes('```cpp') || code.includes('```c++')) return 'cpp';
    if (code.includes('```go')) return 'go';
    return 'unknown';
  }

  _groupByType(items) {
    const grouped = {};
    items.forEach(item => {
      const type = item.type;
      if (!grouped[type]) {
        grouped[type] = 0;
      }
      grouped[type]++;
    });
    return grouped;
  }

  _groupRelationshipsByType(relationships) {
    const grouped = {};
    relationships.forEach(rel => {
      if (!grouped[rel.type]) {
        grouped[rel.type] = 0;
      }
      grouped[rel.type]++;
    });
    return grouped;
  }

  _calculateRelevance(query, text) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText === lowerQuery) return 1.0;
    if (lowerText.startsWith(lowerQuery)) return 0.9;
    if (lowerText.includes(lowerQuery)) return 0.7;
    
    // Calculate word overlap
    const queryWords = lowerQuery.split(/\s+/);
    const textWords = lowerText.split(/\s+/);
    const overlap = queryWords.filter(w => textWords.includes(w)).length;
    
    return overlap / queryWords.length * 0.5;
  }

  _generateSummary(conversation) {
    const messages = conversation.messages || [];
    const firstMessage = messages[0]?.content || '';
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    return `This conversation contains ${messages.length} messages. It begins with: "${firstMessage.substring(0, 100)}..." and concludes with: "${lastMessage.substring(0, 100)}..."`;
  }

  _extractKeyPoints(conversation) {
    const messages = conversation.messages || [];
    const keyPoints = [];
    
    // Extract messages that seem like key points (contain bullet points, numbered lists, or are short and concise)
    messages.forEach(msg => {
      const content = msg.content || '';
      if (content.includes('•') || content.includes('-') || /^\d+\./.test(content)) {
        keyPoints.push(content.substring(0, 200));
      }
    });
    
    return keyPoints.slice(0, 5).join('\n\n');
  }

  _getEntitiesByType() {
    const byType = {};
    for (const [_, entity] of this.knowledgeBase.entities) {
      if (!byType[entity.type]) {
        byType[entity.type] = 0;
      }
      byType[entity.type]++;
    }
    return byType;
  }

  _getTopTags(limit) {
    return Array.from(this.knowledgeBase.tags.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .map(([tag, ids]) => ({ tag, count: ids.length }));
  }

  _getTopCategories(limit) {
    return Array.from(this.knowledgeBase.categories.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .map(([category, ids]) => ({ category, count: ids.length }));
  }

  _getRecentExtractions(limit) {
    return Array.from(this.knowledgeBase.conversations.values())
      .sort((a, b) => b.extractedAt - a.extractedAt)
      .slice(0, limit)
      .map(k => ({
        conversationId: k.conversationId,
        title: k.title,
        extractedAt: k.extractedAt,
        entitiesCount: k.entities.length
      }));
  }

  _convertToMarkdown(exportData) {
    let md = `# Knowledge Base Export\n\n`;
    md += `**Exported:** ${exportData.exportedAt}\n\n`;
    md += `## Statistics\n\n`;
    md += `- Total Entities: ${exportData.entities.length}\n`;
    md += `- Total Relationships: ${exportData.relationships.length}\n`;
    md += `- Total Conversations: ${exportData.conversations.length}\n`;
    md += `- Total Tags: ${exportData.tags.length}\n`;
    md += `- Total Notes: ${exportData.notes.length}\n\n`;
    
    md += `## Entities\n\n`;
    exportData.entities.forEach(entity => {
      md += `### ${entity.name} (${entity.type})\n`;
      if (entity.context) {
        md += `Context: ${entity.context}\n`;
      }
      md += `\n`;
    });
    
    return md;
  }

  async _loadKnowledgeBase() {
    try {
      const stored = await chrome.storage.local.get('knowledgeBase');
      if (stored.knowledgeBase) {
        const data = stored.knowledgeBase;
        this.knowledgeBase.entities = new Map(data.entities || []);
        this.knowledgeBase.relationships = new Map(data.relationships || []);
        this.knowledgeBase.conversations = new Map(data.conversations || []);
        this.knowledgeBase.tags = new Map(data.tags || []);
        this.knowledgeBase.categories = new Map(data.categories || []);
        this.knowledgeBase.notes = new Map(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    }
  }

  async _saveKnowledgeBase() {
    try {
      const data = {
        entities: Array.from(this.knowledgeBase.entities.entries()),
        relationships: Array.from(this.knowledgeBase.relationships.entries()),
        conversations: Array.from(this.knowledgeBase.conversations.entries()),
        tags: Array.from(this.knowledgeBase.tags.entries()),
        categories: Array.from(this.knowledgeBase.categories.entries()),
        notes: Array.from(this.knowledgeBase.notes.entries())
      };
      await chrome.storage.local.set({ knowledgeBase: data });
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
    }
  }
}

// Make agent available globally
if (typeof window !== 'undefined') {
  window.KnowledgeManagementAgent = KnowledgeManagementAgent;
}

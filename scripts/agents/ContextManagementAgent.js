/**
 * ContextManagementAgent - Agent for managing conversation context
 * Implements Section 2.4 of plans.md
 * 
 * Capabilities:
 * - Multi-conversation context support
 * - Smart context summarization
 * - Context budget visualization
 * - Auto-include relevant past information
 * - Session continuity across browser restarts
 */

class ContextManagementAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'context-management-agent',
      name: 'Context Management Agent',
      description: 'Manages conversation context and maintains session continuity',
      capabilities: [
        'buildContext',
        'summarizeContext',
        'visualizeBudget',
        'findRelevantContext',
        'saveSession',
        'restoreSession',
        'clearContext',
        'getContextStats'
      ],
      version: '1.0.0'
    });

    // Context storage
    this.contexts = new Map(); // conversationId -> context data
    this.crossConversationContext = []; // Shared context across conversations
    
    // Session management
    this.currentSession = null;
    this.sessions = [];
    this.maxSessions = 50;

    // Context budget limits (in tokens, approximate)
    this.budgets = {
      gpt35: 4096,
      gpt4: 8192,
      gpt432k: 32768,
      default: 4096
    };

    // Context strategies
    this.strategies = {
      summarization: true,
      prioritization: true,
      compression: true,
      relevanceFiltering: true
    };

    // Statistics
    this.stats = {
      contextsCreated: 0,
      contextsSummarized: 0,
      sessionsRestored: 0,
      averageContextSize: 0,
      totalTokensSaved: 0
    };
  }

  async initialize() {
    await super.initialize();
    
    // Load saved data
    await this._loadState();
    
    // Restore last session if exists
    await this._restoreLastSession();
    
    console.log(`${this.name} initialized with ${this.contexts.size} active contexts`);
  }

  /**
   * Main execution method
   */
  async execute(task) {
    const { type, data } = task;

    switch (type) {
      case 'buildContext':
        return await this._buildContext(data);
      
      case 'summarizeContext':
        return await this._summarizeContext(data);
      
      case 'visualizeBudget':
        return this._visualizeBudget(data);
      
      case 'findRelevantContext':
        return await this._findRelevantContext(data);
      
      case 'saveSession':
        return await this._saveSession(data);
      
      case 'restoreSession':
        return await this._restoreSession(data);
      
      case 'clearContext':
        return await this._clearContext(data);
      
      case 'getContextStats':
        return this._getContextStats();
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Build context for a conversation
   */
  async _buildContext(data) {
    const { conversationId, messages, includeRelated = true, model = 'default' } = data;
    
    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    // Get or create context
    let context = this.contexts.get(conversationId) || {
      conversationId,
      messages: [],
      summary: null,
      relatedContexts: [],
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tokenCount: 0
    };

    // Add new messages
    if (messages && Array.isArray(messages)) {
      context.messages = messages;
      context.tokenCount = this._estimateTokens(messages);
    }

    // Get budget for model
    const budget = this.budgets[model] || this.budgets.default;

    // If over budget, apply strategies
    if (context.tokenCount > budget * 0.8) {
      context = await this._applyContextStrategies(context, budget);
    }

    // Include related context if requested
    if (includeRelated) {
      context.relatedContexts = await this._findRelevantContext({
        conversationId,
        limit: 3
      });
    }

    // Update context
    context.updatedAt = Date.now();
    this.contexts.set(conversationId, context);

    // Update stats
    this.stats.contextsCreated++;
    this._updateAverageContextSize();

    await this._saveState();

    // Emit event
    this._emitEvent('CONTEXT_BUILT', {
      conversationId,
      tokenCount: context.tokenCount,
      budget,
      utilization: (context.tokenCount / budget * 100).toFixed(1)
    });

    return context;
  }

  /**
   * Summarize context to reduce size
   */
  async _summarizeContext(data) {
    const { conversationId, targetReduction = 0.5 } = data;
    
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error('Context not found');
    }

    const originalSize = context.tokenCount;

    // Create summary of older messages
    const summary = this._createMessagesSummary(context.messages);
    
    // Keep only recent messages + summary
    const recentCount = Math.ceil(context.messages.length * (1 - targetReduction));
    const recentMessages = context.messages.slice(-recentCount);

    context.summary = summary;
    context.messages = recentMessages;
    context.tokenCount = this._estimateTokens(recentMessages) + this._estimateTokens([summary]);
    context.updatedAt = Date.now();

    this.contexts.set(conversationId, context);

    // Update stats
    this.stats.contextsSummarized++;
    this.stats.totalTokensSaved += (originalSize - context.tokenCount);

    await this._saveState();

    // Emit event
    this._emitEvent('CONTEXT_SUMMARIZED', {
      conversationId,
      originalSize,
      newSize: context.tokenCount,
      reduction: originalSize - context.tokenCount
    });

    return {
      conversationId,
      originalSize,
      newSize: context.tokenCount,
      summary: summary.substring(0, 200)
    };
  }

  /**
   * Visualize context budget usage
   */
  _visualizeBudget(data) {
    const { conversationId, model = 'default' } = data;
    
    const context = this.contexts.get(conversationId);
    if (!context) {
      return {
        error: 'Context not found',
        conversationId
      };
    }

    const budget = this.budgets[model] || this.budgets.default;
    const utilization = context.tokenCount / budget;

    const visualization = {
      conversationId,
      model,
      budget,
      used: context.tokenCount,
      available: budget - context.tokenCount,
      utilization: Math.round(utilization * 100),
      status: utilization > 0.9 ? 'critical' : utilization > 0.7 ? 'warning' : 'ok',
      breakdown: {
        messages: context.messages.length,
        summary: context.summary ? 'yes' : 'no',
        relatedContexts: context.relatedContexts.length
      },
      recommendations: []
    };

    // Add recommendations based on usage
    if (utilization > 0.9) {
      visualization.recommendations.push({
        priority: 'high',
        action: 'summarize',
        message: 'Context is near budget limit. Consider summarizing older messages.'
      });
    } else if (utilization > 0.7) {
      visualization.recommendations.push({
        priority: 'medium',
        action: 'monitor',
        message: 'Context usage is high. Monitor for next few messages.'
      });
    }

    if (context.messages.length > 50 && !context.summary) {
      visualization.recommendations.push({
        priority: 'medium',
        action: 'create_summary',
        message: 'Create a summary to optimize context usage.'
      });
    }

    return visualization;
  }

  /**
   * Find relevant context from other conversations
   */
  async _findRelevantContext(data) {
    const { conversationId, query, limit = 5 } = data;
    
    const currentContext = this.contexts.get(conversationId);
    const relevantContexts = [];

    // Get keywords from current context or query
    const keywords = query ? 
      this._extractKeywords(query) :
      currentContext ? this._extractKeywords(currentContext.messages.map(m => m.content).join(' ')) :
      [];

    if (keywords.length === 0) {
      return relevantContexts;
    }

    // Search through other contexts
    for (const [otherConvId, otherContext] of this.contexts.entries()) {
      if (otherConvId === conversationId) continue;

      const relevanceScore = this._calculateContextRelevance(keywords, otherContext);
      
      if (relevanceScore > 0.3) {
        relevantContexts.push({
          conversationId: otherConvId,
          relevanceScore,
          summary: otherContext.summary || this._createMessagesSummary(otherContext.messages),
          messageCount: otherContext.messages.length,
          lastUpdated: otherContext.updatedAt
        });
      }
    }

    // Sort by relevance and limit
    relevantContexts.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return relevantContexts.slice(0, limit);
  }

  /**
   * Save current session
   */
  async _saveSession(data) {
    const { name, description } = data || {};
    
    const session = {
      id: `session-${Date.now()}`,
      name: name || `Session ${new Date().toLocaleString()}`,
      description: description || '',
      timestamp: Date.now(),
      contexts: Array.from(this.contexts.entries()).map(([id, ctx]) => ({
        conversationId: id,
        messageCount: ctx.messages.length,
        tokenCount: ctx.tokenCount,
        summary: ctx.summary
      })),
      crossConversationContext: this.crossConversationContext,
      activeConversation: this.currentSession?.activeConversation || null
    };

    // Add to sessions
    this.sessions.push(session);
    
    // Limit sessions
    if (this.sessions.length > this.maxSessions) {
      this.sessions.shift();
    }

    // Set as current session
    this.currentSession = session;

    await this._saveState();

    // Emit event
    this._emitEvent('SESSION_SAVED', {
      sessionId: session.id,
      contextCount: session.contexts.length
    });

    return session;
  }

  /**
   * Restore a saved session
   */
  async _restoreSession(data) {
    const { sessionId } = data;
    
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Note: We only restore metadata, not full messages
    // Full messages should be loaded from conversation storage
    this.currentSession = session;
    this.crossConversationContext = session.crossConversationContext || [];

    // Update stats
    this.stats.sessionsRestored++;

    await this._saveState();

    // Emit event
    this._emitEvent('SESSION_RESTORED', {
      sessionId: session.id,
      contextCount: session.contexts.length
    });

    return {
      success: true,
      session,
      message: 'Session restored. Load individual conversations to restore full context.'
    };
  }

  /**
   * Clear context for a conversation
   */
  async _clearContext(data) {
    const { conversationId, clearAll = false } = data;
    
    if (clearAll) {
      const count = this.contexts.size;
      this.contexts.clear();
      this.crossConversationContext = [];
      
      await this._saveState();
      
      return {
        success: true,
        message: `Cleared ${count} contexts`
      };
    } else if (conversationId) {
      const existed = this.contexts.has(conversationId);
      this.contexts.delete(conversationId);
      
      await this._saveState();
      
      return {
        success: existed,
        message: existed ? 'Context cleared' : 'Context not found'
      };
    } else {
      throw new Error('conversationId required or use clearAll: true');
    }
  }

  /**
   * Get context statistics
   */
  _getContextStats() {
    const contexts = Array.from(this.contexts.values());
    
    return {
      ...this.stats,
      activeContexts: this.contexts.size,
      totalMessages: contexts.reduce((sum, ctx) => sum + ctx.messages.length, 0),
      totalTokens: contexts.reduce((sum, ctx) => sum + ctx.tokenCount, 0),
      sessionsStored: this.sessions.length,
      currentSession: this.currentSession ? {
        id: this.currentSession.id,
        name: this.currentSession.name,
        age: Date.now() - this.currentSession.timestamp
      } : null,
      budgetUtilization: this._calculateAverageBudgetUtilization()
    };
  }

  // ===== Helper Methods =====

  /**
   * Estimate token count for messages
   */
  _estimateTokens(messages) {
    if (!messages || messages.length === 0) return 0;
    
    // Simple estimation: ~4 characters per token
    const text = Array.isArray(messages) ?
      messages.map(m => typeof m === 'string' ? m : m.content || '').join(' ') :
      messages;
    
    return Math.ceil(text.length / 4);
  }

  /**
   * Apply context optimization strategies
   */
  async _applyContextStrategies(context, budget) {
    const targetSize = budget * 0.7; // Target 70% of budget
    
    if (context.tokenCount <= targetSize) {
      return context;
    }

    // Strategy 1: Summarization
    if (this.strategies.summarization && context.messages.length > 10) {
      const summary = this._createMessagesSummary(context.messages.slice(0, -5));
      context.summary = summary;
      context.messages = context.messages.slice(-5);
      context.tokenCount = this._estimateTokens(context.messages) + this._estimateTokens([summary]);
    }

    // Strategy 2: Prioritization (keep important messages)
    if (this.strategies.prioritization && context.tokenCount > targetSize) {
      context.messages = this._prioritizeMessages(context.messages, targetSize);
      context.tokenCount = this._estimateTokens(context.messages);
    }

    // Strategy 3: Compression (remove redundant info)
    if (this.strategies.compression && context.tokenCount > targetSize) {
      context.messages = this._compressMessages(context.messages);
      context.tokenCount = this._estimateTokens(context.messages);
    }

    return context;
  }

  /**
   * Create summary of messages
   */
  _createMessagesSummary(messages) {
    if (!messages || messages.length === 0) {
      return 'No previous messages.';
    }

    // Extract key points
    const points = [];
    const keywords = new Map();

    messages.forEach(msg => {
      const content = typeof msg === 'string' ? msg : msg.content || '';
      
      // Extract keywords
      const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
      words.forEach(word => {
        keywords.set(word, (keywords.get(word) || 0) + 1);
      });

      // Extract questions
      if (content.includes('?')) {
        const questions = content.match(/[^.!?]*\?/g) || [];
        points.push(...questions.slice(0, 2));
      }
    });

    // Get top keywords
    const topKeywords = Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    let summary = `Previous conversation covered: ${topKeywords.join(', ')}.`;
    
    if (points.length > 0) {
      summary += ` Key questions: ${points.slice(0, 2).join(' ')}`;
    }

    return summary;
  }

  /**
   * Prioritize messages based on importance
   */
  _prioritizeMessages(messages, targetTokens) {
    // Always keep first and last few messages
    const keepFirst = 2;
    const keepLast = 3;
    
    if (messages.length <= keepFirst + keepLast) {
      return messages;
    }

    const prioritized = [
      ...messages.slice(0, keepFirst),
      ...messages.slice(-keepLast)
    ];

    // Add important messages from middle
    const middle = messages.slice(keepFirst, -keepLast);
    const importantMiddle = middle.filter(msg => {
      const content = typeof msg === 'string' ? msg : msg.content || '';
      // Messages with code, numbers, or questions are important
      return /```|```|\d{3,}|\?/.test(content);
    });

    const currentTokens = this._estimateTokens(prioritized);
    const availableTokens = targetTokens - currentTokens;
    
    // Add as many important messages as fit
    for (const msg of importantMiddle) {
      const msgTokens = this._estimateTokens([msg]);
      if (this._estimateTokens([...prioritized, msg]) <= targetTokens) {
        prioritized.push(msg);
      } else {
        break;
      }
    }

    return prioritized;
  }

  /**
   * Compress messages by removing redundant content
   */
  _compressMessages(messages) {
    return messages.map(msg => {
      if (typeof msg === 'string') {
        return this._compressText(msg);
      } else if (msg.content) {
        return {
          ...msg,
          content: this._compressText(msg.content)
        };
      }
      return msg;
    });
  }

  /**
   * Compress text content
   */
  _compressText(text) {
    // Remove excessive whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();
    
    // Remove common filler words (but keep code blocks intact)
    if (!compressed.includes('```')) {
      const fillers = ['essentially', 'basically', 'actually', 'literally', 'really'];
      fillers.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        compressed = compressed.replace(regex, '');
      });
    }
    
    return compressed;
  }

  /**
   * Extract keywords from text
   */
  _extractKeywords(text, limit = 10) {
    if (!text) return [];
    
    // Extract words (4+ characters)
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    
    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Sort by frequency and return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Calculate relevance between keywords and context
   */
  _calculateContextRelevance(keywords, context) {
    if (!context || !context.messages) return 0;
    
    const contextText = context.messages
      .map(m => typeof m === 'string' ? m : m.content || '')
      .join(' ')
      .toLowerCase();

    // Count keyword matches
    let matches = 0;
    keywords.forEach(keyword => {
      if (contextText.includes(keyword.toLowerCase())) {
        matches++;
      }
    });

    return matches / keywords.length;
  }

  /**
   * Update average context size stat
   */
  _updateAverageContextSize() {
    if (this.contexts.size === 0) {
      this.stats.averageContextSize = 0;
      return;
    }

    const total = Array.from(this.contexts.values())
      .reduce((sum, ctx) => sum + ctx.tokenCount, 0);
    
    this.stats.averageContextSize = Math.round(total / this.contexts.size);
  }

  /**
   * Calculate average budget utilization
   */
  _calculateAverageBudgetUtilization() {
    if (this.contexts.size === 0) return 0;

    const contexts = Array.from(this.contexts.values());
    const avgUtilization = contexts.reduce((sum, ctx) => {
      const utilization = ctx.tokenCount / this.budgets.default;
      return sum + utilization;
    }, 0) / contexts.length;

    return Math.round(avgUtilization * 100);
  }

  /**
   * Restore last session on initialization
   */
  async _restoreLastSession() {
    if (this.sessions.length > 0) {
      const lastSession = this.sessions[this.sessions.length - 1];
      this.currentSession = lastSession;
      this.crossConversationContext = lastSession.crossConversationContext || [];
      
      console.log(`Restored last session: ${lastSession.name}`);
    }
  }

  /**
   * Load state from Chrome storage
   */
  async _loadState() {
    try {
      const data = await chrome.storage.local.get([
        'contextManagementContexts',
        'contextManagementSessions',
        'contextManagementStats',
        'contextManagementCrossContext'
      ]);
      
      if (data.contextManagementContexts) {
        this.contexts = new Map(data.contextManagementContexts);
      }
      if (data.contextManagementSessions) {
        this.sessions = data.contextManagementSessions;
      }
      if (data.contextManagementStats) {
        this.stats = data.contextManagementStats;
      }
      if (data.contextManagementCrossContext) {
        this.crossConversationContext = data.contextManagementCrossContext;
      }
    } catch (error) {
      console.error('Failed to load ContextManagementAgent state:', error);
    }
  }

  /**
   * Save state to Chrome storage
   */
  async _saveState() {
    try {
      await chrome.storage.local.set({
        contextManagementContexts: Array.from(this.contexts.entries()),
        contextManagementSessions: this.sessions,
        contextManagementStats: this.stats,
        contextManagementCrossContext: this.crossConversationContext
      });
    } catch (error) {
      console.error('Failed to save ContextManagementAgent state:', error);
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(`ContextManagement:${eventType}`, {
        agentId: this.agentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }
}

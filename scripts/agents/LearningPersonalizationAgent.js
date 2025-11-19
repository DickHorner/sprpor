/**
 * LearningPersonalizationAgent - Agent for learning user behavior and personalizing experience
 * Implements Section 2.3 of plans.md
 * 
 * Capabilities:
 * - User behavior pattern recognition
 * - Adaptive UI based on usage
 * - Personalized model/tone/style recommendations
 * - Smart defaults that evolve over time
 * - Usage analytics dashboard
 */

class LearningPersonalizationAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'learning-personalization-agent',
      name: 'Learning & Personalization Agent',
      description: 'Learns from user behavior and personalizes the experience',
      capabilities: [
        'trackBehavior',
        'analyzePatterns',
        'getRecommendations',
        'updatePreferences',
        'getAnalytics',
        'exportPersonalizationData',
        'resetLearning'
      ],
      version: '1.0.0'
    });

    // User behavior tracking
    this.behaviorLog = [];
    this.maxLogSize = 1000;
    
    // Learned patterns
    this.patterns = {
      preferredModels: {},
      preferredTones: {},
      preferredStyles: {},
      preferredLanguages: {},
      timePatterns: {},
      topicPatterns: {},
      interactionPatterns: {}
    };

    // Personalized preferences
    this.preferences = {
      defaultModel: null,
      defaultTone: null,
      defaultStyle: null,
      defaultLanguage: null,
      autoSuggest: true,
      adaptiveUI: true
    };

    // Usage analytics
    this.analytics = {
      totalInteractions: 0,
      conversationsCreated: 0,
      averageConversationLength: 0,
      mostActiveHour: null,
      mostActiveDay: null,
      favoriteTopics: [],
      usageStreak: 0,
      lastActive: null
    };

    // Learning thresholds
    this.thresholds = {
      minInteractionsForRecommendation: 10,
      patternConfidenceThreshold: 0.6,
      adaptationRate: 0.1 // How quickly to adapt (0-1)
    };
  }

  async initialize() {
    await super.initialize();
    
    // Load saved data
    await this._loadState();
    
    // Start behavior tracking
    this._startBehaviorTracking();
    
    // Analyze existing patterns
    await this._analyzePatterns({});
    
    console.log(`${this.name} initialized with ${this.behaviorLog.length} behavior entries`);
  }

  /**
   * Main execution method
   */
  async execute(task) {
    const { type, data } = task;

    switch (type) {
      case 'trackBehavior':
        return await this._trackBehavior(data);
      
      case 'analyzePatterns':
        return await this._analyzePatterns(data);
      
      case 'getRecommendations':
        return await this._getRecommendations(data);
      
      case 'updatePreferences':
        return await this._updatePreferences(data);
      
      case 'getAnalytics':
        return this._getAnalytics();
      
      case 'exportPersonalizationData':
        return this._exportPersonalizationData();
      
      case 'resetLearning':
        return await this._resetLearning(data);
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Track user behavior
   */
  async _trackBehavior(data) {
    const { action, context } = data;
    
    const entry = {
      action,
      context: context || {},
      timestamp: Date.now(),
      hour: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };

    // Add to log
    this.behaviorLog.push(entry);
    
    // Limit log size
    if (this.behaviorLog.length > this.maxLogSize) {
      this.behaviorLog.shift();
    }

    // Update analytics
    this.analytics.totalInteractions++;
    this.analytics.lastActive = Date.now();
    
    // Track specific actions
    if (action === 'conversation_created') {
      this.analytics.conversationsCreated++;
    }

    // Immediate pattern updates for high-value actions
    if (['model_selected', 'tone_selected', 'style_selected', 'language_selected'].includes(action)) {
      await this._updatePatternFromBehavior(entry);
    }

    // Save state periodically
    if (this.behaviorLog.length % 10 === 0) {
      await this._saveState();
    }

    // Emit event
    this._emitEvent('BEHAVIOR_TRACKED', entry);

    return entry;
  }

  /**
   * Analyze behavior patterns
   */
  async _analyzePatterns(data) {
    if (this.behaviorLog.length < this.thresholds.minInteractionsForRecommendation) {
      return {
        status: 'insufficient_data',
        message: `Need at least ${this.thresholds.minInteractionsForRecommendation} interactions`,
        currentCount: this.behaviorLog.length
      };
    }

    // Analyze model preferences
    this.patterns.preferredModels = this._analyzePreference('model_selected', 'model');
    
    // Analyze tone preferences
    this.patterns.preferredTones = this._analyzePreference('tone_selected', 'tone');
    
    // Analyze style preferences
    this.patterns.preferredStyles = this._analyzePreference('style_selected', 'style');
    
    // Analyze language preferences
    this.patterns.preferredLanguages = this._analyzePreference('language_selected', 'language');
    
    // Analyze time patterns
    this.patterns.timePatterns = this._analyzeTimePatterns();
    
    // Analyze topic patterns
    this.patterns.topicPatterns = this._analyzeTopicPatterns();
    
    // Analyze interaction patterns
    this.patterns.interactionPatterns = this._analyzeInteractionPatterns();

    // Update analytics based on patterns
    this._updateAnalytics();

    // Update smart defaults if confidence is high
    await this._updateSmartDefaults();

    await this._saveState();

    // Emit event
    this._emitEvent('PATTERNS_ANALYZED', {
      patterns: this.patterns,
      confidence: this._calculateOverallConfidence()
    });

    return {
      patterns: this.patterns,
      confidence: this._calculateOverallConfidence(),
      recommendations: await this._getRecommendations({})
    };
  }

  /**
   * Get personalized recommendations
   */
  async _getRecommendations(data) {
    const { context } = data || {};
    
    const recommendations = {
      model: null,
      tone: null,
      style: null,
      language: null,
      suggestions: [],
      confidence: {}
    };

    // Model recommendation
    if (this.patterns.preferredModels.top) {
      recommendations.model = {
        value: this.patterns.preferredModels.top.value,
        confidence: this.patterns.preferredModels.top.confidence,
        reason: `You use ${this.patterns.preferredModels.top.value} ${this.patterns.preferredModels.top.percentage}% of the time`
      };
      recommendations.confidence.model = this.patterns.preferredModels.top.confidence;
    }

    // Tone recommendation
    if (this.patterns.preferredTones.top) {
      recommendations.tone = {
        value: this.patterns.preferredTones.top.value,
        confidence: this.patterns.preferredTones.top.confidence,
        reason: `You prefer ${this.patterns.preferredTones.top.value} tone (${this.patterns.preferredTones.top.percentage}% of selections)`
      };
      recommendations.confidence.tone = this.patterns.preferredTones.top.confidence;
    }

    // Style recommendation
    if (this.patterns.preferredStyles.top) {
      recommendations.style = {
        value: this.patterns.preferredStyles.top.value,
        confidence: this.patterns.preferredStyles.top.confidence,
        reason: `${this.patterns.preferredStyles.top.value} is your most used style`
      };
      recommendations.confidence.style = this.patterns.preferredStyles.top.confidence;
    }

    // Language recommendation
    if (this.patterns.preferredLanguages.top) {
      recommendations.language = {
        value: this.patterns.preferredLanguages.top.value,
        confidence: this.patterns.preferredLanguages.top.confidence,
        reason: `You typically use ${this.patterns.preferredLanguages.top.value}`
      };
      recommendations.confidence.language = this.patterns.preferredLanguages.top.confidence;
    }

    // Context-aware suggestions
    if (context) {
      recommendations.suggestions = this._getContextAwareSuggestions(context);
    }

    // Time-based suggestions
    const currentHour = new Date().getHours();
    if (this.patterns.timePatterns.hourly && this.patterns.timePatterns.hourly[currentHour]) {
      recommendations.suggestions.push({
        type: 'time_based',
        message: `Based on your usual ${currentHour}:00 activity, you might want to...`,
        data: this.patterns.timePatterns.hourly[currentHour]
      });
    }

    // Emit event
    this._emitEvent('RECOMMENDATIONS_GENERATED', recommendations);

    return recommendations;
  }

  /**
   * Update user preferences
   */
  async _updatePreferences(data) {
    const { preferences } = data;
    
    // Merge with existing preferences
    this.preferences = {
      ...this.preferences,
      ...preferences
    };

    await this._saveState();

    // Emit event
    this._emitEvent('PREFERENCES_UPDATED', this.preferences);

    return this.preferences;
  }

  /**
   * Get usage analytics
   */
  _getAnalytics() {
    return {
      ...this.analytics,
      patterns: this.patterns,
      preferences: this.preferences,
      learningStatus: {
        dataPoints: this.behaviorLog.length,
        confidence: this._calculateOverallConfidence(),
        readyForPersonalization: this.behaviorLog.length >= this.thresholds.minInteractionsForRecommendation
      }
    };
  }

  /**
   * Export personalization data
   */
  _exportPersonalizationData() {
    return {
      exportDate: new Date().toISOString(),
      behaviorLog: this.behaviorLog,
      patterns: this.patterns,
      preferences: this.preferences,
      analytics: this.analytics,
      metadata: {
        version: this.version,
        agentId: this.agentId
      }
    };
  }

  /**
   * Reset learning data
   */
  async _resetLearning(data) {
    const { keepPreferences = false } = data || {};
    
    // Clear behavior log
    this.behaviorLog = [];
    
    // Reset patterns
    this.patterns = {
      preferredModels: {},
      preferredTones: {},
      preferredStyles: {},
      preferredLanguages: {},
      timePatterns: {},
      topicPatterns: {},
      interactionPatterns: {}
    };

    // Reset analytics
    this.analytics = {
      totalInteractions: 0,
      conversationsCreated: 0,
      averageConversationLength: 0,
      mostActiveHour: null,
      mostActiveDay: null,
      favoriteTopics: [],
      usageStreak: 0,
      lastActive: null
    };

    // Optionally reset preferences
    if (!keepPreferences) {
      this.preferences = {
        defaultModel: null,
        defaultTone: null,
        defaultStyle: null,
        defaultLanguage: null,
        autoSuggest: true,
        adaptiveUI: true
      };
    }

    await this._saveState();

    // Emit event
    this._emitEvent('LEARNING_RESET', { keepPreferences });

    return { success: true, message: 'Learning data reset successfully' };
  }

  // ===== Helper Methods =====

  /**
   * Start behavior tracking by listening to events
   */
  _startBehaviorTracking() {
    if (!this.eventBus) return;

    // Track conversation events
    this.eventBus.on('CONVERSATION_CREATED', (data) => {
      this._trackBehavior({
        action: 'conversation_created',
        context: { conversationId: data.conversationId }
      });
    });

    this.eventBus.on('CONVERSATION_DELETED', (data) => {
      this._trackBehavior({
        action: 'conversation_deleted',
        context: { conversationId: data.conversationId }
      });
    });

    // Track search events
    this.eventBus.on('EnhancedSearch:SEARCH_COMPLETED', (data) => {
      this._trackBehavior({
        action: 'search_performed',
        context: { 
          query: data.query,
          resultsCount: data.results ? data.results.length : 0
        }
      });
    });

    // Track export events
    this.eventBus.on('EXPORT_COMPLETED', (data) => {
      this._trackBehavior({
        action: 'export_performed',
        context: { format: data.format }
      });
    });
  }

  /**
   * Analyze preference for a specific action and context key
   */
  _analyzePreference(action, contextKey) {
    const relevantEntries = this.behaviorLog.filter(entry => entry.action === action);
    
    if (relevantEntries.length === 0) {
      return { top: null, distribution: {} };
    }

    // Count occurrences
    const counts = {};
    relevantEntries.forEach(entry => {
      const value = entry.context[contextKey];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    // Calculate distribution
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const distribution = {};
    
    for (const [value, count] of Object.entries(counts)) {
      distribution[value] = {
        count,
        percentage: Math.round((count / total) * 100),
        confidence: count / total
      };
    }

    // Find top preference
    const sorted = Object.entries(distribution).sort((a, b) => b[1].count - a[1].count);
    const top = sorted[0] ? {
      value: sorted[0][0],
      ...sorted[0][1]
    } : null;

    return { top, distribution };
  }

  /**
   * Analyze time-based patterns
   */
  _analyzeTimePatterns() {
    const hourly = {};
    const daily = {};

    this.behaviorLog.forEach(entry => {
      // Hourly patterns
      const hour = entry.hour;
      hourly[hour] = (hourly[hour] || 0) + 1;

      // Daily patterns
      const day = entry.dayOfWeek;
      daily[day] = (daily[day] || 0) + 1;
    });

    // Find most active hour
    const mostActiveHour = Object.entries(hourly)
      .sort((a, b) => b[1] - a[1])[0];

    // Find most active day
    const mostActiveDay = Object.entries(daily)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      hourly,
      daily,
      mostActiveHour: mostActiveHour ? parseInt(mostActiveHour[0]) : null,
      mostActiveDay: mostActiveDay ? parseInt(mostActiveDay[0]) : null
    };
  }

  /**
   * Analyze topic patterns
   */
  _analyzeTopicPatterns() {
    // Extract topics from conversations in behavior log
    const topics = {};

    this.behaviorLog.forEach(entry => {
      if (entry.context.topics) {
        entry.context.topics.forEach(topic => {
          topics[topic] = (topics[topic] || 0) + 1;
        });
      }
    });

    // Get top topics
    const topTopics = Object.entries(topics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    return {
      allTopics: topics,
      topTopics
    };
  }

  /**
   * Analyze interaction patterns
   */
  _analyzeInteractionPatterns() {
    const patterns = {
      averageSessionLength: 0,
      commonSequences: [],
      featureUsage: {}
    };

    // Track feature usage
    this.behaviorLog.forEach(entry => {
      const feature = entry.action.split('_')[0]; // Get base action
      patterns.featureUsage[feature] = (patterns.featureUsage[feature] || 0) + 1;
    });

    // Sort features by usage
    patterns.featureUsage = Object.fromEntries(
      Object.entries(patterns.featureUsage)
        .sort((a, b) => b[1] - a[1])
    );

    // Detect common action sequences (simplified)
    const sequences = {};
    for (let i = 0; i < this.behaviorLog.length - 1; i++) {
      const seq = `${this.behaviorLog[i].action}->${this.behaviorLog[i + 1].action}`;
      sequences[seq] = (sequences[seq] || 0) + 1;
    }

    patterns.commonSequences = Object.entries(sequences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([seq, count]) => ({ sequence: seq, count }));

    return patterns;
  }

  /**
   * Update analytics based on patterns
   */
  _updateAnalytics() {
    // Most active hour
    if (this.patterns.timePatterns.mostActiveHour !== null) {
      this.analytics.mostActiveHour = this.patterns.timePatterns.mostActiveHour;
    }

    // Most active day
    if (this.patterns.timePatterns.mostActiveDay !== null) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      this.analytics.mostActiveDay = days[this.patterns.timePatterns.mostActiveDay];
    }

    // Favorite topics
    if (this.patterns.topicPatterns.topTopics) {
      this.analytics.favoriteTopics = this.patterns.topicPatterns.topTopics
        .slice(0, 5)
        .map(t => t.topic);
    }

    // Calculate usage streak
    this.analytics.usageStreak = this._calculateUsageStreak();
  }

  /**
   * Calculate usage streak (consecutive days)
   */
  _calculateUsageStreak() {
    if (this.behaviorLog.length === 0) return 0;

    const dates = this.behaviorLog.map(entry => {
      const date = new Date(entry.timestamp);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    });

    const uniqueDates = [...new Set(dates)].sort().reverse();
    
    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      
      if (uniqueDates[i] === expectedDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Update smart defaults based on learned patterns
   */
  async _updateSmartDefaults() {
    // Only update if confidence is high and auto-suggest is enabled
    if (!this.preferences.autoSuggest) return;

    // Update default model
    if (this.patterns.preferredModels.top && 
        this.patterns.preferredModels.top.confidence >= this.thresholds.patternConfidenceThreshold) {
      this.preferences.defaultModel = this.patterns.preferredModels.top.value;
    }

    // Update default tone
    if (this.patterns.preferredTones.top && 
        this.patterns.preferredTones.top.confidence >= this.thresholds.patternConfidenceThreshold) {
      this.preferences.defaultTone = this.patterns.preferredTones.top.value;
    }

    // Update default style
    if (this.patterns.preferredStyles.top && 
        this.patterns.preferredStyles.top.confidence >= this.thresholds.patternConfidenceThreshold) {
      this.preferences.defaultStyle = this.patterns.preferredStyles.top.value;
    }

    // Update default language
    if (this.patterns.preferredLanguages.top && 
        this.patterns.preferredLanguages.top.confidence >= this.thresholds.patternConfidenceThreshold) {
      this.preferences.defaultLanguage = this.patterns.preferredLanguages.top.value;
    }
  }

  /**
   * Update pattern from a single behavior entry
   */
  async _updatePatternFromBehavior(entry) {
    // Quick pattern update for immediate feedback
    const { action, context } = entry;

    if (action === 'model_selected' && context.model) {
      this.patterns.preferredModels = this._analyzePreference('model_selected', 'model');
    } else if (action === 'tone_selected' && context.tone) {
      this.patterns.preferredTones = this._analyzePreference('tone_selected', 'tone');
    } else if (action === 'style_selected' && context.style) {
      this.patterns.preferredStyles = this._analyzePreference('style_selected', 'style');
    } else if (action === 'language_selected' && context.language) {
      this.patterns.preferredLanguages = this._analyzePreference('language_selected', 'language');
    }
  }

  /**
   * Get context-aware suggestions
   */
  _getContextAwareSuggestions(context) {
    const suggestions = [];

    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 12) {
      suggestions.push({
        type: 'time_based',
        message: 'Good morning! Ready to be productive?',
        action: 'show_morning_summary'
      });
    } else if (hour >= 18 && hour < 22) {
      suggestions.push({
        type: 'time_based',
        message: 'Evening! Time to review today\'s conversations?',
        action: 'show_daily_summary'
      });
    }

    // Usage-based suggestions
    if (this.analytics.usageStreak >= 7) {
      suggestions.push({
        type: 'achievement',
        message: `🔥 ${this.analytics.usageStreak} day streak! Keep it up!`,
        action: 'show_achievements'
      });
    }

    return suggestions;
  }

  /**
   * Calculate overall confidence in learned patterns
   */
  _calculateOverallConfidence() {
    const confidences = [];

    if (this.patterns.preferredModels.top) {
      confidences.push(this.patterns.preferredModels.top.confidence);
    }
    if (this.patterns.preferredTones.top) {
      confidences.push(this.patterns.preferredTones.top.confidence);
    }
    if (this.patterns.preferredStyles.top) {
      confidences.push(this.patterns.preferredStyles.top.confidence);
    }
    if (this.patterns.preferredLanguages.top) {
      confidences.push(this.patterns.preferredLanguages.top.confidence);
    }

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  /**
   * Load state from Chrome storage
   */
  async _loadState() {
    try {
      const data = await chrome.storage.local.get([
        'learningBehaviorLog',
        'learningPatterns',
        'learningPreferences',
        'learningAnalytics'
      ]);
      
      if (data.learningBehaviorLog) {
        this.behaviorLog = data.learningBehaviorLog;
      }
      if (data.learningPatterns) {
        this.patterns = data.learningPatterns;
      }
      if (data.learningPreferences) {
        this.preferences = data.learningPreferences;
      }
      if (data.learningAnalytics) {
        this.analytics = data.learningAnalytics;
      }
    } catch (error) {
      console.error('Failed to load LearningPersonalizationAgent state:', error);
    }
  }

  /**
   * Save state to Chrome storage
   */
  async _saveState() {
    try {
      await chrome.storage.local.set({
        learningBehaviorLog: this.behaviorLog,
        learningPatterns: this.patterns,
        learningPreferences: this.preferences,
        learningAnalytics: this.analytics
      });
    } catch (error) {
      console.error('Failed to save LearningPersonalizationAgent state:', error);
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(`Learning:${eventType}`, {
        agentId: this.agentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }
}

/**
 * SmartPromptsAgent - Agent for intelligent prompt optimization and analysis
 * Implements Section 2.2 of plans.md
 * 
 * Capabilities:
 * - Real-time prompt quality analysis
 * - Prompt improvement suggestions
 * - Context-aware template recommendations
 * - Prompt A/B testing framework
 * - Prompt performance tracking
 */

class SmartPromptsAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'smart-prompts-agent',
      name: 'Smart Prompts Agent',
      description: 'Analyzes and optimizes prompts for better ChatGPT responses',
      capabilities: [
        'analyzePrompt',
        'suggestImprovements',
        'recommendTemplate',
        'trackPerformance',
        'comparePrompts',
        'getPromptHistory',
        'getPromptStats'
      ],
      version: '1.0.0'
    });

    // Prompt quality criteria weights
    this.qualityCriteria = {
      clarity: 0.25,      // How clear and specific the prompt is
      context: 0.20,      // How much context is provided
      structure: 0.15,    // How well structured the prompt is
      specificity: 0.20,  // How specific the requirements are
      completeness: 0.20  // How complete the prompt is
    };

    // Performance tracking
    this.promptHistory = [];
    this.maxHistorySize = 200;
    
    // A/B testing experiments
    this.experiments = new Map();
    
    // Template library
    this.templates = this._initializeTemplates();
    
    // Performance metrics
    this.metrics = {
      totalAnalyzed: 0,
      averageQuality: 0,
      improvementsSuggested: 0,
      templatesRecommended: 0
    };
  }

  async initialize() {
    await super.initialize();
    
    // Load saved data from Chrome storage
    await this._loadState();
    
    console.log(`${this.name} initialized with ${this.promptHistory.length} historical prompts`);
  }

  /**
   * Main execution method
   */
  async execute(task) {
    const { type, data } = task;

    switch (type) {
      case 'analyzePrompt':
        return await this._analyzePrompt(data);
      
      case 'suggestImprovements':
        return await this._suggestImprovements(data);
      
      case 'recommendTemplate':
        return await this._recommendTemplate(data);
      
      case 'trackPerformance':
        return await this._trackPerformance(data);
      
      case 'comparePrompts':
        return await this._comparePrompts(data);
      
      case 'getPromptHistory':
        return this._getPromptHistory(data);
      
      case 'getPromptStats':
        return this._getPromptStats();
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Analyze a prompt for quality and characteristics
   */
  async _analyzePrompt(data) {
    const { prompt } = data;
    
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Invalid prompt provided');
    }

    const analysis = {
      prompt: prompt,
      timestamp: Date.now(),
      length: prompt.length,
      wordCount: this._countWords(prompt),
      scores: {},
      overallScore: 0,
      characteristics: {},
      suggestions: []
    };

    // Analyze clarity
    analysis.scores.clarity = this._analyzeClarity(prompt);
    
    // Analyze context
    analysis.scores.context = this._analyzeContext(prompt);
    
    // Analyze structure
    analysis.scores.structure = this._analyzeStructure(prompt);
    
    // Analyze specificity
    analysis.scores.specificity = this._analyzeSpecificity(prompt);
    
    // Analyze completeness
    analysis.scores.completeness = this._analyzeCompleteness(prompt);

    // Calculate overall score
    analysis.overallScore = this._calculateOverallScore(analysis.scores);

    // Identify characteristics
    analysis.characteristics = this._identifyCharacteristics(prompt);

    // Generate basic suggestions
    analysis.suggestions = this._generateSuggestions(analysis);

    // Track in history
    this._addToHistory(analysis);

    // Update metrics
    this.metrics.totalAnalyzed++;
    this.metrics.averageQuality = 
      (this.metrics.averageQuality * (this.metrics.totalAnalyzed - 1) + analysis.overallScore) / 
      this.metrics.totalAnalyzed;

    // Save state
    await this._saveState();

    // Emit event
    this._emitEvent('PROMPT_ANALYZED', analysis);

    return analysis;
  }

  /**
   * Suggest improvements for a prompt
   */
  async _suggestImprovements(data) {
    const { prompt, analysis } = data;
    
    // If analysis not provided, perform it
    const promptAnalysis = analysis || await this._analyzePrompt({ prompt });
    
    const improvements = {
      prompt: prompt,
      currentScore: promptAnalysis.overallScore,
      suggestions: [],
      improvedVersion: null,
      expectedScore: 0
    };

    // Generate detailed improvement suggestions
    if (promptAnalysis.scores.clarity < 0.7) {
      improvements.suggestions.push({
        category: 'clarity',
        priority: 'high',
        issue: 'Prompt lacks clarity',
        suggestion: 'Be more specific about what you want. Use clear, direct language.',
        example: 'Instead of "Tell me about AI", try "Explain artificial intelligence in simple terms, focusing on its practical applications"'
      });
    }

    if (promptAnalysis.scores.context < 0.6) {
      improvements.suggestions.push({
        category: 'context',
        priority: 'high',
        issue: 'Insufficient context provided',
        suggestion: 'Add background information or context to help generate better responses.',
        example: 'Include relevant details like your skill level, purpose, or constraints'
      });
    }

    if (promptAnalysis.scores.structure < 0.6) {
      improvements.suggestions.push({
        category: 'structure',
        priority: 'medium',
        issue: 'Poor prompt structure',
        suggestion: 'Organize your prompt with clear sections or bullet points.',
        example: 'Use formatting like:\n1. Goal: [what you want]\n2. Context: [relevant info]\n3. Format: [desired output]'
      });
    }

    if (promptAnalysis.scores.specificity < 0.7) {
      improvements.suggestions.push({
        category: 'specificity',
        priority: 'high',
        issue: 'Prompt is too vague',
        suggestion: 'Add specific requirements, constraints, or examples.',
        example: 'Include details like length, format, tone, or specific topics to cover'
      });
    }

    if (promptAnalysis.scores.completeness < 0.6) {
      improvements.suggestions.push({
        category: 'completeness',
        priority: 'medium',
        issue: 'Prompt seems incomplete',
        suggestion: 'Ensure all necessary information is included.',
        example: 'Check if you\'ve specified: topic, desired outcome, constraints, and format'
      });
    }

    // Generate improved version if score is low
    if (promptAnalysis.overallScore < 0.7) {
      improvements.improvedVersion = this._generateImprovedVersion(prompt, improvements.suggestions);
      improvements.expectedScore = Math.min(0.95, promptAnalysis.overallScore + 0.2);
    }

    // Update metrics
    this.metrics.improvementsSuggested++;
    await this._saveState();

    // Emit event
    this._emitEvent('IMPROVEMENTS_SUGGESTED', improvements);

    return improvements;
  }

  /**
   * Recommend templates based on prompt intent
   */
  async _recommendTemplate(data) {
    const { prompt, category } = data;
    
    // Determine intent/category if not provided
    const detectedCategory = category || this._detectIntent(prompt);
    
    // Find matching templates
    const matchingTemplates = this.templates.filter(template => {
      if (detectedCategory && template.category === detectedCategory) {
        return true;
      }
      // Also check keywords
      return template.keywords.some(keyword => 
        prompt.toLowerCase().includes(keyword.toLowerCase())
      );
    });

    // Sort by relevance
    const recommendations = matchingTemplates.map(template => ({
      ...template,
      relevanceScore: this._calculateTemplateRelevance(prompt, template)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);

    // Update metrics
    this.metrics.templatesRecommended++;
    await this._saveState();

    // Emit event
    this._emitEvent('TEMPLATES_RECOMMENDED', {
      prompt,
      category: detectedCategory,
      recommendations
    });

    return {
      category: detectedCategory,
      recommendations
    };
  }

  /**
   * Track prompt performance
   */
  async _trackPerformance(data) {
    const { prompt, response, rating, responseTime } = data;
    
    const performance = {
      prompt,
      response: response ? response.substring(0, 200) : null, // Store truncated
      rating: rating || null,
      responseTime: responseTime || null,
      timestamp: Date.now()
    };

    // Find or create prompt in history
    const historyEntry = this.promptHistory.find(h => h.prompt === prompt);
    if (historyEntry) {
      historyEntry.performances = historyEntry.performances || [];
      historyEntry.performances.push(performance);
      historyEntry.avgRating = this._calculateAverageRating(historyEntry.performances);
    } else {
      // Add as new entry
      const analysis = await this._analyzePrompt({ prompt });
      analysis.performances = [performance];
      analysis.avgRating = rating;
    }

    await this._saveState();

    // Emit event
    this._emitEvent('PERFORMANCE_TRACKED', performance);

    return performance;
  }

  /**
   * Compare two prompts (A/B testing)
   */
  async _comparePrompts(data) {
    const { promptA, promptB, experimentName } = data;
    
    const analysisA = await this._analyzePrompt({ prompt: promptA });
    const analysisB = await this._analyzePrompt({ prompt: promptB });

    const comparison = {
      experimentName: experimentName || `Experiment-${Date.now()}`,
      promptA: {
        prompt: promptA,
        score: analysisA.overallScore,
        strengths: this._identifyStrengths(analysisA),
        weaknesses: this._identifyWeaknesses(analysisA)
      },
      promptB: {
        prompt: promptB,
        score: analysisB.overallScore,
        strengths: this._identifyStrengths(analysisB),
        weaknesses: this._identifyWeaknesses(analysisB)
      },
      winner: analysisA.overallScore > analysisB.overallScore ? 'A' : 'B',
      difference: Math.abs(analysisA.overallScore - analysisB.overallScore),
      recommendation: null
    };

    // Generate recommendation
    if (comparison.difference < 0.1) {
      comparison.recommendation = 'Prompts are similar in quality. Test both with real usage.';
    } else {
      comparison.recommendation = `Prompt ${comparison.winner} is significantly better (${(comparison.difference * 100).toFixed(1)}% difference). Consider using it.`;
    }

    // Save experiment
    this.experiments.set(comparison.experimentName, {
      ...comparison,
      timestamp: Date.now()
    });

    await this._saveState();

    // Emit event
    this._emitEvent('PROMPTS_COMPARED', comparison);

    return comparison;
  }

  /**
   * Get prompt history
   */
  _getPromptHistory(data) {
    const { limit = 50, minScore = 0 } = data || {};
    
    return this.promptHistory
      .filter(entry => entry.overallScore >= minScore)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get prompt statistics
   */
  _getPromptStats() {
    const stats = {
      ...this.metrics,
      historySize: this.promptHistory.length,
      experimentsCount: this.experiments.size,
      topPrompts: this._getTopPrompts(5),
      commonWeaknesses: this._getCommonWeaknesses(),
      improvementTrend: this._calculateImprovementTrend()
    };

    return stats;
  }

  // ===== Helper Methods =====

  /**
   * Analyze clarity of prompt
   */
  _analyzeClarity(prompt) {
    let score = 0.5; // Base score

    // Check for clear question words
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    if (questionWords.some(word => prompt.toLowerCase().includes(word))) {
      score += 0.15;
    }

    // Check for imperative verbs (commands)
    const imperativeVerbs = ['explain', 'describe', 'list', 'create', 'write', 'analyze', 'compare', 'summarize'];
    if (imperativeVerbs.some(verb => prompt.toLowerCase().includes(verb))) {
      score += 0.15;
    }

    // Penalize very short prompts
    if (prompt.length < 20) {
      score -= 0.2;
    }

    // Reward clear sentences
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 5) {
      score += 0.1;
    }

    // Check for ambiguous words
    const ambiguousWords = ['thing', 'stuff', 'something', 'anything', 'some'];
    const ambiguousCount = ambiguousWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    score -= ambiguousCount * 0.05;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze context in prompt
   */
  _analyzeContext(prompt) {
    let score = 0.3; // Base score

    // Check for context indicators
    const contextIndicators = ['because', 'since', 'for', 'about', 'regarding', 'in order to'];
    if (contextIndicators.some(ind => prompt.toLowerCase().includes(ind))) {
      score += 0.2;
    }

    // Check for background information
    if (prompt.length > 50) {
      score += 0.15;
    }

    // Check for specific details (numbers, names, dates)
    if (/\d+/.test(prompt)) {
      score += 0.1;
    }
    if (/[A-Z][a-z]+\s[A-Z][a-z]+/.test(prompt)) { // Proper names
      score += 0.1;
    }

    // Check for role-setting
    const roleIndicators = ['as a', 'acting as', 'pretend you are', 'you are a'];
    if (roleIndicators.some(ind => prompt.toLowerCase().includes(ind))) {
      score += 0.15;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze structure of prompt
   */
  _analyzeStructure(prompt) {
    let score = 0.4; // Base score

    // Check for formatting
    if (prompt.includes('\n')) {
      score += 0.15;
    }

    // Check for numbered lists
    if (/\d+[\.\)]\s/.test(prompt)) {
      score += 0.15;
    }

    // Check for bullet points
    if (/[•\-*]\s/.test(prompt)) {
      score += 0.1;
    }

    // Check for sections (colons indicate structure)
    const colonCount = (prompt.match(/:/g) || []).length;
    if (colonCount >= 1 && colonCount <= 3) {
      score += 0.1;
    }

    // Check for logical flow
    const flowWords = ['first', 'then', 'finally', 'next', 'after', 'before'];
    if (flowWords.some(word => prompt.toLowerCase().includes(word))) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze specificity of prompt
   */
  _analyzeSpecificity(prompt) {
    let score = 0.3; // Base score

    // Check for specific constraints
    const constraintWords = ['must', 'should', 'need', 'require', 'want', 'only', 'exactly'];
    const constraintCount = constraintWords.filter(word => 
      prompt.toLowerCase().includes(word)
    ).length;
    score += Math.min(0.2, constraintCount * 0.05);

    // Check for format specifications
    const formatWords = ['format', 'length', 'words', 'paragraphs', 'bullet', 'table', 'list'];
    if (formatWords.some(word => prompt.toLowerCase().includes(word))) {
      score += 0.15;
    }

    // Check for examples
    if (prompt.toLowerCase().includes('example') || prompt.toLowerCase().includes('such as')) {
      score += 0.15;
    }

    // Check for specific topics/keywords
    const wordCount = this._countWords(prompt);
    if (wordCount >= 10 && wordCount <= 100) {
      score += 0.15;
    } else if (wordCount > 100) {
      score += 0.1;
    }

    // Check for technical terms (indicates specific domain)
    const technicalIndicators = prompt.match(/[A-Z]{2,}/g) || []; // Acronyms
    if (technicalIndicators.length > 0) {
      score += 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze completeness of prompt
   */
  _analyzeCompleteness(prompt) {
    let score = 0.3; // Base score

    const components = {
      hasGoal: false,
      hasContext: false,
      hasConstraints: false,
      hasFormat: false
    };

    // Check for goal
    const goalWords = ['want', 'need', 'goal', 'objective', 'purpose', 'help', 'create', 'make'];
    components.hasGoal = goalWords.some(word => prompt.toLowerCase().includes(word));

    // Check for context
    const contextWords = ['because', 'since', 'background', 'context', 'situation'];
    components.hasContext = contextWords.some(word => prompt.toLowerCase().includes(word));

    // Check for constraints
    const constraintWords = ['must', 'should', 'cannot', 'limit', 'constraint', 'requirement'];
    components.hasConstraints = constraintWords.some(word => prompt.toLowerCase().includes(word));

    // Check for format
    const formatWords = ['format', 'structure', 'output', 'result', 'return'];
    components.hasFormat = formatWords.some(word => prompt.toLowerCase().includes(word));

    // Calculate score based on components
    const componentCount = Object.values(components).filter(v => v).length;
    score += componentCount * 0.15;

    // Bonus for longer prompts (suggests completeness)
    if (prompt.length > 100) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate overall quality score
   */
  _calculateOverallScore(scores) {
    let total = 0;
    for (const [criterion, weight] of Object.entries(this.qualityCriteria)) {
      total += (scores[criterion] || 0) * weight;
    }
    return Math.round(total * 100) / 100;
  }

  /**
   * Identify prompt characteristics
   */
  _identifyCharacteristics(prompt) {
    const chars = {
      isQuestion: /\?/.test(prompt),
      isCommand: /^(please\s+)?(explain|describe|list|create|write|analyze)/i.test(prompt),
      hasCode: /```|`/.test(prompt),
      hasFormatting: /\n|[•\-\*]|\d+\./.test(prompt),
      hasConstraints: /(must|should|need|require|only|exactly)/i.test(prompt),
      hasExamples: /(example|such as|like|e\.g\.|for instance)/i.test(prompt),
      length: prompt.length < 50 ? 'short' : prompt.length < 200 ? 'medium' : 'long',
      complexity: this._estimateComplexity(prompt)
    };

    return chars;
  }

  /**
   * Estimate prompt complexity
   */
  _estimateComplexity(prompt) {
    const wordCount = this._countWords(prompt);
    const sentenceCount = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = wordCount / Math.max(1, sentenceCount);
    
    if (avgWordsPerSentence > 25 || wordCount > 150) {
      return 'complex';
    } else if (avgWordsPerSentence > 15 || wordCount > 75) {
      return 'moderate';
    } else {
      return 'simple';
    }
  }

  /**
   * Generate basic suggestions
   */
  _generateSuggestions(analysis) {
    const suggestions = [];

    // Check each score
    for (const [criterion, score] of Object.entries(analysis.scores)) {
      if (score < 0.6) {
        suggestions.push({
          criterion,
          message: `Improve ${criterion} (current score: ${(score * 100).toFixed(0)}%)`,
          priority: score < 0.4 ? 'high' : 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate improved version of prompt
   */
  _generateImprovedVersion(prompt, suggestions) {
    let improved = prompt;

    // Add structure if missing
    if (suggestions.some(s => s.category === 'structure')) {
      // Check if prompt has any structure
      if (!improved.includes('\n') && !improved.includes(':')) {
        improved = `Goal: ${improved}`;
      }
    }

    // Add context indicator if missing
    if (suggestions.some(s => s.category === 'context')) {
      if (!/(because|since|in order to)/i.test(improved)) {
        improved += '\n\nContext: [Add relevant background information here]';
      }
    }

    // Add format specification if missing
    if (suggestions.some(s => s.category === 'completeness')) {
      if (!/(format|output|structure)/i.test(improved)) {
        improved += '\n\nDesired format: [Specify how you want the response formatted]';
      }
    }

    return improved;
  }

  /**
   * Detect intent/category of prompt
   */
  _detectIntent(prompt) {
    const lower = prompt.toLowerCase();
    
    if (/(write|create|generate|compose).*code/.test(lower)) {
      return 'coding';
    } else if (/(write|create|draft|compose)/.test(lower)) {
      return 'writing';
    } else if (/(explain|describe|tell me about)/.test(lower)) {
      return 'explanation';
    } else if (/(analyze|compare|evaluate)/.test(lower)) {
      return 'analysis';
    } else if (/(list|enumerate|provide examples)/.test(lower)) {
      return 'listing';
    } else if (/(summarize|condense|brief)/.test(lower)) {
      return 'summarization';
    } else if (/(translate|convert)/.test(lower)) {
      return 'translation';
    } else if (/(solve|calculate|compute)/.test(lower)) {
      return 'problem_solving';
    } else {
      return 'general';
    }
  }

  /**
   * Calculate template relevance
   */
  _calculateTemplateRelevance(prompt, template) {
    let score = 0;
    const lower = prompt.toLowerCase();

    // Check keyword matches
    const matchingKeywords = template.keywords.filter(keyword => 
      lower.includes(keyword.toLowerCase())
    );
    score += matchingKeywords.length * 0.3;

    // Check category
    const detectedCategory = this._detectIntent(prompt);
    if (template.category === detectedCategory) {
      score += 0.4;
    }

    // Check prompt length compatibility
    const promptLength = prompt.length;
    if (template.minLength && promptLength < template.minLength) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate average rating
   */
  _calculateAverageRating(performances) {
    const rated = performances.filter(p => p.rating !== null);
    if (rated.length === 0) return null;
    
    return rated.reduce((sum, p) => sum + p.rating, 0) / rated.length;
  }

  /**
   * Identify strengths in analysis
   */
  _identifyStrengths(analysis) {
    return Object.entries(analysis.scores)
      .filter(([_, score]) => score >= 0.7)
      .map(([criterion, score]) => ({
        criterion,
        score,
        message: `Strong ${criterion}`
      }));
  }

  /**
   * Identify weaknesses in analysis
   */
  _identifyWeaknesses(analysis) {
    return Object.entries(analysis.scores)
      .filter(([_, score]) => score < 0.6)
      .map(([criterion, score]) => ({
        criterion,
        score,
        message: `Weak ${criterion}`
      }));
  }

  /**
   * Get top performing prompts
   */
  _getTopPrompts(limit) {
    return this.promptHistory
      .filter(entry => entry.avgRating !== null && entry.avgRating !== undefined)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, limit)
      .map(entry => ({
        prompt: entry.prompt.substring(0, 100),
        score: entry.overallScore,
        rating: entry.avgRating
      }));
  }

  /**
   * Get common weaknesses
   */
  _getCommonWeaknesses() {
    const weaknesses = {};
    
    this.promptHistory.forEach(entry => {
      Object.entries(entry.scores).forEach(([criterion, score]) => {
        if (score < 0.6) {
          weaknesses[criterion] = (weaknesses[criterion] || 0) + 1;
        }
      });
    });

    return Object.entries(weaknesses)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([criterion, count]) => ({
        criterion,
        count,
        percentage: (count / this.promptHistory.length * 100).toFixed(1)
      }));
  }

  /**
   * Calculate improvement trend
   */
  _calculateImprovementTrend() {
    if (this.promptHistory.length < 10) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recentCount = Math.min(20, Math.floor(this.promptHistory.length / 3));
    const recent = this.promptHistory.slice(-recentCount);
    const older = this.promptHistory.slice(-recentCount * 2, -recentCount);

    const recentAvg = recent.reduce((sum, e) => sum + e.overallScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, e) => sum + e.overallScore, 0) / older.length;

    const change = recentAvg - olderAvg;
    const trend = change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable';

    return { trend, change: Math.round(change * 100) / 100 };
  }

  /**
   * Count words in text
   */
  _countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Add entry to history
   */
  _addToHistory(analysis) {
    this.promptHistory.push(analysis);
    
    // Limit history size
    if (this.promptHistory.length > this.maxHistorySize) {
      this.promptHistory.shift();
    }
  }

  /**
   * Initialize template library
   */
  _initializeTemplates() {
    return [
      {
        id: 'code-request',
        name: 'Code Request',
        category: 'coding',
        template: 'Write [programming language] code that [specific task].\n\nRequirements:\n1. [requirement 1]\n2. [requirement 2]\n\nPlease include comments and error handling.',
        keywords: ['code', 'function', 'program', 'script', 'algorithm'],
        minLength: 20
      },
      {
        id: 'explanation',
        name: 'Concept Explanation',
        category: 'explanation',
        template: 'Explain [concept] in simple terms.\n\nContext: I am [your level/background]\nFocus on: [specific aspects]\nLength: [desired length]',
        keywords: ['explain', 'what is', 'describe', 'tell me about'],
        minLength: 15
      },
      {
        id: 'analysis',
        name: 'Analysis Request',
        category: 'analysis',
        template: 'Analyze [subject] focusing on:\n1. [aspect 1]\n2. [aspect 2]\n3. [aspect 3]\n\nProvide specific examples and data where possible.',
        keywords: ['analyze', 'compare', 'evaluate', 'assess'],
        minLength: 20
      },
      {
        id: 'writing-assistant',
        name: 'Writing Assistant',
        category: 'writing',
        template: 'Write a [type of content] about [topic].\n\nTone: [professional/casual/etc]\nLength: [word count or length]\nAudience: [target audience]\nKey points to cover:\n1. [point 1]\n2. [point 2]',
        keywords: ['write', 'create', 'compose', 'draft', 'article', 'essay'],
        minLength: 25
      },
      {
        id: 'list-generator',
        name: 'List Generator',
        category: 'listing',
        template: 'Create a comprehensive list of [subject].\n\nCriteria:\n- [criterion 1]\n- [criterion 2]\n\nFor each item, include [what to include].',
        keywords: ['list', 'enumerate', 'examples', 'ideas'],
        minLength: 15
      },
      {
        id: 'summarization',
        name: 'Summarization',
        category: 'summarization',
        template: 'Summarize the following [text/article/document] focusing on:\n- Key points\n- Main arguments\n- Conclusions\n\nLength: [desired length]\n\n[Content to summarize]',
        keywords: ['summarize', 'condense', 'brief', 'overview'],
        minLength: 20
      },
      {
        id: 'problem-solving',
        name: 'Problem Solving',
        category: 'problem_solving',
        template: 'Help me solve this problem:\n\nProblem: [describe problem]\nContext: [relevant information]\nConstraints: [any limitations]\nDesired outcome: [what success looks like]\n\nPlease provide step-by-step solution.',
        keywords: ['solve', 'problem', 'help', 'issue', 'calculate'],
        minLength: 25
      },
      {
        id: 'brainstorm',
        name: 'Brainstorming',
        category: 'general',
        template: 'Help me brainstorm ideas for [topic/project].\n\nGoal: [what you want to achieve]\nTarget audience: [who it\'s for]\nConstraints: [budget/time/other limits]\n\nPlease provide at least [number] creative ideas with brief explanations.',
        keywords: ['brainstorm', 'ideas', 'creative', 'suggestions'],
        minLength: 20
      }
    ];
  }

  /**
   * Load state from Chrome storage
   */
  async _loadState() {
    try {
      const data = await chrome.storage.local.get(['smartPromptsHistory', 'smartPromptsMetrics', 'smartPromptsExperiments']);
      
      if (data.smartPromptsHistory) {
        this.promptHistory = data.smartPromptsHistory;
      }
      if (data.smartPromptsMetrics) {
        this.metrics = data.smartPromptsMetrics;
      }
      if (data.smartPromptsExperiments) {
        this.experiments = new Map(data.smartPromptsExperiments);
      }
    } catch (error) {
      console.error('Failed to load SmartPromptsAgent state:', error);
    }
  }

  /**
   * Save state to Chrome storage
   */
  async _saveState() {
    try {
      await chrome.storage.local.set({
        smartPromptsHistory: this.promptHistory,
        smartPromptsMetrics: this.metrics,
        smartPromptsExperiments: Array.from(this.experiments.entries())
      });
    } catch (error) {
      console.error('Failed to save SmartPromptsAgent state:', error);
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(`SmartPrompts:${eventType}`, {
        agentId: this.agentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }
}

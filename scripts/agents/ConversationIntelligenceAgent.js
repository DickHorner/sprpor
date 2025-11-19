/**
 * ConversationIntelligenceAgent
 * 
 * Provides intelligent conversation analysis including:
 * - Topic extraction
 * - Auto-generated summaries
 * - Duplicate detection
 * - Related conversation suggestions
 * - Quality scoring
 */

class ConversationIntelligenceAgent extends BaseAgent {
    constructor() {
        super(
            'conversation-intelligence',
            'Conversation Intelligence',
            'Analyzes conversations to extract topics, generate summaries, detect duplicates, and provide intelligent suggestions',
            ['analyze', 'summarize', 'topics', 'duplicates', 'quality']
        );
        
        this.conversationCache = new Map();
        this.topicIndex = new Map(); // Map topics to conversation IDs
        this.settings = {
            minTopicRelevance: 0.5,
            maxTopicsPerConversation: 5,
            similarityThreshold: 0.7,
            minQualityScore: 0.3
        };
    }
    
    async initialize() {
        await super.initialize();
        this.logInfo('Conversation Intelligence Agent initialized');
        
        // Listen for conversation events
        this.eventBus.on('CONVERSATION_CREATED', (data) => this.onConversationCreated(data));
        this.eventBus.on('CONVERSATION_UPDATED', (data) => this.onConversationUpdated(data));
    }
    
    async execute(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'analyze':
                return await this.analyzeConversation(data.conversation);
            case 'summarize':
                return await this.generateSummary(data.conversation);
            case 'topics':
                return await this.extractTopics(data.conversation);
            case 'duplicates':
                return await this.findDuplicates(data.conversation);
            case 'related':
                return await this.findRelated(data.conversation);
            case 'quality':
                return await this.scoreQuality(data.conversation);
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }
    
    /**
     * Analyze a conversation completely
     */
    async analyzeConversation(conversation) {
        const analysis = {
            conversationId: conversation.id,
            topics: await this.extractTopics(conversation),
            summary: await this.generateSummary(conversation),
            quality: await this.scoreQuality(conversation),
            related: await this.findRelated(conversation),
            duplicates: await this.findDuplicates(conversation),
            timestamp: Date.now()
        };
        
        // Cache the analysis
        this.conversationCache.set(conversation.id, analysis);
        
        // Update topic index
        analysis.topics.forEach(topic => {
            if (!this.topicIndex.has(topic.name)) {
                this.topicIndex.set(topic.name, new Set());
            }
            this.topicIndex.get(topic.name).add(conversation.id);
        });
        
        this.eventBus.emit('CONVERSATION_ANALYZED', analysis);
        return analysis;
    }
    
    /**
     * Extract topics from conversation
     */
    async extractTopics(conversation) {
        const topics = [];
        const text = this.extractText(conversation);
        
        // Simple keyword extraction (can be enhanced with NLP libraries)
        const keywords = this.extractKeywords(text);
        
        // Group related keywords into topics
        const topicGroups = this.groupKeywordsIntoTopics(keywords);
        
        topicGroups.forEach((group, index) => {
            if (index < this.settings.maxTopicsPerConversation) {
                topics.push({
                    name: group.name,
                    keywords: group.keywords,
                    relevance: group.relevance,
                    mentions: group.mentions
                });
            }
        });
        
        return topics;
    }
    
    /**
     * Generate a summary of the conversation
     */
    async generateSummary(conversation) {
        const text = this.extractText(conversation);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        if (sentences.length === 0) {
            return {
                short: 'Empty conversation',
                long: 'This conversation has no content yet.',
                sentences: 0
            };
        }
        
        // Extract key sentences (simple extractive summarization)
        const keySentences = this.extractKeySentences(sentences, 3);
        
        return {
            short: keySentences[0]?.substring(0, 100) + '...' || 'No summary available',
            long: keySentences.join(' ').substring(0, 500) + '...',
            sentences: sentences.length,
            characters: text.length,
            words: text.split(/\s+/).length
        };
    }
    
    /**
     * Find duplicate or near-duplicate conversations
     */
    async findDuplicates(conversation) {
        const duplicates = [];
        const text = this.extractText(conversation);
        const tokens = this.tokenize(text);
        
        // Compare with cached conversations
        for (const [cachedId, cached] of this.conversationCache) {
            if (cachedId === conversation.id) continue;
            
            const similarity = this.calculateSimilarity(
                tokens,
                this.tokenize(this.extractText(cached.conversation || {}))
            );
            
            if (similarity >= this.settings.similarityThreshold) {
                duplicates.push({
                    id: cachedId,
                    similarity: similarity,
                    reason: similarity > 0.9 ? 'exact' : 'similar'
                });
            }
        }
        
        return duplicates.sort((a, b) => b.similarity - a.similarity);
    }
    
    /**
     * Find related conversations
     */
    async findRelated(conversation) {
        const related = [];
        const topics = await this.extractTopics(conversation);
        const conversationTopics = new Set(topics.map(t => t.name));
        
        // Find conversations sharing topics
        const relatedIds = new Set();
        conversationTopics.forEach(topic => {
            const conversations = this.topicIndex.get(topic);
            if (conversations) {
                conversations.forEach(id => {
                    if (id !== conversation.id) {
                        relatedIds.add(id);
                    }
                });
            }
        });
        
        // Score by shared topics
        relatedIds.forEach(id => {
            const cached = this.conversationCache.get(id);
            if (cached) {
                const sharedTopics = cached.topics.filter(t => 
                    conversationTopics.has(t.name)
                ).length;
                
                related.push({
                    id: id,
                    sharedTopics: sharedTopics,
                    relevance: sharedTopics / conversationTopics.size
                });
            }
        });
        
        return related
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 10);
    }
    
    /**
     * Score conversation quality
     */
    async scoreQuality(conversation) {
        const text = this.extractText(conversation);
        const metrics = {
            length: text.length,
            messages: conversation.messages?.length || 0,
            hasCode: /```/.test(text),
            hasFormatting: /[*_#]/.test(text),
            hasLinks: /https?:\/\//.test(text),
            avgMessageLength: text.length / Math.max(1, conversation.messages?.length || 1)
        };
        
        // Calculate quality score (0-1)
        let score = 0;
        
        // Length factors
        if (metrics.length > 100) score += 0.2;
        if (metrics.length > 500) score += 0.1;
        
        // Message count
        if (metrics.messages > 3) score += 0.2;
        if (metrics.messages > 10) score += 0.1;
        
        // Content richness
        if (metrics.hasCode) score += 0.15;
        if (metrics.hasFormatting) score += 0.1;
        if (metrics.hasLinks) score += 0.05;
        
        // Balance (not too short, not too long messages)
        if (metrics.avgMessageLength > 50 && metrics.avgMessageLength < 1000) {
            score += 0.1;
        }
        
        return {
            score: Math.min(1, score),
            metrics: metrics,
            rating: this.getRating(score)
        };
    }
    
    /**
     * Helper: Extract text from conversation
     */
    extractText(conversation) {
        if (!conversation || !conversation.messages) {
            return '';
        }
        
        return conversation.messages
            .map(msg => msg.content || msg.text || '')
            .join(' ')
            .trim();
    }
    
    /**
     * Helper: Extract keywords using simple frequency analysis
     */
    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 3);
        
        // Common stop words to filter out
        const stopWords = new Set([
            'that', 'this', 'with', 'from', 'have', 'been', 'were', 'what',
            'which', 'their', 'about', 'would', 'there', 'could', 'should'
        ]);
        
        // Count word frequencies
        const frequency = new Map();
        words.forEach(word => {
            if (!stopWords.has(word)) {
                frequency.set(word, (frequency.get(word) || 0) + 1);
            }
        });
        
        // Return sorted by frequency
        return Array.from(frequency.entries())
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    }
    
    /**
     * Helper: Group keywords into topics
     */
    groupKeywordsIntoTopics(keywords) {
        // Simple grouping - can be enhanced with word embeddings
        const topics = [];
        const used = new Set();
        
        keywords.forEach(kw => {
            if (used.has(kw.word)) return;
            
            // Find related keywords (simple prefix matching)
            const related = keywords.filter(other => 
                !used.has(other.word) && 
                (other.word.includes(kw.word) || kw.word.includes(other.word))
            );
            
            if (related.length > 0) {
                const totalMentions = related.reduce((sum, k) => sum + k.count, 0);
                topics.push({
                    name: kw.word,
                    keywords: related.map(r => r.word),
                    relevance: totalMentions / keywords.reduce((s, k) => s + k.count, 0),
                    mentions: totalMentions
                });
                
                related.forEach(r => used.add(r.word));
            }
        });
        
        return topics.sort((a, b) => b.relevance - a.relevance);
    }
    
    /**
     * Helper: Extract key sentences
     */
    extractKeySentences(sentences, count) {
        // Score sentences by length and position
        const scored = sentences.map((sentence, index) => {
            const words = sentence.split(/\s+/).length;
            const positionScore = 1 - (index / sentences.length) * 0.5; // Earlier is better
            const lengthScore = Math.min(words / 20, 1); // Prefer medium length
            
            return {
                sentence: sentence.trim(),
                score: positionScore * 0.6 + lengthScore * 0.4
            };
        });
        
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, count)
            .map(s => s.sentence);
    }
    
    /**
     * Helper: Tokenize text
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }
    
    /**
     * Helper: Calculate similarity between two token arrays (Jaccard similarity)
     */
    calculateSimilarity(tokens1, tokens2) {
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }
    
    /**
     * Helper: Get rating from score
     */
    getRating(score) {
        if (score >= 0.8) return 'excellent';
        if (score >= 0.6) return 'good';
        if (score >= 0.4) return 'fair';
        return 'poor';
    }
    
    /**
     * Event handlers
     */
    async onConversationCreated(data) {
        if (data.conversation) {
            // Analyze new conversations in background
            setTimeout(() => {
                this.analyzeConversation(data.conversation).catch(err => {
                    this.logError('Failed to analyze new conversation', err);
                });
            }, 1000);
        }
    }
    
    async onConversationUpdated(data) {
        if (data.conversation) {
            // Re-analyze updated conversations
            this.conversationCache.delete(data.conversation.id);
            setTimeout(() => {
                this.analyzeConversation(data.conversation).catch(err => {
                    this.logError('Failed to analyze updated conversation', err);
                });
            }, 1000);
        }
    }
}

/**
 * EnhancedSearchAgent
 * 
 * Provides advanced search capabilities including:
 * - Semantic search with embeddings
 * - Code-aware search
 * - Multi-criteria filtering
 * - Search history and saved searches
 * - Search performance optimization
 */

class EnhancedSearchAgent extends BaseAgent {
    constructor() {
        super(
            'enhanced-search',
            'Enhanced Search',
            'Provides semantic, code-aware, and multi-criteria search with history',
            ['search', 'filter', 'semantic', 'code']
        );
        
        this.searchHistory = [];
        this.savedSearches = new Map();
        this.searchCache = new Map();
        this.maxHistorySize = 100;
        this.maxCacheSize = 50;
    }
    
    async initialize() {
        await super.initialize();
        
        // Load saved state
        await this.loadState();
        
        this.logInfo('Enhanced Search Agent initialized');
    }
    
    async execute(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'search':
                return await this.search(data.query, data.options);
            case 'semantic':
                return await this.semanticSearch(data.query, data.conversations);
            case 'code':
                return await this.codeSearch(data.query, data.conversations);
            case 'filter':
                return await this.multiCriteriaFilter(data.conversations, data.criteria);
            case 'saveSearch':
                return await this.saveSearch(data.name, data.query, data.criteria);
            case 'getHistory':
                return this.getSearchHistory();
            case 'getSaved':
                return this.getSavedSearches();
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }
    
    /**
     * Main search function with all enhancements
     */
    async search(query, options = {}) {
        const startTime = Date.now();
        
        // Check cache
        const cacheKey = JSON.stringify({ query, options });
        if (this.searchCache.has(cacheKey)) {
            const cached = this.searchCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
                return { ...cached.results, cached: true };
            }
        }
        
        const {
            conversations = [],
            semantic = false,
            codeAware = false,
            filters = {}
        } = options;
        
        let results = conversations;
        
        // Apply filters first
        if (Object.keys(filters).length > 0) {
            results = await this.multiCriteriaFilter(results, filters);
        }
        
        // Apply search
        if (query && query.trim()) {
            if (semantic) {
                results = await this.semanticSearch(query, results);
            } else if (codeAware) {
                results = await this.codeSearch(query, results);
            } else {
                results = this.keywordSearch(query, results);
            }
        }
        
        const searchTime = Date.now() - startTime;
        
        // Add to history
        this.addToHistory({
            query,
            options,
            resultCount: results.length,
            timestamp: Date.now(),
            searchTime
        });
        
        const searchResults = {
            results,
            query,
            totalResults: results.length,
            searchTime,
            timestamp: Date.now()
        };
        
        // Cache results
        this.cacheResults(cacheKey, searchResults);
        
        // Emit event
        this.eventBus.emit('SEARCH_COMPLETED', searchResults);
        
        return searchResults;
    }
    
    /**
     * Semantic search using text similarity
     */
    async semanticSearch(query, conversations) {
        const queryTokens = this.tokenize(query.toLowerCase());
        const queryVector = this.createVector(queryTokens);
        
        // Score each conversation by semantic similarity
        const scored = conversations.map(conv => {
            const text = this.extractConversationText(conv);
            const tokens = this.tokenize(text.toLowerCase());
            const vector = this.createVector(tokens);
            
            const similarity = this.cosineSimilarity(queryVector, vector);
            
            return {
                conversation: conv,
                score: similarity
            };
        });
        
        // Return sorted by relevance
        return scored
            .filter(item => item.score > 0.1) // Threshold
            .sort((a, b) => b.score - a.score)
            .map(item => ({
                ...item.conversation,
                searchScore: item.score
            }));
    }
    
    /**
     * Code-aware search (detects code blocks and searches within them)
     */
    async codeSearch(query, conversations) {
        const queryLower = query.toLowerCase();
        const results = [];
        
        for (const conv of conversations) {
            const text = this.extractConversationText(conv);
            const codeBlocks = this.extractCodeBlocks(text);
            
            let matchScore = 0;
            let matchedBlocks = [];
            
            // Search in code blocks
            codeBlocks.forEach((block, index) => {
                const blockLower = block.code.toLowerCase();
                if (blockLower.includes(queryLower)) {
                    matchScore += 1;
                    matchedBlocks.push({
                        index,
                        language: block.language,
                        preview: this.getPreview(block.code, query, 100)
                    });
                }
            });
            
            // Also check regular text if code not found
            if (matchScore === 0 && text.toLowerCase().includes(queryLower)) {
                matchScore = 0.5;
            }
            
            if (matchScore > 0) {
                results.push({
                    ...conv,
                    searchScore: matchScore,
                    codeMatches: matchedBlocks,
                    hasCode: codeBlocks.length > 0
                });
            }
        }
        
        return results.sort((a, b) => b.searchScore - a.searchScore);
    }
    
    /**
     * Keyword search (improved version)
     */
    keywordSearch(query, conversations) {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        const results = [];
        
        for (const conv of conversations) {
            const text = this.extractConversationText(conv).toLowerCase();
            const title = (conv.title || '').toLowerCase();
            
            let score = 0;
            let matches = 0;
            
            terms.forEach(term => {
                // Title matches are weighted higher
                const titleMatches = (title.match(new RegExp(term, 'g')) || []).length;
                score += titleMatches * 5;
                matches += titleMatches;
                
                // Content matches
                const contentMatches = (text.match(new RegExp(term, 'g')) || []).length;
                score += contentMatches;
                matches += contentMatches;
            });
            
            if (matches > 0) {
                results.push({
                    ...conv,
                    searchScore: score,
                    matchCount: matches
                });
            }
        }
        
        return results.sort((a, b) => b.searchScore - a.searchScore);
    }
    
    /**
     * Multi-criteria filtering
     */
    async multiCriteriaFilter(conversations, criteria) {
        return conversations.filter(conv => {
            // Date range filter
            if (criteria.startDate && new Date(conv.createdAt || conv.create_time * 1000) < new Date(criteria.startDate)) {
                return false;
            }
            if (criteria.endDate && new Date(conv.createdAt || conv.create_time * 1000) > new Date(criteria.endDate)) {
                return false;
            }
            
            // Model filter
            if (criteria.model && conv.model !== criteria.model) {
                return false;
            }
            
            // Has code filter
            if (criteria.hasCode !== undefined) {
                const text = this.extractConversationText(conv);
                const hasCode = /```/.test(text);
                if (criteria.hasCode !== hasCode) {
                    return false;
                }
            }
            
            // Message count filter
            if (criteria.minMessages && (conv.messages?.length || 0) < criteria.minMessages) {
                return false;
            }
            if (criteria.maxMessages && (conv.messages?.length || 0) > criteria.maxMessages) {
                return false;
            }
            
            // Folder filter
            if (criteria.folder && conv.folderId !== criteria.folder) {
                return false;
            }
            
            // Tags filter
            if (criteria.tags && criteria.tags.length > 0) {
                const convTags = conv.tags || [];
                const hasAllTags = criteria.tags.every(tag => convTags.includes(tag));
                if (!hasAllTags) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    /**
     * Save a search for later use
     */
    async saveSearch(name, query, criteria) {
        this.savedSearches.set(name, {
            name,
            query,
            criteria,
            createdAt: Date.now()
        });
        
        await this.saveState();
        return { success: true, name };
    }
    
    /**
     * Get search history
     */
    getSearchHistory() {
        return this.searchHistory.slice().reverse(); // Most recent first
    }
    
    /**
     * Get saved searches
     */
    getSavedSearches() {
        return Array.from(this.savedSearches.values());
    }
    
    /**
     * Helper: Add search to history
     */
    addToHistory(search) {
        this.searchHistory.push(search);
        
        // Limit history size
        if (this.searchHistory.length > this.maxHistorySize) {
            this.searchHistory.shift();
        }
        
        this.saveState();
    }
    
    /**
     * Helper: Cache search results
     */
    cacheResults(key, results) {
        // Implement simple LRU cache
        if (this.searchCache.size >= this.maxCacheSize) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        
        this.searchCache.set(key, {
            results,
            timestamp: Date.now()
        });
    }
    
    /**
     * Helper: Extract text from conversation
     */
    extractConversationText(conversation) {
        if (!conversation) return '';
        
        let text = conversation.title || '';
        
        if (conversation.messages && Array.isArray(conversation.messages)) {
            text += ' ' + conversation.messages
                .map(msg => msg.content || msg.text || '')
                .join(' ');
        }
        
        return text.trim();
    }
    
    /**
     * Helper: Extract code blocks from text
     */
    extractCodeBlocks(text) {
        const blocks = [];
        const regex = /```(\w*)\n([\s\S]*?)```/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            blocks.push({
                language: match[1] || 'unknown',
                code: match[2]
            });
        }
        
        return blocks;
    }
    
    /**
     * Helper: Get preview of text around match
     */
    getPreview(text, query, length = 100) {
        const index = text.toLowerCase().indexOf(query.toLowerCase());
        if (index === -1) return text.substring(0, length);
        
        const start = Math.max(0, index - length / 2);
        const end = Math.min(text.length, index + query.length + length / 2);
        
        let preview = text.substring(start, end);
        if (start > 0) preview = '...' + preview;
        if (end < text.length) preview = preview + '...';
        
        return preview;
    }
    
    /**
     * Helper: Tokenize text
     */
    tokenize(text) {
        return text
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 0);
    }
    
    /**
     * Helper: Create vector from tokens (term frequency)
     */
    createVector(tokens) {
        const vector = new Map();
        tokens.forEach(token => {
            vector.set(token, (vector.get(token) || 0) + 1);
        });
        return vector;
    }
    
    /**
     * Helper: Calculate cosine similarity
     */
    cosineSimilarity(vec1, vec2) {
        const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);
        
        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;
        
        allTerms.forEach(term => {
            const v1 = vec1.get(term) || 0;
            const v2 = vec2.get(term) || 0;
            
            dotProduct += v1 * v2;
            mag1 += v1 * v1;
            mag2 += v2 * v2;
        });
        
        if (mag1 === 0 || mag2 === 0) return 0;
        
        return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
    }
    
    /**
     * Save state to storage
     */
    async saveState() {
        try {
            const state = {
                searchHistory: this.searchHistory.slice(-this.maxHistorySize),
                savedSearches: Array.from(this.savedSearches.entries()),
                timestamp: Date.now()
            };
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ enhancedSearchState: state });
            }
        } catch (error) {
            this.logError('Failed to save state', error);
        }
    }
    
    /**
     * Load state from storage
     */
    async loadState() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get('enhancedSearchState');
                if (result.enhancedSearchState) {
                    const state = result.enhancedSearchState;
                    this.searchHistory = state.searchHistory || [];
                    this.savedSearches = new Map(state.savedSearches || []);
                }
            }
        } catch (error) {
            this.logError('Failed to load state', error);
        }
    }
}

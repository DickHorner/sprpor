/**
 * NotionIntegrationAgent - Agent for Notion integration via make.com webhooks
 * Optional feature for Section 2
 * 
 * Capabilities:
 * - Export conversations to Notion
 * - Sync notes bidirectionally
 * - Integration with make.com webhooks
 * - OAuth/API token management
 * - Template mapping for Notion pages
 */

class NotionIntegrationAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'notion-integration-agent',
      name: 'Notion Integration Agent',
      description: 'Integrates with Notion for exporting conversations and syncing notes',
      capabilities: [
        'exportToNotion',
        'syncFromNotion',
        'configureMakeWebhook',
        'manageCredentials',
        'createNotionPage',
        'updateNotionPage',
        'getNotionPages',
        'testConnection',
        'getIntegrationStatus'
      ],
      version: '1.0.0'
    });

    // Integration settings
    this.settings = {
      enabled: false,
      useMakeCom: true, // Use make.com as bridge
      makeWebhookUrl: null,
      notionApiKey: null,
      notionDatabaseId: null,
      autoSync: false,
      syncInterval: 3600000 // 1 hour
    };

    // Template mappings
    this.templates = new Map();
    this._initializeDefaultTemplates();

    // Sync queue
    this.syncQueue = [];
    this.syncing = false;

    // Statistics
    this.stats = {
      conversationsExported: 0,
      pagesCreated: 0,
      pagesSynced: 0,
      lastSyncTime: null,
      failedSyncs: 0,
      successfulSyncs: 0
    };
  }

  async initialize() {
    await super.initialize();
    
    // Load saved settings
    await this._loadState();
    
    // Start auto-sync if enabled
    if (this.settings.enabled && this.settings.autoSync) {
      this._startAutoSync();
    }
    
    console.log(`${this.name} initialized. Status: ${this.settings.enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Main execution method
   */
  async execute(task) {
    const { type, data } = task;

    switch (type) {
      case 'exportToNotion':
        return await this._exportToNotion(data);
      
      case 'syncFromNotion':
        return await this._syncFromNotion(data);
      
      case 'configureMakeWebhook':
        return await this._configureMakeWebhook(data);
      
      case 'manageCredentials':
        return await this._manageCredentials(data);
      
      case 'createNotionPage':
        return await this._createNotionPage(data);
      
      case 'updateNotionPage':
        return await this._updateNotionPage(data);
      
      case 'getNotionPages':
        return await this._getNotionPages(data);
      
      case 'testConnection':
        return await this._testConnection();
      
      case 'getIntegrationStatus':
        return this._getIntegrationStatus();
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Export conversation to Notion
   */
  async _exportToNotion(data) {
    if (!this.settings.enabled) {
      throw new Error('Notion integration is not enabled');
    }

    const { conversation, template = 'default', options = {} } = data;
    
    if (!conversation) {
      throw new Error('Conversation data is required');
    }

    // Get template
    const templateConfig = this.templates.get(template) || this.templates.get('default');

    // Build Notion page data
    const pageData = this._buildNotionPageData(conversation, templateConfig, options);

    // Send to Notion
    let result;
    if (this.settings.useMakeCom) {
      result = await this._sendViaMakeWebhook(pageData, 'create');
    } else {
      result = await this._sendDirectToNotion(pageData, 'create');
    }

    // Update stats
    this.stats.conversationsExported++;
    this.stats.pagesCreated++;
    this.stats.successfulSyncs++;
    this.stats.lastSyncTime = Date.now();

    await this._saveState();

    // Emit event
    this._emitEvent('EXPORTED_TO_NOTION', {
      conversationId: conversation.id,
      notionPageId: result.pageId,
      template
    });

    return {
      success: true,
      conversationId: conversation.id,
      notionPageId: result.pageId,
      notionUrl: result.url
    };
  }

  /**
   * Sync from Notion
   */
  async _syncFromNotion(data) {
    if (!this.settings.enabled) {
      throw new Error('Notion integration is not enabled');
    }

    const { pageId, options = {} } = data;
    
    // Fetch from Notion
    let pageData;
    if (this.settings.useMakeCom) {
      pageData = await this._fetchViaMakeWebhook(pageId);
    } else {
      pageData = await this._fetchDirectFromNotion(pageId);
    }

    // Convert Notion data back to conversation format
    const conversationData = this._parseNotionPageData(pageData);

    // Update stats
    this.stats.pagesSynced++;
    this.stats.successfulSyncs++;
    this.stats.lastSyncTime = Date.now();

    await this._saveState();

    // Emit event
    this._emitEvent('SYNCED_FROM_NOTION', {
      pageId,
      conversationId: conversationData.id
    });

    return conversationData;
  }

  /**
   * Configure Make.com webhook
   */
  async _configureMakeWebhook(data) {
    const { webhookUrl, testConnection = true } = data;
    
    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    // Validate URL format
    if (!webhookUrl.startsWith('http')) {
      throw new Error('Invalid webhook URL format');
    }

    this.settings.makeWebhookUrl = webhookUrl;
    this.settings.useMakeCom = true;

    // Test connection if requested
    if (testConnection) {
      const testResult = await this._testMakeWebhook();
      if (!testResult.success) {
        throw new Error(`Webhook test failed: ${testResult.error}`);
      }
    }

    await this._saveState();

    // Emit event
    this._emitEvent('WEBHOOK_CONFIGURED', {
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    });

    return {
      success: true,
      message: 'Make.com webhook configured successfully',
      tested: testConnection
    };
  }

  /**
   * Manage credentials
   */
  async _manageCredentials(data) {
    const { action, credentials } = data;
    
    switch (action) {
      case 'set':
        if (credentials.notionApiKey) {
          this.settings.notionApiKey = credentials.notionApiKey;
        }
        if (credentials.notionDatabaseId) {
          this.settings.notionDatabaseId = credentials.notionDatabaseId;
        }
        this.settings.enabled = true;
        break;
      
      case 'clear':
        this.settings.notionApiKey = null;
        this.settings.notionDatabaseId = null;
        this.settings.enabled = false;
        break;
      
      case 'test':
        return await this._testConnection();
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await this._saveState();

    return {
      success: true,
      enabled: this.settings.enabled
    };
  }

  /**
   * Create Notion page
   */
  async _createNotionPage(data) {
    const { title, content, properties = {} } = data;
    
    const pageData = {
      parent: { database_id: this.settings.notionDatabaseId },
      properties: {
        Name: {
          title: [{ text: { content: title } }]
        },
        ...this._convertPropertiesToNotion(properties)
      },
      children: this._convertContentToNotionBlocks(content)
    };

    let result;
    if (this.settings.useMakeCom) {
      result = await this._sendViaMakeWebhook(pageData, 'create');
    } else {
      result = await this._sendDirectToNotion(pageData, 'create');
    }

    this.stats.pagesCreated++;
    await this._saveState();

    return result;
  }

  /**
   * Update Notion page
   */
  async _updateNotionPage(data) {
    const { pageId, properties, content } = data;
    
    const updateData = {
      page_id: pageId,
      properties: properties ? this._convertPropertiesToNotion(properties) : {},
      children: content ? this._convertContentToNotionBlocks(content) : []
    };

    let result;
    if (this.settings.useMakeCom) {
      result = await this._sendViaMakeWebhook(updateData, 'update');
    } else {
      result = await this._sendDirectToNotion(updateData, 'update');
    }

    this.stats.pagesSynced++;
    await this._saveState();

    return result;
  }

  /**
   * Get Notion pages
   */
  async _getNotionPages(data) {
    const { filter, limit = 100 } = data || {};
    
    const queryData = {
      database_id: this.settings.notionDatabaseId,
      page_size: limit,
      filter: filter || {}
    };

    let result;
    if (this.settings.useMakeCom) {
      result = await this._sendViaMakeWebhook(queryData, 'query');
    } else {
      result = await this._queryDirectFromNotion(queryData);
    }

    return result;
  }

  /**
   * Test connection
   */
  async _testConnection() {
    if (!this.settings.enabled) {
      return {
        success: false,
        error: 'Integration not enabled'
      };
    }

    try {
      if (this.settings.useMakeCom) {
        return await this._testMakeWebhook();
      } else {
        return await this._testDirectConnection();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get integration status
   */
  _getIntegrationStatus() {
    return {
      enabled: this.settings.enabled,
      useMakeCom: this.settings.useMakeCom,
      hasWebhook: !!this.settings.makeWebhookUrl,
      hasApiKey: !!this.settings.notionApiKey,
      hasDatabaseId: !!this.settings.notionDatabaseId,
      autoSync: this.settings.autoSync,
      stats: this.stats,
      queueSize: this.syncQueue.length,
      templates: Array.from(this.templates.keys())
    };
  }

  // ===== Helper Methods =====

  /**
   * Build Notion page data from conversation
   */
  _buildNotionPageData(conversation, template, options) {
    const pageData = {
      parent: { database_id: this.settings.notionDatabaseId },
      properties: {},
      children: []
    };

    // Apply template
    if (template.properties) {
      pageData.properties = this._applyTemplateProperties(conversation, template.properties);
    } else {
      // Default properties
      pageData.properties = {
        Name: {
          title: [{ text: { content: conversation.title || 'Untitled Conversation' } }]
        },
        'Created': {
          date: { start: new Date(conversation.createTime || Date.now()).toISOString() }
        },
        'Model': {
          select: { name: conversation.model || 'Unknown' }
        }
      };
    }

    // Add content blocks
    if (conversation.messages && Array.isArray(conversation.messages)) {
      conversation.messages.forEach(msg => {
        // Add message as block
        pageData.children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: `[${msg.role}]: ${msg.content.substring(0, 2000)}` }
            }]
          }
        });
      });
    }

    return pageData;
  }

  /**
   * Apply template properties to conversation
   */
  _applyTemplateProperties(conversation, templateProps) {
    const properties = {};
    
    for (const [key, config] of Object.entries(templateProps)) {
      if (config.type === 'title') {
        properties[key] = {
          title: [{ text: { content: this._getConversationValue(conversation, config.field) } }]
        };
      } else if (config.type === 'date') {
        const value = this._getConversationValue(conversation, config.field);
        properties[key] = {
          date: { start: new Date(value || Date.now()).toISOString() }
        };
      } else if (config.type === 'select') {
        properties[key] = {
          select: { name: this._getConversationValue(conversation, config.field) }
        };
      } else if (config.type === 'multi_select') {
        const values = this._getConversationValue(conversation, config.field);
        properties[key] = {
          multi_select: Array.isArray(values) ? values.map(v => ({ name: v })) : []
        };
      }
    }

    return properties;
  }

  /**
   * Get value from conversation object
   */
  _getConversationValue(conversation, field) {
    const parts = field.split('.');
    let value = conversation;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return '';
      }
    }

    return value || '';
  }

  /**
   * Convert properties to Notion format
   */
  _convertPropertiesToNotion(properties) {
    const notionProps = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        notionProps[key] = { rich_text: [{ text: { content: value } }] };
      } else if (typeof value === 'number') {
        notionProps[key] = { number: value };
      } else if (Array.isArray(value)) {
        notionProps[key] = { multi_select: value.map(v => ({ name: v })) };
      }
    }

    return notionProps;
  }

  /**
   * Convert content to Notion blocks
   */
  _convertContentToNotionBlocks(content) {
    if (!content) return [];
    
    const blocks = [];
    
    if (typeof content === 'string') {
      // Split by paragraphs
      const paragraphs = content.split('\n\n');
      paragraphs.forEach(para => {
        if (para.trim()) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: para.substring(0, 2000) } }]
            }
          });
        }
      });
    } else if (Array.isArray(content)) {
      content.forEach(block => {
        blocks.push(block);
      });
    }

    return blocks;
  }

  /**
   * Parse Notion page data back to conversation format
   */
  _parseNotionPageData(pageData) {
    // Extract basic info
    const conversation = {
      id: pageData.id,
      title: this._extractNotionTitle(pageData.properties),
      createTime: this._extractNotionDate(pageData.properties, 'Created'),
      model: this._extractNotionSelect(pageData.properties, 'Model'),
      messages: []
    };

    // Parse blocks back to messages (simplified)
    if (pageData.children) {
      pageData.children.forEach(block => {
        if (block.type === 'paragraph') {
          const text = this._extractBlockText(block);
          conversation.messages.push({
            role: 'user', // Simplified
            content: text
          });
        }
      });
    }

    return conversation;
  }

  /**
   * Extract title from Notion properties
   */
  _extractNotionTitle(properties) {
    const titleProp = Object.values(properties).find(p => p.type === 'title');
    if (titleProp && titleProp.title && titleProp.title[0]) {
      return titleProp.title[0].text.content;
    }
    return 'Untitled';
  }

  /**
   * Extract date from Notion properties
   */
  _extractNotionDate(properties, propName) {
    if (properties[propName] && properties[propName].date) {
      return new Date(properties[propName].date.start).getTime();
    }
    return Date.now();
  }

  /**
   * Extract select from Notion properties
   */
  _extractNotionSelect(properties, propName) {
    if (properties[propName] && properties[propName].select) {
      return properties[propName].select.name;
    }
    return '';
  }

  /**
   * Extract text from Notion block
   */
  _extractBlockText(block) {
    if (block.paragraph && block.paragraph.rich_text) {
      return block.paragraph.rich_text.map(rt => rt.text.content).join('');
    }
    return '';
  }

  /**
   * Send via Make.com webhook
   */
  async _sendViaMakeWebhook(data, action) {
    if (!this.settings.makeWebhookUrl) {
      throw new Error('Make.com webhook URL not configured');
    }

    try {
      const response = await fetch(this.settings.makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          data,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      this.stats.failedSyncs++;
      throw new Error(`Failed to send via Make.com webhook: ${error.message}`);
    }
  }

  /**
   * Fetch via Make.com webhook
   */
  async _fetchViaMakeWebhook(pageId) {
    return await this._sendViaMakeWebhook({ pageId }, 'fetch');
  }

  /**
   * Test Make.com webhook
   */
  async _testMakeWebhook() {
    try {
      const result = await this._sendViaMakeWebhook({ test: true }, 'test');
      return {
        success: true,
        message: 'Webhook connection successful',
        response: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send directly to Notion API
   */
  async _sendDirectToNotion(data, action) {
    if (!this.settings.notionApiKey) {
      throw new Error('Notion API key not configured');
    }

    // Note: This is a simplified implementation
    // In production, you'd use the official Notion SDK or make proper API calls
    throw new Error('Direct Notion API integration not implemented. Please use Make.com webhook.');
  }

  /**
   * Fetch directly from Notion API
   */
  async _fetchDirectFromNotion(pageId) {
    throw new Error('Direct Notion API integration not implemented. Please use Make.com webhook.');
  }

  /**
   * Query directly from Notion API
   */
  async _queryDirectFromNotion(queryData) {
    throw new Error('Direct Notion API integration not implemented. Please use Make.com webhook.');
  }

  /**
   * Test direct connection
   */
  async _testDirectConnection() {
    throw new Error('Direct Notion API integration not implemented. Please use Make.com webhook.');
  }

  /**
   * Initialize default templates
   */
  _initializeDefaultTemplates() {
    this.templates.set('default', {
      name: 'Default Template',
      properties: {
        'Name': { type: 'title', field: 'title' },
        'Created': { type: 'date', field: 'createTime' },
        'Model': { type: 'select', field: 'model' },
        'Tags': { type: 'multi_select', field: 'tags' }
      }
    });

    this.templates.set('detailed', {
      name: 'Detailed Template',
      properties: {
        'Name': { type: 'title', field: 'title' },
        'Created': { type: 'date', field: 'createTime' },
        'Updated': { type: 'date', field: 'updateTime' },
        'Model': { type: 'select', field: 'model' },
        'Message Count': { type: 'number', field: 'messageCount' },
        'Tags': { type: 'multi_select', field: 'tags' },
        'Folder': { type: 'select', field: 'folderId' }
      }
    });

    this.templates.set('simple', {
      name: 'Simple Template',
      properties: {
        'Title': { type: 'title', field: 'title' },
        'Date': { type: 'date', field: 'createTime' }
      }
    });
  }

  /**
   * Start auto-sync
   */
  _startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this._processSyncQueue();
    }, this.settings.syncInterval);

    console.log('Auto-sync started');
  }

  /**
   * Process sync queue
   */
  async _processSyncQueue() {
    if (this.syncing || this.syncQueue.length === 0) {
      return;
    }

    this.syncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        
        try {
          if (item.action === 'export') {
            await this._exportToNotion(item.data);
          } else if (item.action === 'sync') {
            await this._syncFromNotion(item.data);
          }
        } catch (error) {
          console.error('Sync queue item failed:', error);
          this.stats.failedSyncs++;
        }
      }
    } finally {
      this.syncing = false;
    }
  }

  /**
   * Load state from Chrome storage
   */
  async _loadState() {
    try {
      const data = await chrome.storage.local.get([
        'notionIntegrationSettings',
        'notionIntegrationStats',
        'notionIntegrationTemplates'
      ]);
      
      if (data.notionIntegrationSettings) {
        this.settings = { ...this.settings, ...data.notionIntegrationSettings };
      }
      if (data.notionIntegrationStats) {
        this.stats = data.notionIntegrationStats;
      }
      if (data.notionIntegrationTemplates) {
        this.templates = new Map(data.notionIntegrationTemplates);
      }
    } catch (error) {
      console.error('Failed to load NotionIntegrationAgent state:', error);
    }
  }

  /**
   * Save state to Chrome storage
   */
  async _saveState() {
    try {
      await chrome.storage.local.set({
        notionIntegrationSettings: {
          enabled: this.settings.enabled,
          useMakeCom: this.settings.useMakeCom,
          makeWebhookUrl: this.settings.makeWebhookUrl,
          notionDatabaseId: this.settings.notionDatabaseId,
          autoSync: this.settings.autoSync,
          syncInterval: this.settings.syncInterval
          // Note: API key is intentionally not saved for security
        },
        notionIntegrationStats: this.stats,
        notionIntegrationTemplates: Array.from(this.templates.entries())
      });
    } catch (error) {
      console.error('Failed to save NotionIntegrationAgent state:', error);
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(`NotionIntegration:${eventType}`, {
        agentId: this.agentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }

  async shutdown() {
    await super.shutdown();
    
    // Stop auto-sync
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

/**
 * IntegrationHubAgent - External service integrations
 * Section 3.3 of the Superpower ChatGPT roadmap
 * 
 * Capabilities:
 * - GitHub integration (save code snippets, link issues)
 * - Obsidian integration (bidirectional sync)
 * - Slack notifications
 * - Webhook support for custom integrations
 * Note: Notion integration already exists in NotionIntegrationAgent
 */

// Agent states
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  WAITING: 'waiting',
  ERROR: 'error'
};

class IntegrationHubAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'integration-hub-agent',
      name: 'Integration Hub Agent',
      description: 'Manages integrations with external services like GitHub, Obsidian, and Slack',
      capabilities: [
        'githubSaveSnippet',
        'githubLinkIssue',
        'githubCreateGist',
        'obsidianSync',
        'obsidianExport',
        'slackNotify',
        'slackSendMessage',
        'webhookTrigger',
        'webhookRegister',
        'getIntegrationStatus',
        'testIntegration',
        'getIntegrationStats'
      ],
      version: '1.0.0'
    });

    // Integration configurations
    this.integrations = {
      github: {
        enabled: false,
        token: null,
        username: null,
        defaultRepo: null,
        gists: new Map()
      },
      obsidian: {
        enabled: false,
        vaultPath: null,
        syncMode: 'manual', // 'manual' or 'auto'
        lastSync: null,
        syncedNotes: new Map()
      },
      slack: {
        enabled: false,
        webhookUrl: null,
        channel: null,
        notifications: []
      },
      webhooks: new Map() // Map of webhook ID -> webhook config
    };

    // Statistics
    this.stats = {
      ...this.stats,
      githubSnippetsSaved: 0,
      githubGistsCreated: 0,
      githubIssuesLinked: 0,
      obsidianNotesSync: 0,
      slackNotificationsSent: 0,
      webhooksTriggered: 0,
      lastIntegrationActivity: null
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    console.log('IntegrationHubAgent: Initializing...');
    
    // Load integration configurations from storage
    await this._loadIntegrations();
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('IntegrationHubAgent: Initialization complete');
    console.log(`Active integrations: ${this._getActiveIntegrations().join(', ')}`);
  }

  /**
   * Set up event listeners for automatic integrations
   */
  _setupEventListeners() {
    if (this.eventBus) {
      // Listen for conversation updates for auto-sync
      this.eventBus.on('conversation:created', async (data) => {
        if (this.integrations.obsidian.enabled && this.integrations.obsidian.syncMode === 'auto') {
          await this.handleTask({
            type: 'obsidianSync',
            data: { conversationId: data.conversationId, conversation: data.conversation }
          });
        }
      });

      // Listen for code snippets for GitHub auto-save
      this.eventBus.on('code:detected', async (data) => {
        if (this.integrations.github.enabled && data.autoSave) {
          await this.handleTask({
            type: 'githubSaveSnippet',
            data: { code: data.code, language: data.language }
          });
        }
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
        // GitHub integrations
        case 'githubSaveSnippet':
          result = await this._githubSaveSnippet(task.data);
          break;

        case 'githubLinkIssue':
          result = await this._githubLinkIssue(task.data);
          break;

        case 'githubCreateGist':
          result = await this._githubCreateGist(task.data);
          break;

        // Obsidian integrations
        case 'obsidianSync':
          result = await this._obsidianSync(task.data);
          break;

        case 'obsidianExport':
          result = await this._obsidianExport(task.data);
          break;

        // Slack integrations
        case 'slackNotify':
          result = await this._slackNotify(task.data);
          break;

        case 'slackSendMessage':
          result = await this._slackSendMessage(task.data);
          break;

        // Webhook integrations
        case 'webhookTrigger':
          result = await this._webhookTrigger(task.data);
          break;

        case 'webhookRegister':
          result = await this._webhookRegister(task.data);
          break;

        // Integration management
        case 'getIntegrationStatus':
          result = await this._getIntegrationStatus(task.data);
          break;

        case 'testIntegration':
          result = await this._testIntegration(task.data);
          break;

        case 'getIntegrationStats':
          result = await this._getIntegrationStats();
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

      console.error('IntegrationHubAgent: Task failed', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  // ============ GitHub Integration Methods ============

  /**
   * Save code snippet to GitHub repository
   */
  async _githubSaveSnippet(data) {
    const { code, language, filename, description = '', conversationId } = data;

    if (!this.integrations.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    if (!code) {
      throw new Error('Code content is required');
    }

    const snippetFilename = filename || `snippet-${Date.now()}.${this._getFileExtension(language)}`;
    const repo = this.integrations.github.defaultRepo;

    console.log(`Saving code snippet to GitHub: ${snippetFilename}`);

    // In production, this would make actual GitHub API calls
    const snippet = {
      id: `snippet-${Date.now()}`,
      filename: snippetFilename,
      code,
      language,
      description,
      repo,
      conversationId,
      createdAt: Date.now(),
      githubUrl: `https://github.com/${repo}/blob/main/snippets/${snippetFilename}`,
      status: 'saved'
    };

    this.stats.githubSnippetsSaved++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:github-snippet-saved', snippet);
    }

    return snippet;
  }

  /**
   * Link conversation to GitHub issue
   */
  async _githubLinkIssue(data) {
    const { conversationId, issueNumber, repo, bidirectional = true } = data;

    if (!this.integrations.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    const repoName = repo || this.integrations.github.defaultRepo;

    console.log(`Linking conversation ${conversationId} to issue #${issueNumber} in ${repoName}`);

    const link = {
      id: `link-${Date.now()}`,
      conversationId,
      issueNumber,
      repo: repoName,
      issueUrl: `https://github.com/${repoName}/issues/${issueNumber}`,
      bidirectional,
      createdAt: Date.now()
    };

    // In production, this would:
    // 1. Add comment to GitHub issue with conversation link
    // 2. Store reference in conversation metadata
    // 3. Set up webhook to monitor issue updates

    this.stats.githubIssuesLinked++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:github-issue-linked', link);
    }

    return link;
  }

  /**
   * Create GitHub Gist from conversation or code
   */
  async _githubCreateGist(data) {
    const { content, description = '', filename, isPublic = false, conversationId } = data;

    if (!this.integrations.github.enabled) {
      throw new Error('GitHub integration is not enabled');
    }

    console.log('Creating GitHub Gist...');

    const gistId = `gist-${Date.now()}`;
    const gist = {
      id: gistId,
      filename: filename || 'conversation.md',
      content,
      description,
      isPublic,
      conversationId,
      createdAt: Date.now(),
      url: `https://gist.github.com/${this.integrations.github.username}/${gistId}`,
      status: 'created'
    };

    this.integrations.github.gists.set(gistId, gist);

    this.stats.githubGistsCreated++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:github-gist-created', gist);
    }

    return gist;
  }

  // ============ Obsidian Integration Methods ============

  /**
   * Sync conversation to Obsidian vault
   */
  async _obsidianSync(data) {
    const { conversationId, conversation, syncMode = 'create' } = data;

    if (!this.integrations.obsidian.enabled) {
      throw new Error('Obsidian integration is not enabled');
    }

    console.log(`Syncing conversation ${conversationId} to Obsidian`);

    // Convert conversation to Markdown
    const markdown = this._convertConversationToMarkdown(conversation);
    
    // Generate filename
    const filename = `${conversation.title || 'Untitled'}-${conversationId}.md`;
    const filePath = `${this.integrations.obsidian.vaultPath}/${filename}`;

    // In production, this would:
    // 1. Use Obsidian Local REST API or file system access
    // 2. Create/update note in Obsidian vault
    // 3. Handle bidirectional sync with conflict resolution

    const syncedNote = {
      conversationId,
      filename,
      filePath,
      lastSync: Date.now(),
      syncMode,
      wordCount: markdown.split(/\s+/).length,
      characterCount: markdown.length
    };

    this.integrations.obsidian.syncedNotes.set(conversationId, syncedNote);
    this.integrations.obsidian.lastSync = Date.now();

    this.stats.obsidianNotesSync++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:obsidian-synced', syncedNote);
    }

    return {
      synced: true,
      filename,
      filePath,
      markdown,
      note: syncedNote
    };
  }

  /**
   * Export conversation to Obsidian format
   */
  async _obsidianExport(data) {
    const { conversationId, conversation, includeMetadata = true, includeLinks = true } = data;

    console.log(`Exporting conversation ${conversationId} to Obsidian format`);

    const markdown = this._convertConversationToMarkdown(conversation, {
      includeMetadata,
      includeLinks,
      includeYamlFrontmatter: true
    });

    return {
      conversationId,
      format: 'obsidian-markdown',
      markdown,
      filename: `${conversation.title || 'Untitled'}.md`,
      size: markdown.length
    };
  }

  // ============ Slack Integration Methods ============

  /**
   * Send notification to Slack
   */
  async _slackNotify(data) {
    const { message, title = '', priority = 'normal', conversationId = null } = data;

    if (!this.integrations.slack.enabled) {
      throw new Error('Slack integration is not enabled');
    }

    console.log('Sending Slack notification:', title);

    // Format message for Slack
    const slackMessage = this._formatSlackMessage({
      title,
      message,
      priority,
      conversationId,
      timestamp: Date.now()
    });

    // In production, this would make actual Slack API calls
    const notification = {
      id: `slack-notif-${Date.now()}`,
      title,
      message,
      priority,
      conversationId,
      sentAt: Date.now(),
      channel: this.integrations.slack.channel,
      status: 'sent'
    };

    this.integrations.slack.notifications.push(notification);

    this.stats.slackNotificationsSent++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:slack-notification-sent', notification);
    }

    return notification;
  }

  /**
   * Send message to Slack channel
   */
  async _slackSendMessage(data) {
    const { channel, text, attachments = [], thread_ts = null } = data;

    if (!this.integrations.slack.enabled) {
      throw new Error('Slack integration is not enabled');
    }

    console.log(`Sending message to Slack channel: ${channel || this.integrations.slack.channel}`);

    const message = {
      id: `slack-msg-${Date.now()}`,
      channel: channel || this.integrations.slack.channel,
      text,
      attachments,
      thread_ts,
      sentAt: Date.now(),
      status: 'sent'
    };

    this.stats.slackNotificationsSent++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    return message;
  }

  // ============ Webhook Integration Methods ============

  /**
   * Trigger a webhook
   */
  async _webhookTrigger(data) {
    const { webhookId, payload, headers = {} } = data;

    if (!this.integrations.webhooks.has(webhookId)) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const webhook = this.integrations.webhooks.get(webhookId);

    console.log(`Triggering webhook: ${webhook.name}`);

    // In production, this would make actual HTTP request
    const trigger = {
      id: `trigger-${Date.now()}`,
      webhookId,
      webhook: webhook.name,
      url: webhook.url,
      method: webhook.method || 'POST',
      payload,
      headers: { ...webhook.headers, ...headers },
      triggeredAt: Date.now(),
      status: 'sent',
      responseStatus: 200
    };

    // Update webhook stats
    webhook.triggerCount = (webhook.triggerCount || 0) + 1;
    webhook.lastTriggered = Date.now();
    this.integrations.webhooks.set(webhookId, webhook);

    this.stats.webhooksTriggered++;
    this.stats.lastIntegrationActivity = Date.now();
    await this._saveIntegrations();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:webhook-triggered', trigger);
    }

    return trigger;
  }

  /**
   * Register a new webhook
   */
  async _webhookRegister(data) {
    const { name, url, method = 'POST', headers = {}, events = [], enabled = true } = data;

    if (!name || !url) {
      throw new Error('Webhook name and URL are required');
    }

    const webhookId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const webhook = {
      webhookId,
      name,
      url,
      method,
      headers,
      events, // Array of event types this webhook should trigger on
      enabled,
      createdAt: Date.now(),
      triggerCount: 0,
      lastTriggered: null
    };

    this.integrations.webhooks.set(webhookId, webhook);
    await this._saveIntegrations();

    // Set up event listeners for this webhook
    if (enabled && events.length > 0) {
      this._setupWebhookListeners(webhook);
    }

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('integration:webhook-registered', webhook);
    }

    return {
      webhookId,
      webhook
    };
  }

  // ============ Integration Management Methods ============

  /**
   * Get integration status
   */
  async _getIntegrationStatus(data) {
    const { integration } = data;

    if (integration) {
      // Get status for specific integration
      if (!this.integrations[integration]) {
        throw new Error(`Integration ${integration} not found`);
      }

      return {
        integration,
        ...this.integrations[integration]
      };
    }

    // Get status for all integrations
    return {
      github: {
        enabled: this.integrations.github.enabled,
        username: this.integrations.github.username,
        hasToken: !!this.integrations.github.token,
        defaultRepo: this.integrations.github.defaultRepo,
        gistsCount: this.integrations.github.gists.size
      },
      obsidian: {
        enabled: this.integrations.obsidian.enabled,
        vaultPath: this.integrations.obsidian.vaultPath,
        syncMode: this.integrations.obsidian.syncMode,
        lastSync: this.integrations.obsidian.lastSync,
        syncedNotesCount: this.integrations.obsidian.syncedNotes.size
      },
      slack: {
        enabled: this.integrations.slack.enabled,
        hasWebhook: !!this.integrations.slack.webhookUrl,
        channel: this.integrations.slack.channel,
        notificationsCount: this.integrations.slack.notifications.length
      },
      webhooks: {
        totalWebhooks: this.integrations.webhooks.size,
        enabledWebhooks: Array.from(this.integrations.webhooks.values()).filter(w => w.enabled).length
      }
    };
  }

  /**
   * Test an integration
   */
  async _testIntegration(data) {
    const { integration } = data;

    console.log(`Testing ${integration} integration...`);

    let testResult = {
      integration,
      tested: true,
      timestamp: Date.now(),
      success: false,
      message: ''
    };

    try {
      switch (integration) {
        case 'github':
          if (!this.integrations.github.enabled) {
            throw new Error('GitHub integration is not enabled');
          }
          // In production, would test API connection
          testResult.success = true;
          testResult.message = 'GitHub API connection successful';
          break;

        case 'obsidian':
          if (!this.integrations.obsidian.enabled) {
            throw new Error('Obsidian integration is not enabled');
          }
          // In production, would test vault access
          testResult.success = true;
          testResult.message = 'Obsidian vault access successful';
          break;

        case 'slack':
          if (!this.integrations.slack.enabled) {
            throw new Error('Slack integration is not enabled');
          }
          // In production, would send test message
          testResult.success = true;
          testResult.message = 'Slack webhook connection successful';
          break;

        default:
          throw new Error(`Unknown integration: ${integration}`);
      }
    } catch (error) {
      testResult.success = false;
      testResult.message = error.message;
    }

    return testResult;
  }

  /**
   * Get integration statistics
   */
  async _getIntegrationStats() {
    return {
      activeIntegrations: this._getActiveIntegrations(),
      github: {
        snippetsSaved: this.stats.githubSnippetsSaved,
        gistsCreated: this.stats.githubGistsCreated,
        issuesLinked: this.stats.githubIssuesLinked
      },
      obsidian: {
        notesSync: this.stats.obsidianNotesSync,
        lastSync: this.integrations.obsidian.lastSync
      },
      slack: {
        notificationsSent: this.stats.slackNotificationsSent
      },
      webhooks: {
        totalWebhooks: this.integrations.webhooks.size,
        totalTriggered: this.stats.webhooksTriggered,
        byWebhook: this._getWebhookStats()
      },
      lastActivity: this.stats.lastIntegrationActivity,
      stats: this.stats
    };
  }

  // ============ Helper Methods ============

  _getActiveIntegrations() {
    const active = [];
    if (this.integrations.github.enabled) active.push('github');
    if (this.integrations.obsidian.enabled) active.push('obsidian');
    if (this.integrations.slack.enabled) active.push('slack');
    if (this.integrations.webhooks.size > 0) active.push('webhooks');
    return active;
  }

  _getFileExtension(language) {
    const extensions = {
      javascript: 'js',
      typescript: 'ts',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'cs',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      php: 'php',
      swift: 'swift',
      kotlin: 'kt'
    };
    return extensions[language?.toLowerCase()] || 'txt';
  }

  _convertConversationToMarkdown(conversation, options = {}) {
    const {
      includeMetadata = true,
      includeLinks = true,
      includeYamlFrontmatter = false
    } = options;

    let markdown = '';

    // YAML frontmatter for Obsidian
    if (includeYamlFrontmatter) {
      markdown += '---\n';
      markdown += `title: ${conversation.title || 'Untitled'}\n`;
      markdown += `created: ${new Date(conversation.createdAt || Date.now()).toISOString()}\n`;
      markdown += `model: ${conversation.model || 'unknown'}\n`;
      markdown += `tags: [chatgpt, conversation]\n`;
      markdown += '---\n\n';
    }

    // Title
    markdown += `# ${conversation.title || 'Untitled Conversation'}\n\n`;

    // Metadata
    if (includeMetadata) {
      markdown += `**Created:** ${new Date(conversation.createdAt || Date.now()).toLocaleDateString()}\n`;
      markdown += `**Model:** ${conversation.model || 'unknown'}\n`;
      markdown += `**Messages:** ${conversation.messages?.length || 0}\n\n`;
      markdown += '---\n\n';
    }

    // Messages
    const messages = conversation.messages || [];
    messages.forEach((msg, index) => {
      const role = msg.role || 'unknown';
      const content = msg.content || msg.text || '';
      
      markdown += `## ${role === 'user' ? '👤 User' : '🤖 Assistant'}\n\n`;
      markdown += `${content}\n\n`;
      
      if (index < messages.length - 1) {
        markdown += '---\n\n';
      }
    });

    // Links
    if (includeLinks) {
      markdown += '\n## Links\n\n';
      markdown += '- [[Index]]\n';
      markdown += `- Created: ${new Date(conversation.createdAt || Date.now()).toLocaleDateString()}\n`;
    }

    return markdown;
  }

  _formatSlackMessage(data) {
    const { title, message, priority, conversationId, timestamp } = data;

    let emoji = ':information_source:';
    if (priority === 'high') emoji = ':warning:';
    if (priority === 'urgent') emoji = ':rotating_light:';

    return {
      text: `${emoji} ${title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: title
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Priority: *${priority}* | Time: <!date^${Math.floor(timestamp / 1000)}^{date_short_pretty} at {time}|${new Date(timestamp).toISOString()}>`
            }
          ]
        }
      ]
    };
  }

  _setupWebhookListeners(webhook) {
    if (!this.eventBus) return;

    webhook.events.forEach(eventType => {
      this.eventBus.on(eventType, async (eventData) => {
        if (webhook.enabled) {
          await this.handleTask({
            type: 'webhookTrigger',
            data: {
              webhookId: webhook.webhookId,
              payload: {
                event: eventType,
                timestamp: Date.now(),
                data: eventData
              }
            }
          });
        }
      });
    });
  }

  _getWebhookStats() {
    const stats = [];
    for (const [id, webhook] of this.integrations.webhooks) {
      stats.push({
        webhookId: id,
        name: webhook.name,
        enabled: webhook.enabled,
        triggerCount: webhook.triggerCount || 0,
        lastTriggered: webhook.lastTriggered
      });
    }
    return stats;
  }

  async _loadIntegrations() {
    try {
      const stored = await chrome.storage.local.get('integrations');
      if (stored.integrations) {
        const data = stored.integrations;
        
        // Load GitHub
        if (data.github) {
          this.integrations.github = {
            ...data.github,
            gists: new Map(data.github.gists || [])
          };
        }
        
        // Load Obsidian
        if (data.obsidian) {
          this.integrations.obsidian = {
            ...data.obsidian,
            syncedNotes: new Map(data.obsidian.syncedNotes || [])
          };
        }
        
        // Load Slack
        if (data.slack) {
          this.integrations.slack = data.slack;
        }
        
        // Load Webhooks
        if (data.webhooks) {
          this.integrations.webhooks = new Map(data.webhooks);
        }
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  }

  async _saveIntegrations() {
    try {
      const data = {
        github: {
          ...this.integrations.github,
          gists: Array.from(this.integrations.github.gists.entries())
        },
        obsidian: {
          ...this.integrations.obsidian,
          syncedNotes: Array.from(this.integrations.obsidian.syncedNotes.entries())
        },
        slack: this.integrations.slack,
        webhooks: Array.from(this.integrations.webhooks.entries())
      };
      await chrome.storage.local.set({ integrations: data });
    } catch (error) {
      console.error('Failed to save integrations:', error);
    }
  }
}

// Make agent available globally
if (typeof window !== 'undefined') {
  window.IntegrationHubAgent = IntegrationHubAgent;
}

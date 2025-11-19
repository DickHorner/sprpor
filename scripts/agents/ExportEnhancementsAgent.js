/**
 * ExportEnhancementsAgent - Advanced export capabilities
 * Section 3.4 of the Superpower ChatGPT roadmap
 * 
 * Capabilities:
 * - Custom export templates
 * - Scheduled exports
 * - Batch export with filtering
 * - Export to Anki (flashcards)
 * - Export to PDF with formatting
 */

// Agent states
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  WAITING: 'waiting',
  ERROR: 'error'
};

class ExportEnhancementsAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'export-enhancements-agent',
      name: 'Export Enhancements Agent',
      description: 'Provides advanced export capabilities with templates, scheduling, and multiple formats',
      capabilities: [
        'exportWithTemplate',
        'scheduleExport',
        'batchExport',
        'exportToAnki',
        'exportToPDF',
        'createTemplate',
        'manageSchedule',
        'getExportHistory',
        'getTemplates',
        'getExportStats'
      ],
      version: '1.0.0'
    });

    // Export templates
    this.templates = new Map();
    
    // Scheduled exports
    this.schedules = new Map();
    
    // Export history
    this.exportHistory = [];
    
    // Built-in templates
    this._initializeBuiltInTemplates();

    // Statistics
    this.stats = {
      ...this.stats,
      totalExports: 0,
      templatedExports: 0,
      scheduledExports: 0,
      batchExports: 0,
      ankiExports: 0,
      pdfExports: 0,
      lastExportTime: null
    };
  }

  /**
   * Initialize built-in export templates
   */
  _initializeBuiltInTemplates() {
    // Markdown template
    this.templates.set('markdown-default', {
      id: 'markdown-default',
      name: 'Markdown (Default)',
      description: 'Standard markdown format with metadata',
      format: 'markdown',
      builtIn: true,
      template: `# {{title}}

**Date:** {{date}}
**Model:** {{model}}
**Messages:** {{messageCount}}

---

{{#messages}}
## {{role}}

{{content}}

{{/messages}}
`,
      createdAt: Date.now()
    });

    // Clean text template
    this.templates.set('text-clean', {
      id: 'text-clean',
      name: 'Clean Text',
      description: 'Simple text format without formatting',
      format: 'text',
      builtIn: true,
      template: `{{title}}

{{#messages}}
{{role}}: {{content}}

{{/messages}}
`,
      createdAt: Date.now()
    });

    // HTML template
    this.templates.set('html-styled', {
      id: 'html-styled',
      name: 'HTML (Styled)',
      description: 'HTML with CSS styling',
      format: 'html',
      builtIn: true,
      template: `<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
    .user { background: #e3f2fd; }
    .assistant { background: #f5f5f5; }
    .role { font-weight: bold; margin-bottom: 10px; }
    pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>{{title}}</h1>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Model:</strong> {{model}}</p>
  <hr>
  {{#messages}}
  <div class="message {{role}}">
    <div class="role">{{roleLabel}}</div>
    <div class="content">{{{htmlContent}}}</div>
  </div>
  {{/messages}}
</body>
</html>`,
      createdAt: Date.now()
    });

    // JSON template
    this.templates.set('json-structured', {
      id: 'json-structured',
      name: 'JSON (Structured)',
      description: 'Structured JSON format',
      format: 'json',
      builtIn: true,
      template: null, // JSON uses programmatic generation
      createdAt: Date.now()
    });

    // Study notes template
    this.templates.set('study-notes', {
      id: 'study-notes',
      name: 'Study Notes',
      description: 'Optimized for learning and review',
      format: 'markdown',
      builtIn: true,
      template: `# 📚 {{title}}

**Study Date:** {{date}}
**Topic:** {{topic}}

## Key Points

{{#keyPoints}}
- {{.}}
{{/keyPoints}}

## Q&A

{{#messages}}
{{#if isQuestion}}
**Q:** {{content}}

{{#nextMessage}}
**A:** {{content}}
{{/nextMessage}}

{{/if}}
{{/messages}}

## Summary

{{summary}}

---
*Generated from ChatGPT conversation*
`,
      createdAt: Date.now()
    });
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    console.log('ExportEnhancementsAgent: Initializing...');
    
    // Load templates, schedules, and history from storage
    await this._loadExportData();
    
    // Set up scheduled export intervals
    this._setupScheduledExports();
    
    console.log('ExportEnhancementsAgent: Initialization complete');
    console.log(`Loaded ${this.templates.size} templates, ${this.schedules.size} schedules`);
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
        case 'exportWithTemplate':
          result = await this._exportWithTemplate(task.data);
          break;

        case 'scheduleExport':
          result = await this._scheduleExport(task.data);
          break;

        case 'batchExport':
          result = await this._batchExport(task.data);
          break;

        case 'exportToAnki':
          result = await this._exportToAnki(task.data);
          break;

        case 'exportToPDF':
          result = await this._exportToPDF(task.data);
          break;

        case 'createTemplate':
          result = await this._createTemplate(task.data);
          break;

        case 'manageSchedule':
          result = await this._manageSchedule(task.data);
          break;

        case 'getExportHistory':
          result = await this._getExportHistory(task.data);
          break;

        case 'getTemplates':
          result = await this._getTemplates(task.data);
          break;

        case 'getExportStats':
          result = await this._getExportStats();
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

      console.error('ExportEnhancementsAgent: Task failed', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Export conversation(s) using a template
   */
  async _exportWithTemplate(data) {
    const { conversationId, conversation, templateId, variables = {} } = data;

    if (!templateId || !this.templates.has(templateId)) {
      throw new Error('Template not found');
    }

    const template = this.templates.get(templateId);
    console.log(`Exporting conversation with template: ${template.name}`);

    // Prepare template variables
    const templateVars = {
      title: conversation.title || 'Untitled Conversation',
      date: new Date(conversation.createdAt || Date.now()).toLocaleDateString(),
      model: conversation.model || 'unknown',
      messageCount: conversation.messages?.length || 0,
      messages: this._prepareMessages(conversation.messages, template.format),
      ...variables
    };

    // Render template
    let exportContent;
    if (template.format === 'json') {
      exportContent = JSON.stringify({
        ...templateVars,
        exportedAt: new Date().toISOString(),
        template: template.name
      }, null, 2);
    } else {
      exportContent = this._renderTemplate(template.template, templateVars);
    }

    // Create export record
    const exportRecord = {
      id: `export-${Date.now()}`,
      conversationId,
      templateId,
      templateName: template.name,
      format: template.format,
      size: exportContent.length,
      timestamp: Date.now(),
      filename: this._generateFilename(conversation, template.format)
    };

    this.exportHistory.unshift(exportRecord);
    if (this.exportHistory.length > 100) {
      this.exportHistory = this.exportHistory.slice(0, 100);
    }

    this.stats.totalExports++;
    this.stats.templatedExports++;
    this.stats.lastExportTime = Date.now();
    await this._saveExportData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:completed', exportRecord);
    }

    return {
      exportContent,
      exportRecord,
      filename: exportRecord.filename,
      format: template.format
    };
  }

  /**
   * Schedule recurring exports
   */
  async _scheduleExport(data) {
    const { name, templateId, filters = {}, frequency, time, enabled = true } = data;

    if (!name || !templateId) {
      throw new Error('Schedule name and template ID are required');
    }

    if (!this.templates.has(templateId)) {
      throw new Error('Template not found');
    }

    const scheduleId = `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const schedule = {
      scheduleId,
      name,
      templateId,
      filters, // { tags: [], categories: [], dateRange: {}, etc. }
      frequency, // 'daily', 'weekly', 'monthly'
      time, // HH:MM format
      enabled,
      createdAt: Date.now(),
      lastRun: null,
      nextRun: this._calculateNextRun(frequency, time),
      runCount: 0
    };

    this.schedules.set(scheduleId, schedule);
    await this._saveExportData();

    // Set up timer for this schedule
    if (enabled) {
      this._setupScheduleTimer(schedule);
    }

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:schedule-created', schedule);
    }

    return {
      scheduleId,
      schedule
    };
  }

  /**
   * Batch export multiple conversations
   */
  async _batchExport(data) {
    const { conversationIds = [], conversations = [], templateId, filters = {} } = data;

    console.log(`Batch exporting ${conversationIds.length || conversations.length} conversations`);

    const results = [];
    const errors = [];

    // Process each conversation
    for (let i = 0; i < conversations.length; i++) {
      try {
        const conversation = conversations[i];
        const conversationId = conversationIds[i] || conversation.id;

        // Apply filters
        if (this._shouldExport(conversation, filters)) {
          const result = await this._exportWithTemplate({
            conversationId,
            conversation,
            templateId
          });
          results.push(result);
        }
      } catch (error) {
        errors.push({
          conversationId: conversationIds[i],
          error: error.message
        });
      }
    }

    this.stats.batchExports++;
    await this._saveExportData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:batch-completed', {
        totalProcessed: conversations.length,
        successful: results.length,
        failed: errors.length
      });
    }

    return {
      totalProcessed: conversations.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Export conversation to Anki flashcard format
   */
  async _exportToAnki(data) {
    const { conversationId, conversation, deckName = 'ChatGPT Conversations' } = data;

    console.log('Exporting to Anki format...');

    // Extract Q&A pairs from conversation
    const flashcards = this._extractFlashcards(conversation);

    // Generate Anki import format (CSV)
    const ankiCSV = this._generateAnkiCSV(flashcards, deckName);

    // Create export record
    const exportRecord = {
      id: `export-${Date.now()}`,
      conversationId,
      format: 'anki',
      deckName,
      flashcardCount: flashcards.length,
      size: ankiCSV.length,
      timestamp: Date.now(),
      filename: `${deckName.replace(/\s+/g, '-')}.csv`
    };

    this.exportHistory.unshift(exportRecord);
    this.stats.totalExports++;
    this.stats.ankiExports++;
    this.stats.lastExportTime = Date.now();
    await this._saveExportData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:anki-completed', exportRecord);
    }

    return {
      exportContent: ankiCSV,
      exportRecord,
      flashcards,
      filename: exportRecord.filename
    };
  }

  /**
   * Export conversation to PDF with formatting
   */
  async _exportToPDF(data) {
    const { conversationId, conversation, options = {} } = data;

    const {
      includeMetadata = true,
      includeCodeHighlighting = true,
      fontSize = 12,
      pageSize = 'A4',
      orientation = 'portrait'
    } = options;

    console.log('Exporting to PDF format...');

    // Generate HTML content for PDF
    const htmlContent = this._generatePDFHTML(conversation, {
      includeMetadata,
      includeCodeHighlighting,
      fontSize
    });

    // In production, this would use a library like jsPDF or Puppeteer
    // For now, we'll create a data structure that can be used to generate PDF
    const pdfData = {
      html: htmlContent,
      options: {
        format: pageSize,
        orientation,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; width: 100%; text-align: center;">${conversation.title || 'Untitled'}</div>`,
        footerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
      }
    };

    // Create export record
    const exportRecord = {
      id: `export-${Date.now()}`,
      conversationId,
      format: 'pdf',
      size: htmlContent.length,
      timestamp: Date.now(),
      filename: `${conversation.title || 'conversation'}.pdf`.replace(/[^a-z0-9.-]/gi, '-'),
      options
    };

    this.exportHistory.unshift(exportRecord);
    this.stats.totalExports++;
    this.stats.pdfExports++;
    this.stats.lastExportTime = Date.now();
    await this._saveExportData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:pdf-completed', exportRecord);
    }

    return {
      exportContent: htmlContent,
      pdfData,
      exportRecord,
      filename: exportRecord.filename
    };
  }

  /**
   * Create a custom export template
   */
  async _createTemplate(data) {
    const { name, description = '', format, template, builtIn = false } = data;

    if (!name || !format) {
      throw new Error('Template name and format are required');
    }

    const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTemplate = {
      id: templateId,
      name,
      description,
      format,
      template,
      builtIn,
      createdAt: Date.now(),
      usageCount: 0,
      lastUsed: null
    };

    this.templates.set(templateId, newTemplate);
    await this._saveExportData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('export:template-created', newTemplate);
    }

    return {
      templateId,
      template: newTemplate
    };
  }

  /**
   * Manage export schedules
   */
  async _manageSchedule(data) {
    const { scheduleId, action, params = {} } = data;

    if (!scheduleId || !this.schedules.has(scheduleId)) {
      throw new Error('Schedule not found');
    }

    const schedule = this.schedules.get(scheduleId);
    let result;

    switch (action) {
      case 'enable':
        schedule.enabled = true;
        this._setupScheduleTimer(schedule);
        result = { enabled: true };
        break;

      case 'disable':
        schedule.enabled = false;
        result = { enabled: false };
        break;

      case 'update':
        Object.assign(schedule, params);
        schedule.nextRun = this._calculateNextRun(schedule.frequency, schedule.time);
        if (schedule.enabled) {
          this._setupScheduleTimer(schedule);
        }
        result = { updated: true, schedule };
        break;

      case 'runNow':
        result = await this._executeScheduledExport(schedule);
        break;

      case 'delete':
        this.schedules.delete(scheduleId);
        result = { deleted: true };
        break;

      default:
        throw new Error(`Unknown schedule action: ${action}`);
    }

    this.schedules.set(scheduleId, schedule);
    await this._saveExportData();

    return {
      scheduleId,
      action,
      result
    };
  }

  /**
   * Get export history
   */
  async _getExportHistory(data) {
    const { limit = 50, offset = 0, filters = {} } = data;

    let history = [...this.exportHistory];

    // Apply filters
    if (filters.format) {
      history = history.filter(h => h.format === filters.format);
    }
    if (filters.templateId) {
      history = history.filter(h => h.templateId === filters.templateId);
    }
    if (filters.startDate) {
      history = history.filter(h => h.timestamp >= filters.startDate);
    }
    if (filters.endDate) {
      history = history.filter(h => h.timestamp <= filters.endDate);
    }

    // Paginate
    const paginatedHistory = history.slice(offset, offset + limit);

    return {
      exports: paginatedHistory,
      total: history.length,
      limit,
      offset,
      hasMore: offset + limit < history.length
    };
  }

  /**
   * Get available templates
   */
  async _getTemplates(data) {
    const { includeBuiltIn = true, format = null } = data;

    let templates = Array.from(this.templates.values());

    if (!includeBuiltIn) {
      templates = templates.filter(t => !t.builtIn);
    }

    if (format) {
      templates = templates.filter(t => t.format === format);
    }

    return {
      templates,
      total: templates.length,
      formats: [...new Set(templates.map(t => t.format))]
    };
  }

  /**
   * Get export statistics
   */
  async _getExportStats() {
    const formatBreakdown = {};
    const templateUsage = {};

    this.exportHistory.forEach(exp => {
      formatBreakdown[exp.format] = (formatBreakdown[exp.format] || 0) + 1;
      if (exp.templateId) {
        templateUsage[exp.templateId] = (templateUsage[exp.templateId] || 0) + 1;
      }
    });

    return {
      totalExports: this.stats.totalExports,
      templatedExports: this.stats.templatedExports,
      scheduledExports: this.stats.scheduledExports,
      batchExports: this.stats.batchExports,
      ankiExports: this.stats.ankiExports,
      pdfExports: this.stats.pdfExports,
      lastExportTime: this.stats.lastExportTime,
      formatBreakdown,
      templateUsage,
      totalTemplates: this.templates.size,
      totalSchedules: this.schedules.size,
      activeSchedules: Array.from(this.schedules.values()).filter(s => s.enabled).length,
      stats: this.stats
    };
  }

  // ============ Helper Methods ============

  _prepareMessages(messages, format) {
    if (!messages) return [];

    return messages.map(msg => {
      const role = msg.role || 'unknown';
      const content = msg.content || msg.text || '';

      return {
        role,
        roleLabel: role === 'user' ? 'User' : 'Assistant',
        content,
        htmlContent: format === 'html' ? this._markdownToHtml(content) : content,
        timestamp: msg.timestamp || Date.now()
      };
    });
  }

  _renderTemplate(templateStr, variables) {
    // Simple template rendering (in production, use Mustache.js or similar)
    let rendered = templateStr;

    // Replace simple variables {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' || typeof value === 'number') {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }

    // Handle message iteration {{#messages}}...{{/messages}}
    if (variables.messages) {
      const messagePattern = /{{#messages}}([\s\S]*?){{\/messages}}/g;
      rendered = rendered.replace(messagePattern, (match, template) => {
        return variables.messages.map(msg => {
          let msgRendered = template;
          for (const [key, value] of Object.entries(msg)) {
            msgRendered = msgRendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }
          return msgRendered;
        }).join('');
      });
    }

    return rendered;
  }

  _generateFilename(conversation, format) {
    const title = (conversation.title || 'conversation').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const extensions = {
      markdown: 'md',
      text: 'txt',
      html: 'html',
      json: 'json',
      pdf: 'pdf'
    };
    const ext = extensions[format] || 'txt';
    return `${title}-${timestamp}.${ext}`;
  }

  _shouldExport(conversation, filters) {
    if (filters.tags && filters.tags.length > 0) {
      const conversationTags = conversation.tags || [];
      if (!filters.tags.some(tag => conversationTags.includes(tag))) {
        return false;
      }
    }

    if (filters.dateRange) {
      const createdAt = conversation.createdAt || 0;
      if (filters.dateRange.start && createdAt < filters.dateRange.start) return false;
      if (filters.dateRange.end && createdAt > filters.dateRange.end) return false;
    }

    if (filters.model && conversation.model !== filters.model) {
      return false;
    }

    return true;
  }

  _extractFlashcards(conversation) {
    const flashcards = [];
    const messages = conversation.messages || [];

    for (let i = 0; i < messages.length - 1; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];

      // Look for Q&A patterns
      if (msg.role === 'user' && nextMsg.role === 'assistant') {
        const question = msg.content || msg.text || '';
        const answer = nextMsg.content || nextMsg.text || '';

        if (question.length > 10 && answer.length > 10) {
          flashcards.push({
            front: this._cleanForAnki(question),
            back: this._cleanForAnki(answer),
            tags: ['chatgpt', conversation.title?.replace(/\s+/g, '-').toLowerCase() || 'conversation']
          });
        }
      }
    }

    return flashcards;
  }

  _generateAnkiCSV(flashcards, deckName) {
    // Anki CSV format: Front, Back, Tags
    let csv = '';
    flashcards.forEach(card => {
      const front = card.front.replace(/"/g, '""'); // Escape quotes
      const back = card.back.replace(/"/g, '""');
      const tags = card.tags.join(' ');
      csv += `"${front}","${back}","${tags}"\n`;
    });
    return csv;
  }

  _cleanForAnki(text) {
    // Remove excessive whitespace and format for Anki
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/```[\s\S]*?```/g, (match) => `<pre>${match.replace(/```/g, '')}</pre>`)
      .trim()
      .substring(0, 5000); // Limit length
  }

  _generatePDFHTML(conversation, options) {
    const { includeMetadata, includeCodeHighlighting, fontSize } = options;

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: ${fontSize}px;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
    }
    h1 { 
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
    }
    .metadata {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .message {
      margin: 25px 0;
      padding: 20px;
      border-radius: 8px;
      page-break-inside: avoid;
    }
    .user {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }
    .assistant {
      background: #f5f5f5;
      border-left: 4px solid #9e9e9e;
    }
    .role {
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: ${fontSize + 2}px;
    }
    pre {
      background: #282c34;
      color: #abb2bf;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    code {
      font-family: 'Courier New', monospace;
      font-size: ${fontSize - 1}px;
    }
  </style>
</head>
<body>
  <h1>${conversation.title || 'Untitled Conversation'}</h1>
`;

    if (includeMetadata) {
      html += `
  <div class="metadata">
    <strong>Date:</strong> ${new Date(conversation.createdAt || Date.now()).toLocaleDateString()}<br>
    <strong>Model:</strong> ${conversation.model || 'unknown'}<br>
    <strong>Messages:</strong> ${conversation.messages?.length || 0}
  </div>
`;
    }

    const messages = conversation.messages || [];
    messages.forEach(msg => {
      const role = msg.role || 'unknown';
      const content = msg.content || msg.text || '';
      const htmlContent = this._markdownToHtml(content, includeCodeHighlighting);

      html += `
  <div class="message ${role}">
    <div class="role">${role === 'user' ? '👤 User' : '🤖 Assistant'}</div>
    <div class="content">${htmlContent}</div>
  </div>
`;
    });

    html += `
</body>
</html>`;

    return html;
  }

  _markdownToHtml(markdown, highlightCode = true) {
    let html = markdown;

    // Code blocks
    if (highlightCode) {
      html = html.replace(/```([\w]*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    }

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  _calculateNextRun(frequency, time) {
    const now = new Date();
    const [hours, minutes] = (time || '00:00').split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      // If time has passed today, schedule for next occurrence
      if (frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (frequency === 'monthly') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
    }

    return nextRun.getTime();
  }

  _setupScheduledExports() {
    // Set up timers for all enabled schedules
    for (const [_, schedule] of this.schedules) {
      if (schedule.enabled) {
        this._setupScheduleTimer(schedule);
      }
    }
  }

  _setupScheduleTimer(schedule) {
    const now = Date.now();
    const delay = schedule.nextRun - now;

    if (delay > 0) {
      setTimeout(async () => {
        await this._executeScheduledExport(schedule);
      }, delay);
    }
  }

  async _executeScheduledExport(schedule) {
    console.log(`Executing scheduled export: ${schedule.name}`);

    try {
      // In production, would fetch conversations matching filters
      // and export them using the specified template
      
      schedule.lastRun = Date.now();
      schedule.runCount++;
      schedule.nextRun = this._calculateNextRun(schedule.frequency, schedule.time);

      this.stats.scheduledExports++;
      await this._saveExportData();

      // Set up next run
      if (schedule.enabled) {
        this._setupScheduleTimer(schedule);
      }

      return {
        success: true,
        schedule: schedule.name,
        executedAt: schedule.lastRun
      };
    } catch (error) {
      console.error('Scheduled export failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _loadExportData() {
    try {
      const stored = await chrome.storage.local.get('exportData');
      if (stored.exportData) {
        const data = stored.exportData;
        
        // Load custom templates (preserve built-in ones)
        if (data.customTemplates) {
          data.customTemplates.forEach(([id, template]) => {
            this.templates.set(id, template);
          });
        }
        
        this.schedules = new Map(data.schedules || []);
        this.exportHistory = data.exportHistory || [];
      }
    } catch (error) {
      console.error('Failed to load export data:', error);
    }
  }

  async _saveExportData() {
    try {
      // Only save custom templates
      const customTemplates = Array.from(this.templates.entries())
        .filter(([_, template]) => !template.builtIn);

      const data = {
        customTemplates,
        schedules: Array.from(this.schedules.entries()),
        exportHistory: this.exportHistory.slice(0, 100) // Keep last 100
      };
      await chrome.storage.local.set({ exportData: data });
    } catch (error) {
      console.error('Failed to save export data:', error);
    }
  }
}

// Make agent available globally
if (typeof window !== 'undefined') {
  window.ExportEnhancementsAgent = ExportEnhancementsAgent;
}

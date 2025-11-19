/**
 * WorkflowAutomationAgent
 * 
 * Provides workflow automation capabilities including:
 * - Visual workflow builder
 * - Trigger-action rule system
 * - Scheduled task execution
 * - Batch processing capabilities
 * - Workflow template library
 */

class WorkflowAutomationAgent extends BaseAgent {
    constructor() {
        super(
            'workflow-automation',
            'Workflow Automation',
            'Automates tasks with visual workflows, triggers, and scheduled execution',
            ['workflow', 'automation', 'trigger', 'schedule', 'batch']
        );
        
        this.workflows = new Map();
        this.activeWorkflows = new Map();
        this.workflowTemplates = new Map();
        this.scheduledTasks = new Map();
        
        this.initializeTemplates();
    }
    
    async initialize() {
        await super.initialize();
        
        // Load saved workflows
        await this.loadWorkflows();
        
        // Start scheduled task processor
        this.startScheduler();
        
        // Listen for trigger events
        this.setupTriggerListeners();
        
        this.logInfo('Workflow Automation Agent initialized');
    }
    
    async execute(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'createWorkflow':
                return await this.createWorkflow(data.workflow);
            case 'executeWorkflow':
                return await this.executeWorkflow(data.workflowId, data.context);
            case 'scheduleWorkflow':
                return await this.scheduleWorkflow(data.workflowId, data.schedule);
            case 'batchProcess':
                return await this.batchProcess(data.items, data.operations);
            case 'getTemplates':
                return this.getTemplates();
            case 'getWorkflows':
                return this.getWorkflows();
            case 'deleteWorkflow':
                return await this.deleteWorkflow(data.workflowId);
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }
    
    /**
     * Create a new workflow
     */
    async createWorkflow(workflowDef) {
        const workflow = {
            id: workflowDef.id || `workflow-${Date.now()}`,
            name: workflowDef.name,
            description: workflowDef.description,
            trigger: workflowDef.trigger,
            actions: workflowDef.actions,
            enabled: workflowDef.enabled !== false,
            createdAt: Date.now(),
            lastRun: null,
            runCount: 0
        };
        
        // Validate workflow
        this.validateWorkflow(workflow);
        
        this.workflows.set(workflow.id, workflow);
        await this.saveWorkflows();
        
        this.eventBus.emit('WORKFLOW_CREATED', { workflow });
        
        return workflow;
    }
    
    /**
     * Execute a workflow
     */
    async executeWorkflow(workflowId, context = {}) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        
        if (!workflow.enabled) {
            throw new Error(`Workflow ${workflowId} is disabled`);
        }
        
        const executionId = `exec-${Date.now()}`;
        const execution = {
            id: executionId,
            workflowId: workflow.id,
            startTime: Date.now(),
            status: 'running',
            context: context,
            results: []
        };
        
        this.activeWorkflows.set(executionId, execution);
        this.eventBus.emit('WORKFLOW_STARTED', { execution });
        
        try {
            // Execute actions in sequence
            for (const action of workflow.actions) {
                const result = await this.executeAction(action, context);
                execution.results.push(result);
                
                // Update context with result
                context = { ...context, ...result.output };
            }
            
            execution.status = 'completed';
            execution.endTime = Date.now();
            execution.duration = execution.endTime - execution.startTime;
            
            // Update workflow stats
            workflow.lastRun = Date.now();
            workflow.runCount++;
            await this.saveWorkflows();
            
            this.eventBus.emit('WORKFLOW_COMPLETED', { execution });
            
        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.endTime = Date.now();
            
            this.eventBus.emit('WORKFLOW_FAILED', { execution, error });
            
            throw error;
        } finally {
            this.activeWorkflows.delete(executionId);
        }
        
        return execution;
    }
    
    /**
     * Execute a single action
     */
    async executeAction(action, context) {
        const result = {
            action: action.type,
            startTime: Date.now(),
            status: 'running',
            output: {}
        };
        
        try {
            switch (action.type) {
                case 'search':
                    result.output = await this.actionSearch(action.params, context);
                    break;
                case 'filter':
                    result.output = await this.actionFilter(action.params, context);
                    break;
                case 'export':
                    result.output = await this.actionExport(action.params, context);
                    break;
                case 'analyze':
                    result.output = await this.actionAnalyze(action.params, context);
                    break;
                case 'notify':
                    result.output = await this.actionNotify(action.params, context);
                    break;
                case 'delay':
                    result.output = await this.actionDelay(action.params, context);
                    break;
                default:
                    throw new Error(`Unknown action type: ${action.type}`);
            }
            
            result.status = 'completed';
            result.endTime = Date.now();
            result.duration = result.endTime - result.startTime;
            
        } catch (error) {
            result.status = 'failed';
            result.error = error.message;
            result.endTime = Date.now();
            throw error;
        }
        
        return result;
    }
    
    /**
     * Action: Search conversations
     */
    async actionSearch(params, context) {
        if (window.agentManager) {
            const searchAgent = window.agentManager.agents.get('enhanced-search');
            if (searchAgent) {
                const results = await searchAgent.execute({
                    type: 'search',
                    data: {
                        query: params.query || context.query,
                        options: params.options || {}
                    }
                });
                return { conversations: results.results };
            }
        }
        return { conversations: [] };
    }
    
    /**
     * Action: Filter conversations
     */
    async actionFilter(params, context) {
        const conversations = context.conversations || [];
        const filtered = conversations.filter(conv => {
            if (params.hasCode && !/```/.test(JSON.stringify(conv))) {
                return false;
            }
            if (params.minLength && JSON.stringify(conv).length < params.minLength) {
                return false;
            }
            return true;
        });
        return { conversations: filtered };
    }
    
    /**
     * Action: Export conversations
     */
    async actionExport(params, context) {
        const conversations = context.conversations || [];
        const format = params.format || 'json';
        
        // This would integrate with actual export functionality
        return {
            exported: conversations.length,
            format: format,
            filename: `export-${Date.now()}.${format}`
        };
    }
    
    /**
     * Action: Analyze conversations
     */
    async actionAnalyze(params, context) {
        const conversations = context.conversations || [];
        const analyses = [];
        
        if (window.agentManager) {
            const convAgent = window.agentManager.agents.get('conversation-intelligence');
            if (convAgent) {
                for (const conv of conversations.slice(0, 10)) { // Limit to 10
                    const analysis = await convAgent.execute({
                        type: 'analyze',
                        data: { conversation: conv }
                    });
                    analyses.push(analysis);
                }
            }
        }
        
        return { analyses };
    }
    
    /**
     * Action: Send notification
     */
    async actionNotify(params, context) {
        const message = params.message || 'Workflow completed';
        
        // Create browser notification if permitted
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Superpower ChatGPT', {
                body: message,
                icon: '/images/icon-48.png'
            });
        }
        
        return { notified: true, message };
    }
    
    /**
     * Action: Delay execution
     */
    async actionDelay(params, context) {
        const delay = params.delay || 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { delayed: delay };
    }
    
    /**
     * Schedule a workflow
     */
    async scheduleWorkflow(workflowId, schedule) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        
        const scheduledTask = {
            workflowId,
            schedule, // cron-like: { type: 'interval', value: 3600000 } or { type: 'cron', value: '0 9 * * 1' }
            nextRun: this.calculateNextRun(schedule),
            enabled: true
        };
        
        this.scheduledTasks.set(workflowId, scheduledTask);
        await this.saveWorkflows();
        
        return scheduledTask;
    }
    
    /**
     * Batch process items
     */
    async batchProcess(items, operations) {
        const results = [];
        const batchSize = 10;
        
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            
            for (const item of batch) {
                try {
                    const result = await this.processBatchItem(item, operations);
                    results.push({ item, result, status: 'success' });
                } catch (error) {
                    results.push({ item, error: error.message, status: 'failed' });
                }
            }
            
            // Emit progress
            this.eventBus.emit('BATCH_PROGRESS', {
                processed: Math.min(i + batchSize, items.length),
                total: items.length
            });
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
            total: items.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'failed').length,
            results
        };
    }
    
    /**
     * Process a single batch item
     */
    async processBatchItem(item, operations) {
        let result = item;
        
        for (const operation of operations) {
            result = await this.executeAction(operation, { item: result });
        }
        
        return result;
    }
    
    /**
     * Start the scheduler
     */
    startScheduler() {
        setInterval(() => {
            this.checkScheduledTasks();
        }, 60000); // Check every minute
    }
    
    /**
     * Check and execute scheduled tasks
     */
    async checkScheduledTasks() {
        const now = Date.now();
        
        for (const [workflowId, task] of this.scheduledTasks) {
            if (task.enabled && task.nextRun <= now) {
                try {
                    await this.executeWorkflow(workflowId);
                    task.nextRun = this.calculateNextRun(task.schedule);
                    await this.saveWorkflows();
                } catch (error) {
                    this.logError(`Scheduled workflow ${workflowId} failed`, error);
                }
            }
        }
    }
    
    /**
     * Calculate next run time
     */
    calculateNextRun(schedule) {
        if (schedule.type === 'interval') {
            return Date.now() + schedule.value;
        }
        // For cron, would need a cron parser library
        // For now, default to 24 hours
        return Date.now() + 86400000;
    }
    
    /**
     * Set up trigger listeners
     */
    setupTriggerListeners() {
        this.eventBus.on('CONVERSATION_CREATED', (data) => {
            this.checkTriggers('conversation_created', data);
        });
        
        this.eventBus.on('CONVERSATION_UPDATED', (data) => {
            this.checkTriggers('conversation_updated', data);
        });
        
        this.eventBus.on('SYNC_COMPLETED', (data) => {
            this.checkTriggers('sync_completed', data);
        });
    }
    
    /**
     * Check if any workflows should be triggered
     */
    async checkTriggers(eventType, data) {
        for (const [workflowId, workflow] of this.workflows) {
            if (workflow.enabled && workflow.trigger.type === eventType) {
                // Check if trigger conditions are met
                if (this.evaluateTriggerConditions(workflow.trigger, data)) {
                    try {
                        await this.executeWorkflow(workflowId, data);
                    } catch (error) {
                        this.logError(`Triggered workflow ${workflowId} failed`, error);
                    }
                }
            }
        }
    }
    
    /**
     * Evaluate trigger conditions
     */
    evaluateTriggerConditions(trigger, data) {
        if (!trigger.conditions) return true;
        
        // Simple condition evaluation
        for (const condition of trigger.conditions) {
            const value = this.getNestedValue(data, condition.field);
            
            switch (condition.operator) {
                case 'equals':
                    if (value !== condition.value) return false;
                    break;
                case 'contains':
                    if (!String(value).includes(condition.value)) return false;
                    break;
                case 'greater_than':
                    if (value <= condition.value) return false;
                    break;
                case 'less_than':
                    if (value >= condition.value) return false;
                    break;
            }
        }
        
        return true;
    }
    
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    
    /**
     * Validate workflow definition
     */
    validateWorkflow(workflow) {
        if (!workflow.name) {
            throw new Error('Workflow must have a name');
        }
        if (!workflow.trigger) {
            throw new Error('Workflow must have a trigger');
        }
        if (!workflow.actions || !Array.isArray(workflow.actions) || workflow.actions.length === 0) {
            throw new Error('Workflow must have at least one action');
        }
    }
    
    /**
     * Initialize workflow templates
     */
    initializeTemplates() {
        this.workflowTemplates.set('weekly-export', {
            name: 'Weekly Export',
            description: 'Export all conversations every Monday at 9am',
            trigger: {
                type: 'schedule',
                schedule: { type: 'cron', value: '0 9 * * 1' }
            },
            actions: [
                { type: 'search', params: { query: '*' } },
                { type: 'export', params: { format: 'markdown' } },
                { type: 'notify', params: { message: 'Weekly export completed' } }
            ]
        });
        
        this.workflowTemplates.set('analyze-new', {
            name: 'Analyze New Conversations',
            description: 'Automatically analyze new conversations',
            trigger: {
                type: 'conversation_created'
            },
            actions: [
                { type: 'analyze', params: {} }
            ]
        });
        
        this.workflowTemplates.set('cleanup-old', {
            name: 'Cleanup Old Conversations',
            description: 'Archive conversations older than 90 days',
            trigger: {
                type: 'schedule',
                schedule: { type: 'interval', value: 86400000 } // Daily
            },
            actions: [
                { type: 'search', params: { query: '*' } },
                { type: 'filter', params: { maxAge: 7776000000 } }, // 90 days
                { type: 'export', params: { format: 'json' } }
            ]
        });
    }
    
    /**
     * Get workflow templates
     */
    getTemplates() {
        return Array.from(this.workflowTemplates.values());
    }
    
    /**
     * Get all workflows
     */
    getWorkflows() {
        return Array.from(this.workflows.values());
    }
    
    /**
     * Delete a workflow
     */
    async deleteWorkflow(workflowId) {
        this.workflows.delete(workflowId);
        this.scheduledTasks.delete(workflowId);
        await this.saveWorkflows();
        
        this.eventBus.emit('WORKFLOW_DELETED', { workflowId });
        
        return { success: true };
    }
    
    /**
     * Save workflows to storage
     */
    async saveWorkflows() {
        try {
            const state = {
                workflows: Array.from(this.workflows.entries()),
                scheduledTasks: Array.from(this.scheduledTasks.entries()),
                timestamp: Date.now()
            };
            
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.set({ workflowState: state });
            }
        } catch (error) {
            this.logError('Failed to save workflows', error);
        }
    }
    
    /**
     * Load workflows from storage
     */
    async loadWorkflows() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await chrome.storage.local.get('workflowState');
                if (result.workflowState) {
                    const state = result.workflowState;
                    this.workflows = new Map(state.workflows || []);
                    this.scheduledTasks = new Map(state.scheduledTasks || []);
                }
            }
        } catch (error) {
            this.logError('Failed to load workflows', error);
        }
    }
}

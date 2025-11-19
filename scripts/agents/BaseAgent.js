/**
 * BaseAgent - Base class that all agents must extend
 * Provides common functionality and interface for all agents
 */
class BaseAgent {
  constructor(config = {}) {
    this.agentId = config.agentId || this._generateAgentId();
    this.name = config.name || 'Unnamed Agent';
    this.description = config.description || '';
    this.capabilities = config.capabilities || [];
    this.version = config.version || '1.0.0';
    
    // Agent state
    this.state = AgentState.IDLE;
    this.enabled = config.enabled !== false;
    this.startTime = null;
    this.lastActivityTime = null;
    
    // Statistics
    this.stats = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      lastError: null
    };

    // Task queue for this agent
    this.taskQueue = [];
    this.currentTask = null;
    
    // Event bus reference (will be set by AgentManager)
    this.eventBus = null;
  }

  /**
   * Initialize the agent
   * Override this method to perform any setup needed
   * @returns {Promise<void>}
   */
  async initialize() {
    this.state = AgentState.INITIALIZING;
    this.startTime = Date.now();
    // Override in subclass
    this.state = AgentState.IDLE;
  }

  /**
   * Shutdown the agent
   * Override this method to perform cleanup
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.state = AgentState.STOPPED;
    this.taskQueue = [];
    this.currentTask = null;
  }

  /**
   * Check if this agent can handle a specific task
   * Override this method to implement capability checking
   * @param {object} task - The task to check
   * @returns {boolean} True if agent can handle the task
   */
  canHandle(task) {
    // Default implementation checks if task type matches capabilities
    if (!task || !task.type) return false;
    return this.capabilities.includes(task.type);
  }

  /**
   * Execute a task
   * Override this method to implement task execution logic
   * @param {object} task - The task to execute
   * @returns {Promise<object>} Task result
   */
  async execute(task) {
    if (!this.enabled) {
      throw new Error(`Agent ${this.name} is disabled`);
    }

    if (this.state === AgentState.BUSY) {
      throw new Error(`Agent ${this.name} is busy`);
    }

    const startTime = Date.now();
    this.state = AgentState.BUSY;
    this.currentTask = task;
    this.lastActivityTime = startTime;

    try {
      // Emit task started event
      this._emitEvent(AgentEventTypes.TASK_STARTED, {
        agentId: this.agentId,
        taskId: task.id,
        task
      });

      // Execute the task (to be implemented by subclass)
      const result = await this._executeTask(task);

      // Update statistics
      const executionTime = Date.now() - startTime;
      this._updateStats(true, executionTime);

      // Emit task completed event
      this._emitEvent(AgentEventTypes.TASK_COMPLETED, {
        agentId: this.agentId,
        taskId: task.id,
        result,
        executionTime
      });

      this.state = AgentState.IDLE;
      this.currentTask = null;

      return result;
    } catch (error) {
      // Update statistics
      const executionTime = Date.now() - startTime;
      this._updateStats(false, executionTime, error);

      // Emit task failed event
      this._emitEvent(AgentEventTypes.TASK_FAILED, {
        agentId: this.agentId,
        taskId: task.id,
        error: error.message
      });

      this.state = AgentState.ERROR;
      this.currentTask = null;

      throw error;
    }
  }

  /**
   * Execute the actual task logic
   * Must be overridden by subclass
   * @param {object} task - The task to execute
   * @returns {Promise<object>} Task result
   * @protected
   */
  async _executeTask(task) {
    throw new Error(`Agent ${this.name} must implement _executeTask method`);
  }

  /**
   * Learn from feedback
   * Override this method to implement learning logic
   * @param {object} feedback - Feedback data
   * @returns {Promise<void>}
   */
  async learn(feedback) {
    // Default implementation does nothing
    // Override in subclass to implement learning
  }

  /**
   * Enable the agent
   */
  enable() {
    this.enabled = true;
    this._emitEvent(AgentEventTypes.AGENT_STARTED, {
      agentId: this.agentId,
      name: this.name
    });
  }

  /**
   * Disable the agent
   */
  disable() {
    this.enabled = false;
    this._emitEvent(AgentEventTypes.AGENT_STOPPED, {
      agentId: this.agentId,
      name: this.name
    });
  }

  /**
   * Get agent status
   * @returns {object} Agent status information
   */
  getStatus() {
    return {
      agentId: this.agentId,
      name: this.name,
      description: this.description,
      version: this.version,
      state: this.state,
      enabled: this.enabled,
      capabilities: this.capabilities,
      stats: { ...this.stats },
      currentTask: this.currentTask ? this.currentTask.id : null,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      lastActivity: this.lastActivityTime
    };
  }

  /**
   * Get agent configuration
   * @returns {object} Agent configuration
   */
  getConfig() {
    return {
      agentId: this.agentId,
      name: this.name,
      description: this.description,
      version: this.version,
      capabilities: this.capabilities,
      enabled: this.enabled
    };
  }

  /**
   * Set event bus reference
   * @param {EventBus} eventBus - Event bus instance
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Emit an event through the event bus
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   * @protected
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(eventType, data);
    }
  }

  /**
   * Subscribe to events through the event bus
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   * @protected
   */
  _subscribeToEvent(eventType, callback) {
    if (this.eventBus) {
      return this.eventBus.on(eventType, callback);
    }
    return () => {};
  }

  /**
   * Update agent statistics
   * @param {boolean} success - Whether task succeeded
   * @param {number} executionTime - Task execution time
   * @param {Error} [error] - Error if task failed
   * @private
   */
  _updateStats(success, executionTime, error = null) {
    if (success) {
      this.stats.tasksCompleted++;
    } else {
      this.stats.tasksFailed++;
      this.stats.lastError = {
        message: error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }

    this.stats.totalExecutionTime += executionTime;
    const totalTasks = this.stats.tasksCompleted + this.stats.tasksFailed;
    this.stats.averageExecutionTime = totalTasks > 0 
      ? this.stats.totalExecutionTime / totalTasks 
      : 0;
  }

  /**
   * Generate unique agent ID
   * @private
   */
  _generateAgentId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Agent state constants
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  BUSY: 'busy',
  ERROR: 'error',
  STOPPED: 'stopped'
};

// Export for use in other modules
// eslint-disable-next-line no-unused-vars
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BaseAgent, AgentState };
}

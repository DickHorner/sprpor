/**
 * AgentManager - Central orchestrator for all agents
 * Manages agent lifecycle, task routing, and coordination
 */
class AgentManager {
  constructor() {
    this.agents = new Map();
    this.eventBus = new EventBus();
    this.taskQueue = [];
    this.isInitialized = false;
    this.config = {
      maxConcurrentTasks: 5,
      taskTimeout: 30000, // 30 seconds
      enableAutoStart: true
    };
    
    // Statistics
    this.stats = {
      totalTasksProcessed: 0,
      activeTasks: 0,
      totalAgents: 0,
      activeAgents: 0
    };

    // Storage key for persistence
    this.storageKey = 'agentManagerState';
  }

  /**
   * Initialize the agent manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn('AgentManager already initialized');
      return;
    }

    console.log('Initializing AgentManager...');

    try {
      // Load saved state from storage
      await this._loadState();

      // Emit system ready event
      this.eventBus.emit(AgentEventTypes.SYSTEM_READY, {
        timestamp: Date.now(),
        agentCount: this.agents.size
      });

      this.isInitialized = true;
      console.log('AgentManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AgentManager:', error);
      throw error;
    }
  }

  /**
   * Register a new agent
   * @param {BaseAgent} agent - Agent instance to register
   * @returns {Promise<void>}
   */
  async registerAgent(agent) {
    if (!(agent instanceof BaseAgent)) {
      throw new Error('Agent must be an instance of BaseAgent');
    }

    if (this.agents.has(agent.agentId)) {
      throw new Error(`Agent with ID ${agent.agentId} is already registered`);
    }

    // Set event bus reference
    agent.setEventBus(this.eventBus);

    // Initialize the agent
    await agent.initialize();

    // Register the agent
    this.agents.set(agent.agentId, agent);
    this.stats.totalAgents++;
    if (agent.enabled) {
      this.stats.activeAgents++;
    }

    // Emit registration event
    this.eventBus.emit(AgentEventTypes.AGENT_REGISTERED, {
      agentId: agent.agentId,
      name: agent.name,
      capabilities: agent.capabilities
    });

    console.log(`Agent registered: ${agent.name} (${agent.agentId})`);

    // Save state
    await this._saveState();
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent ID to unregister
   * @returns {Promise<void>}
   */
  async unregisterAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Shutdown the agent
    await agent.shutdown();

    // Remove from registry
    this.agents.delete(agentId);
    this.stats.totalAgents--;
    if (agent.enabled) {
      this.stats.activeAgents--;
    }

    // Emit unregistration event
    this.eventBus.emit(AgentEventTypes.AGENT_UNREGISTERED, {
      agentId,
      name: agent.name
    });

    console.log(`Agent unregistered: ${agent.name} (${agentId})`);

    // Save state
    await this._saveState();
  }

  /**
   * Dispatch a task to appropriate agent(s)
   * @param {object} task - Task to dispatch
   * @returns {Promise<object>} Task result
   */
  async dispatchTask(task) {
    if (!this.isInitialized) {
      throw new Error('AgentManager not initialized');
    }

    // Generate task ID if not provided
    if (!task.id) {
      task.id = this._generateTaskId();
    }

    // Add to queue
    this.taskQueue.push(task);
    this.stats.activeTasks++;

    // Emit task created event
    this.eventBus.emit(AgentEventTypes.TASK_CREATED, {
      taskId: task.id,
      taskType: task.type,
      timestamp: Date.now()
    });

    try {
      // Find suitable agent
      const agent = this._findAgentForTask(task);
      
      if (!agent) {
        throw new Error(`No capable agent found for task type: ${task.type}`);
      }

      // Emit task assigned event
      this.eventBus.emit(AgentEventTypes.TASK_ASSIGNED, {
        taskId: task.id,
        agentId: agent.agentId,
        agentName: agent.name
      });

      // Execute task with timeout
      const result = await this._executeWithTimeout(
        agent.execute(task),
        this.config.taskTimeout
      );

      // Remove from queue and update stats
      this._removeFromQueue(task.id);
      this.stats.totalTasksProcessed++;
      this.stats.activeTasks--;

      return result;
    } catch (error) {
      // Remove from queue and update stats
      this._removeFromQueue(task.id);
      this.stats.activeTasks--;

      // Emit system error event
      this.eventBus.emit(AgentEventTypes.SYSTEM_ERROR, {
        taskId: task.id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get agent by ID
   * @param {string} agentId - Agent ID
   * @returns {BaseAgent|null} Agent instance or null
   */
  getAgent(agentId) {
    return this.agents.get(agentId) || null;
  }

  /**
   * Get all agents
   * @returns {Array<BaseAgent>} Array of all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by capability
   * @param {string} capability - Capability to filter by
   * @returns {Array<BaseAgent>} Array of matching agents
   */
  getAgentsByCapability(capability) {
    return this.getAllAgents().filter(agent => 
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Enable/disable an agent
   * @param {string} agentId - Agent ID
   * @param {boolean} enabled - Enable or disable
   * @returns {Promise<void>}
   */
  async setAgentEnabled(agentId, enabled) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const wasEnabled = agent.enabled;
    
    if (enabled) {
      agent.enable();
    } else {
      agent.disable();
    }

    // Update stats
    if (wasEnabled && !enabled) {
      this.stats.activeAgents--;
    } else if (!wasEnabled && enabled) {
      this.stats.activeAgents++;
    }

    // Save state
    await this._saveState();
  }

  /**
   * Get overall system status
   * @returns {object} System status
   */
  getSystemStatus() {
    const agents = this.getAllAgents().map(agent => agent.getStatus());

    return {
      initialized: this.isInitialized,
      stats: { ...this.stats },
      agents,
      taskQueueSize: this.taskQueue.length,
      eventBusStats: this.eventBus.getStats()
    };
  }

  /**
   * Get event bus instance
   * @returns {EventBus} Event bus
   */
  getEventBus() {
    return this.eventBus;
  }

  /**
   * Update configuration
   * @param {object} config - Configuration updates
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Find suitable agent for a task
   * @param {object} task - Task to find agent for
   * @returns {BaseAgent|null} Suitable agent or null
   * @private
   */
  _findAgentForTask(task) {
    // Find all agents that can handle this task
    const capableAgents = this.getAllAgents().filter(agent => 
      agent.enabled && 
      agent.state !== AgentState.ERROR && 
      agent.canHandle(task)
    );

    if (capableAgents.length === 0) {
      return null;
    }

    // Sort by priority (idle agents first, then by average execution time)
    capableAgents.sort((a, b) => {
      if (a.state === AgentState.IDLE && b.state !== AgentState.IDLE) return -1;
      if (a.state !== AgentState.IDLE && b.state === AgentState.IDLE) return 1;
      return a.stats.averageExecutionTime - b.stats.averageExecutionTime;
    });

    return capableAgents[0];
  }

  /**
   * Execute task with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Result
   * @private
   */
  _executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      )
    ]);
  }

  /**
   * Remove task from queue
   * @param {string} taskId - Task ID
   * @private
   */
  _removeFromQueue(taskId) {
    const index = this.taskQueue.findIndex(task => task.id === taskId);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
    }
  }

  /**
   * Generate unique task ID
   * @private
   */
  _generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save agent manager state to storage
   * @private
   */
  async _saveState() {
    try {
      const state = {
        agents: this.getAllAgents().map(agent => ({
          config: agent.getConfig(),
          stats: agent.stats
        })),
        stats: this.stats,
        timestamp: Date.now()
      };

      await new Promise((resolve) => {
        chrome.storage.local.set({ [this.storageKey]: state }, resolve);
      });
    } catch (error) {
      console.error('Failed to save AgentManager state:', error);
    }
  }

  /**
   * Load agent manager state from storage
   * @private
   */
  async _loadState() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([this.storageKey], resolve);
      });

      const state = result[this.storageKey];
      if (state && state.stats) {
        // Restore stats (agents will be registered separately)
        this.stats = { ...this.stats, ...state.stats };
        console.log('AgentManager state loaded from storage');
      }
    } catch (error) {
      console.error('Failed to load AgentManager state:', error);
    }
  }
}

// Singleton instance
// eslint-disable-next-line no-unused-vars
const agentManager = new AgentManager();

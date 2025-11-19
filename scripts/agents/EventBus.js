/**
 * EventBus - Central event communication system for agents
 * Enables pub-sub pattern for agent communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Subscribe to an event
   * @param {string} eventType - The event type to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @param {object} options - Optional configuration
   * @returns {Function} Unsubscribe function
   */
  on(eventType, callback, options = {}) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      id: this._generateListenerId()
    };

    this.listeners.get(eventType).push(listener);
    
    // Sort by priority (higher priority first)
    this.listeners.get(eventType).sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => this.off(eventType, listener.id);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first trigger)
   * @param {string} eventType - The event type to listen for
   * @param {Function} callback - Function to call when event is emitted
   * @returns {Function} Unsubscribe function
   */
  once(eventType, callback) {
    return this.on(eventType, callback, { once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventType - The event type
   * @param {string} listenerId - The listener ID to remove
   */
  off(eventType, listenerId) {
    if (!this.listeners.has(eventType)) return;

    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(l => l.id === listenerId);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(eventType);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} eventType - The event type
   * @param {*} data - Event data to pass to listeners
   * @returns {Promise<void>}
   */
  async emit(eventType, data) {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now()
    };

    // Store in history
    this._addToHistory(event);

    if (!this.listeners.has(eventType)) return;

    const listeners = [...this.listeners.get(eventType)];
    const toRemove = [];

    for (const listener of listeners) {
      try {
        await listener.callback(event);
        
        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    }

    // Remove one-time listeners
    toRemove.forEach(id => this.off(eventType, id));
  }

  /**
   * Remove all listeners for a specific event type or all events
   * @param {string} [eventType] - Optional event type to clear
   */
  clear(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get event history
   * @param {object} options - Filter options
   * @returns {Array} Event history
   */
  getHistory(options = {}) {
    let history = [...this.eventHistory];

    if (options.eventType) {
      history = history.filter(e => e.type === options.eventType);
    }

    if (options.since) {
      history = history.filter(e => e.timestamp >= options.since);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Get statistics about event bus usage
   * @returns {object} Statistics
   */
  getStats() {
    const listenerCount = Array.from(this.listeners.values())
      .reduce((sum, listeners) => sum + listeners.length, 0);

    const eventTypes = Array.from(this.listeners.keys());

    return {
      totalListeners: listenerCount,
      eventTypes: eventTypes.length,
      historySize: this.eventHistory.length,
      registeredEvents: eventTypes
    };
  }

  /**
   * Add event to history
   * @private
   */
  _addToHistory(event) {
    this.eventHistory.push(event);
    
    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique listener ID
   * @private
   */
  _generateListenerId() {
    return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Event type constants
const AgentEventTypes = {
  // Agent lifecycle events
  AGENT_REGISTERED: 'agent:registered',
  AGENT_UNREGISTERED: 'agent:unregistered',
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_ERROR: 'agent:error',

  // Task events
  TASK_CREATED: 'task:created',
  TASK_ASSIGNED: 'task:assigned',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',

  // Conversation events
  CONVERSATION_CREATED: 'conversation:created',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_DELETED: 'conversation:deleted',
  CONVERSATION_EXPORTED: 'conversation:exported',
  CONVERSATION_SYNCED: 'conversation:synced',

  // Search events
  SEARCH_EXECUTED: 'search:executed',
  SEARCH_COMPLETED: 'search:completed',

  // User events
  USER_ACTION: 'user:action',
  USER_PROMPT: 'user:prompt',

  // System events
  SYSTEM_READY: 'system:ready',
  SYSTEM_ERROR: 'system:error',
  SETTINGS_CHANGED: 'settings:changed',
  STORAGE_UPDATED: 'storage:updated'
};

// Export for use in other modules
// eslint-disable-next-line no-unused-vars
const eventBus = new EventBus();

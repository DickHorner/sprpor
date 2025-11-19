/**
 * AgentMonitor - UI component for monitoring agent activity
 * Provides a dashboard for viewing agent status and performance
 */
class AgentMonitor {
  constructor(agentManager) {
    this.agentManager = agentManager;
    this.updateInterval = null;
    this.refreshRate = 2000; // 2 seconds
  }

  /**
   * Create and inject the monitoring dashboard
   * @param {HTMLElement} container - Container element to inject dashboard into
   */
  createDashboard(container) {
    const dashboard = document.createElement('div');
    dashboard.id = 'agent-monitor-dashboard';
    dashboard.className = 'agent-monitor-dashboard';
    
    dashboard.innerHTML = `
      <div class="agent-monitor-header">
        <h2>Agent System Monitor</h2>
        <div class="agent-monitor-controls">
          <button id="agent-monitor-refresh" class="btn-icon" title="Refresh">
            <span>🔄</span>
          </button>
          <button id="agent-monitor-close" class="btn-icon" title="Close">
            <span>✕</span>
          </button>
        </div>
      </div>

      <div class="agent-monitor-content">
        <!-- System Status -->
        <div class="agent-monitor-section">
          <h3>System Status</h3>
          <div id="agent-system-status" class="status-grid">
            <div class="status-item">
              <span class="status-label">Total Agents:</span>
              <span class="status-value" id="total-agents">0</span>
            </div>
            <div class="status-item">
              <span class="status-label">Active Agents:</span>
              <span class="status-value" id="active-agents">0</span>
            </div>
            <div class="status-item">
              <span class="status-label">Tasks Processed:</span>
              <span class="status-value" id="tasks-processed">0</span>
            </div>
            <div class="status-item">
              <span class="status-label">Active Tasks:</span>
              <span class="status-value" id="active-tasks">0</span>
            </div>
          </div>
        </div>

        <!-- Agent List -->
        <div class="agent-monitor-section">
          <h3>Registered Agents</h3>
          <div id="agent-list" class="agent-list">
            <!-- Agents will be dynamically added here -->
          </div>
        </div>

        <!-- Event History -->
        <div class="agent-monitor-section">
          <h3>Recent Events</h3>
          <div id="event-history" class="event-history">
            <!-- Events will be dynamically added here -->
          </div>
        </div>
      </div>
    `;

    container.appendChild(dashboard);
    this._attachEventListeners();
    this._startAutoRefresh();
    this.updateDashboard();
  }

  /**
   * Update dashboard with current data
   */
  updateDashboard() {
    this._updateSystemStatus();
    this._updateAgentList();
    this._updateEventHistory();
  }

  /**
   * Start auto-refresh
   * @private
   */
  _startAutoRefresh() {
    this._stopAutoRefresh();
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, this.refreshRate);
  }

  /**
   * Stop auto-refresh
   * @private
   */
  _stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update system status section
   * @private
   */
  _updateSystemStatus() {
    const status = this.agentManager.getSystemStatus();
    
    const totalAgentsEl = document.getElementById('total-agents');
    const activeAgentsEl = document.getElementById('active-agents');
    const tasksProcessedEl = document.getElementById('tasks-processed');
    const activeTasksEl = document.getElementById('active-tasks');

    if (totalAgentsEl) totalAgentsEl.textContent = status.stats.totalAgents;
    if (activeAgentsEl) activeAgentsEl.textContent = status.stats.activeAgents;
    if (tasksProcessedEl) tasksProcessedEl.textContent = status.stats.totalTasksProcessed;
    if (activeTasksEl) activeTasksEl.textContent = status.stats.activeTasks;
  }

  /**
   * Update agent list section
   * @private
   */
  _updateAgentList() {
    const agentListEl = document.getElementById('agent-list');
    if (!agentListEl) return;

    const status = this.agentManager.getSystemStatus();
    
    if (status.agents.length === 0) {
      agentListEl.innerHTML = '<div class="empty-state">No agents registered</div>';
      return;
    }

    agentListEl.innerHTML = status.agents.map(agent => `
      <div class="agent-card ${agent.state}" data-agent-id="${agent.agentId}">
        <div class="agent-header">
          <div class="agent-name-wrapper">
            <span class="agent-name">${this._escapeHtml(agent.name)}</span>
            <span class="agent-state-badge ${agent.state}">${agent.state}</span>
          </div>
          <label class="agent-toggle">
            <input type="checkbox" 
                   class="agent-enabled-toggle" 
                   data-agent-id="${agent.agentId}"
                   ${agent.enabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        
        <div class="agent-description">${this._escapeHtml(agent.description || 'No description')}</div>
        
        <div class="agent-stats">
          <div class="stat">
            <span class="stat-label">Tasks Completed:</span>
            <span class="stat-value">${agent.stats.tasksCompleted}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Tasks Failed:</span>
            <span class="stat-value">${agent.stats.tasksFailed}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Avg Time:</span>
            <span class="stat-value">${Math.round(agent.stats.averageExecutionTime)}ms</span>
          </div>
          <div class="stat">
            <span class="stat-label">Uptime:</span>
            <span class="stat-value">${this._formatUptime(agent.uptime)}</span>
          </div>
        </div>

        <div class="agent-capabilities">
          <span class="capabilities-label">Capabilities:</span>
          ${agent.capabilities.map(cap => `<span class="capability-badge">${cap}</span>`).join('')}
        </div>
      </div>
    `).join('');

    // Attach toggle event listeners
    agentListEl.querySelectorAll('.agent-enabled-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const agentId = e.target.dataset.agentId;
        const enabled = e.target.checked;
        this._toggleAgent(agentId, enabled);
      });
    });
  }

  /**
   * Update event history section
   * @private
   */
  _updateEventHistory() {
    const eventHistoryEl = document.getElementById('event-history');
    if (!eventHistoryEl) return;

    const eventBus = this.agentManager.getEventBus();
    const events = eventBus.getHistory({ limit: 20 });

    if (events.length === 0) {
      eventHistoryEl.innerHTML = '<div class="empty-state">No recent events</div>';
      return;
    }

    eventHistoryEl.innerHTML = events
      .reverse()
      .map(event => `
        <div class="event-item ${this._getEventClass(event.type)}">
          <span class="event-time">${this._formatTime(event.timestamp)}</span>
          <span class="event-type">${event.type}</span>
          <span class="event-data">${this._formatEventData(event.data)}</span>
        </div>
      `).join('');
  }

  /**
   * Toggle agent enabled/disabled
   * @private
   */
  async _toggleAgent(agentId, enabled) {
    try {
      await this.agentManager.setAgentEnabled(agentId, enabled);
      this.updateDashboard();
    } catch (error) {
      console.error('Failed to toggle agent:', error);
      alert(`Failed to ${enabled ? 'enable' : 'disable'} agent: ${error.message}`);
    }
  }

  /**
   * Attach event listeners to dashboard controls
   * @private
   */
  _attachEventListeners() {
    const refreshBtn = document.getElementById('agent-monitor-refresh');
    const closeBtn = document.getElementById('agent-monitor-close');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateDashboard();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.destroy();
      });
    }
  }

  /**
   * Destroy the dashboard and cleanup
   */
  destroy() {
    this._stopAutoRefresh();
    const dashboard = document.getElementById('agent-monitor-dashboard');
    if (dashboard) {
      dashboard.remove();
    }
  }

  /**
   * Format uptime in human-readable format
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Format timestamp
   * @private
   */
  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Get CSS class for event type
   * @private
   */
  _getEventClass(eventType) {
    if (eventType.includes('error') || eventType.includes('failed')) {
      return 'event-error';
    }
    if (eventType.includes('completed') || eventType.includes('registered')) {
      return 'event-success';
    }
    return 'event-info';
  }

  /**
   * Format event data for display
   * @private
   */
  _formatEventData(data) {
    if (!data) return '';
    
    if (data.agentName) return data.agentName;
    if (data.taskId) return `Task: ${data.taskId.substring(0, 12)}...`;
    if (data.error) return `Error: ${data.error}`;
    
    return JSON.stringify(data).substring(0, 50) + '...';
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export for use in other modules
// eslint-disable-next-line no-unused-vars
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentMonitor;
}

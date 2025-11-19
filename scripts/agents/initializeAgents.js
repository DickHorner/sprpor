/**
 * Initialize agent system
 * Sets up the agent infrastructure and registers initial agents
 */

// eslint-disable-next-line no-unused-vars
async function initializeAgentSystem() {
  console.log('Initializing Agent System...');

  try {
    // Initialize the agent manager
    await agentManager.initialize();
    console.log('AgentManager initialized');

    // Register the Performance Monitor Agent
    const performanceAgent = new PerformanceMonitorAgent();
    await agentManager.registerAgent(performanceAgent);
    console.log('PerformanceMonitorAgent registered');

    // Set up event listeners for existing extension features
    _setupEventBridges();

    console.log('Agent System initialization complete');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Agent System:', error);
    return false;
  }
}

/**
 * Setup event bridges between existing extension and agent system
 * @private
 */
function _setupEventBridges() {
  const eventBus = agentManager.getEventBus();

  // Listen for storage changes and emit events
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        eventBus.emit(AgentEventTypes.STORAGE_UPDATED, {
          changes,
          namespace
        });
      }
    });
  }

  // Emit system ready event
  eventBus.emit(AgentEventTypes.SYSTEM_READY, {
    timestamp: Date.now()
  });
}

/**
 * Show agent monitor dashboard
 */
// eslint-disable-next-line no-unused-vars
function showAgentMonitor() {
  // Check if dashboard already exists
  if (document.getElementById('agent-monitor-dashboard')) {
    console.log('Agent monitor already open');
    return;
  }

  // Create container if needed
  let container = document.getElementById('agent-monitor-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'agent-monitor-container';
    document.body.appendChild(container);
  }

  // Create and show the monitor
  const monitor = new AgentMonitor(agentManager);
  monitor.createDashboard(container);
}

/**
 * Get agent system status
 * Utility function for debugging
 */
// eslint-disable-next-line no-unused-vars
function getAgentSystemStatus() {
  if (!agentManager.isInitialized) {
    return { error: 'Agent system not initialized' };
  }
  return agentManager.getSystemStatus();
}

/**
 * Dispatch a test task
 * Utility function for testing
 */
// eslint-disable-next-line no-unused-vars
async function testAgentSystem() {
  if (!agentManager.isInitialized) {
    console.error('Agent system not initialized');
    return;
  }

  console.log('Testing agent system...');

  try {
    // Test performance monitoring task
    const result = await agentManager.dispatchTask({
      type: 'performance',
      data: {}
    });

    console.log('Test task completed successfully:', result);
    return result;
  } catch (error) {
    console.error('Test task failed:', error);
    throw error;
  }
}

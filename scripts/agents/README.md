# Agent Infrastructure

This directory contains the implementation of the Agent Infrastructure system for Superpower ChatGPT, as described in Section 1.1 of the product roadmap (plans.md).

## Overview

The agent infrastructure provides a modular, event-driven architecture for building intelligent agents that can automate tasks, learn from user behavior, and enhance the ChatGPT experience.

## Architecture Components

### 1. EventBus (`EventBus.js`)

The EventBus is a central pub-sub system that enables communication between agents and the rest of the extension.

**Features:**
- Subscribe to events with `on()` or `once()`
- Emit events with `emit()`
- Priority-based event handling
- Event history tracking
- Statistics and monitoring

**Usage:**
```javascript
// Subscribe to an event
eventBus.on(AgentEventTypes.CONVERSATION_CREATED, (event) => {
  console.log('New conversation:', event.data);
});

// Emit an event
eventBus.emit(AgentEventTypes.CONVERSATION_CREATED, {
  conversationId: 'conv-123',
  timestamp: Date.now()
});
```

### 2. BaseAgent (`BaseAgent.js`)

BaseAgent is the abstract base class that all agents must extend. It provides common functionality for agent lifecycle, task execution, and state management.

**Key Methods:**
- `initialize()` - Setup agent
- `shutdown()` - Cleanup agent
- `canHandle(task)` - Check if agent can handle a task
- `execute(task)` - Execute a task
- `learn(feedback)` - Learn from feedback
- `getStatus()` - Get agent status and statistics

**Creating a New Agent:**
```javascript
class MyAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'my-agent',
      name: 'My Agent',
      description: 'Does something useful',
      capabilities: ['task-type-1', 'task-type-2'],
      version: '1.0.0'
    });
  }

  async _executeTask(task) {
    // Implement task execution logic
    return { result: 'success' };
  }
}
```

### 3. AgentManager (`AgentManager.js`)

The AgentManager is the central orchestrator that manages all agents, routes tasks, and coordinates agent activities.

**Key Responsibilities:**
- Agent registration and lifecycle management
- Task routing to appropriate agents
- Event bus coordination
- State persistence
- Resource management

**Usage:**
```javascript
// Initialize
await agentManager.initialize();

// Register an agent
const myAgent = new MyAgent();
await agentManager.registerAgent(myAgent);

// Dispatch a task
const result = await agentManager.dispatchTask({
  type: 'task-type-1',
  data: { /* task data */ }
});
```

### 4. AgentMonitor (`AgentMonitor.js`)

AgentMonitor provides a visual dashboard for monitoring agent activity, performance, and system health.

**Features:**
- Real-time agent status display
- Performance metrics and statistics
- Event history viewer
- Agent enable/disable controls
- Auto-refresh capability

**Usage:**
```javascript
// Show the monitoring dashboard
showAgentMonitor();
```

### 5. PerformanceMonitorAgent (`PerformanceMonitorAgent.js`)

An example agent that monitors system performance and tracks metrics.

**Capabilities:**
- Tracks sync, search, and export durations
- Monitors memory usage
- Detects performance issues
- Generates recommendations
- Calculates system health score

## Event Types

The system defines standard event types in `AgentEventTypes`:

### Agent Lifecycle Events
- `AGENT_REGISTERED` - Agent was registered
- `AGENT_UNREGISTERED` - Agent was unregistered
- `AGENT_STARTED` - Agent was enabled
- `AGENT_STOPPED` - Agent was disabled
- `AGENT_ERROR` - Agent encountered an error

### Task Events
- `TASK_CREATED` - Task was created
- `TASK_ASSIGNED` - Task was assigned to an agent
- `TASK_STARTED` - Task execution started
- `TASK_COMPLETED` - Task completed successfully
- `TASK_FAILED` - Task failed

### Conversation Events
- `CONVERSATION_CREATED` - New conversation created
- `CONVERSATION_UPDATED` - Conversation updated
- `CONVERSATION_DELETED` - Conversation deleted
- `CONVERSATION_EXPORTED` - Conversation exported
- `CONVERSATION_SYNCED` - Conversation synced

### System Events
- `SYSTEM_READY` - System initialized
- `SYSTEM_ERROR` - System error occurred
- `SETTINGS_CHANGED` - Settings changed
- `STORAGE_UPDATED` - Storage updated

## Agent States

Agents can be in one of the following states:
- `IDLE` - Ready to accept tasks
- `INITIALIZING` - Starting up
- `BUSY` - Currently executing a task
- `ERROR` - Encountered an error
- `STOPPED` - Disabled or shut down

## Integration

The agent system is integrated into the extension at initialization:

1. Agent scripts are loaded via `manifest.json`
2. `initializeAgentSystem()` is called during extension startup
3. Agents are registered and begin listening for events
4. Tasks can be dispatched through the AgentManager

## Debugging and Testing

### View System Status
```javascript
// In the browser console
getAgentSystemStatus()
```

### Test the System
```javascript
// Run a test task
testAgentSystem()
```

### Show Monitoring Dashboard
```javascript
// Display the agent monitor UI
showAgentMonitor()
```

## Storage

The agent system persists its state in Chrome's local storage:
- `agentManagerState` - Manager and agent states
- Agents can use Chrome storage for their own data needs

## Future Agents

The infrastructure is designed to support various specialized agents:

### Planned Agents (from roadmap)
1. **Conversation Intelligence Agent** - Analyzes conversations, extracts topics, suggests follow-ups
2. **Smart Search Agent** - Semantic search with context awareness
3. **Workflow Automation Agent** - Automate repetitive tasks
4. **Prompt Optimization Agent** - Helps craft better prompts
5. **Knowledge Management Agent** - Builds personal knowledge base
6. **Context Manager Agent** - Manages conversation context
7. **Learning & Personalization Agent** - Adapts to user preferences

## Best Practices

### Creating New Agents
1. Extend `BaseAgent`
2. Define clear capabilities
3. Implement `_executeTask()` for task logic
4. Use event bus for communication
5. Handle errors gracefully
6. Track statistics for monitoring

### Task Design
1. Include unique task ID
2. Specify task type that matches agent capabilities
3. Include all necessary data
4. Handle timeouts appropriately

### Event Usage
1. Emit events for significant actions
2. Subscribe to relevant events only
3. Clean up event listeners on shutdown
4. Use appropriate event types

## Performance Considerations

- Agents run in the browser context (lightweight)
- Task execution has 30-second timeout by default
- Event history limited to 100 events
- Metric storage limited to last 100 measurements
- Auto-refresh rates should be reasonable (2+ seconds)

## Security

- All processing happens locally in the browser
- No data sent to external servers
- Agents are sandboxed within extension context
- Chrome's extension security model applies

## Contributing

When adding new agents:
1. Follow the BaseAgent interface
2. Add comprehensive JSDoc comments
3. Update this README
4. Add agent to manifest.json
5. Register in initializeAgents.js
6. Test thoroughly

## Files

- `EventBus.js` - Event communication system
- `BaseAgent.js` - Base agent class and interface
- `AgentManager.js` - Central orchestrator
- `AgentMonitor.js` - Monitoring dashboard UI
- `PerformanceMonitorAgent.js` - Example agent
- `initializeAgents.js` - System initialization
- `README.md` - This documentation

## License

Part of the Superpower ChatGPT project.

/**
 * AdvancedPromptChainsAgent - Agent for advanced prompt chain execution
 * Implements Section 2.5 of plans.md
 * 
 * Capabilities:
 * - Conditional branching in chains
 * - Variable support and templating
 * - Error handling and retry logic
 * - Chain execution visualization
 * - Import/export chain definitions
 */

class AdvancedPromptChainsAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'advanced-prompt-chains-agent',
      name: 'Advanced Prompt Chains Agent',
      description: 'Manages complex prompt chains with branching, variables, and error handling',
      capabilities: [
        'createChain',
        'executeChain',
        'pauseChain',
        'resumeChain',
        'stopChain',
        'getChainStatus',
        'exportChain',
        'importChain',
        'validateChain',
        'visualizeChain'
      ],
      version: '1.0.0'
    });

    // Chain storage
    this.chains = new Map(); // chainId -> chain definition
    this.executions = new Map(); // executionId -> execution state
    
    // Execution settings
    this.settings = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 300000, // 5 minutes
      maxConcurrentExecutions: 5
    };

    // Statistics
    this.stats = {
      chainsCreated: 0,
      chainsExecuted: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalStepsExecuted: 0,
      averageExecutionTime: 0
    };
  }

  async initialize() {
    await super.initialize();
    
    // Load saved data
    await this._loadState();
    
    // Resume any paused executions
    await this._resumePausedExecutions();
    
    console.log(`${this.name} initialized with ${this.chains.size} chains`);
  }

  /**
   * Main execution method
   */
  async execute(task) {
    const { type, data } = task;

    switch (type) {
      case 'createChain':
        return await this._createChain(data);
      
      case 'executeChain':
        return await this._executeChain(data);
      
      case 'pauseChain':
        return this._pauseChain(data);
      
      case 'resumeChain':
        return await this._resumeChain(data);
      
      case 'stopChain':
        return this._stopChain(data);
      
      case 'getChainStatus':
        return this._getChainStatus(data);
      
      case 'exportChain':
        return this._exportChain(data);
      
      case 'importChain':
        return await this._importChain(data);
      
      case 'validateChain':
        return this._validateChain(data);
      
      case 'visualizeChain':
        return this._visualizeChain(data);
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
  }

  /**
   * Create a new prompt chain
   */
  async _createChain(data) {
    const { name, description, steps, variables, config } = data;
    
    if (!name || !steps || !Array.isArray(steps)) {
      throw new Error('Invalid chain definition: name and steps are required');
    }

    // Validate chain
    const validation = this._validateChainStructure({ name, steps, variables });
    if (!validation.valid) {
      throw new Error(`Invalid chain: ${validation.errors.join(', ')}`);
    }

    const chain = {
      id: `chain-${Date.now()}`,
      name,
      description: description || '',
      steps,
      variables: variables || {},
      config: {
        maxRetries: config?.maxRetries || this.settings.maxRetries,
        retryDelay: config?.retryDelay || this.settings.retryDelay,
        timeout: config?.timeout || this.settings.timeout,
        ...config
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0
    };

    this.chains.set(chain.id, chain);
    this.stats.chainsCreated++;

    await this._saveState();

    // Emit event
    this._emitEvent('CHAIN_CREATED', {
      chainId: chain.id,
      name: chain.name,
      stepCount: steps.length
    });

    return chain;
  }

  /**
   * Execute a prompt chain
   */
  async _executeChain(data) {
    const { chainId, initialVariables, onProgress } = data;
    
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error('Chain not found');
    }

    // Check concurrent execution limit
    const activeExecutions = Array.from(this.executions.values())
      .filter(e => e.status === 'running' || e.status === 'paused').length;
    
    if (activeExecutions >= this.settings.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent executions reached');
    }

    // Create execution
    const execution = {
      id: `exec-${Date.now()}`,
      chainId,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      currentStep: 0,
      steps: [],
      variables: {
        ...chain.variables,
        ...initialVariables
      },
      results: [],
      error: null
    };

    this.executions.set(execution.id, execution);

    // Emit start event
    this._emitEvent('CHAIN_STARTED', {
      executionId: execution.id,
      chainId,
      stepCount: chain.steps.length
    });

    // Execute steps
    try {
      for (let i = 0; i < chain.steps.length; i++) {
        // Check if execution was stopped or paused
        const currentExec = this.executions.get(execution.id);
        if (currentExec.status === 'stopped') {
          throw new Error('Execution stopped by user');
        }
        if (currentExec.status === 'paused') {
          execution.currentStep = i;
          await this._saveState();
          return execution;
        }

        const step = chain.steps[i];
        execution.currentStep = i;

        // Execute step with error handling
        const stepResult = await this._executeStep(step, execution, chain.config);
        
        execution.steps.push({
          stepIndex: i,
          stepType: step.type,
          status: 'completed',
          result: stepResult,
          timestamp: Date.now()
        });
        execution.results.push(stepResult);

        // Handle branching
        if (step.type === 'condition' && stepResult.branch) {
          const branchSteps = step.branches[stepResult.branch];
          if (branchSteps) {
            // Execute branch steps
            for (const branchStep of branchSteps) {
              const branchResult = await this._executeStep(branchStep, execution, chain.config);
              execution.results.push(branchResult);
            }
          }
        }

        // Call progress callback if provided
        if (onProgress) {
          onProgress({
            executionId: execution.id,
            currentStep: i + 1,
            totalSteps: chain.steps.length,
            progress: ((i + 1) / chain.steps.length * 100).toFixed(1)
          });
        }

        // Emit progress event
        this._emitEvent('CHAIN_PROGRESS', {
          executionId: execution.id,
          step: i + 1,
          total: chain.steps.length
        });
      }

      // Execution completed successfully
      execution.status = 'completed';
      execution.endTime = Date.now();

      chain.executionCount++;
      chain.successCount++;
      this.stats.successfulExecutions++;
      this.stats.totalStepsExecuted += chain.steps.length;

      // Emit completion event
      this._emitEvent('CHAIN_COMPLETED', {
        executionId: execution.id,
        chainId,
        duration: execution.endTime - execution.startTime,
        stepsExecuted: execution.steps.length
      });

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.error = error.message;

      chain.executionCount++;
      chain.failureCount++;
      this.stats.failedExecutions++;

      // Emit error event
      this._emitEvent('CHAIN_FAILED', {
        executionId: execution.id,
        chainId,
        error: error.message,
        failedStep: execution.currentStep
      });
    }

    // Update stats
    this.stats.chainsExecuted++;
    this._updateAverageExecutionTime(execution.endTime - execution.startTime);

    await this._saveState();

    return execution;
  }

  /**
   * Pause chain execution
   */
  _pauseChain(data) {
    const { executionId } = data;
    
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== 'running') {
      throw new Error('Can only pause running executions');
    }

    execution.status = 'paused';
    execution.pausedAt = Date.now();

    this._saveState();

    // Emit event
    this._emitEvent('CHAIN_PAUSED', {
      executionId,
      currentStep: execution.currentStep
    });

    return execution;
  }

  /**
   * Resume paused chain execution
   */
  async _resumeChain(data) {
    const { executionId } = data;
    
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== 'paused') {
      throw new Error('Can only resume paused executions');
    }

    execution.status = 'running';
    delete execution.pausedAt;

    // Emit event
    this._emitEvent('CHAIN_RESUMED', {
      executionId,
      resumeStep: execution.currentStep
    });

    // Continue execution
    return await this._executeChain({
      chainId: execution.chainId,
      initialVariables: execution.variables
    });
  }

  /**
   * Stop chain execution
   */
  _stopChain(data) {
    const { executionId } = data;
    
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (!['running', 'paused'].includes(execution.status)) {
      throw new Error('Can only stop running or paused executions');
    }

    execution.status = 'stopped';
    execution.endTime = Date.now();

    this._saveState();

    // Emit event
    this._emitEvent('CHAIN_STOPPED', {
      executionId,
      stoppedAt: execution.currentStep
    });

    return execution;
  }

  /**
   * Get chain execution status
   */
  _getChainStatus(data) {
    const { executionId, chainId } = data;
    
    if (executionId) {
      return this.executions.get(executionId);
    } else if (chainId) {
      const chain = this.chains.get(chainId);
      if (!chain) {
        throw new Error('Chain not found');
      }

      // Get all executions for this chain
      const executions = Array.from(this.executions.values())
        .filter(e => e.chainId === chainId);

      return {
        chain,
        executions,
        stats: {
          total: chain.executionCount,
          successful: chain.successCount,
          failed: chain.failureCount,
          successRate: chain.executionCount > 0 ? 
            (chain.successCount / chain.executionCount * 100).toFixed(1) : 0
        }
      };
    } else {
      throw new Error('Either executionId or chainId is required');
    }
  }

  /**
   * Export chain definition
   */
  _exportChain(data) {
    const { chainId } = data;
    
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error('Chain not found');
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      chain: {
        name: chain.name,
        description: chain.description,
        steps: chain.steps,
        variables: chain.variables,
        config: chain.config
      }
    };
  }

  /**
   * Import chain definition
   */
  async _importChain(data) {
    const { chainData } = data;
    
    if (!chainData || !chainData.chain) {
      throw new Error('Invalid chain data');
    }

    // Validate imported chain
    const validation = this._validateChainStructure(chainData.chain);
    if (!validation.valid) {
      throw new Error(`Invalid chain: ${validation.errors.join(', ')}`);
    }

    // Create chain from imported data
    return await this._createChain(chainData.chain);
  }

  /**
   * Validate chain structure
   */
  _validateChain(data) {
    const { chainId, chainData } = data;
    
    let chain;
    if (chainId) {
      chain = this.chains.get(chainId);
      if (!chain) {
        throw new Error('Chain not found');
      }
    } else if (chainData) {
      chain = chainData;
    } else {
      throw new Error('Either chainId or chainData is required');
    }

    return this._validateChainStructure(chain);
  }

  /**
   * Visualize chain structure
   */
  _visualizeChain(data) {
    const { chainId } = data;
    
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new Error('Chain not found');
    }

    const visualization = {
      chainId,
      name: chain.name,
      nodes: [],
      edges: [],
      layout: 'vertical'
    };

    // Create nodes for each step
    chain.steps.forEach((step, index) => {
      const node = {
        id: `step-${index}`,
        type: step.type,
        label: step.name || `Step ${index + 1}`,
        data: {
          prompt: step.prompt?.substring(0, 50),
          hasRetry: step.retry !== undefined
        }
      };

      visualization.nodes.push(node);

      // Add edge from previous step
      if (index > 0) {
        visualization.edges.push({
          from: `step-${index - 1}`,
          to: `step-${index}`,
          label: 'next'
        });
      }

      // Add branch nodes if conditional
      if (step.type === 'condition' && step.branches) {
        Object.keys(step.branches).forEach(branchName => {
          visualization.nodes.push({
            id: `step-${index}-branch-${branchName}`,
            type: 'branch',
            label: branchName,
            data: { steps: step.branches[branchName].length }
          });

          visualization.edges.push({
            from: `step-${index}`,
            to: `step-${index}-branch-${branchName}`,
            label: branchName
          });
        });
      }
    });

    return visualization;
  }

  // ===== Helper Methods =====

  /**
   * Execute a single step
   */
  async _executeStep(step, execution, config) {
    const { type, retry = {}, timeout } = step;
    const maxRetries = retry.max || config.maxRetries;
    const retryDelay = retry.delay || config.retryDelay;
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Set timeout
        const stepTimeout = timeout || config.timeout;
        const result = await Promise.race([
          this._executeStepType(step, execution),
          this._createTimeout(stepTimeout)
        ]);

        return result;

      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry
          await this._delay(retryDelay);
          
          // Emit retry event
          this._emitEvent('STEP_RETRY', {
            executionId: execution.id,
            step: execution.currentStep,
            attempt: attempt + 1,
            maxRetries
          });
        }
      }
    }

    // All retries exhausted
    throw new Error(`Step failed after ${maxRetries} retries: ${lastError.message}`);
  }

  /**
   * Execute step based on type
   */
  async _executeStepType(step, execution) {
    const { type, prompt, variables: stepVars } = step;

    // Resolve variables in prompt
    const resolvedPrompt = this._resolveVariables(prompt, {
      ...execution.variables,
      ...stepVars
    });

    switch (type) {
      case 'prompt':
        return await this._executePromptStep(resolvedPrompt, step, execution);
      
      case 'condition':
        return await this._executeConditionStep(step, execution);
      
      case 'loop':
        return await this._executeLoopStep(step, execution);
      
      case 'variable':
        return this._executeVariableStep(step, execution);
      
      case 'delay':
        return await this._executeDelayStep(step);
      
      case 'transform':
        return this._executeTransformStep(step, execution);
      
      default:
        throw new Error(`Unknown step type: ${type}`);
    }
  }

  /**
   * Execute prompt step
   */
  async _executePromptStep(prompt, step, execution) {
    // This would integrate with the actual ChatGPT interface
    // For now, we'll simulate it
    return {
      type: 'prompt',
      prompt,
      response: `[Response to: ${prompt.substring(0, 50)}...]`,
      timestamp: Date.now()
    };
  }

  /**
   * Execute condition step
   */
  async _executeConditionStep(step, execution) {
    const { condition, branches } = step;
    
    // Evaluate condition
    const conditionResult = this._evaluateCondition(condition, execution);
    
    // Determine which branch to take
    let branch = 'default';
    if (conditionResult === true) {
      branch = 'true';
    } else if (conditionResult === false) {
      branch = 'false';
    } else {
      branch = conditionResult;
    }

    return {
      type: 'condition',
      condition,
      result: conditionResult,
      branch,
      hasBranch: branches && branches[branch] !== undefined
    };
  }

  /**
   * Execute loop step
   */
  async _executeLoopStep(step, execution) {
    const { iterations, items, loopVariable } = step;
    const results = [];

    if (items) {
      // Loop over items
      const itemList = this._resolveVariables(items, execution.variables);
      
      for (let i = 0; i < itemList.length; i++) {
        execution.variables[loopVariable || 'item'] = itemList[i];
        execution.variables.index = i;
        
        // Execute loop body would go here
        results.push({ index: i, item: itemList[i] });
      }
    } else if (iterations) {
      // Loop N times
      for (let i = 0; i < iterations; i++) {
        execution.variables.index = i;
        
        // Execute loop body would go here
        results.push({ index: i });
      }
    }

    return {
      type: 'loop',
      iterations: results.length,
      results
    };
  }

  /**
   * Execute variable step
   */
  _executeVariableStep(step, execution) {
    const { variableName, value, operation } = step;
    
    let newValue;
    
    if (operation === 'set') {
      newValue = this._resolveVariables(value, execution.variables);
    } else if (operation === 'increment') {
      newValue = (execution.variables[variableName] || 0) + 1;
    } else if (operation === 'decrement') {
      newValue = (execution.variables[variableName] || 0) - 1;
    } else {
      newValue = this._resolveVariables(value, execution.variables);
    }

    execution.variables[variableName] = newValue;

    return {
      type: 'variable',
      variableName,
      value: newValue
    };
  }

  /**
   * Execute delay step
   */
  async _executeDelayStep(step) {
    const { duration } = step;
    await this._delay(duration);
    
    return {
      type: 'delay',
      duration
    };
  }

  /**
   * Execute transform step
   */
  _executeTransformStep(step, execution) {
    const { transform, input, output } = step;
    
    const inputValue = this._resolveVariables(input, execution.variables);
    let transformedValue;

    switch (transform) {
      case 'uppercase':
        transformedValue = String(inputValue).toUpperCase();
        break;
      case 'lowercase':
        transformedValue = String(inputValue).toLowerCase();
        break;
      case 'trim':
        transformedValue = String(inputValue).trim();
        break;
      case 'length':
        transformedValue = String(inputValue).length;
        break;
      default:
        transformedValue = inputValue;
    }

    if (output) {
      execution.variables[output] = transformedValue;
    }

    return {
      type: 'transform',
      transform,
      input: inputValue,
      output: transformedValue
    };
  }

  /**
   * Resolve variables in string
   */
  _resolveVariables(text, variables) {
    if (typeof text !== 'string') return text;
    
    let resolved = text;
    
    // Replace {{variable}} with value
    const matches = text.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      matches.forEach(match => {
        const varName = match.slice(2, -2);
        const value = variables[varName];
        if (value !== undefined) {
          resolved = resolved.replace(match, value);
        }
      });
    }

    return resolved;
  }

  /**
   * Evaluate condition
   */
  _evaluateCondition(condition, execution) {
    const { variable, operator, value } = condition;
    
    const varValue = execution.variables[variable];
    
    switch (operator) {
      case '==':
        return varValue == value;
      case '===':
        return varValue === value;
      case '!=':
        return varValue != value;
      case '!==':
        return varValue !== value;
      case '>':
        return varValue > value;
      case '>=':
        return varValue >= value;
      case '<':
        return varValue < value;
      case '<=':
        return varValue <= value;
      case 'contains':
        return String(varValue).includes(value);
      case 'exists':
        return varValue !== undefined && varValue !== null;
      default:
        return false;
    }
  }

  /**
   * Validate chain structure
   */
  _validateChainStructure(chain) {
    const errors = [];

    if (!chain.name) {
      errors.push('Chain name is required');
    }

    if (!chain.steps || !Array.isArray(chain.steps)) {
      errors.push('Chain steps must be an array');
    } else {
      // Validate each step
      chain.steps.forEach((step, index) => {
        if (!step.type) {
          errors.push(`Step ${index}: type is required`);
        }

        if (step.type === 'condition' && !step.condition) {
          errors.push(`Step ${index}: condition is required for condition steps`);
        }

        if (step.type === 'loop' && !step.iterations && !step.items) {
          errors.push(`Step ${index}: either iterations or items is required for loop steps`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Resume paused executions
   */
  async _resumePausedExecutions() {
    const paused = Array.from(this.executions.values())
      .filter(e => e.status === 'paused');
    
    console.log(`Found ${paused.length} paused executions`);
    // Auto-resume could be implemented here if desired
  }

  /**
   * Update average execution time
   */
  _updateAverageExecutionTime(executionTime) {
    const total = this.stats.averageExecutionTime * (this.stats.chainsExecuted - 1) + executionTime;
    this.stats.averageExecutionTime = Math.round(total / this.stats.chainsExecuted);
  }

  /**
   * Create timeout promise
   */
  _createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Step timeout')), ms);
    });
  }

  /**
   * Delay helper
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load state from Chrome storage
   */
  async _loadState() {
    try {
      const data = await chrome.storage.local.get([
        'advancedChainsChains',
        'advancedChainsExecutions',
        'advancedChainsStats'
      ]);
      
      if (data.advancedChainsChains) {
        this.chains = new Map(data.advancedChainsChains);
      }
      if (data.advancedChainsExecutions) {
        this.executions = new Map(data.advancedChainsExecutions);
      }
      if (data.advancedChainsStats) {
        this.stats = data.advancedChainsStats;
      }
    } catch (error) {
      console.error('Failed to load AdvancedPromptChainsAgent state:', error);
    }
  }

  /**
   * Save state to Chrome storage
   */
  async _saveState() {
    try {
      await chrome.storage.local.set({
        advancedChainsChains: Array.from(this.chains.entries()),
        advancedChainsExecutions: Array.from(this.executions.entries()),
        advancedChainsStats: this.stats
      });
    } catch (error) {
      console.error('Failed to save AdvancedPromptChainsAgent state:', error);
    }
  }

  /**
   * Emit custom event
   */
  _emitEvent(eventType, data) {
    if (this.eventBus) {
      this.eventBus.emit(`AdvancedChains:${eventType}`, {
        agentId: this.agentId,
        timestamp: Date.now(),
        ...data
      });
    }
  }
}

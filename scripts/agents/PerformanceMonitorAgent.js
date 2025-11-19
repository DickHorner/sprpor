/**
 * PerformanceMonitorAgent - Monitors system performance and tracks metrics
 * Example agent demonstrating the agent infrastructure
 */
class PerformanceMonitorAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'performance-monitor',
      name: 'Performance Monitor',
      description: 'Tracks system performance metrics and identifies optimization opportunities',
      capabilities: ['monitor', 'analytics', 'performance'],
      version: '1.0.0',
      enabled: true
    });

    this.metrics = {
      syncDurations: [],
      searchDurations: [],
      exportDurations: [],
      memoryUsage: [],
      errors: []
    };

    this.thresholds = {
      syncDuration: 10000, // 10 seconds
      searchDuration: 1000, // 1 second
      exportDuration: 5000, // 5 seconds
      memoryUsage: 100 * 1024 * 1024 // 100MB
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    
    // Subscribe to relevant events
    this._subscribeToEvent(AgentEventTypes.CONVERSATION_SYNCED, (event) => {
      this._trackSyncDuration(event.data);
    });

    this._subscribeToEvent(AgentEventTypes.SEARCH_COMPLETED, (event) => {
      this._trackSearchDuration(event.data);
    });

    this._subscribeToEvent(AgentEventTypes.CONVERSATION_EXPORTED, (event) => {
      this._trackExportDuration(event.data);
    });

    this._subscribeToEvent(AgentEventTypes.SYSTEM_ERROR, (event) => {
      this._trackError(event.data);
    });

    // Start periodic monitoring
    this._startPeriodicMonitoring();
    
    console.log('PerformanceMonitorAgent initialized');
  }

  /**
   * Shutdown the agent
   */
  async shutdown() {
    this._stopPeriodicMonitoring();
    await super.shutdown();
    console.log('PerformanceMonitorAgent shutdown');
  }

  /**
   * Execute task
   */
  async _executeTask(task) {
    switch (task.type) {
      case 'monitor':
        return await this._performMonitoring();
      
      case 'analytics':
        return await this._generateAnalytics();
      
      case 'performance':
        return await this._getPerformanceReport();
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * Perform system monitoring
   * @private
   */
  async _performMonitoring() {
    const report = {
      timestamp: Date.now(),
      memoryUsage: this._getMemoryUsage(),
      metrics: this._getMetricsSummary(),
      alerts: this._checkThresholds()
    };

    // Store memory usage
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      usage: report.memoryUsage
    });

    // Keep only last 100 measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }

    return report;
  }

  /**
   * Generate analytics
   * @private
   */
  async _generateAnalytics() {
    return {
      syncStats: this._calculateStats(this.metrics.syncDurations),
      searchStats: this._calculateStats(this.metrics.searchDurations),
      exportStats: this._calculateStats(this.metrics.exportDurations),
      errorCount: this.metrics.errors.length,
      recommendations: this._generateRecommendations()
    };
  }

  /**
   * Get performance report
   * @private
   */
  async _getPerformanceReport() {
    const analytics = await this._generateAnalytics();
    
    return {
      summary: {
        totalOperations: this._getTotalOperations(),
        averagePerformance: this._getAveragePerformance(),
        healthScore: this._calculateHealthScore()
      },
      details: analytics,
      alerts: this._checkThresholds(),
      timestamp: Date.now()
    };
  }

  /**
   * Track sync duration
   * @private
   */
  _trackSyncDuration(data) {
    if (data && data.duration) {
      this.metrics.syncDurations.push({
        timestamp: Date.now(),
        duration: data.duration
      });

      // Keep only last 100 measurements
      if (this.metrics.syncDurations.length > 100) {
        this.metrics.syncDurations.shift();
      }
    }
  }

  /**
   * Track search duration
   * @private
   */
  _trackSearchDuration(data) {
    if (data && data.duration) {
      this.metrics.searchDurations.push({
        timestamp: Date.now(),
        duration: data.duration
      });

      if (this.metrics.searchDurations.length > 100) {
        this.metrics.searchDurations.shift();
      }
    }
  }

  /**
   * Track export duration
   * @private
   */
  _trackExportDuration(data) {
    if (data && data.duration) {
      this.metrics.exportDurations.push({
        timestamp: Date.now(),
        duration: data.duration
      });

      if (this.metrics.exportDurations.length > 100) {
        this.metrics.exportDurations.shift();
      }
    }
  }

  /**
   * Track error
   * @private
   */
  _trackError(data) {
    this.metrics.errors.push({
      timestamp: Date.now(),
      error: data
    });

    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Start periodic monitoring
   * @private
   */
  _startPeriodicMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this._performMonitoring().catch(error => {
        console.error('Periodic monitoring failed:', error);
      });
    }, 60000); // Every minute
  }

  /**
   * Stop periodic monitoring
   * @private
   */
  _stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Get memory usage
   * @private
   */
  _getMemoryUsage() {
    if (performance && performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  /**
   * Get metrics summary
   * @private
   */
  _getMetricsSummary() {
    return {
      syncCount: this.metrics.syncDurations.length,
      searchCount: this.metrics.searchDurations.length,
      exportCount: this.metrics.exportDurations.length,
      errorCount: this.metrics.errors.length
    };
  }

  /**
   * Calculate statistics for a metric
   * @private
   */
  _calculateStats(measurements) {
    if (measurements.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 };
    }

    const values = measurements.map(m => m.duration);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Check performance thresholds
   * @private
   */
  _checkThresholds() {
    const alerts = [];

    // Check sync duration
    const recentSyncs = this.metrics.syncDurations.slice(-10);
    const avgSyncTime = recentSyncs.length > 0
      ? recentSyncs.reduce((sum, m) => sum + m.duration, 0) / recentSyncs.length
      : 0;
    
    if (avgSyncTime > this.thresholds.syncDuration) {
      alerts.push({
        type: 'warning',
        metric: 'sync',
        message: `Average sync time (${Math.round(avgSyncTime)}ms) exceeds threshold`,
        value: avgSyncTime,
        threshold: this.thresholds.syncDuration
      });
    }

    // Check search duration
    const recentSearches = this.metrics.searchDurations.slice(-10);
    const avgSearchTime = recentSearches.length > 0
      ? recentSearches.reduce((sum, m) => sum + m.duration, 0) / recentSearches.length
      : 0;
    
    if (avgSearchTime > this.thresholds.searchDuration) {
      alerts.push({
        type: 'warning',
        metric: 'search',
        message: `Average search time (${Math.round(avgSearchTime)}ms) exceeds threshold`,
        value: avgSearchTime,
        threshold: this.thresholds.searchDuration
      });
    }

    // Check error rate
    const recentErrors = this.metrics.errors.filter(
      e => e.timestamp > Date.now() - 600000 // Last 10 minutes
    );
    
    if (recentErrors.length > 5) {
      alerts.push({
        type: 'error',
        metric: 'errors',
        message: `High error rate detected: ${recentErrors.length} errors in last 10 minutes`,
        value: recentErrors.length
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];
    const alerts = this._checkThresholds();

    if (alerts.some(a => a.metric === 'sync')) {
      recommendations.push({
        title: 'Optimize Sync Performance',
        description: 'Consider implementing incremental sync or reducing sync frequency',
        priority: 'medium'
      });
    }

    if (alerts.some(a => a.metric === 'search')) {
      recommendations.push({
        title: 'Improve Search Speed',
        description: 'Consider indexing conversations or implementing search result caching',
        priority: 'medium'
      });
    }

    if (alerts.some(a => a.metric === 'errors')) {
      recommendations.push({
        title: 'Investigate Error Causes',
        description: 'Review error logs to identify and fix common failure patterns',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Get total operations
   * @private
   */
  _getTotalOperations() {
    return this.metrics.syncDurations.length +
           this.metrics.searchDurations.length +
           this.metrics.exportDurations.length;
  }

  /**
   * Get average performance
   * @private
   */
  _getAveragePerformance() {
    const allDurations = [
      ...this.metrics.syncDurations,
      ...this.metrics.searchDurations,
      ...this.metrics.exportDurations
    ];

    if (allDurations.length === 0) return 0;

    const sum = allDurations.reduce((total, m) => total + m.duration, 0);
    return sum / allDurations.length;
  }

  /**
   * Calculate health score (0-100)
   * @private
   */
  _calculateHealthScore() {
    let score = 100;
    const alerts = this._checkThresholds();

    // Deduct points for warnings and errors
    alerts.forEach(alert => {
      if (alert.type === 'warning') {
        score -= 10;
      } else if (alert.type === 'error') {
        score -= 20;
      }
    });

    return Math.max(0, score);
  }
}

// Export for use in other modules
// eslint-disable-next-line no-unused-vars
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitorAgent;
}

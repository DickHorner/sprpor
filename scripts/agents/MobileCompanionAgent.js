/**
 * MobileCompanionAgent - Mobile companion app features
 * Section 3.5 of the Superpower ChatGPT roadmap
 * 
 * Capabilities:
 * - iOS/Android read-only access management
 * - Cloud sync service (optional)
 * - Mobile search and browsing
 * - Push notifications for automation
 * - Mobile-optimized data formats
 */

// Agent states
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  WAITING: 'waiting',
  ERROR: 'error'
};

class MobileCompanionAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'mobile-companion-agent',
      name: 'Mobile Companion Agent',
      description: 'Manages mobile companion app features including sync, notifications, and mobile-optimized access',
      capabilities: [
        'generateMobileToken',
        'syncToMobile',
        'prepareMobileData',
        'sendPushNotification',
        'registerMobileDevice',
        'manageMobileAccess',
        'getMobileStats',
        'optimizeForMobile',
        'getMobileSyncStatus',
        'revokeMobileAccess'
      ],
      version: '1.0.0'
    });

    // Mobile devices registry
    this.mobileDevices = new Map();
    
    // Sync queue for mobile devices
    this.syncQueue = new Map();
    
    // Push notifications queue
    this.notificationQueue = [];
    
    // Mobile access tokens
    this.accessTokens = new Map();

    // Statistics
    this.stats = {
      ...this.stats,
      devicesRegistered: 0,
      syncOperations: 0,
      notificationsSent: 0,
      dataOptimized: 0,
      accessTokensGenerated: 0,
      lastSyncTime: null,
      lastNotificationTime: null
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    console.log('MobileCompanionAgent: Initializing...');
    
    // Load mobile data from storage
    await this._loadMobileData();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Start background sync service
    this._startSyncService();
    
    console.log('MobileCompanionAgent: Initialization complete');
    console.log(`Registered devices: ${this.mobileDevices.size}`);
  }

  /**
   * Set up event listeners for mobile sync
   */
  _setupEventListeners() {
    if (this.eventBus) {
      // Listen for conversation updates to sync to mobile
      this.eventBus.on('conversation:created', async (data) => {
        await this._queueForSync('conversation', data.conversationId);
      });

      this.eventBus.on('conversation:updated', async (data) => {
        await this._queueForSync('conversation', data.conversationId);
      });

      // Listen for workflow completions to notify mobile
      this.eventBus.on('workflow:completed', async (data) => {
        await this.handleTask({
          type: 'sendPushNotification',
          data: {
            title: 'Workflow Completed',
            message: `${data.workflowName} has finished executing`,
            data: data
          }
        });
      });

      // Listen for important events
      this.eventBus.on('knowledge:extracted', async (data) => {
        await this.handleTask({
          type: 'sendPushNotification',
          data: {
            title: 'Knowledge Extracted',
            message: `Found ${data.entitiesCount} entities in conversation`,
            data: data,
            priority: 'low'
          }
        });
      });
    }
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
        case 'generateMobileToken':
          result = await this._generateMobileToken(task.data);
          break;

        case 'syncToMobile':
          result = await this._syncToMobile(task.data);
          break;

        case 'prepareMobileData':
          result = await this._prepareMobileData(task.data);
          break;

        case 'sendPushNotification':
          result = await this._sendPushNotification(task.data);
          break;

        case 'registerMobileDevice':
          result = await this._registerMobileDevice(task.data);
          break;

        case 'manageMobileAccess':
          result = await this._manageMobileAccess(task.data);
          break;

        case 'getMobileStats':
          result = await this._getMobileStats();
          break;

        case 'optimizeForMobile':
          result = await this._optimizeForMobile(task.data);
          break;

        case 'getMobileSyncStatus':
          result = await this._getMobileSyncStatus(task.data);
          break;

        case 'revokeMobileAccess':
          result = await this._revokeMobileAccess(task.data);
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

      console.error('MobileCompanionAgent: Task failed', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Generate mobile access token for device registration
   */
  async _generateMobileToken(data) {
    const { deviceName, platform, expiresIn = 90 * 24 * 60 * 60 * 1000 } = data; // Default 90 days

    const tokenId = this._generateTokenId();
    const token = this._generateSecureToken();

    const accessToken = {
      tokenId,
      token,
      deviceName,
      platform, // 'ios' or 'android'
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn,
      used: false,
      usedAt: null,
      deviceId: null
    };

    this.accessTokens.set(tokenId, accessToken);

    this.stats.accessTokensGenerated++;
    await this._saveMobileData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('mobile:token-generated', { tokenId, platform });
    }

    return {
      tokenId,
      token,
      expiresAt: accessToken.expiresAt,
      qrCode: this._generateQRCodeData(token) // For easy mobile scanning
    };
  }

  /**
   * Register a mobile device
   */
  async _registerMobileDevice(data) {
    const { token, deviceInfo } = data;

    // Validate token
    const accessToken = Array.from(this.accessTokens.values())
      .find(t => t.token === token && !t.used && t.expiresAt > Date.now());

    if (!accessToken) {
      throw new Error('Invalid or expired token');
    }

    const deviceId = this._generateDeviceId();

    const device = {
      deviceId,
      name: deviceInfo.name || accessToken.deviceName,
      platform: accessToken.platform,
      osVersion: deviceInfo.osVersion,
      appVersion: deviceInfo.appVersion,
      pushToken: deviceInfo.pushToken || null, // For push notifications
      registeredAt: Date.now(),
      lastSyncAt: null,
      lastActiveAt: Date.now(),
      syncEnabled: true,
      notificationsEnabled: true,
      syncPreferences: {
        autoSync: true,
        syncFrequency: 'realtime', // 'realtime', 'hourly', 'daily', 'manual'
        syncConversations: true,
        syncPrompts: true,
        syncKnowledge: false, // Large data, opt-in
        maxConversations: 100 // Limit for mobile storage
      },
      stats: {
        totalSyncs: 0,
        totalNotifications: 0,
        dataTransferred: 0
      }
    };

    this.mobileDevices.set(deviceId, device);

    // Mark token as used
    accessToken.used = true;
    accessToken.usedAt = Date.now();
    accessToken.deviceId = deviceId;
    this.accessTokens.set(accessToken.tokenId, accessToken);

    this.stats.devicesRegistered++;
    await this._saveMobileData();

    // Initial sync
    await this._syncToMobile({ deviceId });

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('mobile:device-registered', { deviceId, platform: device.platform });
    }

    return {
      deviceId,
      device,
      message: 'Device registered successfully'
    };
  }

  /**
   * Sync data to mobile device
   */
  async _syncToMobile(data) {
    const { deviceId, force = false } = data;

    if (!deviceId || !this.mobileDevices.has(deviceId)) {
      throw new Error('Device not found');
    }

    const device = this.mobileDevices.get(deviceId);

    if (!device.syncEnabled && !force) {
      return {
        synced: false,
        message: 'Sync is disabled for this device'
      };
    }

    console.log(`Syncing data to device: ${device.name}`);

    // Collect data to sync based on preferences
    const syncData = await this._collectSyncData(device);

    // Optimize data for mobile
    const optimizedData = await this._optimizeForMobile({ data: syncData, device });

    // In production, this would send data to mobile device via:
    // - WebSocket for realtime sync
    // - Cloud service (Firebase, AWS, etc.)
    // - Direct API call to mobile app

    const syncResult = {
      deviceId,
      timestamp: Date.now(),
      dataSize: JSON.stringify(optimizedData).length,
      items: {
        conversations: syncData.conversations?.length || 0,
        prompts: syncData.prompts?.length || 0,
        knowledge: syncData.knowledge?.length || 0
      },
      optimized: true
    };

    // Update device stats
    device.lastSyncAt = Date.now();
    device.lastActiveAt = Date.now();
    device.stats.totalSyncs++;
    device.stats.dataTransferred += syncResult.dataSize;
    this.mobileDevices.set(deviceId, device);

    this.stats.syncOperations++;
    this.stats.lastSyncTime = Date.now();
    await this._saveMobileData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('mobile:sync-completed', syncResult);
    }

    return {
      synced: true,
      syncResult,
      optimizedData
    };
  }

  /**
   * Prepare mobile-optimized data
   */
  async _prepareMobileData(data) {
    const { conversations = [], includeFullContent = false } = data;

    const mobileData = {
      version: '1.0.0',
      timestamp: Date.now(),
      conversations: []
    };

    for (const conversation of conversations) {
      const mobileConversation = {
        id: conversation.id,
        title: conversation.title || 'Untitled',
        preview: this._generatePreview(conversation),
        messageCount: conversation.messages?.length || 0,
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        tags: conversation.tags || []
      };

      if (includeFullContent) {
        mobileConversation.messages = conversation.messages?.map(msg => ({
          role: msg.role,
          content: this._truncateForMobile(msg.content, 1000),
          timestamp: msg.timestamp
        }));
      }

      mobileData.conversations.push(mobileConversation);
    }

    this.stats.dataOptimized++;
    return mobileData;
  }

  /**
   * Send push notification to mobile device
   */
  async _sendPushNotification(data) {
    const { 
      title, 
      message, 
      data: notificationData = {},
      priority = 'normal',
      deviceId = null,
      badge = null,
      sound = 'default'
    } = data;

    const notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      data: notificationData,
      priority,
      badge,
      sound,
      timestamp: Date.now(),
      sent: false,
      devices: []
    };

    // Determine target devices
    const targetDevices = deviceId 
      ? [this.mobileDevices.get(deviceId)].filter(Boolean)
      : Array.from(this.mobileDevices.values()).filter(d => d.notificationsEnabled);

    if (targetDevices.length === 0) {
      return {
        sent: false,
        message: 'No eligible devices for notification'
      };
    }

    console.log(`Sending push notification to ${targetDevices.length} device(s)`);

    // In production, this would use:
    // - Firebase Cloud Messaging (FCM) for Android
    // - Apple Push Notification service (APNs) for iOS

    for (const device of targetDevices) {
      if (device.pushToken) {
        notification.devices.push({
          deviceId: device.deviceId,
          platform: device.platform,
          sentAt: Date.now(),
          status: 'sent'
        });

        device.stats.totalNotifications++;
        device.lastActiveAt = Date.now();
        this.mobileDevices.set(device.deviceId, device);
      }
    }

    notification.sent = notification.devices.length > 0;
    this.notificationQueue.unshift(notification);
    if (this.notificationQueue.length > 100) {
      this.notificationQueue = this.notificationQueue.slice(0, 100);
    }

    this.stats.notificationsSent += notification.devices.length;
    this.stats.lastNotificationTime = Date.now();
    await this._saveMobileData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('mobile:notification-sent', {
        notificationId: notification.id,
        devicesCount: notification.devices.length
      });
    }

    return {
      sent: true,
      notification,
      devicesSent: notification.devices.length
    };
  }

  /**
   * Manage mobile device access
   */
  async _manageMobileAccess(data) {
    const { deviceId, action, settings = {} } = data;

    if (!deviceId || !this.mobileDevices.has(deviceId)) {
      throw new Error('Device not found');
    }

    const device = this.mobileDevices.get(deviceId);

    switch (action) {
      case 'enable':
        device.syncEnabled = true;
        break;

      case 'disable':
        device.syncEnabled = false;
        break;

      case 'updateSettings':
        device.syncPreferences = { ...device.syncPreferences, ...settings };
        break;

      case 'enableNotifications':
        device.notificationsEnabled = true;
        break;

      case 'disableNotifications':
        device.notificationsEnabled = false;
        break;

      case 'updatePushToken':
        device.pushToken = settings.pushToken;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    device.lastActiveAt = Date.now();
    this.mobileDevices.set(deviceId, device);
    await this._saveMobileData();

    return {
      deviceId,
      action,
      device
    };
  }

  /**
   * Optimize data for mobile consumption
   */
  async _optimizeForMobile(data) {
    const { data: rawData, device } = data;

    const optimized = {
      ...rawData,
      optimizedAt: Date.now(),
      optimizations: []
    };

    // Truncate long content
    if (rawData.conversations) {
      optimized.conversations = rawData.conversations.map(conv => {
        const optimizedConv = { ...conv };
        
        if (conv.messages) {
          optimizedConv.messages = conv.messages.map(msg => ({
            ...msg,
            content: this._truncateForMobile(msg.content, 2000)
          }));
          optimized.optimizations.push('truncated-messages');
        }

        return optimizedConv;
      });
    }

    // Remove large binary data
    delete optimized.images;
    delete optimized.attachments;
    optimized.optimizations.push('removed-binary-data');

    // Compress timestamps
    if (rawData.conversations) {
      optimized.conversations = optimized.conversations.map(conv => ({
        ...conv,
        createdAt: this._compressTimestamp(conv.createdAt)
      }));
      optimized.optimizations.push('compressed-timestamps');
    }

    return optimized;
  }

  /**
   * Get mobile sync status for a device
   */
  async _getMobileSyncStatus(data) {
    const { deviceId } = data;

    if (!deviceId || !this.mobileDevices.has(deviceId)) {
      throw new Error('Device not found');
    }

    const device = this.mobileDevices.get(deviceId);
    const queuedItems = this.syncQueue.get(deviceId) || [];

    return {
      deviceId,
      deviceName: device.name,
      syncEnabled: device.syncEnabled,
      lastSyncAt: device.lastSyncAt,
      queuedItems: queuedItems.length,
      syncPreferences: device.syncPreferences,
      stats: device.stats
    };
  }

  /**
   * Revoke mobile device access
   */
  async _revokeMobileAccess(data) {
    const { deviceId } = data;

    if (!deviceId || !this.mobileDevices.has(deviceId)) {
      throw new Error('Device not found');
    }

    const device = this.mobileDevices.get(deviceId);
    
    // Remove device
    this.mobileDevices.delete(deviceId);
    
    // Clear sync queue
    this.syncQueue.delete(deviceId);

    // Revoke associated token
    for (const [tokenId, token] of this.accessTokens) {
      if (token.deviceId === deviceId) {
        this.accessTokens.delete(tokenId);
      }
    }

    await this._saveMobileData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('mobile:access-revoked', { deviceId, deviceName: device.name });
    }

    return {
      revoked: true,
      deviceId,
      deviceName: device.name
    };
  }

  /**
   * Get mobile companion statistics
   */
  async _getMobileStats() {
    const devicesByPlatform = {
      ios: 0,
      android: 0
    };

    const deviceStats = [];

    for (const [_, device] of this.mobileDevices) {
      devicesByPlatform[device.platform]++;
      
      deviceStats.push({
        deviceId: device.deviceId,
        name: device.name,
        platform: device.platform,
        lastSyncAt: device.lastSyncAt,
        totalSyncs: device.stats.totalSyncs,
        totalNotifications: device.stats.totalNotifications,
        dataTransferred: device.stats.dataTransferred
      });
    }

    return {
      totalDevices: this.mobileDevices.size,
      devicesByPlatform,
      totalSyncOperations: this.stats.syncOperations,
      totalNotificationsSent: this.stats.notificationsSent,
      totalAccessTokens: this.accessTokens.size,
      lastSyncTime: this.stats.lastSyncTime,
      lastNotificationTime: this.stats.lastNotificationTime,
      deviceStats,
      recentNotifications: this.notificationQueue.slice(0, 10),
      stats: this.stats
    };
  }

  // ============ Helper Methods ============

  _generateTokenId() {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateSecureToken() {
    // Generate a secure random token
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  _generateDeviceId() {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateQRCodeData(token) {
    // In production, would generate actual QR code
    // For now, return data that can be encoded as QR
    return {
      type: 'superpower-mobile-token',
      token,
      version: '1.0.0'
    };
  }

  _generatePreview(conversation) {
    const messages = conversation.messages || [];
    if (messages.length === 0) return 'Empty conversation';

    const firstMessage = messages[0];
    const content = firstMessage.content || firstMessage.text || '';
    
    return this._truncateForMobile(content, 150);
  }

  _truncateForMobile(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  _compressTimestamp(timestamp) {
    // Convert to Unix timestamp (seconds instead of milliseconds)
    return Math.floor(timestamp / 1000);
  }

  async _collectSyncData(device) {
    const syncData = {};

    // In production, would fetch actual data from storage
    // For now, return structure

    if (device.syncPreferences.syncConversations) {
      syncData.conversations = []; // Would fetch from storage
    }

    if (device.syncPreferences.syncPrompts) {
      syncData.prompts = []; // Would fetch from storage
    }

    if (device.syncPreferences.syncKnowledge) {
      syncData.knowledge = []; // Would fetch from storage
    }

    return syncData;
  }

  async _queueForSync(type, resourceId) {
    // Add to sync queue for all enabled devices
    for (const [deviceId, device] of this.mobileDevices) {
      if (device.syncEnabled && device.syncPreferences.autoSync) {
        if (!this.syncQueue.has(deviceId)) {
          this.syncQueue.set(deviceId, []);
        }

        const queue = this.syncQueue.get(deviceId);
        queue.push({
          type,
          resourceId,
          queuedAt: Date.now()
        });

        this.syncQueue.set(deviceId, queue);
      }
    }
  }

  _startSyncService() {
    // Start background service to process sync queue
    // In production, would use a more sophisticated approach

    setInterval(async () => {
      for (const [deviceId, queue] of this.syncQueue) {
        if (queue.length > 0) {
          const device = this.mobileDevices.get(deviceId);
          
          if (device && device.syncEnabled && device.syncPreferences.autoSync) {
            // Process sync
            await this._syncToMobile({ deviceId });
            
            // Clear queue
            this.syncQueue.set(deviceId, []);
          }
        }
      }
    }, 60000); // Check every minute
  }

  async _loadMobileData() {
    try {
      const stored = await chrome.storage.local.get('mobileData');
      if (stored.mobileData) {
        const data = stored.mobileData;
        this.mobileDevices = new Map(data.devices || []);
        this.accessTokens = new Map(data.tokens || []);
        this.notificationQueue = data.notifications || [];
        this.syncQueue = new Map(data.syncQueue || []);
      }
    } catch (error) {
      console.error('Failed to load mobile data:', error);
    }
  }

  async _saveMobileData() {
    try {
      const data = {
        devices: Array.from(this.mobileDevices.entries()),
        tokens: Array.from(this.accessTokens.entries()),
        notifications: this.notificationQueue.slice(0, 100),
        syncQueue: Array.from(this.syncQueue.entries())
      };
      await chrome.storage.local.set({ mobileData: data });
    } catch (error) {
      console.error('Failed to save mobile data:', error);
    }
  }
}

// Make agent available globally
if (typeof window !== 'undefined') {
  window.MobileCompanionAgent = MobileCompanionAgent;
}

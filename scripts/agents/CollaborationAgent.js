/**
 * CollaborationAgent - Team collaboration and sharing features
 * Section 3.2 of the Superpower ChatGPT roadmap
 * 
 * Capabilities:
 * - Secure conversation sharing with permissions
 * - Team workspaces management
 * - Shared prompt libraries with ratings
 * - Conversation annotations and comments
 * - Team activity feeds
 */

// Agent states
const AgentState = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  WAITING: 'waiting',
  ERROR: 'error'
};

class CollaborationAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'collaboration-agent',
      name: 'Collaboration Agent',
      description: 'Enables team collaboration, sharing, and workspace management',
      capabilities: [
        'shareConversation',
        'createWorkspace',
        'manageWorkspace',
        'addComment',
        'ratePrompt',
        'getActivityFeed',
        'managePermissions',
        'createSharedLibrary',
        'syncSharedContent',
        'getCollaborationStats'
      ],
      version: '1.0.0'
    });

    // Collaboration data
    this.workspaces = new Map(); // Map of workspace ID -> workspace object
    this.sharedConversations = new Map(); // Map of share ID -> shared conversation
    this.sharedLibraries = new Map(); // Map of library ID -> shared library
    this.comments = new Map(); // Map of comment ID -> comment object
    this.activityFeed = []; // Array of activity items
    this.permissions = new Map(); // Map of resource ID -> permissions

    // Permission levels
    this.permissionLevels = {
      OWNER: 'owner',
      ADMIN: 'admin',
      WRITE: 'write',
      READ: 'read',
      NONE: 'none'
    };

    // Statistics
    this.stats = {
      ...this.stats,
      conversationsShared: 0,
      workspacesCreated: 0,
      commentsAdded: 0,
      promptsRated: 0,
      activitiesLogged: 0,
      lastActivityTime: null
    };
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    await super.initialize();
    console.log('CollaborationAgent: Initializing...');
    
    // Load existing collaboration data from storage
    await this._loadCollaborationData();
    
    // Set up event listeners
    this._setupEventListeners();
    
    console.log('CollaborationAgent: Initialization complete');
    console.log(`Loaded ${this.workspaces.size} workspaces, ${this.sharedConversations.size} shared conversations`);
  }

  /**
   * Set up event listeners
   */
  _setupEventListeners() {
    if (this.eventBus) {
      // Listen for conversation updates to sync with shared versions
      this.eventBus.on('conversation:updated', async (data) => {
        await this._syncSharedConversation(data.conversationId);
      });

      // Listen for prompt library updates
      this.eventBus.on('prompt:saved', async (data) => {
        await this._syncSharedLibrary(data.promptId);
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
        case 'shareConversation':
          result = await this._shareConversation(task.data);
          break;

        case 'createWorkspace':
          result = await this._createWorkspace(task.data);
          break;

        case 'manageWorkspace':
          result = await this._manageWorkspace(task.data);
          break;

        case 'addComment':
          result = await this._addComment(task.data);
          break;

        case 'ratePrompt':
          result = await this._ratePrompt(task.data);
          break;

        case 'getActivityFeed':
          result = await this._getActivityFeed(task.data);
          break;

        case 'managePermissions':
          result = await this._managePermissions(task.data);
          break;

        case 'createSharedLibrary':
          result = await this._createSharedLibrary(task.data);
          break;

        case 'syncSharedContent':
          result = await this._syncSharedContent(task.data);
          break;

        case 'getCollaborationStats':
          result = await this._getCollaborationStats();
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

      console.error('CollaborationAgent: Task failed', error);
      
      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  /**
   * Share a conversation with specific permissions
   */
  async _shareConversation(data) {
    const { conversationId, conversation, permissions = [], workspaceId = null, expiresAt = null } = data;

    if (!conversationId || !conversation) {
      throw new Error('Conversation ID and conversation data are required');
    }

    const shareId = this._generateShareId();
    const shareLink = this._generateShareLink(shareId);

    const sharedConversation = {
      shareId,
      conversationId,
      title: conversation.title || 'Untitled Conversation',
      sharedBy: this._getCurrentUserId(),
      sharedAt: Date.now(),
      workspaceId,
      expiresAt,
      shareLink,
      permissions: this._normalizePermissions(permissions),
      accessCount: 0,
      lastAccessedAt: null,
      comments: [],
      metadata: {
        messageCount: conversation.messages?.length || 0,
        model: conversation.model || 'unknown',
        createdAt: conversation.createdAt || Date.now()
      }
    };

    this.sharedConversations.set(shareId, sharedConversation);
    
    // Set permissions for the resource
    this.permissions.set(`conversation-${conversationId}`, {
      resourceId: conversationId,
      resourceType: 'conversation',
      permissions: sharedConversation.permissions,
      createdAt: Date.now()
    });

    // Add to workspace if specified
    if (workspaceId && this.workspaces.has(workspaceId)) {
      const workspace = this.workspaces.get(workspaceId);
      workspace.conversations.push(shareId);
      this.workspaces.set(workspaceId, workspace);
    }

    // Log activity
    await this._logActivity({
      type: 'conversation:shared',
      userId: this._getCurrentUserId(),
      resourceId: conversationId,
      details: {
        shareId,
        workspaceId,
        permissionCount: permissions.length
      }
    });

    this.stats.conversationsShared++;
    await this._saveCollaborationData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('collaboration:shared', {
        type: 'conversation',
        shareId,
        conversationId
      });
    }

    return {
      shareId,
      shareLink,
      expiresAt,
      permissions: sharedConversation.permissions,
      sharedConversation
    };
  }

  /**
   * Create a new team workspace
   */
  async _createWorkspace(data) {
    const { name, description = '', members = [], settings = {} } = data;

    if (!name) {
      throw new Error('Workspace name is required');
    }

    const workspaceId = this._generateWorkspaceId();
    const currentUserId = this._getCurrentUserId();

    const workspace = {
      workspaceId,
      name,
      description,
      createdBy: currentUserId,
      createdAt: Date.now(),
      members: [
        {
          userId: currentUserId,
          role: this.permissionLevels.OWNER,
          joinedAt: Date.now()
        },
        ...members
      ],
      conversations: [],
      libraries: [],
      settings: {
        isPublic: false,
        allowComments: true,
        requireApproval: false,
        ...settings
      },
      stats: {
        totalMembers: members.length + 1,
        totalConversations: 0,
        totalComments: 0,
        totalActivity: 0
      }
    };

    this.workspaces.set(workspaceId, workspace);

    // Log activity
    await this._logActivity({
      type: 'workspace:created',
      userId: currentUserId,
      resourceId: workspaceId,
      details: {
        name,
        memberCount: workspace.members.length
      }
    });

    this.stats.workspacesCreated++;
    await this._saveCollaborationData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('collaboration:workspace-created', {
        workspaceId,
        name
      });
    }

    return {
      workspaceId,
      workspace
    };
  }

  /**
   * Manage workspace (add/remove members, update settings)
   */
  async _manageWorkspace(data) {
    const { workspaceId, action, params = {} } = data;

    if (!workspaceId || !this.workspaces.has(workspaceId)) {
      throw new Error('Workspace not found');
    }

    const workspace = this.workspaces.get(workspaceId);
    let result;

    switch (action) {
      case 'addMember':
        result = await this._addWorkspaceMember(workspace, params);
        break;

      case 'removeMember':
        result = await this._removeWorkspaceMember(workspace, params);
        break;

      case 'updateMemberRole':
        result = await this._updateMemberRole(workspace, params);
        break;

      case 'updateSettings':
        workspace.settings = { ...workspace.settings, ...params.settings };
        result = { settings: workspace.settings };
        break;

      case 'listMembers':
        result = { members: workspace.members };
        break;

      default:
        throw new Error(`Unknown workspace action: ${action}`);
    }

    this.workspaces.set(workspaceId, workspace);
    await this._saveCollaborationData();

    return {
      workspaceId,
      action,
      result
    };
  }

  /**
   * Add a comment or annotation to a conversation
   */
  async _addComment(data) {
    const { conversationId, shareId, content, messageIndex = null, type = 'comment' } = data;

    if (!content) {
      throw new Error('Comment content is required');
    }

    const commentId = this._generateCommentId();
    const userId = this._getCurrentUserId();

    const comment = {
      commentId,
      conversationId,
      shareId,
      userId,
      content,
      messageIndex, // null for general comments, index for message-specific
      type, // 'comment', 'annotation', 'suggestion'
      createdAt: Date.now(),
      updatedAt: Date.now(),
      replies: [],
      reactions: {
        likes: 0,
        helpful: 0
      }
    };

    this.comments.set(commentId, comment);

    // Add to shared conversation if applicable
    if (shareId && this.sharedConversations.has(shareId)) {
      const shared = this.sharedConversations.get(shareId);
      shared.comments.push(commentId);
      this.sharedConversations.set(shareId, shared);
    }

    // Log activity
    await this._logActivity({
      type: 'comment:added',
      userId,
      resourceId: conversationId,
      details: {
        commentId,
        type
      }
    });

    this.stats.commentsAdded++;
    await this._saveCollaborationData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('collaboration:comment-added', {
        commentId,
        conversationId,
        shareId
      });
    }

    return {
      commentId,
      comment
    };
  }

  /**
   * Rate a prompt in shared library
   */
  async _ratePrompt(data) {
    const { promptId, libraryId, rating, review = '' } = data;

    if (!promptId || rating === undefined) {
      throw new Error('Prompt ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const userId = this._getCurrentUserId();
    const ratingId = `${promptId}-${userId}`;

    const promptRating = {
      ratingId,
      promptId,
      libraryId,
      userId,
      rating,
      review,
      createdAt: Date.now()
    };

    // Update library if it exists
    if (libraryId && this.sharedLibraries.has(libraryId)) {
      const library = this.sharedLibraries.get(libraryId);
      const prompt = library.prompts.find(p => p.id === promptId);
      
      if (prompt) {
        if (!prompt.ratings) {
          prompt.ratings = [];
        }
        
        // Remove existing rating from this user
        prompt.ratings = prompt.ratings.filter(r => r.userId !== userId);
        
        // Add new rating
        prompt.ratings.push(promptRating);
        
        // Calculate average rating
        prompt.averageRating = prompt.ratings.reduce((sum, r) => sum + r.rating, 0) / prompt.ratings.length;
        prompt.totalRatings = prompt.ratings.length;

        this.sharedLibraries.set(libraryId, library);
      }
    }

    // Log activity
    await this._logActivity({
      type: 'prompt:rated',
      userId,
      resourceId: promptId,
      details: {
        rating,
        libraryId
      }
    });

    this.stats.promptsRated++;
    await this._saveCollaborationData();

    return {
      ratingId,
      promptRating
    };
  }

  /**
   * Get activity feed for user or workspace
   */
  async _getActivityFeed(data) {
    const { workspaceId = null, userId = null, limit = 50, offset = 0, types = [] } = data;

    let activities = [...this.activityFeed];

    // Filter by workspace
    if (workspaceId) {
      activities = activities.filter(a => a.workspaceId === workspaceId);
    }

    // Filter by user
    if (userId) {
      activities = activities.filter(a => a.userId === userId);
    }

    // Filter by types
    if (types.length > 0) {
      activities = activities.filter(a => types.includes(a.type));
    }

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const paginatedActivities = activities.slice(offset, offset + limit);

    return {
      activities: paginatedActivities,
      total: activities.length,
      limit,
      offset,
      hasMore: offset + limit < activities.length
    };
  }

  /**
   * Manage permissions for a resource
   */
  async _managePermissions(data) {
    const { resourceId, resourceType, action, permissions = [] } = data;

    const permissionKey = `${resourceType}-${resourceId}`;

    switch (action) {
      case 'grant':
        if (!this.permissions.has(permissionKey)) {
          this.permissions.set(permissionKey, {
            resourceId,
            resourceType,
            permissions: [],
            createdAt: Date.now()
          });
        }
        const existing = this.permissions.get(permissionKey);
        existing.permissions.push(...this._normalizePermissions(permissions));
        existing.updatedAt = Date.now();
        this.permissions.set(permissionKey, existing);
        break;

      case 'revoke':
        if (this.permissions.has(permissionKey)) {
          const perm = this.permissions.get(permissionKey);
          perm.permissions = perm.permissions.filter(p => 
            !permissions.some(rp => rp.userId === p.userId)
          );
          perm.updatedAt = Date.now();
          this.permissions.set(permissionKey, perm);
        }
        break;

      case 'check':
        const userId = permissions[0]?.userId || this._getCurrentUserId();
        const hasPermission = this._checkPermission(resourceId, resourceType, userId);
        return {
          resourceId,
          resourceType,
          userId,
          hasPermission,
          level: hasPermission ? hasPermission.level : this.permissionLevels.NONE
        };

      case 'list':
        if (this.permissions.has(permissionKey)) {
          return {
            resourceId,
            resourceType,
            permissions: this.permissions.get(permissionKey).permissions
          };
        }
        return {
          resourceId,
          resourceType,
          permissions: []
        };

      default:
        throw new Error(`Unknown permission action: ${action}`);
    }

    await this._saveCollaborationData();

    return {
      resourceId,
      resourceType,
      action,
      success: true
    };
  }

  /**
   * Create a shared prompt library
   */
  async _createSharedLibrary(data) {
    const { name, description = '', prompts = [], workspaceId = null, isPublic = false } = data;

    if (!name) {
      throw new Error('Library name is required');
    }

    const libraryId = this._generateLibraryId();
    const userId = this._getCurrentUserId();

    const library = {
      libraryId,
      name,
      description,
      createdBy: userId,
      createdAt: Date.now(),
      workspaceId,
      isPublic,
      prompts: prompts.map(p => ({
        ...p,
        id: p.id || this._generatePromptId(),
        addedAt: Date.now(),
        addedBy: userId,
        ratings: [],
        averageRating: 0,
        totalRatings: 0,
        usageCount: 0
      })),
      collaborators: [],
      stats: {
        totalPrompts: prompts.length,
        totalRatings: 0,
        averageRating: 0
      }
    };

    this.sharedLibraries.set(libraryId, library);

    // Add to workspace if specified
    if (workspaceId && this.workspaces.has(workspaceId)) {
      const workspace = this.workspaces.get(workspaceId);
      workspace.libraries.push(libraryId);
      this.workspaces.set(workspaceId, workspace);
    }

    // Log activity
    await this._logActivity({
      type: 'library:created',
      userId,
      resourceId: libraryId,
      details: {
        name,
        promptCount: prompts.length
      }
    });

    await this._saveCollaborationData();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('collaboration:library-created', {
        libraryId,
        name
      });
    }

    return {
      libraryId,
      library
    };
  }

  /**
   * Sync shared content with latest changes
   */
  async _syncSharedContent(data) {
    const { type, resourceId } = data;

    let syncResult = {
      type,
      resourceId,
      synced: false,
      changes: []
    };

    if (type === 'conversation') {
      syncResult = await this._syncSharedConversation(resourceId);
    } else if (type === 'library') {
      syncResult = await this._syncSharedLibrary(resourceId);
    }

    return syncResult;
  }

  /**
   * Get collaboration statistics
   */
  async _getCollaborationStats() {
    return {
      totalWorkspaces: this.workspaces.size,
      totalSharedConversations: this.sharedConversations.size,
      totalSharedLibraries: this.sharedLibraries.size,
      totalComments: this.comments.size,
      totalActivities: this.activityFeed.length,
      recentActivities: this._getRecentActivities(10),
      mostActiveWorkspaces: this._getMostActiveWorkspaces(5),
      topRatedPrompts: this._getTopRatedPrompts(10),
      stats: this.stats
    };
  }

  // Helper methods

  _generateShareId() {
    return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateWorkspaceId() {
    return `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateCommentId() {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateLibraryId() {
    return `library-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generatePromptId() {
    return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateShareLink(shareId) {
    return `https://superpower-chatgpt/shared/${shareId}`;
  }

  _getCurrentUserId() {
    // In production, this would get the actual user ID from authentication
    return 'user-' + (localStorage.getItem('userId') || 'anonymous');
  }

  _normalizePermissions(permissions) {
    return permissions.map(p => ({
      userId: p.userId,
      level: p.level || this.permissionLevels.READ,
      grantedAt: Date.now(),
      grantedBy: this._getCurrentUserId()
    }));
  }

  _checkPermission(resourceId, resourceType, userId) {
    const permissionKey = `${resourceType}-${resourceId}`;
    if (!this.permissions.has(permissionKey)) {
      return null;
    }

    const perm = this.permissions.get(permissionKey);
    return perm.permissions.find(p => p.userId === userId);
  }

  async _addWorkspaceMember(workspace, params) {
    const { userId, role = this.permissionLevels.READ } = params;
    
    if (workspace.members.find(m => m.userId === userId)) {
      throw new Error('User is already a member of this workspace');
    }

    workspace.members.push({
      userId,
      role,
      joinedAt: Date.now(),
      addedBy: this._getCurrentUserId()
    });

    workspace.stats.totalMembers = workspace.members.length;

    await this._logActivity({
      type: 'workspace:member-added',
      userId: this._getCurrentUserId(),
      resourceId: workspace.workspaceId,
      details: {
        newMemberId: userId,
        role
      }
    });

    return { member: workspace.members[workspace.members.length - 1] };
  }

  async _removeWorkspaceMember(workspace, params) {
    const { userId } = params;
    
    const memberIndex = workspace.members.findIndex(m => m.userId === userId);
    if (memberIndex === -1) {
      throw new Error('User is not a member of this workspace');
    }

    workspace.members.splice(memberIndex, 1);
    workspace.stats.totalMembers = workspace.members.length;

    await this._logActivity({
      type: 'workspace:member-removed',
      userId: this._getCurrentUserId(),
      resourceId: workspace.workspaceId,
      details: {
        removedMemberId: userId
      }
    });

    return { success: true };
  }

  async _updateMemberRole(workspace, params) {
    const { userId, role } = params;
    
    const member = workspace.members.find(m => m.userId === userId);
    if (!member) {
      throw new Error('User is not a member of this workspace');
    }

    member.role = role;
    member.roleUpdatedAt = Date.now();

    await this._logActivity({
      type: 'workspace:role-updated',
      userId: this._getCurrentUserId(),
      resourceId: workspace.workspaceId,
      details: {
        targetUserId: userId,
        newRole: role
      }
    });

    return { member };
  }

  async _syncSharedConversation(conversationId) {
    // Find shared conversations for this ID
    const shares = Array.from(this.sharedConversations.values())
      .filter(s => s.conversationId === conversationId);

    if (shares.length === 0) {
      return { synced: false, message: 'No shared versions found' };
    }

    // In production, this would sync with the latest conversation data
    shares.forEach(share => {
      share.lastSyncedAt = Date.now();
    });

    await this._saveCollaborationData();

    return {
      synced: true,
      conversationId,
      sharesUpdated: shares.length
    };
  }

  async _syncSharedLibrary(promptId) {
    // Find libraries containing this prompt
    const libraries = Array.from(this.sharedLibraries.values())
      .filter(lib => lib.prompts.some(p => p.id === promptId));

    if (libraries.length === 0) {
      return { synced: false, message: 'Prompt not found in any shared library' };
    }

    // In production, this would sync with the latest prompt data
    libraries.forEach(library => {
      library.lastSyncedAt = Date.now();
    });

    await this._saveCollaborationData();

    return {
      synced: true,
      promptId,
      librariesUpdated: libraries.length
    };
  }

  async _logActivity(activity) {
    const activityItem = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...activity
    };

    this.activityFeed.unshift(activityItem);

    // Keep only last 1000 activities
    if (this.activityFeed.length > 1000) {
      this.activityFeed = this.activityFeed.slice(0, 1000);
    }

    this.stats.activitiesLogged++;
    this.stats.lastActivityTime = Date.now();

    // Emit event
    if (this.eventBus) {
      this.eventBus.emit('collaboration:activity', activityItem);
    }
  }

  _getRecentActivities(limit) {
    return this.activityFeed.slice(0, limit);
  }

  _getMostActiveWorkspaces(limit) {
    const workspaceActivity = new Map();

    this.activityFeed.forEach(activity => {
      if (activity.workspaceId) {
        const count = workspaceActivity.get(activity.workspaceId) || 0;
        workspaceActivity.set(activity.workspaceId, count + 1);
      }
    });

    return Array.from(workspaceActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([workspaceId, activityCount]) => {
        const workspace = this.workspaces.get(workspaceId);
        return {
          workspaceId,
          name: workspace?.name || 'Unknown',
          activityCount
        };
      });
  }

  _getTopRatedPrompts(limit) {
    const allPrompts = [];

    for (const [_, library] of this.sharedLibraries) {
      allPrompts.push(...library.prompts.map(p => ({
        ...p,
        libraryId: library.libraryId,
        libraryName: library.name
      })));
    }

    return allPrompts
      .filter(p => p.totalRatings > 0)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit);
  }

  async _loadCollaborationData() {
    try {
      const stored = await chrome.storage.local.get('collaborationData');
      if (stored.collaborationData) {
        const data = stored.collaborationData;
        this.workspaces = new Map(data.workspaces || []);
        this.sharedConversations = new Map(data.sharedConversations || []);
        this.sharedLibraries = new Map(data.sharedLibraries || []);
        this.comments = new Map(data.comments || []);
        this.activityFeed = data.activityFeed || [];
        this.permissions = new Map(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to load collaboration data:', error);
    }
  }

  async _saveCollaborationData() {
    try {
      const data = {
        workspaces: Array.from(this.workspaces.entries()),
        sharedConversations: Array.from(this.sharedConversations.entries()),
        sharedLibraries: Array.from(this.sharedLibraries.entries()),
        comments: Array.from(this.comments.entries()),
        activityFeed: this.activityFeed,
        permissions: Array.from(this.permissions.entries())
      };
      await chrome.storage.local.set({ collaborationData: data });
    } catch (error) {
      console.error('Failed to save collaboration data:', error);
    }
  }
}

// Make agent available globally
if (typeof window !== 'undefined') {
  window.CollaborationAgent = CollaborationAgent;
}

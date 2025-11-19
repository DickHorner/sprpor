/**
 * UIUXEnhancementAgent
 * 
 * Manages UI/UX improvements including:
 * - Redesigned settings panel with tabs and search
 * - Improved folder management UI
 * - Better conversation preview/thumbnails
 * - Dark/light theme refinements
 * - Accessibility improvements (ARIA labels, keyboard navigation)
 */

class UIUXEnhancementAgent extends BaseAgent {
    constructor() {
        super(
            'uiux-enhancement',
            'UI/UX Enhancement',
            'Manages and applies UI/UX improvements across the application',
            ['ui', 'ux', 'accessibility', 'theme']
        );
        
        this.enhancements = new Map();
        this.accessibilityMode = false;
        this.keyboardShortcuts = new Map();
    }
    
    async initialize() {
        await super.initialize();
        
        // Apply enhancements
        await this.applyEnhancements();
        
        // Set up keyboard navigation
        this.setupKeyboardNavigation();
        
        this.logInfo('UI/UX Enhancement Agent initialized');
    }
    
    async execute(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'enhanceSettings':
                return await this.enhanceSettingsPanel();
            case 'enhanceFolders':
                return await this.enhanceFolderManagement();
            case 'enhancePreviews':
                return await this.enhanceConversationPreviews();
            case 'refineTheme':
                return await this.refineTheme(data.theme);
            case 'improveAccessibility':
                return await this.improveAccessibility();
            case 'registerShortcut':
                return this.registerKeyboardShortcut(data.key, data.callback, data.description);
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }
    
    /**
     * Apply all UI/UX enhancements
     */
    async applyEnhancements() {
        await this.enhanceSettingsPanel();
        await this.enhanceFolderManagement();
        await this.enhanceConversationPreviews();
        await this.improveAccessibility();
        
        this.eventBus.emit('UIUX_ENHANCEMENTS_APPLIED', {
            count: this.enhancements.size
        });
    }
    
    /**
     * Enhance settings panel with tabs and search
     */
    async enhanceSettingsPanel() {
        const enhancement = {
            name: 'Enhanced Settings Panel',
            applied: false,
            features: []
        };
        
        // Add CSS for enhanced settings
        const style = document.createElement('style');
        style.id = 'enhanced-settings-style';
        style.textContent = `
            .settings-tabs {
                display: flex;
                border-bottom: 2px solid #e0e0e0;
                margin-bottom: 20px;
                gap: 10px;
            }
            
            .settings-tab {
                padding: 10px 20px;
                cursor: pointer;
                border: none;
                background: none;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                transition: all 0.2s;
                border-bottom: 2px solid transparent;
                margin-bottom: -2px;
            }
            
            .settings-tab:hover {
                color: #333;
                background: #f5f5f5;
            }
            
            .settings-tab.active {
                color: #10a37f;
                border-bottom-color: #10a37f;
            }
            
            .settings-search {
                width: 100%;
                padding: 10px;
                margin-bottom: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 5px;
                font-size: 14px;
            }
            
            .settings-search:focus {
                outline: none;
                border-color: #10a37f;
                box-shadow: 0 0 0 2px rgba(16, 163, 127, 0.1);
            }
            
            .settings-panel {
                display: none;
            }
            
            .settings-panel.active {
                display: block;
            }
            
            .settings-group {
                margin-bottom: 30px;
            }
            
            .settings-group-title {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #333;
            }
            
            .setting-item {
                padding: 15px;
                border: 1px solid #e0e0e0;
                border-radius: 5px;
                margin-bottom: 10px;
                transition: all 0.2s;
            }
            
            .setting-item:hover {
                background: #f9f9f9;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .setting-item.highlight {
                background: #fffbeb;
                border-color: #fbbf24;
            }
        `;
        
        if (!document.getElementById('enhanced-settings-style')) {
            document.head.appendChild(style);
            enhancement.features.push('Added enhanced settings CSS');
        }
        
        enhancement.applied = true;
        this.enhancements.set('settings', enhancement);
        
        return enhancement;
    }
    
    /**
     * Enhance folder management UI
     */
    async enhanceFolderManagement() {
        const enhancement = {
            name: 'Enhanced Folder Management',
            applied: false,
            features: []
        };
        
        const style = document.createElement('style');
        style.id = 'enhanced-folders-style';
        style.textContent = `
            .folder-item {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s;
                gap: 8px;
            }
            
            .folder-item:hover {
                background: #f0f0f0;
            }
            
            .folder-item.active {
                background: #e6f7f4;
                border-left: 3px solid #10a37f;
            }
            
            .folder-icon {
                font-size: 16px;
            }
            
            .folder-name {
                flex: 1;
                font-size: 14px;
            }
            
            .folder-count {
                font-size: 12px;
                color: #666;
                background: #e0e0e0;
                padding: 2px 8px;
                border-radius: 10px;
            }
            
            .folder-actions {
                display: none;
                gap: 5px;
            }
            
            .folder-item:hover .folder-actions {
                display: flex;
            }
            
            .folder-action-btn {
                padding: 4px 8px;
                border: none;
                background: #e0e0e0;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            
            .folder-action-btn:hover {
                background: #d0d0d0;
            }
            
            .folder-drag-handle {
                cursor: move;
                opacity: 0.3;
            }
            
            .folder-item:hover .folder-drag-handle {
                opacity: 1;
            }
        `;
        
        if (!document.getElementById('enhanced-folders-style')) {
            document.head.appendChild(style);
            enhancement.features.push('Added enhanced folder CSS');
        }
        
        enhancement.applied = true;
        this.enhancements.set('folders', enhancement);
        
        return enhancement;
    }
    
    /**
     * Enhance conversation previews
     */
    async enhanceConversationPreviews() {
        const enhancement = {
            name: 'Enhanced Conversation Previews',
            applied: false,
            features: []
        };
        
        const style = document.createElement('style');
        style.id = 'enhanced-previews-style';
        style.textContent = `
            .conversation-preview {
                display: flex;
                flex-direction: column;
                padding: 12px;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                transition: all 0.2s;
                cursor: pointer;
            }
            
            .conversation-preview:hover {
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                transform: translateY(-2px);
            }
            
            .preview-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .preview-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                flex: 1;
            }
            
            .preview-date {
                font-size: 12px;
                color: #666;
            }
            
            .preview-content {
                font-size: 13px;
                color: #666;
                line-height: 1.5;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                margin-bottom: 8px;
            }
            
            .preview-footer {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .preview-tag {
                font-size: 11px;
                padding: 3px 8px;
                background: #e6f7f4;
                color: #10a37f;
                border-radius: 10px;
            }
            
            .preview-badge {
                font-size: 11px;
                padding: 3px 8px;
                background: #f0f0f0;
                color: #666;
                border-radius: 10px;
            }
            
            .preview-thumbnail {
                width: 100%;
                height: 120px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 5px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                margin-bottom: 8px;
            }
        `;
        
        if (!document.getElementById('enhanced-previews-style')) {
            document.head.appendChild(style);
            enhancement.features.push('Added enhanced preview CSS');
        }
        
        enhancement.applied = true;
        this.enhancements.set('previews', enhancement);
        
        return enhancement;
    }
    
    /**
     * Refine theme (dark/light)
     */
    async refineTheme(theme = 'light') {
        const refinements = {
            theme: theme,
            applied: []
        };
        
        if (theme === 'dark') {
            const darkStyle = document.createElement('style');
            darkStyle.id = 'dark-theme-refinements';
            darkStyle.textContent = `
                body.dark-mode .settings-tab {
                    color: #ccc;
                }
                
                body.dark-mode .settings-tab:hover {
                    color: #fff;
                    background: #2a2a2a;
                }
                
                body.dark-mode .settings-tab.active {
                    color: #10a37f;
                }
                
                body.dark-mode .settings-search {
                    background: #2a2a2a;
                    border-color: #444;
                    color: #fff;
                }
                
                body.dark-mode .folder-item:hover {
                    background: #2a2a2a;
                }
                
                body.dark-mode .conversation-preview {
                    background: #1a1a1a;
                    border-color: #333;
                }
                
                body.dark-mode .conversation-preview:hover {
                    background: #2a2a2a;
                }
            `;
            
            if (!document.getElementById('dark-theme-refinements')) {
                document.head.appendChild(darkStyle);
                refinements.applied.push('Dark theme refinements');
            }
        }
        
        return refinements;
    }
    
    /**
     * Improve accessibility
     */
    async improveAccessibility() {
        const improvements = {
            applied: [],
            ariaLabels: 0,
            keyboardNav: 0
        };
        
        // Add ARIA labels to interactive elements
        document.querySelectorAll('button:not([aria-label])').forEach(button => {
            const text = button.textContent.trim() || button.title || 'Button';
            button.setAttribute('aria-label', text);
            improvements.ariaLabels++;
        });
        
        document.querySelectorAll('input:not([aria-label])').forEach(input => {
            const label = input.placeholder || input.name || 'Input field';
            input.setAttribute('aria-label', label);
            improvements.ariaLabels++;
        });
        
        // Add role attributes
        document.querySelectorAll('.modal').forEach(modal => {
            if (!modal.getAttribute('role')) {
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
                improvements.applied.push('Added dialog roles');
            }
        });
        
        // Add focus indicators
        const focusStyle = document.createElement('style');
        focusStyle.id = 'accessibility-focus-style';
        focusStyle.textContent = `
            *:focus {
                outline: 2px solid #10a37f;
                outline-offset: 2px;
            }
            
            *:focus:not(:focus-visible) {
                outline: none;
            }
            
            *:focus-visible {
                outline: 2px solid #10a37f;
                outline-offset: 2px;
            }
            
            .skip-link {
                position: absolute;
                top: -40px;
                left: 0;
                background: #10a37f;
                color: white;
                padding: 8px;
                text-decoration: none;
                z-index: 100;
            }
            
            .skip-link:focus {
                top: 0;
            }
        `;
        
        if (!document.getElementById('accessibility-focus-style')) {
            document.head.appendChild(focusStyle);
            improvements.applied.push('Added focus indicators');
        }
        
        this.accessibilityMode = true;
        this.eventBus.emit('ACCESSIBILITY_IMPROVED', improvements);
        
        return improvements;
    }
    
    /**
     * Set up keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const handler = this.keyboardShortcuts.get(e.key);
            if (handler && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handler.callback();
            }
        });
        
        // Default shortcuts
        this.registerKeyboardShortcut('/', () => {
            const searchInput = document.querySelector('.settings-search');
            if (searchInput) searchInput.focus();
        }, 'Focus search');
        
        this.registerKeyboardShortcut('Escape', () => {
            const modal = document.querySelector('.modal:not([style*="display: none"])');
            if (modal) {
                const closeBtn = modal.querySelector('.close, .modal-close');
                if (closeBtn) closeBtn.click();
            }
        }, 'Close modal');
    }
    
    /**
     * Register keyboard shortcut
     */
    registerKeyboardShortcut(key, callback, description) {
        this.keyboardShortcuts.set(key, { callback, description });
        return { success: true, key, description };
    }
}

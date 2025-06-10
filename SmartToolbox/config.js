const CONFIG = {
    API: {
        OPENAI_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
        API_KEY: 'API KEY', // TODO: Move to environment variable
        MAX_RETRIES: 3,
        TIMEOUT: 30000,
        DEFAULT_MODEL: 'gpt-4',
        DEFAULT_TEMPERATURE: 0.7
    },
    
    UI: {
        BUTTON_WIDTH: 85,
        BUTTON_HEIGHT: 85,
        STEPPER_HEIGHT: 30,
        ANIMATION_DURATION: 300,
        TOOLTIP_DELAY: 1500,
        MAX_PRIMARY_TOOLS: 8,
        MAX_SECONDARY_TOOLS: 10
    },
    
    SELECTORS: {
        TOOLBAR: '.tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle',
        PROJECTS_PANEL: '.projects-panel',
        START_BUTTON: '.start-project',
        DROPDOWN_ITEMS: '[class^="dropdown-item"]',
        QUICK_MENUS: '.quick-menus'
    },
    
    PERFORMANCE: {
        DEBOUNCE_DELAY: 1000,
        REFRESH_TIMEOUT: 300,
        STEP_TRANSITION_DELAY: 500
    },
    
    DEBUG: {
        ENABLED: true,
        VERBOSE_LOGGING: false
    }
};

// Export for global access
window.CONFIG = CONFIG;

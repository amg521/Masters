// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Modular LLM-integrated AUI framework
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @resource     popupCSS https://raw.githubusercontent.com/amg521/Masters/main/styles/popup.css
// @resource     toolboxCSS https://raw.githubusercontent.com/amg521/Masters/main/styles/toolbox.css
// ==/UserScript==

(function() {
    'use strict';

    // Load external dependencies
    const loadScript = (url) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                onload: response => {
                    if (response.status === 200) {
                        eval(response.responseText);
                        resolve();
                    } else {
                        reject(new Error(`Failed to load: ${url}`));
                    }
                },
                onerror: reject
            });
        });
    };

    const baseUrl = 'https://raw.githubusercontent.com/amg521/Masters/main/';
    
    // Load all modules in order
    Promise.all([
        loadScript(baseUrl + 'config.js'),
        loadScript(baseUrl + 'utils.js'),
        loadScript(baseUrl + 'api-client.js'),
        loadScript(baseUrl + 'data/tool-ontology.js'),
        loadScript(baseUrl + 'modules/context-of-use.js'),
        loadScript(baseUrl + 'modules/task-model.js'),
        loadScript(baseUrl + 'modules/abstract-ui.js'),
        loadScript(baseUrl + 'modules/concrete-ui.js')
    ]).then(() => {
        // Inject styles
        GM_addStyle(POPUP_STYLES);
        GM_addStyle(TOOLBOX_STYLES);
        
        // Initialize the application
        new AdaptiveUIFramework();
    }).catch(error => {
        console.error('Failed to load framework:', error);
    });

    // Main Application Framework
    class AdaptiveUIFramework {
        constructor() {
            this.apiClient = new APIClient();
            this.modules = {};
            this.init();
        }

        async init() {
            try {
                // Initialize modules with dependencies
                this.modules.contextOfUse = new ContextOfUseModule(this.apiClient);
                this.modules.taskModel = new TaskModelModule(this.apiClient, TOOL_ONTOLOGY);
                this.modules.abstractUI = new AbstractUIModule(TOOL_ONTOLOGY);
                this.modules.concreteUI = new ConcreteUIModule();
                
                this.waitForSelfCADReady();
            } catch (error) {
                console.error('Framework initialization failed:', error);
            }
        }

        waitForSelfCADReady() {
            const checkReady = setInterval(() => {
                const toolbar = document.querySelector(CONFIG.SELECTORS.TOOLBAR);
                const projectsPanel = document.querySelector(CONFIG.SELECTORS.PROJECTS_PANEL);
                
                if (toolbar && projectsPanel && projectsPanel.classList.contains('hidden')) {
                    clearInterval(checkReady);
                    this.startAdaptiveInterface(toolbar);
                }
            }, 500);
        }

        async startAdaptiveInterface(targetDiv) {
            try {
                // 1. Capture user context
                const userContext = await this.modules.contextOfUse.captureUserIntent();
                
                // 2. Generate task model
                const taskModel = await this.modules.taskModel.generateTaskModel(userContext);
                
                // 3. Create UI specification
                const uiSpecification = this.modules.abstractUI.generateUISpecification(taskModel);
                
                // 4. Render adaptive interface
                this.modules.concreteUI.renderAdaptiveInterface(uiSpecification, targetDiv, taskModel);
                
                console.log('Adaptive UI Framework successfully initialized');
            } catch (error) {
                console.error('Failed to start adaptive interface:', error);
            }
        }
    }

    // Make framework globally available for debugging
    window.AdaptiveUIFramework = AdaptiveUIFramework;
})();

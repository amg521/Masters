class ContextOfUseModule {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.currentPopup = null;
    }

    async captureUserIntent() {
        return new Promise((resolve) => {
            this.createContextPopup(resolve);
        });
    }

    createContextPopup(onComplete) {
        // Remove any existing popup
        if (this.currentPopup) {
            this.currentPopup.remove();
        }

        const popupHost = Utils.createElement('div');
        document.body.appendChild(popupHost);
        
        const shadow = popupHost.attachShadow({mode: 'open'});
        shadow.innerHTML = `
            <style>${POPUP_STYLES}</style>
            ${this.getPopupHTML()}
        `;

        this.currentPopup = popupHost;
        this.attachPopupEventListeners(shadow, onComplete);
    }

    getPopupHTML() {
        return `
            <div class="container">
                <div class="close-button">×</div>
                <h1>Let AI personalize your toolbar</h1>
                <p>Don't worry- the default toolbar will be untouched</p>

                <label for="build">What would you like to build today?</label>
                <input type="text" id="build" placeholder="e.g. a door hinge" />

                <label for="help">How can we best help you?</label>
                <select id="help">
                    <option>I'd like to be guided through every step</option>
                    <option>I'd like to choose from a set of approaches</option>
                    <option>I'd like to choose my own approach</option>
                </select>

                <div id="dynamic-section"></div>

                <button class="button">Generate smart toolbar <span style="font-size: 16px; margin-left: 8px;">✨</span></button>
            </div>
        `;
    }

    attachPopupEventListeners(shadow, onComplete) {
        const buildInput = shadow.getElementById('build');
        const helpSelect = shadow.getElementById('help');
        const dynamicSection = shadow.getElementById('dynamic-section');
        const generateButton = shadow.querySelector('.button');
        const closeButton = shadow.querySelector('.close-button');

        let generatedApproaches = [];
        let previousSelection = helpSelect.value;
        let previousBuildInput = buildInput.value;

        // Close button functionality
        closeButton.addEventListener('click', () => {
            this.currentPopup.remove();
        });

        // Dynamic section updates
        const updateDynamicSection = Utils.debounce(async () => {
            const currentSelection = helpSelect.value;
            const currentBuildInput = buildInput.value;

            if (currentSelection !== previousSelection ||
                (currentSelection.includes('set of approaches') && currentBuildInput !== previousBuildInput)) {

                previousSelection = currentSelection;
                previousBuildInput = currentBuildInput;

                dynamicSection.innerHTML = '';

                if (currentSelection.includes('set of approaches')) {
                    await this.handleApproachesSelection(dynamicSection, currentBuildInput || "a generic object");
                } else if (currentSelection.includes('own approach')) {
                    this.handleCustomApproach(dynamicSection);
                }
            }
        }, CONFIG.PERFORMANCE.DEBOUNCE_DELAY);

        helpSelect.addEventListener('change', updateDynamicSection);
        buildInput.addEventListener('input', updateDynamicSection);

        // Handle radio button exclusivity
        dynamicSection.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const radios = dynamicSection.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    radio.checked = radio === e.target;
                });
            }
        });

        // Generate button handler
        generateButton.addEventListener('click', async () => {
            const result = await this.processUserInput(shadow, generatedApproaches);
            this.currentPopup.remove();
            onComplete(result);
        });

        // Initialize first state
        updateDynamicSection();
    }

    async handleApproachesSelection(dynamicSection, userBuildInput) {
        dynamicSection.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

        try {
            const approaches = await this.apiClient.generateApproaches(userBuildInput);
            dynamicSection.innerHTML = '';

            approaches.forEach((item, index) => {
                const optionDiv = Utils.createElement('div', {
                    className: 'checkbox',
                    innerHTML: `
                        <input type="radio" name="approach" id="option${index + 1}" ${index === 0 ? 'checked' : ''}>
                        <label for="option${index + 1}">
                            <span>Option ${index + 1}</span><br>
                            <small>${item.approach}</small>
                        </label>
                    `
                });
                dynamicSection.appendChild(optionDiv);
            });

            return approaches;
        } catch (error) {
            console.error("Error generating approaches:", error);
            return this.apiClient.getDefaultApproaches();
        }
    }

    handleCustomApproach(dynamicSection) {
        dynamicSection.innerHTML = `
            <label for="approach">My approach will be to...</label>
            <textarea id="approach" placeholder="e.g. Create hinge parts using basic shapes like cylinders and cubes, then combine them."></textarea>
        `;
    }

    async processUserInput(shadow, generatedApproaches) {
        const buildInput = shadow.getElementById('build');
        const helpSelect = shadow.getElementById('help');
        const dynamicSection = shadow.getElementById('dynamic-section');

        const objectToMake = Utils.sanitizeInput(buildInput.value) || "a generic object";
        let userApproach = "";

        if (helpSelect.value.includes('guided')) {
            userApproach = "I'd like to be guided through every step";
        } else if (helpSelect.value.includes('set of approaches')) {
            const selectedRadio = dynamicSection.querySelector('input[type="radio"]:checked');
            if (selectedRadio && generatedApproaches) {
                const index = parseInt(selectedRadio.id.replace('option', '')) - 1;
                userApproach = generatedApproaches[index]?.approach || "Using a combined approach of basic shapes";
            }
        } else if (helpSelect.value.includes('own approach')) {
            const approachTextarea = dynamicSection.querySelector('#approach');
            userApproach = Utils.sanitizeInput(approachTextarea?.value) || "Creating using my own custom approach";
        }

        return {
            objectToMake,
            userApproach,
            guidanceLevel: helpSelect.value
        };
    }

    async checkForAmbiguity(userInput) {
        // Simple heuristic for ambiguous terms
        const ambiguousTerms = ['plane', 'table', 'box', 'ring', 'cup', 'bowl'];
        return ambiguousTerms.some(term => userInput.toLowerCase().includes(term));
    }
}

// Make available globally
window.ContextOfUseModule = ContextOfUseModule;

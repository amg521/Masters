// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows AI configuration popup first, then loads smart toolbox with drag-scroll functionality
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Inject Inter font globally
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
    `);

    // Global variables
    let toolboxData = null;
    let actionPlanData = null;
    let currentStepIndex = 0;

    // Fetch the toolbox JSON from GitHub
    const fetchToolboxData = async () => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://raw.githubusercontent.com/amg521/Masters/refs/heads/main/SmartToolbox/SelfCADMapping.json",
                onload: function(response) {
                    if (response.status === 200) {
                        try {
                            const data = JSON.parse(response.responseText);
                            resolve(data);
                        } catch (e) {
                            reject("Error parsing JSON: " + e.message);
                        }
                    } else {
                        reject("Failed to load toolbox data: " + response.status);
                    }
                },
                onerror: function(error) {
                    reject("Failed to fetch toolbox data: " + error);
                }
            });
        });
    };

    // Function to call ChatGPT API for generating approaches
    const generateApproaches = async (userBuildInput) => {
        try {
            // Prepare the prompt for ChatGPT
            const prompt = `
                Generate 3 different approaches for building "${userBuildInput}" using CAD tools.
                Use the following list of tools as reference:
                ${JSON.stringify(toolboxData)}

                Format your response as a JSON array with 3 objects, each with a single property 'approach'.
                Each approach description must be maximum 83 characters.

                Example format:
                [
                    {"approach": "First approach description (max 83 chars)"},
                    {"approach": "Second approach description (max 83 chars)"},
                    {"approach": "Third approach description (max 83 chars)"}
                ]
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer API_KEY'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(`API Error: ${data.error.message}`);
            }

            // Parse the JSON response from the API
            const content = data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error("Error generating approaches:", error);
            // Return default approaches in case of error
            return [
                {"approach": "Error getting AI suggestions. Create using basic shapes then combine."},
                {"approach": "Error getting AI suggestions. Use 2D sketches and extrude into 3D."},
                {"approach": "Error getting AI suggestions. Sculpt from a basic shape."}
            ];
        }
    };

    // Function to generate action plan based on user selections
    const generateActionPlan = async (objectToMake, userApproach) => {
        try {
            // Prepare the prompt for ChatGPT - request structured JSON with button IDs
            const prompt = `
                I want to create "${objectToMake}" using SelfCAD. My preferred approach is: "${userApproach}".

                Here are all the tools available in SelfCAD that I can use:
                ${JSON.stringify(toolboxData)}

                Please respond with a JSON object that contains:
                1. An array of steps to follow to create the object
                2. An ordered list of tools that will be used

                Each step must include:
                - step_number: The step number (starting at 1)
                - description: A clear description of what to do
                - tools: An array of objects containing tool names and IDs needed for this step, exactly matching from the provided tool list
                  Each tool object needs both "name" and "id" properties from the tool list

                Example JSON format:
                {
                  "plan": [
                    {
                      "step_number": 1,
                      "description": "Create a cube as the base for the table",
                      "tools": [
                        {"name": "Cube", "id": "btn_cube"},
                        {"name": "Scale", "id": "btn_scale"}
                      ]
                    },
                    {
                      "step_number": 2,
                      "description": "Add cylinders for the table legs",
                      "tools": [
                        {"name": "Cylinder", "id": "btn_cylinder"},
                        {"name": "Move", "id": "btn_move"}
                      ]
                    }
                  ],
                  "tool_order": [
                    {"name": "Cube", "id": "btn_cube"},
                    {"name": "Scale", "id": "btn_scale"},
                    {"name": "Cylinder", "id": "btn_cylinder"},
                    {"name": "Move", "id": "btn_move"},
                    {"name": "Combine", "id": "btn_combine"}
                  ]
                }

                Make sure all tool names and IDs match exactly with those in the provided list.
                Your response should be only the JSON object, with no additional text.
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer API_KEY'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(`API Error: ${data.error.message}`);
            }

            // Parse the JSON response from the API
            const content = data.choices[0].message.content;
            const parsedContent = JSON.parse(content);
            console.log("Received action plan:", parsedContent);
            return parsedContent;
        } catch (error) {
            console.error("Error generating action plan:", error);
            // Return a minimal fallback plan with IDs
            return {
                "plan": [
                    {
                        "step_number": 1,
                        "description": "Error generating detailed plan. Start by creating basic shapes needed for your model.",
                        "tools": [
                            {"name": "Cube", "id": "btn_cube"},
                            {"name": "Sphere", "id": "btn_sphere"},
                            {"name": "Cylinder", "id": "btn_cylinder"}
                        ]
                    }
                ],
                "tool_order": [
                    {"name": "Cube", "id": "btn_cube"},
                    {"name": "Sphere", "id": "btn_sphere"},
                    {"name": "Cylinder", "id": "btn_cylinder"},
                    {"name": "Move", "id": "btn_move"},
                    {"name": "Scale", "id": "btn_scale"}
                ]
            };
        }
    };

    // Initialize the app by fetching the toolbox data first
    const initializeApp = async () => {
        try {
            toolboxData = await fetchToolboxData();
            waitForStartButton();
        } catch (error) {
            console.error("Initialization error:", error);
            alert("Error initializing the application: " + error);
        }
    };

    const waitForStartButton = () => {
        const checkButton = setInterval(() => {
            const startButton = document.querySelector('.start-project');
            if (startButton) {
                clearInterval(checkButton);
                startButton.addEventListener('click', createPopup);
            }
        }, 500);
    };

    const createPopup = () => {
        const popupHost = document.createElement('div');
        document.body.appendChild(popupHost);
        const shadow = popupHost.attachShadow({mode: 'open'});

        // Popup HTML and CSS
        shadow.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    font-family: 'Inter', sans-serif;
                }

                .container {
                    background-color: #fff;
                    padding: 8px 24px;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    width: 380px;
                    border: 1px solid #D9D9D9;
                    position: relative;
                }

                h1 {
                    font-size: 24px;
                    font-weight: 600;
                    letter-spacing: -0.02em;
                    line-height: 120%;
                    margin-bottom: 4px;
                    background: linear-gradient(90deg, #14708E 0%, #26C9FF 69%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                p {
                    font-size: 16px;
                    font-weight: 400;
                    color: #757575;
                    margin-top: 4px;
                    margin-bottom: 24px;
                }

                label {
                    display: block;
                    font-size: 16px;
                    margin-bottom: 8px;
                    color: #464646;
                }

                input, select, textarea {
                    width: 100%;
                    height: 40px;
                    padding: 8px;
                    margin-bottom: 24px;
                    border: 1px solid #26C9FF;
                    border-radius: 8px;
                    box-sizing: border-box;
                    font-size: 16px;
                }
                select {
                    margin-bottom: 8px;
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    font-weight: 400;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 16px center;
                    background-size: 20px;
                    padding-right: 44px;
                }
                .button {
                    background: linear-gradient(90deg, #14708E 0%, #26C9FF 69%);
                    color: white;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    width: 100%;
                    font-weight: 600;
                    font-size: 16px;
                    height: 44px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    margin-top: 24px;
                    margin-bottom: 24px;
                }
                .button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                #build::placeholder,
                textarea#approach::placeholder {
                    color: #B3B3B3;
                }

                .button img {
                    height: 16px;
                    width: 16px;
                }

                .checkbox {
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 24px;
                }
                .checkbox input {
                    width: 16px;
                    height: 16px;
                    margin-right: 12px;
                    border-radius: 4px;
                    background-color: #464646;
                    border: 1px solid #464646;
                    align-self: flex-start;
                }

                .checkbox label {
                    font-size: 16px;
                    margin: 0;
                }

                .checkbox label span {
                    color: #464646;
                    font-weight: 300;
                }
                .checkbox small {
                    color: #757575;
                    font-size: 16px;
                    display: block;
                    margin-top: 4px;
                }

                .checkbox input:checked + label span {
                    font-weight: 600;
                }

                #build, #help {
                    padding-left: 16px;
                    color: #464646;
                }
                textarea#approach {
                    height: 80px;
                    font-family: 'Inter', sans-serif;
                    font-size: 16px;
                    padding-left: 16px;
                    margin-bottom: 8px;
                }

                #dynamic-section {
                    margin-top: 12px;
                }

                .loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100px;
                }

                .loading-spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    border-radius: 50%;
                    border-top: 4px solid #26C9FF;
                    width: 30px;
                    height: 30px;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .button-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s ease-in-out infinite;
                }
            </style>

            <div class="container">
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

                <button class="button">Generate smart toolbar <img src="sparkle-icon.png" alt="sparkle" /></button>
            </div>
        `;

        // Add popup interactivity
        const helpSelect = shadow.getElementById('help');
        const buildInput = shadow.getElementById('build');
        const dynamicSection = shadow.getElementById('dynamic-section');
        const generateButton = shadow.querySelector('.button');

        // Track previous selection to detect changes
        let previousSelection = helpSelect.value;
        let previousBuildInput = buildInput.value;
        let generatedApproaches = [];

        // Dynamic section handler
        const updateDynamicSection = async () => {
            const currentSelection = helpSelect.value;
            const currentBuildInput = buildInput.value;

            // Only regenerate if selection changed or build input changed while on "set of approaches"
            if (currentSelection !== previousSelection ||
                (currentSelection.includes('set of approaches') && currentBuildInput !== previousBuildInput)) {

                previousSelection = currentSelection;
                previousBuildInput = currentBuildInput;

                dynamicSection.innerHTML = '';

                if (currentSelection.includes('set of approaches')) {
                    // Show loading spinner
                    dynamicSection.innerHTML = `
                        <div class="loading">
                            <div class="loading-spinner"></div>
                        </div>
                    `;

                    // Get what the user wants to build
                    const userBuildInput = currentBuildInput.trim() || "a generic object";

                    try {
                        // Call ChatGPT API to generate approaches
                        generatedApproaches = await generateApproaches(userBuildInput);

                        // Remove loading spinner and add the generated approaches
                        dynamicSection.innerHTML = '';

                        // Create radio buttons for each approach
                        generatedApproaches.forEach((item, index) => {
                            const optionId = `option${index + 1}`;
                            const isChecked = index === 0 ? 'checked' : '';

                            const optionDiv = document.createElement('div');
                            optionDiv.className = 'checkbox';
                            optionDiv.innerHTML = `
                                <input type="radio" name="approach" id="${optionId}" ${isChecked}>
                                <label for="${optionId}">
                                    <span>Option ${index + 1}</span><br>
                                    <small>${item.approach}</small>
                                </label>
                            `;

                            dynamicSection.appendChild(optionDiv);
                        });
                    } catch (error) {
                        // Handle errors by showing default options
                        generatedApproaches = [
                            {"approach": "Create parts using basic shapes like cylinders and cubes, then combine them."},
                            {"approach": "Draw 2D sketches, then extrude them into 3D objects."},
                            {"approach": "Sculpt and refine the geometry from a basic shape using sculpting tools."}
                        ];

                        dynamicSection.innerHTML = `
                            <div class="checkbox">
                                <input type="radio" name="approach" id="option1" checked>
                                <label for="option1"><span>Option 1</span><br><small>${generatedApproaches[0].approach}</small></label>
                            </div>
                            <div class="checkbox">
                                <input type="radio" name="approach" id="option2">
                                <label for="option2"><span>Option 2</span><br><small>${generatedApproaches[1].approach}</small></label>
                            </div>
                            <div class="checkbox">
                                <input type="radio" name="approach" id="option3">
                                <label for="option3"><span>Option 3</span><br><small>${generatedApproaches[2].approach}</small></label>
                            </div>
                        `;

                        console.error("Error generating approaches:", error);
                    }
                } else if (currentSelection.includes('own approach')) {
                    dynamicSection.innerHTML = `
                        <label for="approach">My approach will be to...</label>
                        <textarea id="approach" placeholder="e.g. Create hinge parts using basic shapes like cylinders and cubes, then combine them."></textarea>
                    `;
                }

                dynamicSection.style.marginBottom = '24px';
            }
        };

        // Listen for changes to help select dropdown
        helpSelect.addEventListener('change', updateDynamicSection);

        // Listen for changes to build input when in "set of approaches" mode
        buildInput.addEventListener('input', () => {
            if (helpSelect.value.includes('set of approaches')) {
                // Use a debounce to avoid making too many API calls while typing
                if (buildInput.debounceTimeout) {
                    clearTimeout(buildInput.debounceTimeout);
                }
                buildInput.debounceTimeout = setTimeout(updateDynamicSection, 1000);
            }
        });

        // Fixed radio button exclusivity handler
        dynamicSection.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                const radios = dynamicSection.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    radio.checked = radio === e.target;
                });
            }
        });

        // Initialize first state
        updateDynamicSection();

        // Button click handler
        generateButton.addEventListener('click', async () => {
            // Show loading spinner and disable button
            generateButton.disabled = true;
            const originalButtonContent = generateButton.innerHTML;
            generateButton.innerHTML = `<span class="button-spinner"></span> Generating...`;

            try {
                // Get the user's build object
                const objectToMake = buildInput.value.trim() || "a generic object";

                // Get the user's selected approach
                let userApproach = "";

                if (helpSelect.value.includes('guided')) {
                    userApproach = "I'd like to be guided through every step";
                }
                else if (helpSelect.value.includes('set of approaches')) {
                    // Find which radio button is checked
                    const selectedRadio = dynamicSection.querySelector('input[type="radio"]:checked');
                    if (selectedRadio) {
                        const index = parseInt(selectedRadio.id.replace('option', '')) - 1;
                        userApproach = generatedApproaches[index]?.approach || "Using a combined approach of basic shapes";
                    }
                }
                else if (helpSelect.value.includes('own approach')) {
                    const approachTextarea = dynamicSection.querySelector('#approach');
                    userApproach = approachTextarea ? approachTextarea.value.trim() : "";
                    if (!userApproach) {
                        userApproach = "Creating using my own custom approach";
                    }
                }

                // Generate action plan
                actionPlanData = await generateActionPlan(objectToMake, userApproach);

                // Reset current step index
                currentStepIndex = 0;

                // Remove popup
                popupHost.remove();

                // Initialize smart toolbox and action plan display
                initializeSmartToolbox();
            } catch (error) {
                console.error("Error processing request:", error);
                generateButton.innerHTML = originalButtonContent;
                generateButton.disabled = false;
                alert("Error generating plan. Please try again.");
            }
        });
    };

    function initializeSmartToolbox() {
        console.log("Smart toolbox script has started running.");

        // Variables for global access
        let targetDiv;
        let smartToolbox;
        let refreshTimeout;
        let actionPlanContainer;
        let stepButtonMap = new Map(); // Maps step index to button element

        // Create action plan display
        const createActionPlanDisplay = () => {
            actionPlanContainer = document.createElement('div');
            actionPlanContainer.id = "action-plan-container";
            actionPlanContainer.style.position = 'fixed';
            actionPlanContainer.style.bottom = '20px';
            actionPlanContainer.style.right = '20px';
            actionPlanContainer.style.width = '300px';
            actionPlanContainer.style.maxHeight = '400px';
            actionPlanContainer.style.backgroundColor = 'white';
            actionPlanContainer.style.border = '1px solid #D9D9D9';
            actionPlanContainer.style.borderRadius = '8px';
            actionPlanContainer.style.padding = '16px';
            actionPlanContainer.style.zIndex = '9996'; // Lower than toolbox but higher than content
            actionPlanContainer.style.overflow = 'auto';
            actionPlanContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            actionPlanContainer.style.fontFamily = "'Inter', sans-serif";
            actionPlanContainer.style.cursor = 'move'; // Indicate it's draggable

            const titleElement = document.createElement('h3');
            titleElement.textContent = 'AI Action Plan';
            titleElement.style.marginTop = '0';
            titleElement.style.marginBottom = '12px';
            titleElement.style.fontSize = '16px';
            titleElement.style.fontWeight = '600';
            titleElement.style.cursor = 'move';

            const stepsContainer = document.createElement('div');
            stepsContainer.id = 'action-steps-container';
            stepsContainer.style.fontSize = '14px';
            stepsContainer.style.lineHeight = '1.4';
            stepsContainer.style.color = '#464646';

            // Create numbered steps from the action plan data
            if (actionPlanData && actionPlanData.plan) {
                actionPlanData.plan.forEach((step, index) => {
                    const stepElement = document.createElement('div');
                    stepElement.classList.add('action-step');
                    stepElement.dataset.stepIndex = index;

                    // Create step heading with step number
                    const stepHeading = document.createElement('div');
                    stepHeading.style.fontWeight = 'bold';
                    stepHeading.style.marginBottom = '4px';
                    stepHeading.textContent = `Step ${step.step_number}:`;

                    // Create step description
                    const stepDescription = document.createElement('div');
                    stepDescription.innerHTML = step.description;

                    // Create step tools list
                    const stepTools = document.createElement('div');
                    stepTools.style.marginTop = '4px';
                    stepTools.style.fontSize = '12px';
                    stepTools.style.color = '#666';

                    if (step.tools && step.tools.length > 0) {
                        const toolNames = step.tools.map(tool => tool.name);
                        stepTools.textContent = `Tools: ${toolNames.join(', ')}`;
                    }

                    // Add all elements to the step container
                    stepElement.appendChild(stepHeading);
                    stepElement.appendChild(stepDescription);
                    stepElement.appendChild(stepTools);

                    stepElement.style.padding = '8px';
                    stepElement.style.borderRadius = '4px';
                    stepElement.style.marginBottom = '8px';

                    // Highlight the first step
                    if (index === 0) {
                        stepElement.style.backgroundColor = '#e6f7ff';
                        stepElement.style.border = '1px solid #91d5ff';
                    }

                    stepsContainer.appendChild(stepElement);
                });
            }

            // Add navigation buttons
            const navigationContainer = document.createElement('div');
            navigationContainer.style.display = 'flex';
            navigationContainer.style.justifyContent = 'space-between';
            navigationContainer.style.marginTop = '12px';

            const prevButton = document.createElement('button');
            prevButton.textContent = '← Previous';
            prevButton.style.backgroundColor = '#f0f0f0';
            prevButton.style.border = 'none';
            prevButton.style.padding = '6px 12px';
            prevButton.style.borderRadius = '4px';
            prevButton.style.cursor = 'pointer';
            prevButton.style.fontSize = '12px';
            prevButton.disabled = true;
            prevButton.style.opacity = '0.5';

            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next →';
            nextButton.style.backgroundColor = '#1890ff';
            nextButton.style.border = 'none';
            nextButton.style.padding = '6px 12px';
            nextButton.style.borderRadius = '4px';
            nextButton.style.cursor = 'pointer';
            nextButton.style.color = 'white';
            nextButton.style.fontSize = '12px';

            // Disable next button if there's only one step
            if (!actionPlanData || !actionPlanData.plan || actionPlanData.plan.length <= 1) {
                nextButton.disabled = true;
                nextButton.style.opacity = '0.5';
            }

            prevButton.addEventListener('click', () => {
                if (currentStepIndex > 0) {
                    updateCurrentStep(currentStepIndex - 1);
                }
            });

            nextButton.addEventListener('click', () => {
                if (actionPlanData && actionPlanData.plan && currentStepIndex < actionPlanData.plan.length - 1) {
                    updateCurrentStep(currentStepIndex + 1);
                }
            });

            navigationContainer.appendChild(prevButton);
            navigationContainer.appendChild(nextButton);

            const minimizeButton = document.createElement('button');
            minimizeButton.textContent = '−';
            minimizeButton.style.position = 'absolute';
            minimizeButton.style.top = '8px';
            minimizeButton.style.right = '8px';
            minimizeButton.style.backgroundColor = 'transparent';
            minimizeButton.style.border = 'none';
            minimizeButton.style.fontSize = '16px';
            minimizeButton.style.cursor = 'pointer';
            minimizeButton.style.width = '24px';
            minimizeButton.style.height = '24px';
            minimizeButton.style.borderRadius = '50%';
            minimizeButton.style.display = 'flex';
            minimizeButton.style.justifyContent = 'center';
            minimizeButton.style.alignItems = 'center';
            minimizeButton.style.zIndex = '1'; // Ensure it's above draggable area

            let isMinimized = false;
            minimizeButton.addEventListener('click', () => {
                if (isMinimized) {
                    stepsContainer.style.display = 'block';
                    navigationContainer.style.display = 'flex';
                    actionPlanContainer.style.height = 'auto';
                    minimizeButton.textContent = '−';
                } else {
                    stepsContainer.style.display = 'none';
                    navigationContainer.style.display = 'none';
                    actionPlanContainer.style.height = 'auto';
                    minimizeButton.textContent = '+';
                }
                isMinimized = !isMinimized;
            });

            actionPlanContainer.appendChild(titleElement);
            actionPlanContainer.appendChild(stepsContainer);
            actionPlanContainer.appendChild(navigationContainer);
            actionPlanContainer.appendChild(minimizeButton);

            document.body.appendChild(actionPlanContainer);

            // Make the action plan container draggable
            let isDragging = false;
            let offsetX, offsetY;

            const startDrag = (e) => {
                // Only initiate drag on heading or container itself (not on buttons or content)
                if (e.target === titleElement || e.target === actionPlanContainer) {
                    isDragging = true;
                    offsetX = e.clientX - actionPlanContainer.getBoundingClientRect().left;
                    offsetY = e.clientY - actionPlanContainer.getBoundingClientRect().top;
                    document.addEventListener('mousemove', dragMove);
                    document.addEventListener('mouseup', stopDrag);
                }
            };

            const dragMove = (e) => {
                if (isDragging) {
                    const x = e.clientX - offsetX;
                    const y = e.clientY - offsetY;

                    // Keep within window bounds
                    const maxX = window.innerWidth - actionPlanContainer.offsetWidth;
                    const maxY = window.innerHeight - actionPlanContainer.offsetHeight;

                    actionPlanContainer.style.left = `${Math.max(0, Math.min(maxX, x))}px`;
                    actionPlanContainer.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
                    actionPlanContainer.style.right = 'auto';
                    actionPlanContainer.style.bottom = 'auto';
                }
            };

            const stopDrag = () => {
                isDragging = false;
                document.removeEventListener('mousemove', dragMove);
                document.removeEventListener('mouseup', stopDrag);
            };

            actionPlanContainer.addEventListener('mousedown', startDrag);

            // Store reference to buttons for step navigation
            return {prevButton, nextButton};
        };

        // Function to update the current step
        const updateCurrentStep = (newIndex) => {
            if (!actionPlanData || !actionPlanData.plan) return;
            if (newIndex < 0 || newIndex >= actionPlanData.plan.length) return;

            // Update step index
            currentStepIndex = newIndex;

            // Update step highlighting in action plan
            const stepElements = document.querySelectorAll('.action-step');
            stepElements.forEach((el, idx) => {
                if (idx === currentStepIndex) {
                    el.style.backgroundColor = '#e6f7ff';
                    el.style.border = '1px solid #91d5ff';
                } else {
                    el.style.backgroundColor = 'transparent';
                    el.style.border = 'none';
                }
            });

            // Update button highlighting in toolbox
            if (smartToolbox) {
                const allButtons = smartToolbox.querySelectorAll('[data-tool-name], [data-tool-id]');
                allButtons.forEach(button => {
                    button.style.boxShadow = 'none';
                });

                // Get the current step's tools
                const currentStep = actionPlanData.plan[currentStepIndex];
                if (currentStep && currentStep.tools) {
                    // Highlight all buttons corresponding to tools in this step
                    currentStep.tools.forEach(tool => {
                        // Try to find by name first, then by ID
                        let toolButton = smartToolbox.querySelector(`[data-tool-name="${tool.name.toLowerCase()}"]`);
                        if (!toolButton) {
                            toolButton = smartToolbox.querySelector(`[data-tool-id="${tool.id}"]`);
                        }

                        if (toolButton) {
                            toolButton.style.boxShadow = '0 0 0 2px #1890ff';

                            // Scroll the first highlighted button into view if needed
                            if (toolButton === smartToolbox.querySelector(`[data-tool-name="${currentStep.tools[0].name.toLowerCase()}"]`) ||
                                toolButton === smartToolbox.querySelector(`[data-tool-id="${currentStep.tools[0].id}"]`)) {
                                if (toolButton.offsetLeft < smartToolbox.scrollLeft ||
                                    toolButton.offsetLeft + toolButton.offsetWidth > smartToolbox.scrollLeft + smartToolbox.offsetWidth) {
                                    smartToolbox.scrollLeft = toolButton.offsetLeft - 20;
                                }
                            }
                        }
                    });
                }
            }

            // Update navigation buttons
            const navContainer = document.querySelector('#action-plan-container');
            if (navContainer) {
                const prevButton = navContainer.querySelector('button:first-of-type');
                const nextButton = navContainer.querySelector('button:last-of-type');

                prevButton.disabled = currentStepIndex === 0;
                prevButton.style.opacity = currentStepIndex === 0 ? '0.5' : '1';

                nextButton.disabled = currentStepIndex === actionPlanData.plan.length - 1;
                nextButton.style.opacity = currentStepIndex === actionPlanData.plan.length - 1 ? '0.5' : '1';
            }
        };

        // MODIFIED: Added check for projects-panel.hidden
        const waitForTargetDiv = () => {
            targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
            const toolbar = document.getElementById("headerToolbarMenu");
            const projectsPanel = document.querySelector('.projects-panel'); // NEW
            const quickMenus = document.querySelector('.quick-menus'); // For toggle button placement

            // MODIFIED condition to check projects-panel state
            if (!targetDiv || !toolbar || !projectsPanel || !projectsPanel.classList.contains('hidden')) {
                console.log("Target div, toolbar, or projects panel not found/hidden. Retrying...");
                setTimeout(waitForTargetDiv, 500);
                return;
            }

            console.log("Target div and toolbar located.");
            createSmartToolbox(targetDiv, toolbar, quickMenus);

            // Create action plan display after smart toolbox is initialized
            if (actionPlanData) {
                const navButtons = createActionPlanDisplay();

                // Initialize step highlighting after both toolbox and action plan are created
                setTimeout(() => {
                    // Initial step highlighting
                    updateCurrentStep(0);
                }, 500);
            }
        };

        // Extract the repeated code into a function for populating the toolbox
        const populateSmartToolbox = (toolbox, sourceDiv) => {
            toolbox.innerHTML = ""; // clear previous content
            stepButtonMap.clear(); // Reset step-to-button mapping

            // Get the ordered list of tools from the action plan
            const relevantTools = new Set();
            const relevantToolIds = new Set();

            if (actionPlanData && actionPlanData.tool_order) {
                actionPlanData.tool_order.forEach(tool => {
                    relevantTools.add(tool.name.toLowerCase());
                    relevantToolIds.add(tool.id);
                });
            }

            // Fallback if tool_order is missing
            if (relevantTools.size === 0 && actionPlanData && actionPlanData.plan) {
                actionPlanData.plan.forEach(step => {
                    if (step.tools) {
                        step.tools.forEach(tool => {
                            relevantTools.add(tool.name.toLowerCase());
                            relevantToolIds.add(tool.id);
                        });
                    }
                });
            }

            // First, collect all relevant buttons in order
            const allButtons = [];

            // Create a map of tool names/ids to their order in the tool_order array
            const toolOrderMap = new Map();
            if (actionPlanData && actionPlanData.tool_order) {
                actionPlanData.tool_order.forEach((tool, index) => {
                    toolOrderMap.set(tool.name.toLowerCase(), index);
                    toolOrderMap.set(tool.id, index);
                });
            }

            // loop through children of the target toolbar
            Array.from(sourceDiv.children).forEach((child) => {
                const dropdownItems = child.querySelectorAll('[class^="dropdown-item"]');
                if (dropdownItems.length > 0) {
                    dropdownItems.forEach((dropdownItem) => {
                        const iconElement = dropdownItem.querySelector('span[class^="pull-left"][class*="selfcad-grey-"]');
                        const labelElement = dropdownItem.querySelector('span[class="inner pull-left"][rv-text="btn.labelText"]');

                        if (iconElement && labelElement) {
                            const buttonName = labelElement.textContent.trim();
                            const buttonId = getButtonIdFromClassList(dropdownItem);

                            // Skip if this tool is not in our relevantTools (not needed for the plan)
                            if (!relevantTools.has(buttonName.toLowerCase()) && !relevantToolIds.has(buttonId)) return;

                            const clonedDropdownItem = dropdownItem.cloneNode(true); // clone the dropdown item

                            // Add data attribute for the tool name and ID (useful for step tracking)
                            clonedDropdownItem.setAttribute('data-tool-name', buttonName.toLowerCase());
                            if (buttonId) {
                                clonedDropdownItem.setAttribute('data-tool-id', buttonId);
                            }

                            // Create stacked container for proper layout
                            const stackedContainer = document.createElement("div");
                            stackedContainer.style.display = "flex";
                            stackedContainer.style.flexDirection = "column";
                            stackedContainer.style.alignItems = "center";
                            stackedContainer.style.justifyContent = "center";
                            stackedContainer.style.height = "100%";
                            stackedContainer.style.padding = "4px 6px";

                            const clonedIcon = iconElement.cloneNode(true);
                            const clonedLabel = labelElement.cloneNode(true);

                            stackedContainer.appendChild(clonedIcon);
                            stackedContainer.appendChild(clonedLabel);

                            clonedDropdownItem.setAttribute('name', buttonName);
                            clonedDropdownItem.buttonName = buttonName; // Store for sorting later
                            clonedDropdownItem.buttonId = buttonId; // Store ID for sorting later
                            clonedDropdownItem.order = toolOrderMap.get(buttonName.toLowerCase()) || toolOrderMap.get(buttonId) || 999;

                            if (clonedLabel) {
                                const isDisabled = dropdownItem.classList.contains('disabled');
                                clonedLabel.style.color = isDisabled ? "rgb(158, 158, 158)" : "rgb(140, 187, 226)";
                                clonedLabel.style.visibility = "visible";
                                clonedLabel.style.opacity = "1";
                                clonedLabel.style.transition = "none";
                                clonedLabel.style.paddingTop = "6px";
                                clonedLabel.style.fontSize = "12px";
                                clonedLabel.style.whiteSpace = "nowrap";
                            }

                            clonedDropdownItem.innerHTML = "";
                            clonedDropdownItem.appendChild(stackedContainer);

                            clonedDropdownItem.style.display = "inline-flex";
                            clonedDropdownItem.style.flexDirection = "column";
                            clonedDropdownItem.style.alignItems = "center";
                            clonedDropdownItem.style.justifyContent = "center";
                            clonedDropdownItem.style.border = "1px solid #ddd";
                            clonedDropdownItem.style.backgroundColor = "#f9f9f9";
                            clonedDropdownItem.style.padding = "0";
                            clonedDropdownItem.style.margin = "2px";
                            clonedDropdownItem.style.height = "85px"; // Match the original height

                            // Add disabled styling if original item is disabled
                            if (dropdownItem.classList.contains('disabled')) {
                                clonedDropdownItem.classList.add('disabled');
                                clonedDropdownItem.style.opacity = "0.6";
                                clonedDropdownItem.style.cursor = "not-allowed";
                            } else {
                                clonedDropdownItem.addEventListener("click", () => {
                                    dropdownItem.click();
                                    // Schedule a refresh after click
                                    scheduleToolboxRefresh();
                                });
                            }

                            // Associate button with steps where this tool is used
                            if (actionPlanData && actionPlanData.plan) {
                                actionPlanData.plan.forEach((step, stepIndex) => {
                                    if (step.tools && step.tools.some(tool =>
                                        tool.name.toLowerCase() === buttonName.toLowerCase() || tool.id === buttonId)) {
                                        // Add a click handler to navigate to the first step using this tool
                                        if (!clonedDropdownItem.hasStepHandler) {
                                            clonedDropdownItem.addEventListener('click', () => {
                                                updateCurrentStep(stepIndex);
                                            });
                                            clonedDropdownItem.hasStepHandler = true;
                                        }
                                    }
                                });
                            }

                            allButtons.push(clonedDropdownItem);
                        }
                    });
                } else {
                    const labelElement = child.querySelector('.inner.pull-left');
                    if (labelElement) {
                        const buttonName = labelElement.textContent.trim();
                        const buttonId = getButtonIdFromClassList(child);

                        // Skip if this tool is not in our relevantTools (not needed for the plan)
                        if (!relevantTools.has(buttonName.toLowerCase()) && !relevantToolIds.has(buttonId)) return;

                        const clonedChild = child.cloneNode(true); // clone the child

                        // Add data attribute for the tool name and ID
                        clonedChild.setAttribute('data-tool-name', buttonName.toLowerCase());
                        if (buttonId) {
                            clonedChild.setAttribute('data-tool-id', buttonId);
                        }

                        // Fix the layout and styling
                        clonedChild.style.display = "inline-flex";
                        clonedChild.style.flexDirection = "column";
                        clonedChild.style.alignItems = "center";
                        clonedChild.style.justifyContent = "center";
                        clonedChild.style.border = "1px solid #ddd";
                        clonedChild.style.backgroundColor = "#f9f9f9";
                        clonedChild.style.padding = "4px 6px";
                        clonedChild.style.margin = "2px";
                        clonedChild.style.height = "85px"; // Match the original height

                        // Update label properties for readability
                        const childLabel = clonedChild.querySelector('.inner.pull-left');
                        if (childLabel) {
                            childLabel.style.fontSize = "12px";
                            childLabel.style.whiteSpace = "nowrap";
                        }

                        clonedChild.setAttribute('name', buttonName);
                        clonedChild.buttonName = buttonName; // Store for sorting later
                        clonedChild.buttonId = buttonId; // Store ID for sorting later
                        clonedChild.order = toolOrderMap.get(buttonName.toLowerCase()) || toolOrderMap.get(buttonId) || 999;

                        // Add disabled styling if original item is disabled
                        if (child.classList.contains('disabled')) {
                            clonedChild.classList.add('disabled');
                            clonedChild.style.opacity = "0.6";
                            clonedChild.style.cursor = "not-allowed";
                        } else {
                            clonedChild.addEventListener("click", () => {
                                child.click();
                                // Schedule a refresh after click
                                scheduleToolboxRefresh();
                            });
                        }

                        // Associate button with steps where this tool is used
                        if (actionPlanData && actionPlanData.plan) {
                            actionPlanData.plan.forEach((step, stepIndex) => {
                                if (step.tools && step.tools.some(tool =>
                                    tool.name.toLowerCase() === buttonName.toLowerCase() || tool.id === buttonId)) {
                                    // Add a click handler to navigate to the first step using this tool
                                    if (!clonedChild.hasStepHandler) {
                                        clonedChild.addEventListener('click', () => {
                                            updateCurrentStep(stepIndex);
                                        });
                                        clonedChild.hasStepHandler = true;
                                    }
                                }
                            });
                        }

                        allButtons.push(clonedChild);
                    }
                }
            });

            // Function to extract button ID from class list
            function getButtonIdFromClassList(element) {
                // Check if element has an ID attribute that starts with btn_
                if (element.id && element.id.startsWith('btn_')) {
                    return element.id;
                }

                // Look through classes for one that starts with btn_
                for (const className of element.classList) {
                    if (className.startsWith('btn_')) {
                        return className;
                    }
                }

                return null;
            }

            // Sort buttons based on tool order
            allButtons.sort((a, b) => a.order - b.order);

            // Add all buttons to the toolbox
            allButtons.forEach(button => {
                toolbox.appendChild(button);
            });

            console.log("Smart toolbox populated with relevant tools in recommended order.");

            // Highlight the current step's button if applicable
            setTimeout(() => {
                updateCurrentStep(currentStepIndex);
            }, 100);
        };

        // Function to schedule a toolbox refresh with debouncing
        const scheduleToolboxRefresh = () => {
            console.log("Scheduling toolbox refresh...");

            // Clear any existing timeout to prevent multiple refreshes
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }

            // Set a new timeout for refresh (300ms delay to ensure UI has updated)
            refreshTimeout = setTimeout(() => {
                if (smartToolbox && smartToolbox.style.display !== "none" && targetDiv) {
                    console.log("Refreshing toolbox...");
                    populateSmartToolbox(smartToolbox, targetDiv);
                }
            }, 300);
        };

        // Function to observe app interactions and refresh toolbox
        const setupInteractionObservers = () => {
            console.log("Setting up interaction observers...");

            // 1. Observe clicks on the entire app
            document.addEventListener('click', (e) => {
                // Only refresh if the click is not on the smart toolbox itself
                if (smartToolbox && !smartToolbox.contains(e.target)) {
                    scheduleToolboxRefresh();
                }
            });

            // 2. Observe keypress events that might trigger actions
            document.addEventListener('keydown', () => {
                scheduleToolboxRefresh();
            });

            // 3. Set up MutationObserver to watch for changes in the UI
            const observer = new MutationObserver((mutations) => {
                let shouldRefresh = false;

                // Check if any mutations affect the disabled state of buttons
                mutations.forEach((mutation) => {
                    if (mutation.target.classList &&
                        (mutation.target.classList.contains('disabled') ||
                         mutation.target.parentElement && mutation.target.parentElement.classList.contains('dropdown-item'))) {
                        shouldRefresh = true;
                    }
                });

                if (shouldRefresh) {
                    scheduleToolboxRefresh();
                }
            });

            // Start observing the target div for class changes (especially 'disabled' class)
            if (targetDiv) {
                observer.observe(targetDiv, {
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class']
                });
            }
        };

        // initialize the smart toolbox
        const createSmartToolbox = (sourceDiv, toolbar, quickMenus) => {
            console.log("Initializing smart toolbox...");

            // Store reference to targetDiv
            targetDiv = sourceDiv;

            // get toolbar dimensions
            const rect = toolbar.getBoundingClientRect();

            // create the smart toolbox container
            smartToolbox = document.createElement("div");
            smartToolbox.id = "smart-toolbox";
            smartToolbox.style.display = "none"; // initially hidden
            smartToolbox.style.position = "absolute";
            smartToolbox.style.top = `${rect.top + window.scrollY}px`;
            smartToolbox.style.left = `${rect.left + window.scrollX}px`;
            smartToolbox.style.width = `${rect.width}px`;
            smartToolbox.style.height = `${rect.height}px`;
            smartToolbox.style.zIndex = "9999";
            smartToolbox.style.overflowX = "auto"; // enable scrolling
            smartToolbox.style.overflowY = "hidden";
            smartToolbox.style.whiteSpace = "nowrap"; // ensure buttons stay in a row
            smartToolbox.style.backgroundColor = "white";
            smartToolbox.style.padding = "0px";
            smartToolbox.style.flexWrap = "nowrap";
            smartToolbox.style.alignItems = "center";
            smartToolbox.style.justifyContent = "flex-start";
            smartToolbox.style.cursor = "grab";

            // append the smart toolbox to the document body
            document.body.appendChild(smartToolbox);
            console.log("Smart toolbox container added to the page.");

            // function to update position on browser resize
            const updateSmartToolboxPosition = () => {
                const updatedRect = toolbar.getBoundingClientRect();
                smartToolbox.style.width = `${updatedRect.width}px`;
                smartToolbox.style.left = `${updatedRect.left + window.scrollX}px`;
                smartToolbox.style.top = `${updatedRect.top + window.scrollY}px`;
                console.log("Smart toolbox position updated!");
            };

            // listen for window resize events
            window.addEventListener("resize", updateSmartToolboxPosition);
            updateSmartToolboxPosition(); // run immediately on initialization

            // enable click-and-drag scrolling
            let isDragging = false;
            let startX;
            let scrollLeft;

            smartToolbox.addEventListener("mousedown", (e) => {
                isDragging = true;
                smartToolbox.style.cursor = "grabbing"; // indicate active dragging
                startX = e.pageX - smartToolbox.offsetLeft;
                scrollLeft = smartToolbox.scrollLeft;
                e.preventDefault(); // prevent text selection
            });

            smartToolbox.addEventListener("mouseup", () => {
                isDragging = false;
                smartToolbox.style.cursor = "grab"; // return to normal cursor
            });

            smartToolbox.addEventListener("mouseleave", () => {
                isDragging = false;
                smartToolbox.style.cursor = "grab";
            });

            smartToolbox.addEventListener("mousemove", (e) => {
                if (!isDragging) return;
                const x = e.pageX - smartToolbox.offsetLeft;
                const walk = (x - startX) * 2; // adjust speed
                smartToolbox.scrollLeft = scrollLeft - walk;
            });

            // function to toggle toolbox visibility and populate it
            const toggleSmartToolbox = () => {
                if (smartToolbox.style.display === "none") {
                    // Populate the smart toolbox using the extracted function
                    populateSmartToolbox(smartToolbox, targetDiv);

                    smartToolbox.style.display = "flex";
                    targetDiv.style.display = "none"; // Hide default toolbar
                    toggleButton.innerText = "Hide Smart Toolbox"; // Update button text when turned on
                } else {
                    smartToolbox.style.display = "none";
                    targetDiv.style.display = "block";
                    toggleButton.innerText = "Show Smart Toolbox"; // Update button text when turned off
                }
            };

            // Create toggle button with blue gradient
            const toggleButton = document.createElement("button");
            toggleButton.innerText = "Show Smart Toolbox";
            toggleButton.className = "btn btn-sm"; // Use SelfCAD's button class but skip btn-default

            // Add gradient style to match theme
            toggleButton.style.background = "linear-gradient(90deg, #14708E 0%, #26C9FF 69%)";
            toggleButton.style.color = "white";
            toggleButton.style.border = "none";
            toggleButton.style.margin = "0 5px";
            toggleButton.style.padding = "2px 10px";
            toggleButton.style.height = "100%";
            toggleButton.style.fontSize = "12px";
            toggleButton.style.fontWeight = "500";

            toggleButton.addEventListener("click", toggleSmartToolbox);

            // Insert the button in the quick-menus div if available
            if (quickMenus) {
                // Create a container for our button
                const buttonContainer = document.createElement("div");
                buttonContainer.style.display = "inline-block";
                buttonContainer.style.height = "100%";
                buttonContainer.style.verticalAlign = "middle";
                buttonContainer.appendChild(toggleButton);

                // Insert at the beginning of quick-menus to avoid wrapping
                if (quickMenus.firstChild) {
                    quickMenus.insertBefore(buttonContainer, quickMenus.firstChild);
                } else {
                    quickMenus.appendChild(buttonContainer);
                }
            } else {
                // Fallback to fixed position if quick-menus not found
                toggleButton.style.position = "fixed";
                toggleButton.style.top = "10px";
                toggleButton.style.right = "10px";
                toggleButton.style.zIndex = "10001";
                document.body.appendChild(toggleButton);
            }

            // Setup observers for UI interactions
            setupInteractionObservers();
        };

        waitForTargetDiv();
    }

    // Start the application by fetching the toolbox data
    initializeApp();
})();

// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox and Debug Features
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Shows AI configuration popup first, then loads smart toolbox with drag-scroll functionality and advanced debugging
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
    let actionPlan = null;
    let secondaryTools = []; // Array to store secondary tools

    // Helper function to identify special buttons by analyzing their structure, class names, and content
    const identifySpecialButton = (element) => {
        // Get all available information about the element
        const html = element.innerHTML.toLowerCase();
        const classes = Array.from(element.classList).join(' ').toLowerCase();
        const title = (element.getAttribute('title') || '').toLowerCase();
        const tooltip = (element.getAttribute('data-tooltip') || '').toLowerCase();
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();

        // Data structure to hold all the special button patterns to check
        const buttonPatterns = [
            // Transform tools
            { name: "Move", patterns: ["move", "translate", "position"] },
            { name: "Rotate", patterns: ["rotate", "rotation", "turning"] },
            { name: "Scale", patterns: ["scale", "resize", "sizing"] },
            { name: "Mirror", patterns: ["mirror", "reflect", "flip horizontal"] },
            { name: "Flip", patterns: ["flip", "invert", "flip vertical"] },
            { name: "Align", patterns: ["align", "alignment"] },
            { name: "Array", patterns: ["array", "pattern", "duplicate", "repeat"] },

            // Boolean operations
            { name: "Union", patterns: ["union", "merge", "combine", "join", "add", "boolean union"] },
            { name: "Subtract", patterns: ["subtract", "difference", "cut", "boolean subtract"] },
            { name: "Intersect", patterns: ["intersect", "intersection", "boolean intersect"] },

            // View controls
            { name: "Orbit", patterns: ["orbit", "rotate view", "view rotation"] },
            { name: "Pan", patterns: ["pan", "move view", "drag view"] },
            { name: "Front View", patterns: ["front view", "front", "view front"] },
            { name: "Top View", patterns: ["top view", "top", "view top"] },
            { name: "Right View", patterns: ["right view", "right", "view right"] },
            { name: "Perspective", patterns: ["perspective", "3d view", "isometric"] },

            // Selection tools
            { name: "Select", patterns: ["select", "selection tool"] },
            { name: "Select All", patterns: ["select all", "all", "select everything"] },
            { name: "Deselect", patterns: ["deselect", "clear selection", "unselect"] },
            { name: "Invert Selection", patterns: ["invert", "invert selection", "reverse selection"] },

            // Common CAD operations
            { name: "Extrusion", patterns: ["extrude", "extrusion", "pull"] },
            { name: "Fillet", patterns: ["fillet", "round", "rounded corner"] },
            { name: "Chamfer", patterns: ["chamfer", "bevel", "angled corner"] },
            { name: "Group", patterns: ["group", "create group"] },
            { name: "Ungroup", patterns: ["ungroup", "separate", "break group"] },
            { name: "Boolean", patterns: ["boolean", "boolean operations"] },

            // Basic shapes
            { name: "Cube", patterns: ["cube", "box", "rectangle"] },
            { name: "Sphere", patterns: ["sphere", "ball"] },
            { name: "Cylinder", patterns: ["cylinder", "tube"] },
            { name: "Cone", patterns: ["cone"] },
            { name: "Torus", patterns: ["torus", "donut"] },

            // Common UI elements
            { name: "Undo", patterns: ["undo", "undo action"] },
            { name: "Redo", patterns: ["redo", "redo action"] },
            { name: "Delete", patterns: ["delete", "remove", "erase"] },
            { name: "Hide", patterns: ["hide", "invisible", "toggle visibility"] },
            { name: "Show", patterns: ["show", "visible", "unhide"] }
        ];

        // Check all sources of information for each pattern
        for (const button of buttonPatterns) {
            for (const pattern of button.patterns) {
                // Check if the pattern appears in any of the element properties
                if (html.includes(pattern) ||
                    classes.includes(pattern) ||
                    title.includes(pattern) ||
                    tooltip.includes(pattern) ||
                    ariaLabel.includes(pattern)) {
                    return button.name;
                }

                // Special case for icons with specific classes
                if (element.querySelector(`[class*="${pattern}"]`)) {
                    return button.name;
                }
            }
        }

        // Special case for icons that might be identified by image source
        const images = element.querySelectorAll('img');
        if (images.length > 0) {
            const srcString = Array.from(images)
                .map(img => (img.getAttribute('src') || '').toLowerCase())
                .join(' ');

            for (const button of buttonPatterns) {
                for (const pattern of button.patterns) {
                    if (srcString.includes(pattern)) {
                        return button.name;
                    }
                }
            }
        }

        // Special case for SVG icons
        const svgs = element.querySelectorAll('svg');
        if (svgs.length > 0) {
            // Check SVG contents for clues
            const svgString = Array.from(svgs)
                .map(svg => svg.outerHTML.toLowerCase())
                .join(' ');

            for (const button of buttonPatterns) {
                for (const pattern of button.patterns) {
                    if (svgString.includes(pattern)) {
                        return button.name;
                    }
                }
            }
        }

        // Check for data attributes that might contain button information
        const dataAttributeString = Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .map(attr => attr.value.toLowerCase())
            .join(' ');

        for (const button of buttonPatterns) {
            for (const pattern of button.patterns) {
                if (dataAttributeString.includes(pattern)) {
                    return button.name;
                }
            }
        }

        // ENHANCEMENT: Extra patterns for additional tool identification
        const extraPatterns = [
            { name: "Extrusion", patterns: ["pull", "push", "extension"] },
            { name: "Cube", patterns: ["box", "block", "rectangular prism"] },
            { name: "Combine", patterns: ["join", "combine", "fuse"] },
            { name: "Subtract", patterns: ["cut", "remove", "cutout"] },
            { name: "Fillet", patterns: ["round edges", "rounded corners"] },
            { name: "Chamfer", patterns: ["bevel edges", "angled corners"] },
            { name: "Move", patterns: ["position", "relocate", "place"] },
            { name: "Scale", patterns: ["resize", "size adjust", "dimension"] },
            { name: "Align", patterns: ["center", "line up", "position relative"] }
        ];

        // Check extra patterns
        for (const button of extraPatterns) {
            for (const pattern of button.patterns) {
                if (html.includes(pattern) ||
                    classes.includes(pattern) ||
                    title.includes(pattern) ||
                    tooltip.includes(pattern) ||
                    ariaLabel.includes(pattern)) {
                    return button.name;
                }
            }
        }

        // No match found
        return null;
    };

    // Function to create a debug popup showing button order with raw ChatGPT output
    const createDebugOrderPopup = (allButtons, toolOrder, priorityMap) => {
        // Create popup container
        const debugPopup = document.createElement('div');
        debugPopup.style.position = 'fixed';
        debugPopup.style.top = '50%';
        debugPopup.style.left = '50%';
        debugPopup.style.transform = 'translate(-50%, -50%)';
        debugPopup.style.width = '700px'; // Increased width for more content
        debugPopup.style.maxHeight = '80vh';
        debugPopup.style.backgroundColor = 'white';
        debugPopup.style.border = '2px solid #26C9FF';
        debugPopup.style.borderRadius = '8px';
        debugPopup.style.padding = '16px';
        debugPopup.style.zIndex = '20000';
        debugPopup.style.overflowY = 'auto';
        debugPopup.style.fontFamily = "'Inter', sans-serif";
        debugPopup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Button Order Debug Info';
        title.style.marginTop = '0';
        title.style.color = '#14708E';
        title.style.borderBottom = '1px solid #eee';
        title.style.paddingBottom = '8px';

        // Create content sections
        const orderInfo = document.createElement('div');

        // Show raw ChatGPT output
        const rawOutputSection = document.createElement('div');
        rawOutputSection.innerHTML = '<h3>Raw ChatGPT Output:</h3>';

        // Get the raw TOOL_ORDER section from actionPlan
        let rawToolOrderText = "Not found";
        if (actionPlan) {
            const toolOrderMatch = actionPlan.match(/TOOL_ORDER:\s*([\w\s,]+)(?:\n|$)/);
            if (toolOrderMatch && toolOrderMatch[0]) {
                rawToolOrderText = toolOrderMatch[0].trim();
            }
        }

        const rawOutputPre = document.createElement('pre');
        rawOutputPre.style.backgroundColor = '#f5f5f5';
        rawOutputPre.style.padding = '10px';
        rawOutputPre.style.border = '1px solid #ddd';
        rawOutputPre.style.borderRadius = '4px';
        rawOutputPre.style.overflowX = 'auto';
        rawOutputPre.style.maxHeight = '100px';
        rawOutputPre.style.fontSize = '14px';
        rawOutputPre.style.fontFamily = 'monospace';
        rawOutputPre.textContent = rawToolOrderText;

        rawOutputSection.appendChild(rawOutputPre);

        // Show complete action plan
        const fullActionPlanSection = document.createElement('div');
        fullActionPlanSection.innerHTML = '<h3>Complete Action Plan:</h3>';

        const fullActionPlanButton = document.createElement('button');
        fullActionPlanButton.textContent = 'Show/Hide Full Action Plan';
        fullActionPlanButton.style.backgroundColor = '#f0f0f0';
        fullActionPlanButton.style.border = '1px solid #ddd';
        fullActionPlanButton.style.borderRadius = '4px';
        fullActionPlanButton.style.padding = '8px 12px';
        fullActionPlanButton.style.marginBottom = '10px';
        fullActionPlanButton.style.cursor = 'pointer';

        const fullActionPlanPre = document.createElement('pre');
        fullActionPlanPre.style.backgroundColor = '#f5f5f5';
        fullActionPlanPre.style.padding = '10px';
        fullActionPlanPre.style.border = '1px solid #ddd';
        fullActionPlanPre.style.borderRadius = '4px';
        fullActionPlanPre.style.overflowX = 'auto';
        fullActionPlanPre.style.maxHeight = '200px';
        fullActionPlanPre.style.fontSize = '14px';
        fullActionPlanPre.style.fontFamily = 'monospace';
        fullActionPlanPre.style.display = 'none'; // Initially hidden
        fullActionPlanPre.textContent = actionPlan || "No action plan available";

        fullActionPlanButton.addEventListener('click', () => {
            fullActionPlanPre.style.display =
                fullActionPlanPre.style.display === 'none' ? 'block' : 'none';
        });

        fullActionPlanSection.appendChild(fullActionPlanButton);
        fullActionPlanSection.appendChild(fullActionPlanPre);

        // Original tool order (processed)
        const toolOrderSection = document.createElement('div');
        toolOrderSection.innerHTML = `<h3>Processed Tool Order (${toolOrder.length} tools):</h3>`;
        const toolOrderList = document.createElement('ol');
        toolOrder.forEach(tool => {
            const li = document.createElement('li');
            li.textContent = tool;
            toolOrderList.appendChild(li);
        });
        toolOrderSection.appendChild(toolOrderList);

        // Secondary tools section
        if (secondaryTools.length > 0) {
            const secondaryToolsSection = document.createElement('div');
            secondaryToolsSection.innerHTML = `<h3>Secondary Tools (${secondaryTools.length} tools):</h3>`;
            const secondaryToolsList = document.createElement('ol');
            secondaryTools.forEach(tool => {
                const li = document.createElement('li');
                li.textContent = tool;
                secondaryToolsList.appendChild(li);
            });
            secondaryToolsSection.appendChild(secondaryToolsList);
            toolOrderSection.appendChild(secondaryToolsSection);
        }

        // Priority map
        const prioritySection = document.createElement('div');
        prioritySection.innerHTML = '<h3>Priority Mapping:</h3>';
        const priorityList = document.createElement('ul');
        priorityMap.forEach((value, key) => {
            const li = document.createElement('li');
            li.textContent = `${key}: ${value}`;
            priorityList.appendChild(li);
        });
        prioritySection.appendChild(priorityList);

        // Final button order
        const buttonOrderSection = document.createElement('div');
        buttonOrderSection.innerHTML = `<h3>Final Button Order (${allButtons.length} buttons):</h3>`;
        const buttonTable = document.createElement('table');
        buttonTable.style.width = '100%';
        buttonTable.style.borderCollapse = 'collapse';

        // Add table header
        const tableHeader = document.createElement('tr');
        tableHeader.innerHTML = `
            <th style="border:1px solid #ddd; padding:8px; text-align:left">Position</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left">Button Name</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left">Priority</th>
            <th style="border:1px solid #ddd; padding:8px; text-align:left">Type</th>
        `;
        buttonTable.appendChild(tableHeader);

        // Add rows for each button
        allButtons.forEach((button, index) => {
            const buttonName = button.getAttribute('data-button-name') || button.buttonName || 'Unknown';
            const priority = priorityMap.has(buttonName) ? priorityMap.get(buttonName) : 'N/A';

            // Determine the button type
            let buttonType = "Not Used";
            if (priority !== 'N/A') {
                buttonType = "Primary";
            } else if (secondaryTools.includes(buttonName)) {
                buttonType = "Secondary";
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="border:1px solid #ddd; padding:8px">${index + 1}</td>
                <td style="border:1px solid #ddd; padding:8px">${buttonName}</td>
                <td style="border:1px solid #ddd; padding:8px">${priority}</td>
                <td style="border:1px solid #ddd; padding:8px">${buttonType}</td>
            `;

            // Highlight matched buttons
            if (priority !== 'N/A') {
                row.style.backgroundColor = '#e6f7ff'; // Primary tools
            } else if (secondaryTools.includes(buttonName)) {
                row.style.backgroundColor = '#f9f0ff'; // Secondary tools
            }

            buttonTable.appendChild(row);
        });

        buttonOrderSection.appendChild(buttonTable);

        // Add export to clipboard buttons
        const exportSection = document.createElement('div');
        exportSection.style.margin = '20px 0';
        exportSection.style.borderTop = '1px solid #eee';
        exportSection.style.paddingTop = '15px';

        const exportButtonRaw = document.createElement('button');
        exportButtonRaw.textContent = 'Copy Raw ChatGPT Output';
        exportButtonRaw.style.backgroundColor = '#14708E';
        exportButtonRaw.style.color = 'white';
        exportButtonRaw.style.border = 'none';
        exportButtonRaw.style.borderRadius = '4px';
        exportButtonRaw.style.padding = '8px 12px';
        exportButtonRaw.style.marginRight = '10px';
        exportButtonRaw.style.cursor = 'pointer';

        exportButtonRaw.addEventListener('click', () => {
            navigator.clipboard.writeText(rawToolOrderText)
                .then(() => {
                    alert('Raw output copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy to clipboard');
                });
        });

        const exportButtonAll = document.createElement('button');
        exportButtonAll.textContent = 'Copy Full Action Plan';
        exportButtonAll.style.backgroundColor = '#14708E';
        exportButtonAll.style.color = 'white';
        exportButtonAll.style.border = 'none';
        exportButtonAll.style.borderRadius = '4px';
        exportButtonAll.style.padding = '8px 12px';
        exportButtonAll.style.cursor = 'pointer';

        exportButtonAll.addEventListener('click', () => {
            navigator.clipboard.writeText(actionPlan || "No action plan available")
                .then(() => {
                    alert('Full action plan copied to clipboard!');
                })
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    alert('Failed to copy to clipboard');
                });
        });

        exportSection.appendChild(exportButtonRaw);
        exportSection.appendChild(exportButtonAll);

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '16px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.backgroundColor = '#14708E';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.float = 'right';
        closeButton.onclick = () => document.body.removeChild(debugPopup);

        // Assemble popup
        orderInfo.appendChild(rawOutputSection);
        orderInfo.appendChild(fullActionPlanSection);
        orderInfo.appendChild(toolOrderSection);
        orderInfo.appendChild(prioritySection);
        orderInfo.appendChild(buttonOrderSection);
        orderInfo.appendChild(exportSection);

        debugPopup.appendChild(title);
        debugPopup.appendChild(orderInfo);
        debugPopup.appendChild(closeButton);

        // Add to document
        document.body.appendChild(debugPopup);
    };

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
                    'Authorization': 'Bearer API-KEY'
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
            // Prepare the prompt for ChatGPT
            let prompt = `
                I want to create "${objectToMake}" using SelfCAD. My preferred approach is: "${userApproach}".

                Here are all the tools available in SelfCAD that I can use:
                ${JSON.stringify(toolboxData)}

                Please create a step-by-step plan for how to create this object using the available tools.
                Be specific about which tools to use at each step.
                Use the exact tool names from the list when recommending tools.
                Keep in mind that I'm using SelfCAD which is a 3D modeling tool.
                Make your instructions clear and specific.

                VERY IMPORTANT: Please include a comma-separated list at the end of your response titled "TOOL_ORDER:"
                that lists, in order of use, all the tool names that should be used in this plan. The tool names MUST EXACTLY match
                the data-button-name attributes of the buttons in the UI. Common tool names are: Cube, Sphere, Cylinder, Cone, Torus,
                Scale, Move, Rotate, Edit Details, Fillet, Combine.

                Example: "TOOL_ORDER: Cube, Extrusion, Fillet, Move"
            `;

            // ENHANCEMENT: Add explicit instruction to ensure TOOL_ORDER section is included
            prompt += `

                I MUST include a clear TOOL_ORDER: section in my response with a comma-separated list
                of ALL tools needed, in the exact order they should be used.
                Example: "TOOL_ORDER: Cube, Extrude, Fillet, Move"
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer API-KEY'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(`API Error: ${data.error.message}`);
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error("Error generating action plan:", error);
            return "Error generating action plan. Please try again.";
        }
    };

    // NEW: Function to get secondary tools from ChatGPT
    const getSecondaryTools = async (primaryTools, objectToMake) => {
        try {
            // Prepare the prompt for ChatGPT
            const prompt = `
                I'm creating "${objectToMake}" in SelfCAD. I already have the main tools I need, which are:
                ${primaryTools.join(', ')}

                Based on this task, what additional tools from SelfCAD might be helpful that aren't already in my main list?

                Please provide a list of 3-5 tool names that aren't in my main tools list but might be helpful.
                Return your answer in this format:
                "SECONDARY_TOOLS: Tool1, Tool2, Tool3, etc."

                The tool names should match exactly from this list:
                ${JSON.stringify(toolboxData.tools.map(tool => tool.name))}
            `;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer API-KEY'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(`API Error: ${data.error.message}`);
            }

            // Extract the secondary tools list
            const content = data.choices[0].message.content;
            const match = content.match(/SECONDARY_TOOLS:\s*([\w\s,]+)(?:\n|$)/);

            if (match && match[1]) {
                // Parse the comma-separated list, being careful with spaces
                const secondaryTools = match[1].split(',').map(tool => tool.trim());
                // Filter out any tools already in primary list
                return secondaryTools.filter(tool => !primaryTools.includes(tool));
            }

            return [];
        } catch (error) {
            console.error("Error getting secondary tools:", error);
            return [];
        }
    };

    // ENHANCEMENT: Improved function to extract tool order from action plan
    const extractToolOrder = (actionPlanText) => {
        console.log("Extracting tool order from action plan");

        // Try to find the TOOL_ORDER section with a more comprehensive regex
        // This handles both single-line and multi-line tool orders
        const toolOrderMatch = actionPlanText.match(/TOOL_ORDER:\s*([\w\s,]+)(?:\n|$)/);
        if (toolOrderMatch && toolOrderMatch[1]) {
            // Parse the comma-separated list, being careful with spaces
            const toolOrder = toolOrderMatch[1].split(',').map(tool => tool.trim());
            console.log("Extracted tool order directly from action plan:", toolOrder);
            return toolOrder;
        }

        // If no TOOL_ORDER section found, try another approach - look for numbered steps
        const numberedSteps = actionPlanText.match(/\b(\d+)\.\s+Use\s+the\s+(\w+)\s+tool/gi);
        if (numberedSteps && numberedSteps.length > 0) {
            const extractedTools = numberedSteps.map(step => {
                const match = step.match(/Use\s+the\s+(\w+)\s+tool/i);
                return match ? match[1] : null;
            }).filter(Boolean);

            if (extractedTools.length > 0) {
                console.log("Extracted tool order from numbered steps:", extractedTools);
                return extractedTools;
            }
        }

        // If no TOOL_ORDER section found, return empty array to prevent incorrect ordering
        console.warn("No TOOL_ORDER section found in action plan! Returning empty array.");
        return [];
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

                .button-spinner {
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top: 3px solid #FFFFFF;
                    width: 16px;
                    height: 16px;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                    margin-left: 10px;
                }

                .button:disabled {
                    opacity: 0.8;
                    cursor: not-allowed;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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

                <button class="button">Generate smart toolbar <span style="font-size: 16px; margin-left: 8px;">✨</span></button>
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
            // Disable the button and show loading state
            generateButton.disabled = true;
            generateButton.innerHTML = 'Generating <span class="button-spinner"></span>';
            generateButton.style.cursor = 'not-allowed';

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
            actionPlan = await generateActionPlan(objectToMake, userApproach);

            // Remove popup
            popupHost.remove();

            // Initialize smart toolbox and action plan display
            initializeSmartToolbox(objectToMake);
        });
    };

    function initializeSmartToolbox(objectToMake) {
        console.log("Smart toolbox script has started running.");

        // Variables for global access
        let targetDiv;
        let smartToolbox;
        let refreshTimeout;
        let toolOrder = [];
        // Store priorityMap at a higher scope for access by the debug button
        let priorityMap = new Map();

        // Extract tool order from action plan
        if (actionPlan) {
            toolOrder = extractToolOrder(actionPlan);
            console.log("Tool order extracted:", toolOrder);

            // Also log the raw TOOL_ORDER section from the action plan
            const toolOrderMatch = actionPlan.match(/TOOL_ORDER:\s*([\w\s,]+)(?:\n|$)/);
            if (toolOrderMatch && toolOrderMatch[0]) {
                console.log("Raw TOOL_ORDER section:", toolOrderMatch[0]);
            } else {
                console.warn("No raw TOOL_ORDER section found in action plan!");
            }

            // Get secondary tools immediately after extracting primary tools
            if (toolOrder.length > 0 && objectToMake) {
                console.log("Getting secondary tools...");
                getSecondaryTools(toolOrder, objectToMake).then(tools => {
                    secondaryTools = tools;
                    console.log("Secondary tools received:", secondaryTools);

                    // Refresh toolbox to include secondary tools
                    if (smartToolbox && smartToolbox.style.display !== "none" && targetDiv) {
                        populateSmartToolbox(smartToolbox, targetDiv);
                    }
                });
            }
        }

        // Create action plan display
        const createActionPlanDisplay = () => {
            const actionPlanContainer = document.createElement('div');
            actionPlanContainer.style.position = 'fixed';
            actionPlanContainer.style.bottom = '20px';
            actionPlanContainer.style.right = '20px';
            actionPlanContainer.style.width = '300px';
            actionPlanContainer.style.maxHeight = '400px';
            actionPlanContainer.style.backgroundColor = 'white';
            actionPlanContainer.style.border = '1px solid #D9D9D9';
            actionPlanContainer.style.borderRadius = '8px';
            actionPlanContainer.style.padding = '16px';
            actionPlanContainer.style.zIndex = '10000';
            actionPlanContainer.style.overflow = 'auto';
            actionPlanContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            actionPlanContainer.style.fontFamily = "'Inter', sans-serif";

            const titleElement = document.createElement('h3');
            titleElement.textContent = 'AI Action Plan';
            titleElement.style.marginTop = '0';
            titleElement.style.marginBottom = '12px';
            titleElement.style.fontSize = '16px';
            titleElement.style.fontWeight = '600';

            const contentElement = document.createElement('div');

            // Remove the TOOL_ORDER line from display
            let displayText = actionPlan;
            const toolOrderIndex = displayText.indexOf("TOOL_ORDER:");
            if (toolOrderIndex !== -1) {
                displayText = displayText.substring(0, toolOrderIndex);
            }

            contentElement.innerHTML = displayText.replace(/\n/g, '<br>');
            contentElement.style.fontSize = '14px';
            contentElement.style.lineHeight = '1.4';
            contentElement.style.color = '#464646';

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

            let isMinimized = false;
            minimizeButton.addEventListener('click', () => {
                if (isMinimized) {
                    contentElement.style.display = 'block';
                    actionPlanContainer.style.height = 'auto';
                    minimizeButton.textContent = '−';
                } else {
                    contentElement.style.display = 'none';
                    actionPlanContainer.style.height = 'auto';
                    minimizeButton.textContent = '+';
                }
                isMinimized = !isMinimized;
            });

            actionPlanContainer.appendChild(titleElement);
            actionPlanContainer.appendChild(contentElement);
            actionPlanContainer.appendChild(minimizeButton);

            document.body.appendChild(actionPlanContainer);
        };

        // MODIFIED: Added check for projects-panel.hidden
        const waitForTargetDiv = () => {
            targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
            const toolbar = document.getElementById("headerToolbarMenu");
            const projectsPanel = document.querySelector('.projects-panel'); // NEW

            // MODIFIED condition to check projects-panel state
            if (!targetDiv || !toolbar || !projectsPanel || !projectsPanel.classList.contains('hidden')) {
                console.log("Target div, toolbar, or projects panel not found/hidden. Retrying...");
                setTimeout(waitForTargetDiv, 500);
                return;
            }

            console.log("Target div and toolbar located.");
            createSmartToolbox(targetDiv, toolbar);

            // Create action plan display after smart toolbox is initialized
            if (actionPlan) {
                createActionPlanDisplay();
            }
        };

        // Extract the repeated code into a function for populating the toolbox
        const populateSmartToolbox = (toolbox, sourceDiv) => {
            toolbox.innerHTML = ""; // clear previous content

            // First, collect all buttons
            const allButtons = [];

            // Debug the tool order before sorting
            console.log("Tool order before sorting:", toolOrder);
            console.log("Secondary tools:", secondaryTools);

            // loop through children of the target toolbar
            Array.from(sourceDiv.children).forEach((child) => {
                const dropdownItems = child.querySelectorAll('[class^="dropdown-item"]');
                if (dropdownItems.length > 0) {
                    dropdownItems.forEach((dropdownItem) => {
                        const clonedDropdownItem = dropdownItem.cloneNode(true); // clone the dropdown item

                        // Fix button height to ensure consistency
                        clonedDropdownItem.style.height = "85px"; // Set fixed height

                        // stack icon and label vertically
                        const iconElement = dropdownItem.querySelector('span[class^="pull-left"][class*="selfcad-grey-"]');
                        const labelElement = dropdownItem.querySelector('span[class="inner pull-left"][rv-text="btn.labelText"]');

                        // Extract button name - try multiple possible selectors
                        let buttonName = "";
                        if (labelElement && labelElement.textContent) {
                            buttonName = labelElement.textContent.trim();
                        } else {
                            // Try alternate selector
                            const altLabel = dropdownItem.querySelector('.inner.pull-left');
                            if (altLabel) {
                                buttonName = altLabel.textContent.trim();
                            } else {
                            // Special case for transform and other special tools
                            const specialButtons = identifySpecialButton(dropdownItem);
                            if (specialButtons) {
                                buttonName = specialButtons;
                            }
                            }
                        }

                        // Store the button name consistently for all buttons
                        clonedDropdownItem.setAttribute('data-button-name', buttonName);
                        clonedDropdownItem.buttonName = buttonName;
                        console.log(`Added dropdown button: ${buttonName}`);

                        if (iconElement && labelElement) {
                            const stackedContainer = document.createElement("div");
                            stackedContainer.style.display = "flex";
                            stackedContainer.style.flexDirection = "column";
                            stackedContainer.style.alignItems = "center";
                            stackedContainer.style.justifyContent = "center";
                            stackedContainer.style.height = "100%";

                            const clonedIcon = iconElement.cloneNode(true);
                            const clonedLabel = labelElement.cloneNode(true);

                            stackedContainer.appendChild(clonedIcon);
                            stackedContainer.appendChild(clonedLabel);

                            if (clonedLabel) {
                                const isDisabled = dropdownItem.classList.contains('disabled');
                                clonedLabel.style.color = isDisabled ? "rgb(158, 158, 158)" : "rgb(140, 187, 226)";
                                clonedLabel.style.visibility = "visible";
                                clonedLabel.style.opacity = "1";
                                clonedLabel.style.transition = "none";
                                clonedLabel.style.paddingTop = "6px";
                            }

                            clonedDropdownItem.innerHTML = "";
                            clonedDropdownItem.appendChild(stackedContainer);

                            clonedDropdownItem.style.display = "flex";
                            clonedDropdownItem.style.flexDirection = "column";
                            clonedDropdownItem.style.alignItems = "center";
                            clonedDropdownItem.style.justifyContent = "center";
                            clonedDropdownItem.style.border = "1px solid #ddd";
                            clonedDropdownItem.style.backgroundColor = "#f9f9f9";
                            clonedDropdownItem.style.padding = "4px 6px";
                            clonedDropdownItem.style.margin = "2px";
                            clonedDropdownItem.style.width = "85px"; // Fixed width

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

                            allButtons.push(clonedDropdownItem);
                        }
                    });
                } else {
                    const clonedChild = child.cloneNode(true);

                    // Fix button height to ensure consistency
                    clonedChild.style.height = "85px"; // Set fixed height
                    clonedChild.style.width = "85px"; // Fixed width
                    clonedChild.style.border = "1px solid #ddd";
                    clonedChild.style.backgroundColor = "#f9f9f9";
                    clonedChild.style.margin = "2px";
                    clonedChild.style.display = "flex";
                    clonedChild.style.flexDirection = "column";
                    clonedChild.style.alignItems = "center";
                    clonedChild.style.justifyContent = "center";

                    // Extract button name - try multiple possible selectors
                    let buttonName = "";
                    const labelElement = child.querySelector('.inner.pull-left');
                    if (labelElement && labelElement.textContent) {
                        buttonName = labelElement.textContent.trim();
                    } else {
                        // Try alternate selector
                        const altLabel = child.querySelector('[rv-text="btn.labelText"]');
                        if (altLabel) {
                            buttonName = altLabel.textContent.trim();
                        } else {
                            // Special case for identifying various special tools
                            const specialButtons = identifySpecialButton(child);
                            if (specialButtons) {
                                buttonName = specialButtons;
                                console.log(`Identified special button: ${buttonName}`);
                            }
                        }
                    }

                    // Store the button name consistently for all buttons
                    clonedChild.setAttribute('data-button-name', buttonName);
                    clonedChild.buttonName = buttonName;
                    console.log(`Added regular button: ${buttonName}`);

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

                    allButtons.push(clonedChild);
                }
            });

            // MODIFIED: Filter buttons to only include those mentioned by ChatGPT (primary or secondary)
            const filteredButtons = allButtons.filter(button => {
                const buttonName = button.getAttribute('data-button-name');
                return toolOrder.includes(buttonName) || secondaryTools.includes(buttonName);
            });

            // DEBUG: Output the filtered buttons
            console.log("Filtered buttons:", filteredButtons.length, "out of", allButtons.length);

            // Create two arrays for primary and secondary tools
            const primaryButtons = [];
            const secondaryButtons = [];

            // Filter buttons into primary and secondary groups
            filteredButtons.forEach(button => {
                const buttonName = button.getAttribute('data-button-name');
                if (toolOrder.includes(buttonName)) {
                    primaryButtons.push(button);
                } else if (secondaryTools.includes(buttonName)) {
                    secondaryButtons.push(button);
                }
            });

            console.log("Primary buttons count:", primaryButtons.length);
            console.log("Secondary buttons count:", secondaryButtons.length);

            // MODIFIED: Direct sorting by exact tool name matching without normalization
            if (toolOrder.length > 0) {
                console.log("Sorting buttons based on tool order:", toolOrder);

                // Create a priority map using exact tool names, no normalization
                priorityMap = new Map();
                toolOrder.forEach((toolName, index) => {
                    priorityMap.set(toolName, index);
                    console.log(`Priority ${index}: ${toolName}`);
                });

                // Sort primary buttons based on priority
                primaryButtons.sort((a, b) => {
                    // Get the exact data-button-name
                    const aName = a.getAttribute('data-button-name');
                    const bName = b.getAttribute('data-button-name');

                    // Get priority values
                    const aPriority = priorityMap.get(aName);
                    const bPriority = priorityMap.get(bName);

                    return aPriority - bPriority;
                });

                console.log("Primary buttons after sorting:",
                    primaryButtons.map(b => b.getAttribute('data-button-name')));
            }

            // Create a divider between primary and secondary tools
            let divider = null;
            if (primaryButtons.length > 0 && secondaryButtons.length > 0) {
                divider = document.createElement('div');
                divider.style.height = '85px';
                divider.style.minWidth = '2px';
                divider.style.backgroundColor = '#ddd';
                divider.style.margin = '0 10px';

                // Add a "More Tools" tooltip
                const tooltipText = document.createElement('div');
                tooltipText.textContent = 'Additional Tools';
                tooltipText.style.fontSize = '10px';
                tooltipText.style.color = '#666';
                tooltipText.style.transform = 'rotate(-90deg)';
                tooltipText.style.whiteSpace = 'nowrap';

                divider.appendChild(tooltipText);
                divider.style.display = 'flex';
                divider.style.alignItems = 'center';
                divider.style.justifyContent = 'center';
            }

            // Add primary buttons to the toolbox
            primaryButtons.forEach(button => {
                toolbox.appendChild(button);
            });

            // Add divider if we have secondary buttons
            if (divider) {
                toolbox.appendChild(divider);
            }

            // Add secondary buttons to the toolbox
            secondaryButtons.forEach(button => {
                toolbox.appendChild(button);
            });

            console.log("All buttons added to the smart toolbox in recommended order.");
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
        const createSmartToolbox = (sourceDiv, toolbar) => {
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
            smartToolbox.style.display = "none";

            smartToolbox.style.flexWrap = "nowrap";
            smartToolbox.style.alignItems = "center";
            smartToolbox.style.justifyContent = "flex-start";
            smartToolbox.style.cursor = "grab";

            // append the smart toolbox to the document body
            document.body.appendChild(smartToolbox);
            console.log("Smart toolbox container added to the page.");

            // function to update width on browser resize
            const updateSmartToolboxSize = () => {
                const rect = toolbar.getBoundingClientRect();
                smartToolbox.style.width = `${rect.width}px`;
                smartToolbox.style.left = `${rect.left + window.scrollX}px`;
                console.log("Smart toolbox resized!");
            };

            // listen for window resize events
            window.addEventListener("resize", updateSmartToolboxSize);
            updateSmartToolboxSize(); // run immediately on initialization

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
                    // CHANGED: Update button text to "Hide Smart Toolbox"
                    toggleButton.innerText = "Hide Smart Toolbox";
                } else {
                    smartToolbox.style.display = "none";
                    targetDiv.style.display = "block";
                    toggleButton.innerText = "Show Smart Toolbox";
                }
            };

            // Create toggle button and add it to quick-menus div
            const toggleButton = document.createElement("button");
            toggleButton.innerText = "Show Smart Toolbox"; // Start in OFF state

            // UPDATED: Styling for the toggle button with new height and border color
            toggleButton.style.height = "30px"; // Make the button taller (changed from 22px)
            toggleButton.style.padding = "0 12px";
            toggleButton.style.marginLeft = "10px";
            toggleButton.style.borderRadius = "4px";
            toggleButton.style.border = "2px solid #0c546b"; // Changed border color
            toggleButton.style.background = "linear-gradient(90deg, #14708E 0%, #26C9FF 69%)"; // Gradient from popup
            toggleButton.style.color = "white"; // White text
            toggleButton.style.cursor = "pointer";
            toggleButton.style.fontSize = "12px";
            toggleButton.style.fontWeight = "600"; // Bold text
            toggleButton.style.display = "flex";
            toggleButton.style.alignItems = "center";
            toggleButton.style.justifyContent = "center";

            // Create debug button
            const debugButton = document.createElement("button");
            debugButton.innerText = "Debug Order";
            debugButton.style.padding = "5px 10px";
            debugButton.style.marginLeft = "10px";
            debugButton.style.borderRadius = "4px";
            debugButton.style.border = "1px solid #ff8c00";
            debugButton.style.backgroundColor = "#fff3e0";
            debugButton.style.cursor = "pointer";
            debugButton.style.fontSize = "12px";

            debugButton.addEventListener("click", () => {
                // We need to capture the current state when the button is clicked
                const currentButtons = Array.from(smartToolbox.children);
                createDebugOrderPopup(currentButtons, toolOrder, priorityMap);
            });

            // Find quick-menus div and increase its width to accommodate the button
            const quickMenusDiv = document.querySelector('.quick-menus');
            if (quickMenusDiv) {
                // Get the current width and increase it
                const currentWidth = quickMenusDiv.offsetWidth;
                quickMenusDiv.style.width = `${currentWidth + 270}px`; // Add enough space for both buttons
                quickMenusDiv.appendChild(toggleButton);
                quickMenusDiv.appendChild(debugButton);
            } else {
                // Fallback if quick-menus div is not found
                toggleButton.style.position = "fixed";
                toggleButton.style.top = "10px";
                toggleButton.style.right = "10px";
                toggleButton.style.zIndex = "10001";
                document.body.appendChild(toggleButton);

                debugButton.style.position = "fixed";
                debugButton.style.top = "10px";
                debugButton.style.right = "170px"; // Position to the left of toggle button
                debugButton.style.zIndex = "10001";
                document.body.appendChild(debugButton);
            }

            toggleButton.addEventListener("click", toggleSmartToolbox);

            // Setup observers for UI interactions
            setupInteractionObservers();
        };

        waitForTargetDiv();
    }

    // Start the application by fetching the toolbox data
    initializeApp();
})();

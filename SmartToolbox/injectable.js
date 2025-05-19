// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox and Debug Features
// @namespace    http://tampermonkey.net/
// @version      1.3
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
    let currentStepIndex = 0; // Track the current step in the workflow

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

    // Function to verify tool name matching
    const verifyToolNameMatching = () => {
        console.log("\n===== TOOL NAME VERIFICATION =====");
        console.log("Checking exact matching between TOOL_ORDER and button data-button-name attributes");

        // Get all buttons with data-button-name attribute
        const allNamedButtons = Array.from(document.querySelectorAll('[data-button-name]'))
            .map(btn => btn.getAttribute('data-button-name'));

        console.log(`Found ${allNamedButtons.length} buttons with data-button-name attributes`);

        // Check each tool in toolOrder
        toolOrder.forEach((toolName, index) => {
            const matchingButtons = allNamedButtons.filter(btnName => btnName === toolName);
            console.log(`Tool "${toolName}" (index ${index}): ${matchingButtons.length} matching buttons found`);

            if (matchingButtons.length === 0) {
                console.warn(`WARNING: No buttons found with exact matching name for tool "${toolName}"`);
                // Try to find close matches for debugging
                const closeMatches = allNamedButtons.filter(btnName =>
                    btnName.toLowerCase().includes(toolName.toLowerCase()) ||
                    toolName.toLowerCase().includes(btnName.toLowerCase())
                );
                if (closeMatches.length > 0) {
                    console.log(`Possible similar matches: ${closeMatches.join(', ')}`);
                }
            }
        });

        console.log("===== END VERIFICATION =====\n");
    };

    // Function to create tooltips for tool buttons
    const setupToolTooltip = (button, toolIndex, steps) => {
        if (toolIndex < 0 || toolIndex >= steps.length) return;

        let tooltipTimeout;
        let tooltip = null;

        button.addEventListener('mouseenter', () => {
            // Set longer delay before showing tooltip (1.5 seconds)
            tooltipTimeout = setTimeout(() => {
                // Create tooltip
                tooltip = document.createElement('div');
                tooltip.className = 'tool-tooltip';
                tooltip.style.position = 'fixed'; // Use fixed positioning relative to viewport
                tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                tooltip.style.color = 'white';
                tooltip.style.padding = '15px';
                tooltip.style.borderRadius = '6px';
                tooltip.style.fontSize = '14px';
                tooltip.style.zIndex = '10001';
                tooltip.style.maxWidth = '350px';
                tooltip.style.width = 'auto';
                tooltip.style.whiteSpace = 'normal';
                tooltip.style.textAlign = 'left';
                tooltip.style.lineHeight = '1.5';
                tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                tooltip.innerHTML = steps[toolIndex];
                tooltip.style.visibility = "hidden";


                // Add step number label
                const stepLabel = document.createElement('div');
                stepLabel.style.fontSize = '12px';
                stepLabel.style.color = '#26C9FF';
                stepLabel.style.marginBottom = '8px';
                stepLabel.style.fontWeight = 'bold';
                stepLabel.textContent = `Step ${toolIndex + 1}`;
                tooltip.insertBefore(stepLabel, tooltip.firstChild);

                // Add tooltip to body (not to button) for better positioning
                document.body.appendChild(tooltip);

                // Position tooltip near mouse cursor
                const updateTooltipPosition = (e) => {
                    // Get mouse position
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;

                    // Calculate tooltip position
                    let left = mouseX + 15; // Offset from cursor
                    let top = mouseY + 15;

                    // Check if tooltip would go off-screen and adjust if needed
                    const tooltipRect = tooltip.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    if (left + tooltipRect.width > viewportWidth) {
                        left = mouseX - tooltipRect.width - 15;
                    }

                    if (top + tooltipRect.height > viewportHeight) {
                        top = mouseY - tooltipRect.height - 15;
                    }

                    // Apply position
                    tooltip.style.left = `${left}px`;
                    tooltip.style.top = `${top}px`;
                };

                // Initial positioning
                updateTooltipPosition(event);

                // Update tooltip position on mouse move
                button.addEventListener('mousemove', updateTooltipPosition);

                // Store the mousemove handler
                button.tooltipUpdateHandler = updateTooltipPosition;

            }, 1500); // 1.5 seconds delay before showing
        });

        button.addEventListener('mouseleave', () => {
            clearTimeout(tooltipTimeout);

            // Remove tooltip
            if (tooltip && tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
                tooltip = null;
            }

            // Remove the mousemove handler
            if (button.tooltipUpdateHandler) {
                button.removeEventListener('mousemove', button.tooltipUpdateHandler);
                button.tooltipUpdateHandler = null;
            }
        });
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

    // Function to call OpenAI API with retry logic
    const callOpenAIAPI = async (endpoint, prompt, maxRetries = 3, initialDelay = 1000) => {
        let retries = 0;
        let delay = initialDelay;

        while (retries <= maxRetries) {
            try {
                console.log(`Calling OpenAI API (attempt ${retries + 1}/${maxRetries + 1})...`);

                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'API KEY'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        max_tokens: endpoint === 'approaches' ? 300 : 1000,
                        temperature: 0.7
                    }),
                    // Add timeout
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                    console.error("Invalid or empty response:", data);
                    throw new Error("Received invalid or empty response from API");
                }

                const content = data.choices[0].message.content;

                if (!content || content.trim() === '') {
                    throw new Error("API returned empty content");
                }

                console.log(`OpenAI API call successful for ${endpoint}`);
                return content;
            } catch (error) {
                console.error(`API call failed (attempt ${retries + 1}/${maxRetries + 1}):`, error);

                if (retries >= maxRetries) {
                    console.error(`Max retries (${maxRetries}) reached. Giving up.`);
                    throw error;
                }

                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
                retries++;
            }
        }
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

            const content = await callOpenAIAPI('approaches', prompt);

            try {
                // Parse the JSON response
                return JSON.parse(content);
            } catch (parseError) {
                console.error("Error parsing JSON from API response:", parseError);
                console.log("Raw response:", content);

                // Attempt to extract JSON from text if it's embedded in other text
                const jsonMatch = content.match(/\[\s*\{.*\}\s*\]/s);
                if (jsonMatch) {
                    try {
                        return JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        console.error("Failed to extract JSON:", e);
                    }
                }

                // Return default approaches as fallback
                return [
                    {"approach": "Create using basic shapes then combine them for a unified structure."},
                    {"approach": "Start with 2D sketches, then extrude into 3D forms for precision."},
                    {"approach": "Begin with a base shape, then sculpt and refine with modeling tools."}
                ];
            }
        } catch (error) {
            console.error("Error generating approaches:", error);
            // Return default approaches in case of error
            return [
                {"approach": "Create using basic shapes then combine them for a unified structure."},
                {"approach": "Start with 2D sketches, then extrude into 3D forms for precision."},
                {"approach": "Begin with a base shape, then sculpt and refine with modeling tools."}
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

                Number each step clearly (1., 2., 3., etc.) and start each step with the exact tool name that should be used.
                For example: "1. Use the Cube tool to create the base of the object."

                VERY IMPORTANT: Please include a comma-separated list at the end of your response titled "TOOL_ORDER:"
                that lists, in order of use, all the tool names that should be used in this plan. The tool names MUST EXACTLY match
                the data-button-name attributes of the buttons in the UI. Common tool names are: Cube, Sphere, Cylinder, Cone, Torus,
                Scale, Move, Rotate, Edit Details, Fillet, Combine.

                Example: "TOOL_ORDER: Cube, Extrusion, Fillet, Move"
            `;

            // Add explicit instruction to ensure TOOL_ORDER section is included
            prompt += `

                I MUST include a clear TOOL_ORDER: section in my response with a comma-separated list
                of ALL tools needed, in the exact order they should be used.
                Example: "TOOL_ORDER: Cube, Extrude, Fillet, Move"
            `;

            return await callOpenAIAPI('actionPlan', prompt);
        } catch (error) {
            console.error("Error generating action plan:", error);
            return "Error generating action plan. Please try again later.\n\nTOOL_ORDER: Cube, Sphere, Cylinder, Scale, Move, Rotate";
        }
    };

    // Function to get secondary tools from ChatGPT
    const getSecondaryTools = async (primaryTools, objectToMake) => {
        try {
            // Prepare the prompt for ChatGPT
            const prompt = `
                I'm creating "${objectToMake}" in SelfCAD. I already have the main tools I need, which are:
                ${primaryTools.join(', ')}

                Based on this task, what additional tools from SelfCAD might be helpful that aren't already in my main list?

                Please provide a list of tool names that aren't in my main tools list but might be helpful.
                Return your answer in this format:
                "SECONDARY_TOOLS: Tool1, Tool2, Tool3, etc."

                The tool names should match exactly from this list:
                ${JSON.stringify(toolboxData.tools.map(tool => tool.name))}
            `;

            const content = await callOpenAIAPI('secondaryTools', prompt);

            // Extract the secondary tools list
            const match = content.match(/SECONDARY_TOOLS:\s*([\w\s,]+)(?:\n|$)/);

            if (match && match[1]) {
                // Parse the comma-separated list, being careful with spaces
                const secondaryTools = match[1].split(',').map(tool => tool.trim());
                // Filter out any tools already in primary list
                return secondaryTools.filter(tool => !primaryTools.includes(tool));
            }

            // If no proper format is found, try to extract a list from the text
            const toolMentions = toolboxData.tools
                .map(tool => tool.name)
                .filter(toolName =>
                    !primaryTools.includes(toolName) &&
                    content.includes(toolName)
                );

            if (toolMentions.length > 0) {
                return toolMentions;
            }

            return [];
        } catch (error) {
            console.error("Error getting secondary tools:", error);
            // Return a few generic secondary tools as fallback
            return ["Fillet", "Chamfer", "Boolean", "Group"];
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

            // Verify these tool names will match exactly with button data-button-name attributes
            console.log("Verifying tool names for exact matching...");

            // Log each tool name for debugging
            toolOrder.forEach((toolName, index) => {
                console.log(`Tool ${index + 1}: "${toolName}"`);
            });

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

                // Log each tool name for debugging
                extractedTools.forEach((toolName, index) => {
                    console.log(`Tool ${index + 1}: "${toolName}"`);
                });

                return extractedTools;
            }
        }

        // More aggressive extraction - look for any mentions of tools in numbered steps
        const lines = actionPlanText.split('\n');
        const numberedLines = lines.filter(line => /^\d+\./.test(line.trim()));

        if (numberedLines.length > 0) {
            const toolsFromNumberedLines = [];

            for (const line of numberedLines) {
                for (const tool of toolboxData.tools) {
                    if (line.includes(tool.name)) {
                        toolsFromNumberedLines.push(tool.name);
                        break; // Only add the first tool found in each line
                    }
                }
            }

            if (toolsFromNumberedLines.length > 0) {
                console.log("Extracted tools from numbered lines:", toolsFromNumberedLines);

                // Log each tool name for debugging
                toolsFromNumberedLines.forEach((toolName, index) => {
                    console.log(`Tool ${index + 1}: "${toolName}"`);
                });

                return toolsFromNumberedLines;
            }
        }

        // If no TOOL_ORDER section found, return default tools to prevent incorrect ordering
        console.warn("No TOOL_ORDER section found in action plan! Returning default tool set.");
        return ["Cube", "Sphere", "Cylinder", "Scale", "Move", "Rotate"];
    };

    // Function to parse the action plan into steps
    const parseActionPlanIntoSteps = (actionPlanText) => {
        // Skip the TOOL_ORDER section
        const planTextWithoutToolOrder = actionPlanText.replace(/TOOL_ORDER:.*$/s, '').trim();

        // Split by numbered steps
        const stepRegex = /(\d+\.\s+.*?)(?=\d+\.\s+|$)/gs;
        const matches = [...planTextWithoutToolOrder.matchAll(stepRegex)];

        if (matches && matches.length > 0) {
            return matches.map(match => match[1].trim());
        }

        // Fallback: split by newlines if numbered steps aren't found
        return planTextWithoutToolOrder.split('\n').filter(line => line.trim() !== '');
    };

    // Extract step descriptions from action plan steps
    const extractStepDescriptions = (actionPlanSteps) => {
        return actionPlanSteps.map(step => {
            // Remove the step number prefix and any leading tool name
            const withoutNumber = step.replace(/^\d+\.\s+/, '');
            // Try to find the actual instruction, skipping the tool name mention
            const withoutToolMention = withoutNumber.replace(/^Use\s+the\s+\w+\s+tool\s+to\s+/, '');
            return withoutToolMention;
        });
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

            // Reset the current step index
            currentStepIndex = 0;

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
        let actionPlanSteps = [];
        let stepDescriptions = [];
        let actionPlanDisplay = null;
        let currentStepHighlight = null;
        // Store priorityMap at a higher scope for access by the debug button
        let priorityMap = new Map();

        // Extract tool order from action plan
        if (actionPlan) {
            toolOrder = extractToolOrder(actionPlan);
            console.log("Tool order extracted:", toolOrder);

            // Parse action plan into steps
            actionPlanSteps = parseActionPlanIntoSteps(actionPlan);
            console.log("Action plan steps:", actionPlanSteps);

            // Extract step descriptions
            stepDescriptions = extractStepDescriptions(actionPlanSteps);
            console.log("Step descriptions:", stepDescriptions);

            // Also log the raw TOOL_ORDER section from the action plan
            const toolOrderMatch = actionPlan.match(/TOOL_ORDER:\s*([\w\s,]+)(?:\n|$)/);
            if (toolOrderMatch && toolOrderMatch[0]) {
                console.log("Raw TOOL_ORDER section:", toolOrderMatch[0]);
            } else {
                console.warn("No raw TOOL_ORDER section found in action plan!");
            }

            // Get secondary tools
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

        // Function to highlight the current step in the action plan display
        const highlightCurrentStep = () => {
            if (!actionPlanDisplay || actionPlanSteps.length === 0) return;

            // Remove all previous highlights
            const allSteps = actionPlanDisplay.querySelectorAll('.step');
            allSteps.forEach(step => {
                step.classList.remove('current-step');
                step.style.backgroundColor = 'transparent';
                step.style.border = '1px solid transparent';
            });

            // Create highlight element for current step if it doesn't exist
            if (!actionPlanDisplay.querySelector('.steps-container')) {
                // First time setup - create structured step display
                const stepsContainer = document.createElement('div');
                stepsContainer.className = 'steps-container';
                stepsContainer.style.marginTop = '10px';

                actionPlanSteps.forEach((step, index) => {
                    const stepElement = document.createElement('div');
                    stepElement.className = 'step';
                    stepElement.dataset.stepIndex = index;
                    stepElement.innerHTML = step; // Use innerHTML to preserve HTML formatting (bold tool name)
                    stepElement.style.padding = '8px';
                    stepElement.style.marginBottom = '5px';
                    stepElement.style.borderRadius = '4px';
                    stepElement.style.transition = 'background-color 0.3s';

                    stepsContainer.appendChild(stepElement);
                });

                // Clear existing content and add the structured steps
                const contentElement = actionPlanDisplay.querySelector('.action-plan-content');
                if (contentElement) {
                    contentElement.innerHTML = '';
                    contentElement.appendChild(stepsContainer);
                }
            }

            // Highlight current step
            const stepElements = actionPlanDisplay.querySelectorAll('.step');
            if (stepElements.length > currentStepIndex) {
                currentStepHighlight = stepElements[currentStepIndex];
                currentStepHighlight.classList.add('current-step');
                currentStepHighlight.style.backgroundColor = '#e6f7ff';
                currentStepHighlight.style.border = '1px solid #91d5ff';

                // Scroll to the current step
                currentStepHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        // Function to advance to the next step
        const advanceToNextStep = () => {
            if (actionPlanSteps.length > 0 && currentStepIndex < actionPlanSteps.length - 1) {
                currentStepIndex++;
                populateSmartToolbox(smartToolbox, targetDiv); // Refresh to highlight next tool
            }
        };

        // Create stepper component
        const createStepper = (container, toolOrder) => {
            const stepperContainer = document.createElement('div');
            stepperContainer.className = 'stepper-container';
            stepperContainer.style.display = 'flex';
            stepperContainer.style.alignItems = 'center';
            stepperContainer.style.justifyContent = 'space-between';
            stepperContainer.style.marginBottom = '8px';
            stepperContainer.style.padding = '0 10px';
            stepperContainer.style.width = '100%';
            stepperContainer.style.boxSizing = 'border-box';

            // Create step buttons with lines between them
            toolOrder.forEach((tool, index) => {
                // Create the circle
                const step = document.createElement('div');
                step.className = 'step-indicator';
                step.dataset.step = index + 1;
                step.style.width = '36px';
                step.style.height = '36px';
                step.style.borderRadius = '50%';
                step.style.backgroundColor = index <= currentStepIndex ? '#14708E' : '#D9D9D9';
                step.style.color = 'white';
                step.style.display = 'flex';
                step.style.alignItems = 'center';
                step.style.justifyContent = 'center';
                step.style.fontWeight = 'bold';
                step.style.fontSize = '16px';
                step.style.fontFamily = "'Inter', sans-serif";
                step.style.zIndex = '2';
                step.textContent = index + 1;

                stepperContainer.appendChild(step);

                // Add connector line if not the last step
                if (index < toolOrder.length - 1) {
                    const line = document.createElement('div');
                    line.className = 'step-line';
                    line.style.flex = '1';
                    line.style.height = '2px';
                    line.style.backgroundColor = index < currentStepIndex ? '#14708E' : '#D9D9D9';
                    line.style.zIndex = '1';

                    stepperContainer.appendChild(line);
                }
            });

            container.appendChild(stepperContainer);
        };

        // Extract the repeated code into a function for populating the toolbox
        const populateSmartToolbox = (toolbox, sourceDiv) => {
            toolbox.innerHTML = ""; // clear previous content

            // Create stepper at the top
            createStepper(toolbox, toolOrder);

            // First, collect all buttons
            const allButtons = [];

            // Debug the tool order before sorting
            console.log("Tool order before sorting:", toolOrder);

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
                            stackedContainer.className = "button-content";

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
                            // Ensure consistent width with box-sizing
                            clonedDropdownItem.style.minWidth = "85px"; // Minimum width
                            clonedDropdownItem.style.width = "85px"; // Fixed width
                            clonedDropdownItem.style.maxWidth = "85px"; // Maximum width
                            clonedDropdownItem.style.boxSizing = "border-box"; // Include padding in width calculation
                            clonedDropdownItem.style.transition = "all 0.3s ease";

                            // Add disabled styling if original item is disabled
                            if (dropdownItem.classList.contains('disabled')) {
                                clonedDropdownItem.classList.add('disabled');
                                clonedDropdownItem.style.opacity = "0.6";
                                clonedDropdownItem.style.cursor = "not-allowed";
                            } else {
                                clonedDropdownItem.addEventListener("click", () => {
                                    dropdownItem.click();
                                    // Advance to next step when a tool is clicked
                                    if (clonedDropdownItem.classList.contains('current-tool')) {
                                        advanceToNextStep();
                                    }
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
                    // Ensure consistent width with box-sizing
                    clonedChild.style.minWidth = "85px"; // Minimum width
                    clonedChild.style.width = "85px"; // Fixed width
                    clonedChild.style.maxWidth = "85px"; // Maximum width
                    clonedChild.style.boxSizing = "border-box"; // Include padding in width calculation
                    clonedChild.style.border = "1px solid #ddd";
                    clonedChild.style.backgroundColor = "#f9f9f9";
                    clonedChild.style.margin = "2px";
                    clonedChild.style.display = "flex";
                    clonedChild.style.flexDirection = "column";
                    clonedChild.style.alignItems = "center";
                    clonedChild.style.justifyContent = "center";
                    clonedChild.style.transition = "all 0.3s ease";

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
                            // Advance to next step when a tool is clicked
                            if (clonedChild.classList.contains('current-tool')) {
                                advanceToNextStep();
                            }
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

            // MODIFIED: Direct sorting by exact tool name matching without normalization
            if (toolOrder.length > 0) {
                console.log("Sorting buttons based on tool order:", toolOrder);

                // Create a priority map using exact tool names, no normalization
                priorityMap = new Map();
                toolOrder.forEach((toolName, index) => {
                    priorityMap.set(toolName, index);
                    console.log(`Priority ${index}: "${toolName}"`);
                });

                // Sort primary buttons based on priority
                primaryButtons.sort((a, b) => {
                    // Get the exact data-button-name
                    const aName = a.getAttribute('data-button-name');
                    const bName = b.getAttribute('data-button-name');

                    console.log(`Comparing button names: "${aName}" vs "${bName}"`);

                    // Get priority values
                    const aPriority = priorityMap.get(aName);
                    const bPriority = priorityMap.get(bName);

                    console.log(`Priorities: ${aPriority} vs ${bPriority}`);

                    if (aPriority === undefined && bPriority === undefined) {
                        return 0;
                    } else if (aPriority === undefined) {
                        return 1; // b comes before a
                    } else if (bPriority === undefined) {
                        return -1; // a comes before b
                    }

                    return aPriority - bPriority;
                });

                console.log("Primary buttons after sorting:",
                    primaryButtons.map(b => `"${b.getAttribute('data-button-name')}"`));

                // Verify matching between priority map and data-button-name attributes
                console.log("Verifying priority map against button attributes:");
                primaryButtons.forEach(button => {
                    const buttonName = button.getAttribute('data-button-name');
                    const priority = priorityMap.get(buttonName);
                    console.log(`Button: "${buttonName}", Priority: ${priority !== undefined ? priority : "Not found in priority map"}`);
                });
            }

            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'button-container';
            buttonContainer.style.display = 'flex';
            buttonContainer.style.alignItems = 'center';
            buttonContainer.style.justifyContent = 'flex-start';
            buttonContainer.style.overflowX = 'auto';
            buttonContainer.style.overflowY = 'hidden';
            buttonContainer.style.width = '100%';
            buttonContainer.style.padding = '0 10px';

            // Create a collapsible button for additional tools
            let additionalToolsToggle = null;
            let secondaryToolsContainer = null;

            // Add primary buttons to the toolbox with highlighting for current step
            primaryButtons.forEach((button, index) => {
                const buttonName = button.getAttribute('data-button-name');
                const toolIndex = toolOrder.indexOf(buttonName);

                // Special styling for current step button
                if (toolIndex === currentStepIndex) {
                    button.classList.add('current-tool');

                    // Expand the button horizontally and show the step description
                    button.style.width = 'auto';
                    button.style.maxWidth = '300px'; // Set a reasonable max width
                    button.style.border = '2px solid #26C9FF';
                    button.style.boxShadow = '0 0 8px rgba(38, 201, 255, 0.6)';
                    button.style.backgroundColor = '#e6f7ff';

                    // Add step description
                    if (stepDescriptions && stepDescriptions[toolIndex]) {
                        const descriptionElement = document.createElement('div');
                        descriptionElement.className = 'step-description';
                        descriptionElement.textContent = stepDescriptions[toolIndex];
                        descriptionElement.style.fontSize = '12px';
                        descriptionElement.style.color = '#14708E';
                        descriptionElement.style.marginTop = '5px';
                        descriptionElement.style.textAlign = 'center';
                        descriptionElement.style.padding = '0 10px';

                        const buttonContent = button.querySelector('.button-content');
                        if (buttonContent) {
                            buttonContent.appendChild(descriptionElement);
                        } else {
                            button.appendChild(descriptionElement);
                        }
                    }
                }

                buttonContainer.appendChild(button);
            });

            if (secondaryButtons.length > 0) {
                // Create the extra tools button
                additionalToolsToggle = document.createElement('div');
                additionalToolsToggle.className = 'additional-tools-toggle';
                additionalToolsToggle.style.height = '85px';
                additionalToolsToggle.style.minWidth = '85px';
                additionalToolsToggle.style.maxWidth = '120px';
                additionalToolsToggle.style.backgroundColor = '#14708E'; // Dark blue theme color
                additionalToolsToggle.style.padding = '0 15px'; // Add padding
                additionalToolsToggle.style.margin = '0 5px';
                additionalToolsToggle.style.borderRadius = '4px';
                additionalToolsToggle.style.boxShadow = '0 0 5px rgba(38, 201, 255, 0.5)';
                additionalToolsToggle.style.cursor = 'pointer';
                additionalToolsToggle.style.position = 'relative';
                additionalToolsToggle.style.color = 'white';
                additionalToolsToggle.style.display = 'flex';
                additionalToolsToggle.style.flexDirection = 'column';
                additionalToolsToggle.style.alignItems = 'center';
                additionalToolsToggle.style.justifyContent = 'center';
                additionalToolsToggle.innerHTML = `
                    <div style="font-size:24px; margin-bottom:5px;">+</div>
                    <div style="font-size:12px;">Extra tools</div>
                `;

                buttonContainer.appendChild(additionalToolsToggle);

                // Create container for secondary tools (separate from main container)
                secondaryToolsContainer = document.createElement('div');
                secondaryToolsContainer.className = 'secondary-tools-container';
                secondaryToolsContainer.style.display = 'none'; // Hidden by default
                secondaryToolsContainer.style.position = 'absolute';
                secondaryToolsContainer.style.top = '140px'; // Position below the main toolbar
                secondaryToolsContainer.style.left = '0';
                secondaryToolsContainer.style.width = '100%';
                secondaryToolsContainer.style.backgroundColor = 'white';
                secondaryToolsContainer.style.border = '1px solid #ddd';
                secondaryToolsContainer.style.borderRadius = '4px';
                secondaryToolsContainer.style.padding = '10px';
                secondaryToolsContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                secondaryToolsContainer.style.zIndex = '9998';
                secondaryToolsContainer.style.display = 'none'; // Initially hidden
                secondaryToolsContainer.style.flexWrap = 'wrap';
                secondaryToolsContainer.style.justifyContent = 'center';

                // Add secondary buttons to the secondary tools container
                secondaryButtons.forEach(button => {
                    secondaryToolsContainer.appendChild(button);
                });

                // Toggle functionality
                additionalToolsToggle.addEventListener('click', () => {
                    if (secondaryToolsContainer.style.display === 'none') {
                        secondaryToolsContainer.style.display = 'flex';
                        additionalToolsToggle.innerHTML = `
                            <div style="font-size:24px; margin-bottom:5px;">-</div>
                            <div style="font-size:12px;">Close</div>
                        `;
                    } else {
                        secondaryToolsContainer.style.display = 'none';
                        additionalToolsToggle.innerHTML = `
                            <div style="font-size:24px; margin-bottom:5px;">+</div>
                            <div style="font-size:12px;">Extra tools</div>
                        `;
                    }
                });

                document.body.appendChild(secondaryToolsContainer);
            }

            toolbox.appendChild(buttonContainer);

            // Call the verification function after everything is set up
            setTimeout(verifyToolNameMatching, 2000);

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
            // CHANGED: Display flex by default instead of none
            smartToolbox.style.display = "flex";
            smartToolbox.style.flexDirection = "column";
            smartToolbox.style.position = "absolute";
            smartToolbox.style.top = `${rect.top + window.scrollY}px`;
            smartToolbox.style.left = `${rect.left + window.scrollX}px`;
            smartToolbox.style.width = `${rect.width}px`;
            smartToolbox.style.zIndex = "9999";
            smartToolbox.style.backgroundColor = "white";
            smartToolbox.style.padding = "10px 0";
            smartToolbox.style.cursor = "grab";

            // append the smart toolbox to the document body
            document.body.appendChild(smartToolbox);
            console.log("Smart toolbox container added to the page.");

            // Hide the default toolbar
            targetDiv.style.display = "none";

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
                const buttonContainer = smartToolbox.querySelector('.button-container');
                if (!buttonContainer) return;

                isDragging = true;
                buttonContainer.style.cursor = "grabbing"; // indicate active dragging
                startX = e.pageX - buttonContainer.offsetLeft;
                scrollLeft = buttonContainer.scrollLeft;
                e.preventDefault(); // prevent text selection
            });

            document.addEventListener("mouseup", () => {
                const buttonContainer = smartToolbox.querySelector('.button-container');
                if (!buttonContainer) return;

                isDragging = false;
                buttonContainer.style.cursor = "grab"; // return to normal cursor
            });

            document.addEventListener("mousemove", (e) => {
                const buttonContainer = smartToolbox.querySelector('.button-container');
                if (!buttonContainer || !isDragging) return;

                const x = e.pageX - buttonContainer.offsetLeft;
                const walk = (x - startX) * 2; // adjust speed
                buttonContainer.scrollLeft = scrollLeft - walk;
            });

            // function to toggle toolbox visibility and populate it
            const toggleSmartToolbox = () => {
                if (smartToolbox.style.display === "none") {
                    // Populate the smart toolbox using the extracted function
                    populateSmartToolbox(smartToolbox, targetDiv);

                    smartToolbox.style.display = "flex"; // Changed to flex for column layout
                    targetDiv.style.display = "none"; // Hide default toolbar
                    toggleButton.innerText = "Default view"; // Changed text order
                } else {
                    smartToolbox.style.display = "none";
                    targetDiv.style.display = "block";
                    toggleButton.innerText = "Smart toolbox";
                }
            };

            // Create toggle button and add it to quick-menus div
            const toggleButton = document.createElement("button");
            // CHANGED: Initial text now "Default view" since we start with smart toolbox visible
            toggleButton.innerText = "Default view";

            // ENHANCED: Styling for the toggle button
            toggleButton.style.height = "30px"; // Make the button taller
            toggleButton.style.padding = "0 12px";
            toggleButton.style.marginLeft = "10px";
            toggleButton.style.borderRadius = "4px";
            toggleButton.style.border = "2px solid #26C9FF"; // Bold border
            toggleButton.style.background = "linear-gradient(90deg, #14708E 0%, #26C9FF 69%)"; // Gradient from popup
            toggleButton.style.color = "white"; // White text
            toggleButton.style.cursor = "pointer";
            toggleButton.style.fontSize = "12px";
            toggleButton.style.fontWeight = "600"; // Bold text

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
                const currentButtons = Array.from(smartToolbox.querySelectorAll('[data-button-name]'));
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
                debugButton.style.right = "130px"; // Position to the left of toggle button
                debugButton.style.zIndex = "10001";
                document.body.appendChild(debugButton);
            }

            toggleButton.addEventListener("click", toggleSmartToolbox);

            // Setup observers for UI interactions
            setupInteractionObservers();

            // Populate the toolbox initially
            populateSmartToolbox(smartToolbox, targetDiv);
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
        };

        waitForTargetDiv();
    }

    // Start the application by fetching the toolbox data
    initializeApp();
})();

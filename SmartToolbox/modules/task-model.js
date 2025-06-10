class TaskModelModule {
    constructor(apiClient, toolOntology) {
        this.apiClient = apiClient;
        this.toolOntology = toolOntology;
    }

    async generateTaskModel(userContext) {
        try {
            const actionPlan = await this.generateActionPlan(userContext.objectToMake, userContext.userApproach);
            
            return {
                actionPlan: actionPlan,
                toolOrder: this.extractToolOrder(actionPlan),
                steps: this.parseActionPlanIntoSteps(actionPlan),
                userContext: userContext
            };
        } catch (error) {
            console.error('Task model generation failed:', error);
            return this.getDefaultTaskModel(userContext);
        }
    }

    async generateActionPlan(objectToMake, userApproach) {
        const prompt = `
            I want to create "${objectToMake}" using SelfCAD. My preferred approach is: "${userApproach}".

            Here are all the tools available in SelfCAD that I can use:
            ${JSON.stringify(this.toolOntology)}

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

            I MUST include a clear TOOL_ORDER: section in my response with a comma-separated list
            of ALL tools needed, in the exact order they should be used.
            Example: "TOOL_ORDER: Cube, Extrude, Fillet, Move"
        `;

        return await this.apiClient.callLLM(prompt, { endpoint: 'actionPlan' });
    }

    extractToolOrder(actionPlanText) {
        console.log("Extracting tool order from action plan");

        // Try to find the TOOL_ORDER section
        const toolOrderMatch = actionPlanText.match(/TOOL_ORDER:\s*([\w\s,]+)(?:\n|$)/);
        if (toolOrderMatch && toolOrderMatch[1]) {
            const toolOrder = toolOrderMatch[1].split(',').map(tool => tool.trim());
            console.log("Extracted tool order directly from action plan:", toolOrder);
            
            // Log each tool name for debugging
            toolOrder.forEach((toolName, index) => {
                console.log(`Tool ${index + 1}: "${toolName}"`);
            });

            return toolOrder;
        }

        // Fallback: look for numbered steps
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

        // More aggressive extraction
        const lines = actionPlanText.split('\n');
        const numberedLines = lines.filter(line => /^\d+\./.test(line.trim()));

        if (numberedLines.length > 0) {
            const toolsFromNumberedLines = [];

            for (const line of numberedLines) {
                for (const tool of this.toolOntology.tools) {
                    if (line.includes(tool.name)) {
                        toolsFromNumberedLines.push(tool.name);
                        break;
                    }
                }
            }

            if (toolsFromNumberedLines.length > 0) {
                console.log("Extracted tools from numbered lines:", toolsFromNumberedLines);
                return toolsFromNumberedLines;
            }
        }

        console.warn("No TOOL_ORDER section found in action plan! Returning default tool set.");
        return this.getDefaultTools();
    }

    parseActionPlanIntoSteps(actionPlanText) {
        // Skip the TOOL_ORDER section
        const planTextWithoutToolOrder = actionPlanText.replace(/TOOL_ORDER:.*$/s, '').trim();

        // Split by numbered steps
        const stepRegex = /(\d+\.\s+.*?)(?=\d+\.\s+|$)/gs;
        const matches = [...planTextWithoutToolOrder.matchAll(stepRegex)];

        if (matches && matches.length > 0) {
            return matches.map(match => match[1].trim());
        }

        // Fallback: split by newlines
        return planTextWithoutToolOrder.split('\n').filter(line => line.trim() !== '');
    }

    extractStepDescriptions(actionPlanSteps) {
        return actionPlanSteps.map(step => {
            // Remove the step number prefix and any leading tool name
            const withoutNumber = step.replace(/^\d+\.\s+/, '');
            // Try to find the actual instruction, skipping the tool name mention
            const withoutToolMention = withoutNumber.replace(/^Use\s+the\s+\w+\s+tool\s+to\s+/, '');
            return Utils.capitalize(withoutToolMention);
        });
    }

    async getSecondaryTools(primaryTools, objectToMake) {
        try {
            const prompt = `
                I'm creating "${objectToMake}" in SelfCAD. I already have the main tools I need, which are:
                ${primaryTools.join(', ')}

                Based on this task, what additional tools from SelfCAD might be helpful that aren't already in my main list?

                Please provide a list of tool names that aren't in my main tools list but might be helpful.
                Return your answer in this format:
                "SECONDARY_TOOLS: Tool1, Tool2, Tool3, etc."

                The tool names should match exactly from this list:
                ${JSON.stringify(this.toolOntology.tools.map(tool => tool.name))}
            `;

            const content = await this.apiClient.callLLM(prompt, { endpoint: 'secondaryTools' });

            // Extract the secondary tools list
            const match = content.match(/SECONDARY_TOOLS:\s*([\w\s,]+)(?:\n|$)/);

            if (match && match[1]) {
                const secondaryTools = match[1].split(',').map(tool => tool.trim());
                return secondaryTools.filter(tool => !primaryTools.includes(tool));
            }

            // Fallback: find tool mentions in the text
            const toolMentions = this.toolOntology.tools
                .map(tool => tool.name)
                .filter(toolName =>
                    !primaryTools.includes(toolName) &&
                    content.includes(toolName)
                );

            return toolMentions.length > 0 ? toolMentions : this.getDefaultSecondaryTools();
        } catch (error) {
            console.error("Error getting secondary tools:", error);
            return this.getDefaultSecondaryTools();
        }
    }

    getDefaultTools() {
        return ["Cube", "Sphere", "Cylinder", "Scale", "Move", "Rotate"];
    }

    getDefaultSecondaryTools() {
        return ["Fillet", "Chamfer", "Boolean", "Group"];
    }

    getDefaultTaskModel(userContext) {
        return {
            actionPlan: `Default workflow for creating ${userContext.objectToMake}:\n1. Start with basic shapes\n2. Transform as needed\n\nTOOL_ORDER: ${this.getDefaultTools().join(', ')}`,
            toolOrder: this.getDefaultTools(),
            steps: ['1. Start with basic shapes', '2. Transform as needed'],
            userContext: userContext
        };
    }
}

// Make available globally
window.TaskModelModule = TaskModelModule;

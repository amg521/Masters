class AbstractUIModule {
    constructor(toolOntology) {
        this.toolOntology = toolOntology;
    }

    generateUISpecification(taskModel) {
        const toolOrder = taskModel.toolOrder;
        const steps = taskModel.steps;

        return {
            primaryTools: this.identifyPrimaryTools(toolOrder),
            secondaryTools: [], // Will be populated later
            toolOrder: toolOrder,
            stepDescriptions: this.extractStepDescriptions(steps),
            priorityMap: this.createPriorityMap(toolOrder),
            adaptationType: 'contextual_ordering',
            userContext: taskModel.userContext
        };
    }

    identifyPrimaryTools(toolOrder) {
        // Limit primary tools to prevent overcrowding
        return toolOrder.slice(0, CONFIG.UI.MAX_PRIMARY_TOOLS);
    }

    async populateSecondaryTools(uiSpecification, taskModelModule) {
        try {
            const secondaryTools = await taskModelModule.getSecondaryTools(
                uiSpecification.primaryTools,
                uiSpecification.userContext.objectToMake
            );
            uiSpecification.secondaryTools = secondaryTools.slice(0, CONFIG.UI.MAX_SECONDARY_TOOLS);
        } catch (error) {
            console.error("Error populating secondary tools:", error);
            uiSpecification.secondaryTools = taskModelModule.getDefaultSecondaryTools();
        }
    }

    extractStepDescriptions(steps) {
        return steps.map(step => {
            // Remove the step number prefix and any leading tool name
            const withoutNumber = step.replace(/^\d+\.\s+/, '');
            const withoutToolMention = withoutNumber.replace(/^Use\s+the\s+\w+\s+tool\s+to\s+/, '');
            return Utils.capitalize(withoutToolMention);
        });
    }

    createPriorityMap(toolOrder) {
        const priorityMap = new Map();
        toolOrder.forEach((toolName, index) => {
            priorityMap.set(toolName, index);
        });
        return priorityMap;
    }

    identifySpecialButton(element) {
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

        // Check SVG contents and data attributes
        const svgs = element.querySelectorAll('svg');
        if (svgs.length > 0) {
            const svgString = Array.from(svgs).map(svg => svg.outerHTML.toLowerCase()).join(' ');
            for (const button of buttonPatterns) {
                for (const pattern of button.patterns) {
                    if (svgString.includes(pattern)) {
                        return button.name;
                    }
                }
            }
        }

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

        return null;
    }
}

// Make available globally
window.AbstractUIModule = AbstractUIModule;

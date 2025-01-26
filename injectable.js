// ==UserScript==
// @name         Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Create a smart toolbox for SelfCAD
// @author       You
// @match        https://www.selfcad.com/app/*
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

window.onload = function () {
    console.log("Smart Toolbox script has started running.");

    const toolsUrl = "https://raw.githubusercontent.com/amg521/Masters/refs/heads/main/SelfCADMapping.json";

    GM_xmlhttpRequest({
        method: "GET",
        url: toolsUrl,
        onload: (response) => {
            let toolsData;
            try {
                toolsData = JSON.parse(response.responseText);
                console.log("JSON fetched successfully:", toolsData);
            } catch (e) {
                console.error("Error parsing JSON:", e);
                return;
            }

            // Locate the default toolbar
            console.log("Attempting to locate default toolbar...");
            const defaultToolbar = document.getElementById("toolbarMenu") ||
                                   document.querySelector("#headerToolbarMenu") ||
                                   document.querySelector("#headerToolbarMenu > div") ||
                                   document.getElementById("loadToolsHeaderMenu");
            console.log("Default Toolbar:", defaultToolbar);

            if (!defaultToolbar) {
                console.error("Default toolbar not found. Check the selectors or page structure.");
                return;
            }

            // Create the Smart Toolbox container
            const smartToolbox = document.createElement('div');
            smartToolbox.id = 'smart-toolbox';
            smartToolbox.style.display = 'none'; // Initially hidden

            // Inherit the styles from the default toolbar
            smartToolbox.style.position = defaultToolbar.style.position;
            smartToolbox.style.top = defaultToolbar.style.top;
            smartToolbox.style.left = defaultToolbar.style.left;
            smartToolbox.style.width = defaultToolbar.style.width;
            smartToolbox.style.height = defaultToolbar.style.height;
            smartToolbox.style.backgroundColor = defaultToolbar.style.backgroundColor;
            smartToolbox.style.border = defaultToolbar.style.border;
            smartToolbox.style.zIndex = defaultToolbar.style.zIndex;

            // Populate the Smart Toolbox with tools
            toolsData.tools.forEach(tool => {
                console.log(`Adding tool button for: ${tool.name}`);

                const toolButton = document.createElement('button');
                toolButton.innerText = tool.name;

                // Apply styles from the default toolbar's buttons
                const defaultButton = defaultToolbar.querySelector('button');
                if (defaultButton) {
                    toolButton.style.cssText = defaultButton.style.cssText;
                }

                // Add hover effect for guidance
                toolButton.title = tool.function;

                // Add click functionality
                toolButton.addEventListener('click', () => {
                    const element = document.querySelector(tool.selector);
                    if (element) {
                        console.log(`Clicking on tool: ${tool.name}`);
                        element.click();
                    } else {
                        console.warn(`Tool not found in DOM: ${tool.name}`);
                    }
                });

                smartToolbox.appendChild(toolButton);
            });

            // Append the Smart Toolbox to the default toolbar's parent
            defaultToolbar.parentNode.appendChild(smartToolbox);

            // Create toggle button
            const toggleButton = document.createElement('button');
            toggleButton.innerText = 'Toggle Toolbox';
            toggleButton.style.position = 'fixed';
            toggleButton.style.top = '10px';
            toggleButton.style.right = '10px';
            toggleButton.style.zIndex = '10001';
            toggleButton.addEventListener('click', () => {
                if (smartToolbox.style.display === 'none') {
                    smartToolbox.style.display = 'block';
                    defaultToolbar.style.display = 'none';
                } else {
                    smartToolbox.style.display = 'none';
                    defaultToolbar.style.display = 'block';
                }
            });

            // Append toggle button to the document body
            document.body.appendChild(toggleButton);

            console.log("Smart Toolbox and toggle button added to the page.");
        },
        onerror: (error) => {
            console.error("Failed to fetch JSON:", error);
        }
    });
};

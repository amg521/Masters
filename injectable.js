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
            smartToolbox.style.position = 'fixed';
            smartToolbox.style.top = '50px';
            smartToolbox.style.left = '10px';
            smartToolbox.style.width = '300px';
            smartToolbox.style.backgroundColor = 'white';
            smartToolbox.style.zIndex = '10000';
            smartToolbox.style.border = '1px solid black';
            smartToolbox.style.padding = '10px';
            smartToolbox.style.overflowY = 'auto';

            // Add title to the Smart Toolbox
            const title = document.createElement('h3');
            title.innerText = 'Smart Toolbox';
            title.style.marginTop = '0';
            title.style.marginBottom = '10px';
            title.style.fontSize = '16px';
            title.style.textAlign = 'center';
            smartToolbox.appendChild(title);

            // Populate the Smart Toolbox with tools
            toolsData.tools.forEach(tool => {
                console.log(`Adding tool button for: ${tool.name}`);

                const toolButton = document.createElement('button');
                toolButton.innerText = tool.name;
                toolButton.style.display = 'block';
                toolButton.style.width = '100%';
                toolButton.style.marginBottom = '5px';
                toolButton.style.padding = '8px';
                toolButton.style.border = '1px solid #ccc';
                toolButton.style.borderRadius = '4px';
                toolButton.style.backgroundColor = '#fff';
                toolButton.style.cursor = 'pointer';

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

            // Append the Smart Toolbox to the document body
            console.log("Appending Smart Toolbox to document body...");
            document.body.appendChild(smartToolbox);
            console.log("Smart Toolbox appended. Verifying existence...");
            console.log(document.getElementById('smart-toolbox'));

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

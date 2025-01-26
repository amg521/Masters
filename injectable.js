// ==UserScript==
// @name         Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Create a smart toolbox for SelfCAD
// @author       You
// @match        https://www.selfcad.com/app/*
// @connect      raw.githubusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

window.onload = async function () {
    const toolsUrl = "https://raw.githubusercontent.com/amg521/Masters/refs/heads/main/Site.json";

    let toolsData;
    try {
        toolsData = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: toolsUrl,
                onload: (response) => {
                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: (error) => reject(error),
            });
        });
    } catch (error) {
        console.error("Failed to fetch JSON:", error);
        return;
    }

    // Create the Smart Toolbox container
    const smartToolbox = document.createElement('div');
    smartToolbox.id = 'smart-toolbox';
    smartToolbox.style.position = 'fixed';
    smartToolbox.style.top = '10px';
    smartToolbox.style.right = '10px';
    smartToolbox.style.width = '300px';
    smartToolbox.style.height = 'auto';
    smartToolbox.style.backgroundColor = '#f9f9f9';
    smartToolbox.style.border = '1px solid #ccc';
    smartToolbox.style.padding = '10px';
    smartToolbox.style.overflowY = 'auto';
    smartToolbox.style.zIndex = '10000';

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
                element.click();
            } else {
                console.warn(`Tool not found in DOM: ${tool.name}`);
            }
        });

        smartToolbox.appendChild(toolButton);
    });

    // Append the Smart Toolbox to the document body
    document.body.appendChild(smartToolbox);
};

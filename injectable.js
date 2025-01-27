// ==UserScript==
// @name         Smart Toolbox Cloner
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Clone the child elements of a specific div into a smart toolbox on toggle
// @author       You
// @match        https://www.selfcad.com/app/*
// @grant        none
// ==/UserScript==

(function () {
    console.log("Smart Toolbox script has started running.");

    // Function to wait for the target div to appear
    const waitForTargetDiv = () => {
        const targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
        if (targetDiv) {
            console.log("Target div located:", targetDiv);
            initializeSmartToolbox(targetDiv);
        } else {
            console.log("Target div not found. Retrying...");
            setTimeout(waitForTargetDiv, 500); // Retry every 500ms
        }
    };

    // Initialize the smart toolbox
    const initializeSmartToolbox = (targetDiv) => {
        console.log("Initializing Smart Toolbox...");

        // Create the Smart Toolbox container
        const smartToolbox = document.createElement("div");
        smartToolbox.id = "smart-toolbox";
        smartToolbox.style.display = "none"; // Initially hidden
        smartToolbox.style.position = "absolute";
        smartToolbox.style.top = "10px";
        smartToolbox.style.left = "10px";
        smartToolbox.style.backgroundColor = "white";
        smartToolbox.style.border = "1px solid #ccc";
        smartToolbox.style.padding = "10px";
        smartToolbox.style.zIndex = "10000";

        // Append the Smart Toolbox to the document body
        document.body.appendChild(smartToolbox);
        console.log("Smart Toolbox container added to the page.");

        // Function to clone and move child elements into the smart toolbox
        const toggleSmartToolbox = () => {
            if (smartToolbox.style.display === "none") {
                // Clone all child elements into the smart toolbox
                smartToolbox.innerHTML = ""; // Clear previous content
                Array.from(targetDiv.children).forEach((child) => {
                    const clonedChild = child.cloneNode(true); // Deep clone the child element
                    smartToolbox.appendChild(clonedChild);
                });
                console.log("Child elements cloned into the smart toolbox.");

                // Show the smart toolbox and hide the original toolbar
                smartToolbox.style.display = "block";
                targetDiv.style.display = "none";
            } else {
                // Hide the smart toolbox and show the original toolbar
                smartToolbox.style.display = "none";
                targetDiv.style.display = "block";
            }
        };

        // Create a toggle button for the smart toolbox
        const toggleButton = document.createElement("button");
        toggleButton.innerText = "Toggle Toolbox";
        toggleButton.style.position = "fixed";
        toggleButton.style.top = "10px";
        toggleButton.style.right = "10px";
        toggleButton.style.zIndex = "10001";
        toggleButton.style.padding = "10px";
        toggleButton.style.backgroundColor = "#007BFF";
        toggleButton.style.color = "#FFF";
        toggleButton.style.border = "none";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.borderRadius = "5px";

        // Add a hover effect to the toggle button
        toggleButton.addEventListener("mouseover", () => {
            toggleButton.style.backgroundColor = "#0056b3";
        });
        toggleButton.addEventListener("mouseout", () => {
            toggleButton.style.backgroundColor = "#007BFF";
        });

        // Add toggle functionality
        toggleButton.addEventListener("click", toggleSmartToolbox);

        // Append the toggle button to the document body
        document.body.appendChild(toggleButton);
        console.log("Toggle button added to the page.");
    };

    // Start waiting for the target div to load
    waitForTargetDiv();
})();

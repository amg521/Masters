// ==UserScript==
// @name         Smart Toolbox with Visible Dropdown Text
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  clone toolbar buttons into a smart toolbox, ensure dropdown item text is visible from the start
// @author       You
// @match        https://www.selfcad.com/app/*
// @grant        none
// ==/UserScript==

(function () {
    console.log("smart toolbox script has started running.");

    // function to wait for the target div to appear
    const waitForTargetDiv = () => {
        const targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
        if (targetDiv) {
            console.log("target div located:", targetDiv);
            initializeSmartToolbox(targetDiv);
        } else {
            console.log("target div not found. retrying...");
            setTimeout(waitForTargetDiv, 500); // retry every 500ms
        }
    };

    // initialize the smart toolbox
    const initializeSmartToolbox = (targetDiv) => {
        console.log("initializing smart toolbox...");

        // create the smart toolbox container
        const smartToolbox = document.createElement("div");
        smartToolbox.id = "smart-toolbox";
        smartToolbox.style.display = "none"; // initially hidden
        smartToolbox.style.position = "absolute";
        smartToolbox.style.top = "10px";
        smartToolbox.style.left = "10px";
        smartToolbox.style.width = "400px"; // fixed width
        smartToolbox.style.height = "600px"; // fixed height
        smartToolbox.style.overflowY = "auto"; // scroll if content overflows
        smartToolbox.style.backgroundColor = "white";
        smartToolbox.style.border = "1px solid #ccc";
        smartToolbox.style.padding = "10px";
        smartToolbox.style.zIndex = "10000";

        // append the smart toolbox to the document body
        document.body.appendChild(smartToolbox);
        console.log("smart toolbox container added to the page.");

        // function to clone and move child elements into the smart toolbox
        const toggleSmartToolbox = () => {
            if (smartToolbox.style.display === "none") {
                // clear previous content
                smartToolbox.innerHTML = "";

                // process all child elements of the target toolbar
                Array.from(targetDiv.children).forEach((child) => {
                    const clonedChild = child.cloneNode(true); // deep clone the child element

                    // if the child contains subchildren with "dropdown-item" classes, extract them
                    const dropdownItems = clonedChild.querySelectorAll('[class^="dropdown-item"]');
                    if (dropdownItems.length > 0) {
                        dropdownItems.forEach((dropdownItem) => {
                            const clonedDropdownItem = dropdownItem.cloneNode(true); // deep clone each dropdown item

                            // ensure the text is visible from the start
                            const textElement = clonedDropdownItem.querySelector('[rv-text="btn.labelText"]');
                            if (textElement) {
                                textElement.style.color = "black"; // make text visible
                            }

                            clonedDropdownItem.style.marginBottom = "5px"; // add spacing between buttons
                            smartToolbox.appendChild(clonedDropdownItem);
                        });
                    } else {
                        // if not a dropdown, add the regular button
                        smartToolbox.appendChild(clonedChild);
                    }
                });

                console.log("all buttons (including dropdown subchildren) cloned into the smart toolbox.");

                // show the smart toolbox and hide the original toolbar
                smartToolbox.style.display = "block";
                targetDiv.style.display = "none";
            } else {
                // hide the smart toolbox and show the original toolbar
                smartToolbox.style.display = "none";
                targetDiv.style.display = "block";
            }
        };

        // create a toggle button for the smart toolbox
        const toggleButton = document.createElement("button");
        toggleButton.innerText = "toggle toolbox";
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

        // add a hover effect to the toggle button
        toggleButton.addEventListener("mouseover", () => {
            toggleButton.style.backgroundColor = "#0056b3";
        });
        toggleButton.addEventListener("mouseout", () => {
            toggleButton.style.backgroundColor = "#007BFF";
        });

        // add toggle functionality
        toggleButton.addEventListener("click", toggleSmartToolbox);

        // append the toggle button to the document body
        document.body.appendChild(toggleButton);
        console.log("toggle button added to the page.");
    };

    // start waiting for the target div to load
    waitForTargetDiv();
})();

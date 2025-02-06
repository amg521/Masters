// ==UserScript==
// @name         Smart Toolbox with Accurate Hover Colors
// @namespace    http://tampermonkey.net/
// @version      2.20
// @description  clone toolbar buttons into a smart toolbox, ensure left-to-right alignment, and maintain correct active/inactive colors
// @author       Axelle Groothaert
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
        smartToolbox.style.top = targetDiv.style.top;
        smartToolbox.style.left = targetDiv.style.left;
        smartToolbox.style.width = targetDiv.style.width;
        smartToolbox.style.height = targetDiv.style.height;
        smartToolbox.style.overflowX = "auto"; // horizontal scrolling if needed
        smartToolbox.style.overflowY = "hidden";
        smartToolbox.style.whiteSpace = "nowrap"; // force buttons to align in a row
        smartToolbox.style.backgroundColor = "white";
        smartToolbox.style.border = "1px solid #ccc";
        smartToolbox.style.padding = "10px";
        smartToolbox.style.zIndex = "10000";
        smartToolbox.style.display = "flex";
        smartToolbox.style.flexWrap = "nowrap";
        smartToolbox.style.alignItems = "center";
        smartToolbox.style.justifyContent = "flex-start"; // left-to-right alignment

        // append the smart toolbox to the document body
        document.body.appendChild(smartToolbox);
        console.log("smart toolbox container added to the page.");

        // function to clone and move child elements into the smart toolbox
        const toggleSmartToolbox = () => {
            if (smartToolbox.style.display === "none") {
                smartToolbox.innerHTML = ""; // clear previous content

                // loop through children of the target toolbar
                Array.from(targetDiv.children).forEach((child) => {
                    const dropdownItems = child.querySelectorAll('[class^="dropdown-item"]');
                    if (dropdownItems.length > 0) {
                        dropdownItems.forEach((dropdownItem) => {
                            const clonedDropdownItem = dropdownItem.cloneNode(true); // clone the dropdown item

                            // stack icon and label vertically
                            const iconElement = dropdownItem.querySelector('span[class^="pull-left"][class*="selfcad-grey-"]');
                            const labelElement = dropdownItem.querySelector('span[class="inner pull-left"][rv-text="btn.labelText"]');

                            if (iconElement && labelElement) {
                                const stackedContainer = document.createElement("div");
                                stackedContainer.style.display = "flex";
                                stackedContainer.style.flexDirection = "column";
                                stackedContainer.style.alignItems = "center";

                                // Append the icon and label to the stacked container
                                stackedContainer.appendChild(iconElement.cloneNode(true));
                                stackedContainer.appendChild(labelElement.cloneNode(true));

                                // Set label color dynamically based on the original dropdown item's state
                                const stackedLabel = stackedContainer.querySelector('span[class="inner pull-left"][rv-text="btn.labelText"]');
                                if (stackedLabel) {
                                    const isDisabled = dropdownItem.classList.contains('disabled');
                                    stackedLabel.style.color = isDisabled ? "rgb(158, 158, 158)" : "rgb(140, 187, 226)";
                                    stackedLabel.style.visibility = "visible";
                                    stackedLabel.style.opacity = "1";
                                    stackedLabel.style.transition = "none"; // remove hover effects
                                }

                                // Clear cloned dropdown item and append stacked content
                                clonedDropdownItem.innerHTML = "";
                                clonedDropdownItem.appendChild(stackedContainer);

                                clonedDropdownItem.style.display = "flex";
                                clonedDropdownItem.style.flexDirection = "column";
                                clonedDropdownItem.style.alignItems = "center";
                                clonedDropdownItem.style.border = "1px solid #ddd"; // match default border
                                clonedDropdownItem.style.backgroundColor = "#f9f9f9"; // match default background
                                clonedDropdownItem.style.padding = "10px";
                                clonedDropdownItem.style.margin = "5px"; // ensure spacing between buttons
                                clonedDropdownItem.style.borderRadius = "4px";
                                clonedDropdownItem.style.width = "auto";
                                clonedDropdownItem.style.minWidth = "fit-content";
                                clonedDropdownItem.style.maxWidth = "none";

                                // copy functionality from the original dropdown item
                                clonedDropdownItem.addEventListener("click", () => {
                                    dropdownItem.click(); // trigger the original button click
                                });

                                smartToolbox.appendChild(clonedDropdownItem);
                            }
                        });
                    } else {
                        const clonedChild = child.cloneNode(true); // clone regular buttons

                        // Ensure the cloned button matches the appearance of default buttons
                        clonedChild.style.border = "1px solid #ddd"; // match default border
                        clonedChild.style.backgroundColor = "#f9f9f9"; // match default background
                        clonedChild.style.width = "auto";
                        clonedChild.style.minWidth = "fit-content";
                        clonedChild.style.maxWidth = "none";
                        clonedChild.style.margin = "5px"; // spacing between buttons

                        // copy functionality for regular buttons
                        clonedChild.addEventListener("click", () => {
                            child.click(); // trigger the original button click
                        });

                        smartToolbox.appendChild(clonedChild);
                    }
                });

                console.log("all buttons (including dropdown subchildren) cloned into the smart toolbox.");

                // show the smart toolbox and hide the original toolbar
                smartToolbox.style.display = "flex";
                targetDiv.style.display = "none"; // hide the original toolbar
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

// ==UserScript==
// @name         Smart Toolbox with Drag-to-Scroll
// @namespace    http://tampermonkey.net/
// @version      2.21
// @description  Clone toolbar buttons into a smart toolbox, ensure left-to-right alignment, enable click-and-drag scrolling
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        none
// ==/UserScript==

(function () {
    console.log("smart toolbox script has started running.");

    // function to wait for the target div to appear
    const waitForTargetDiv = () => {
        const targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
        const toolbar = document.getElementById("headerToolbarMenu");

        if (!targetDiv || !toolbar) {
            console.log("Target div or toolbar not found. Retrying...");
            setTimeout(waitForTargetDiv, 500); // retry every 500ms
            return;
        }

        console.log("Target div and toolbar located.");
        initializeSmartToolbox(targetDiv, toolbar);
    };

    // initialize the smart toolbox
    const initializeSmartToolbox = (targetDiv, toolbar) => {
        console.log("Initializing smart toolbox...");

        // get toolbar dimensions
        const rect = toolbar.getBoundingClientRect();

        // create the smart toolbox container
        const smartToolbox = document.createElement("div");
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
        smartToolbox.style.display = "flex";
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

                                stackedContainer.appendChild(iconElement.cloneNode(true));
                                stackedContainer.appendChild(labelElement.cloneNode(true));

                                const stackedLabel = stackedContainer.querySelector('span[class="inner pull-left"][rv-text="btn.labelText"]');
                                if (stackedLabel) {
                                    const isDisabled = dropdownItem.classList.contains('disabled');
                                    stackedLabel.style.color = isDisabled ? "rgb(158, 158, 158)" : "rgb(140, 187, 226)";
                                    stackedLabel.style.visibility = "visible";
                                    stackedLabel.style.opacity = "1";
                                    stackedLabel.style.transition = "none";
                                    stackedLabel.style.paddingTop = "6px";

                                    // Set button name to the text from the inner pull-left element
                                    const buttonName = stackedLabel.textContent.trim();
                                    clonedDropdownItem.setAttribute('name', buttonName);
                                }

                                clonedDropdownItem.innerHTML = "";
                                clonedDropdownItem.appendChild(stackedContainer);

                                clonedDropdownItem.style.display = "flex";
                                clonedDropdownItem.style.flexDirection = "column";
                                clonedDropdownItem.style.alignItems = "center";
                                clonedDropdownItem.style.border = "1px solid #ddd";
                                clonedDropdownItem.style.backgroundColor = "#f9f9f9";
                                clonedDropdownItem.style.padding = "4px 6px";
                                clonedDropdownItem.style.margin = "2px";

                                clonedDropdownItem.addEventListener("click", () => {
                                    dropdownItem.click();
                                });

                                smartToolbox.appendChild(clonedDropdownItem);
                            }
                        });
                    } else {
                        const clonedChild = child.cloneNode(true);
                        clonedChild.style.border = "1px solid #ddd";
                        clonedChild.style.backgroundColor = "#f9f9f9";
                        clonedChild.style.margin = "2px";

                        // Set button name to the text from the inner pull-left element if present
                        const labelElement = clonedChild.querySelector('.inner.pull-left');
                        if (labelElement) {
                            const buttonName = labelElement.textContent.trim();
                            clonedChild.setAttribute('name', buttonName);
                        }

                        clonedChild.addEventListener("click", () => {
                            child.click();
                        });

                        smartToolbox.appendChild(clonedChild);
                    }
                });

                console.log("All buttons cloned into the smart toolbox.");

                smartToolbox.style.display = "flex";
                targetDiv.style.display = "none";
                toggleButton.innerText = "Hide Toolbox"; // Update button text when turned on
            } else {
                smartToolbox.style.display = "none";
                targetDiv.style.display = "block";
                toggleButton.innerText = "Show Toolbox"; // Update button text when turned off
            }
        };

        const toggleButton = document.createElement("button");
        toggleButton.innerText = "Show Toolbox"; // Start in OFF state
        toggleButton.style.position = "fixed";
        toggleButton.style.top = "10px";
        toggleButton.style.right = "10px";
        toggleButton.style.zIndex = "10001";

        toggleButton.addEventListener("click", toggleSmartToolbox);
        document.body.appendChild(toggleButton);
    };

    waitForTargetDiv();
})();

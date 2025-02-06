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
        smartToolbox.style.overflowX = "auto"; // enable scrolling
        smartToolbox.style.overflowY = "hidden";
        smartToolbox.style.whiteSpace = "nowrap"; // ensure buttons stay in a row
        smartToolbox.style.backgroundColor = "white";
        smartToolbox.style.border = "1px solid #ccc";
        smartToolbox.style.padding = "2px";
        smartToolbox.style.zIndex = "10000";
        smartToolbox.style.display = "flex";
        smartToolbox.style.flexWrap = "nowrap";
        smartToolbox.style.alignItems = "center";
        smartToolbox.style.justifyContent = "flex-start";
        smartToolbox.style.cursor = "grab"; // indicate draggable behavior

        // append the smart toolbox to the document body
        document.body.appendChild(smartToolbox);
        console.log("smart toolbox container added to the page.");

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
                                clonedDropdownItem.style.padding = "8px";
                                clonedDropdownItem.style.margin = "2px"; // ensure spacing between buttons
                                //clonedDropdownItem.style.borderRadius = "4px";

                                // copy functionality from the original dropdown item
                                clonedDropdownItem.addEventListener("click", () => {
                                    dropdownItem.click(); // trigger the original button click
                                });

                                smartToolbox.appendChild(clonedDropdownItem);
                            }
                        });
                    } else {
                        const clonedChild = child.cloneNode(true); // clone regular buttons
                        clonedChild.style.border = "1px solid #ddd";
                        clonedChild.style.backgroundColor = "#f9f9f9";
                        clonedChild.style.margin = "2px"; // spacing between buttons

                        clonedChild.addEventListener("click", () => {
                            child.click();
                        });

                        smartToolbox.appendChild(clonedChild);
                    }
                });

                console.log("all buttons (including dropdown subchildren) cloned into the smart toolbox.");

                // show the smart toolbox and hide the original toolbar
                smartToolbox.style.display = "flex";
                targetDiv.style.display = "none"; // hide the original toolbar
            } else {
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

        toggleButton.addEventListener("click", toggleSmartToolbox);
        document.body.appendChild(toggleButton);
        console.log("toggle button added to the page.");
    };

    // start waiting for the target div to load
    waitForTargetDiv();
})();

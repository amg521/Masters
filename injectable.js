// ==UserScript==
// @name         Smart Toolbox with Accurate Hover Colors
// @namespace    http://tampermonkey.net/
// @version      2.19
// @description  clone toolbar buttons into a smart toolbox, stack icons and labels in dropdown buttons, and ensure hugging width with always-visible labels and correct active/inactive colors
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        none
// ==/UserScript==

(function () {
    console.log("smart toolbox script has started running.");

    // function to wait for the target div to appear
    const waitForTargetDiv = () => {
        const targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
        const extraDiv = document.getElementById("headerToolbarMenu");
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
        smartToolbox.style.top = `${targetDiv.getBoundingClientRect().top}px`;
        smartToolbox.style.left = `${targetDiv.getBoundingClientRect().left}px`;
        smartToolbox.style.width = targetDiv.offsetWidth + "px";
        smartToolbox.style.height = targetDiv.offsetHeight + "px";
        smartToolbox.style.overflowX = "auto"; // enable horizontal scrolling
        smartToolbox.style.overflowY = "hidden";
        smartToolbox.style.whiteSpace = "nowrap"; // ensure buttons stay in a row
        smartToolbox.style.backgroundColor = "white";
        smartToolbox.style.border = "1px solid #ccc";
        smartToolbox.style.padding = "10px";
        smartToolbox.style.zIndex = "10000";
        smartToolbox.style.display = "flex"; // ensure items are aligned in a row
        smartToolbox.style.flexWrap = "nowrap"; // prevent wrapping
        smartToolbox.style.alignItems = "center"; // align items vertically in center
        smartToolbox.style.overflow = "auto"; // ensure scrolling works

        // append the smart toolbox to the document body
        document.body.appendChild(smartToolbox);
        console.log("smart toolbox container added to the page.");

        // function to clone and move child elements into the smart toolbox
        const toggleSmartToolbox = () => {
            if (smartToolbox.style.display === "none") {
                smartToolbox.innerHTML = ""; // clear previous content

                // loop through children of the target toolbar
                Array.from(targetDiv.children).forEach((child) => {
                    const clonedChild = child.cloneNode(true);
                    clonedChild.style.display = "inline-flex";
                    clonedChild.style.alignItems = "center";
                    clonedChild.style.marginRight = "10px";
                    clonedChild.style.border = "1px solid #ddd";
                    clonedChild.style.backgroundColor = "#f9f9f9";
                    clonedChild.style.width = "auto";
                    clonedChild.addEventListener("click", () => {
                        child.click();
                    });
                    smartToolbox.appendChild(clonedChild);
                });

                console.log("all buttons cloned into the smart toolbox.");
                smartToolbox.style.display = "block";
                targetDiv.style.display = "none";
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
        toggleButton.style.padding = "10px";
        toggleButton.style.backgroundColor = "#007BFF";
        toggleButton.style.color = "#FFF";
        toggleButton.style.border = "none";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.borderRadius = "5px";

        // add toggle functionality
        toggleButton.addEventListener("click", toggleSmartToolbox);
        document.body.appendChild(toggleButton);
        console.log("toggle button added to the page.");
    };

    // start waiting for the target div to load
    waitForTargetDiv();
})();

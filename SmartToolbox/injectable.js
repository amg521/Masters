// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows AI configuration popup first, then loads smart toolbox with drag-scroll functionality
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        GM_addStyle
// @resource     STYLES https://raw.githubusercontent.com/amg521/Masters/refs/heads/main/SmartToolbox/styles.css
// @grant        GM_getResourceText
// ==/UserScript==

(function() {
    'use strict';

    // Load the external CSS
    const cssContent = GM_getResourceText('STYLES');
    GM_addStyle(cssContent);

    const waitForStartButton = () => {
    const checkButton = setInterval(() => {
        const startButton = document.querySelector('.start-project');
        if (startButton) {
            clearInterval(checkButton);
            startButton.addEventListener('click', createPopup);
        }
    }, 500);
};

const createPopup = () => {
    const popupHost = document.createElement('div');
    document.body.appendChild(popupHost);
    const shadow = popupHost.attachShadow({mode: 'open'});

    // Create a style element inside the shadow DOM to apply the styles
    const shadowStyle = document.createElement('style');
    shadowStyle.textContent = cssContent; // Use the loaded CSS
    shadow.appendChild(shadowStyle);

    // Popup HTML
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
        <h1>Let AI personalize your toolbar</h1>
        <p>Don't worry- the default toolbar will be untouched</p>

        <label for="build">What would you like to build today?</label>
        <input type="text" id="build" placeholder="e.g. a door hinge" />

        <label for="help">How can we best help you?</label>
        <select id="help">
            <option>I'd like to be guided through every step</option>
            <option>I'd like to choose from a set of approaches</option>
            <option>I'd like to choose my own approach</option>
        </select>

        <div id="dynamic-section"></div>

        <button class="button">Generate smart toolbar <img src="sparkle-icon.png" alt="sparkle" /></button>
    `;
    shadow.appendChild(container);

    // Add popup interactivity
    const helpSelect = shadow.getElementById('help');
    const dynamicSection = shadow.getElementById('dynamic-section');
    const generateButton = shadow.querySelector('.button');

    // Dynamic section handler
    helpSelect.addEventListener('change', () => {
        dynamicSection.innerHTML = '';
        if (helpSelect.value.includes('set of approaches')) {
            dynamicSection.innerHTML = `
                <div class="checkbox">
                    <input type="radio" name="approach" id="option1" checked>
                    <label for="option1"><span>Option 1</span><br><small>Create hinge parts using basic shapes like cylinders and cubes, then combine them.</small></label>
                </div>
                <div class="checkbox">
                    <input type="radio" name="approach" id="option2">
                    <label for="option2"><span>Option 2</span><br><small>Draw 2D sketches for the hinge leaves and pin, then extrude them into 3D.</small></label>
                </div>
                <div class="checkbox">
                    <input type="radio" name="approach" id="option3">
                    <label for="option3"><span>Option 3</span><br><small>Sculpt and refine the hinge geometry from a basic shape using sculpting tools.</small></label>
                </div>
            `;
        } else if (helpSelect.value.includes('own approach')) {
            dynamicSection.innerHTML = `
                <label for="approach">My approach will be to...</label>
                <textarea id="approach" placeholder="e.g. Create hinge parts using basic shapes like cylinders and cubes, then combine them."></textarea>
            `;
        }
        dynamicSection.style.marginBottom = '24px';
    });

    // Fixed radio button exclusivity handler
    dynamicSection.addEventListener('change', (e) => {
        if (e.target.type === 'radio') {
            const radios = dynamicSection.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.checked = radio === e.target;
            });
        }
    });

    // Initialize first state
    helpSelect.dispatchEvent(new Event('change'));

    // Button click handler
    generateButton.addEventListener('click', () => {
        popupHost.remove();
        initializeSmartToolbox();
    });

    // Smart Toolbox functionality
    function initializeSmartToolbox() {
    console.log("smart toolbox script has started running.");

    // Variables for global access
    let targetDiv;
    let smartToolbox;
    let refreshTimeout;

    // MODIFIED: Added check for projects-panel.hidden
    const waitForTargetDiv = () => {
        targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
        const toolbar = document.getElementById("headerToolbarMenu");
        const projectsPanel = document.querySelector('.projects-panel'); // NEW

        // MODIFIED condition to check projects-panel state
        if (!targetDiv || !toolbar || !projectsPanel || !projectsPanel.classList.contains('hidden')) {
            console.log("Target div, toolbar, or projects panel not found/hidden. Retrying...");
            setTimeout(waitForTargetDiv, 500);
            return;
        }

        console.log("Target div and toolbar located.");
        createSmartToolbox(targetDiv, toolbar);
    };

    // Extract the repeated code into a function for populating the toolbox
    const populateSmartToolbox = (toolbox, sourceDiv) => {
        toolbox.innerHTML = ""; // clear previous content

        // loop through children of the target toolbar
        Array.from(sourceDiv.children).forEach((child) => {
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

                        // Add disabled styling if original item is disabled
                        if (dropdownItem.classList.contains('disabled')) {
                            clonedDropdownItem.classList.add('disabled');
                            clonedDropdownItem.style.opacity = "0.6";
                            clonedDropdownItem.style.cursor = "not-allowed";
                        } else {
                            clonedDropdownItem.addEventListener("click", () => {
                                dropdownItem.click();
                                // Schedule a refresh after click
                                scheduleToolboxRefresh();
                            });
                        }

                        toolbox.appendChild(clonedDropdownItem);
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

                // Add disabled styling if original item is disabled
                if (child.classList.contains('disabled')) {
                    clonedChild.classList.add('disabled');
                    clonedChild.style.opacity = "0.6";
                    clonedChild.style.cursor = "not-allowed";
                } else {
                    clonedChild.addEventListener("click", () => {
                        child.click();
                        // Schedule a refresh after click
                        scheduleToolboxRefresh();
                    });
                }

                toolbox.appendChild(clonedChild);
            }
        });

        console.log("All buttons cloned into the smart toolbox.");
    };

    // Function to schedule a toolbox refresh with debouncing
    const scheduleToolboxRefresh = () => {
        console.log("Scheduling toolbox refresh...");

        // Clear any existing timeout to prevent multiple refreshes
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }

        // Set a new timeout for refresh (300ms delay to ensure UI has updated)
        refreshTimeout = setTimeout(() => {
            if (smartToolbox && smartToolbox.style.display !== "none" && targetDiv) {
                console.log("Refreshing toolbox...");
                populateSmartToolbox(smartToolbox, targetDiv);
            }
        }, 300);
    };

    // Function to observe app interactions and refresh toolbox
    const setupInteractionObservers = () => {
        console.log("Setting up interaction observers...");

        // 1. Observe clicks on the entire app
        document.addEventListener('click', (e) => {
            // Only refresh if the click is not on the smart toolbox itself
            if (smartToolbox && !smartToolbox.contains(e.target)) {
                scheduleToolboxRefresh();
            }
        });

        // 2. Observe keypress events that might trigger actions
        document.addEventListener('keydown', () => {
            scheduleToolboxRefresh();
        });

        // 3. Set up MutationObserver to watch for changes in the UI
        const observer = new MutationObserver((mutations) => {
            let shouldRefresh = false;

            // Check if any mutations affect the disabled state of buttons
            mutations.forEach((mutation) => {
                if (mutation.target.classList &&
                    (mutation.target.classList.contains('disabled') ||
                     mutation.target.parentElement && mutation.target.parentElement.classList.contains('dropdown-item'))) {
                    shouldRefresh = true;
                }
            });

            if (shouldRefresh) {
                scheduleToolboxRefresh();
            }
        });

        // Start observing the target div for class changes (especially 'disabled' class)
        if (targetDiv) {
            observer.observe(targetDiv, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    };

    // initialize the smart toolbox
    const createSmartToolbox = (sourceDiv, toolbar) => {
        console.log("Initializing smart toolbox...");

        // Store reference to targetDiv
        targetDiv = sourceDiv;

        // get toolbar dimensions
        const rect = toolbar.getBoundingClientRect();

        // create the smart toolbox container
        smartToolbox = document.createElement("div");
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
        smartToolbox.style.display = "none";

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

        // function to toggle toolbox visibility and populate it
        const toggleSmartToolbox = () => {
            if (smartToolbox.style.display === "none") {
                // Populate the smart toolbox using the extracted function
                populateSmartToolbox(smartToolbox, targetDiv);

                smartToolbox.style.display = "flex";
                targetDiv.style.display = "none"; // Hide default toolbar
                toggleButton.innerText = "Hide Toolbox"; // Update button text when turned on
            } else {
                smartToolbox.style.display = "none";
                targetDiv.style.display = "block";
                toggleButton.innerText = "Show Toolbox"; // Update button text when turned off
            }
        };

        // Create the toggle button with explicit styling
        const toggleButton = document.createElement("button");
        toggleButton.innerText = "Show Toolbox"; // Start in OFF state
        toggleButton.style.position = "fixed";
        toggleButton.style.top = "10px";
        toggleButton.style.right = "10px";
        toggleButton.style.zIndex = "10001";
        toggleButton.style.padding = "8px 12px";
        toggleButton.style.backgroundColor = "#14708E";
        toggleButton.style.color = "white";
        toggleButton.style.border = "none";
        toggleButton.style.borderRadius = "4px";
        toggleButton.style.cursor = "pointer";
        toggleButton.style.fontFamily = "Inter, sans-serif";
        toggleButton.style.fontWeight = "600";

        toggleButton.addEventListener("click", toggleSmartToolbox);
        // Check if the button already exists and remove it if it does
        const existingButton = document.getElementById("smart-toolbox-toggle");
        if (existingButton) {
            existingButton.remove();
        }
        // Add an ID to the button for easier reference
        toggleButton.id = "smart-toolbox-toggle";
        // Append the button to the document body
        document.body.appendChild(toggleButton);
        console.log("Toggle button created and added to page");

        // Setup observers for UI interactions
        setupInteractionObservers();
    };

    waitForTargetDiv();
    }
}

waitForStartButton(); // This starts looking for .start-project
})();

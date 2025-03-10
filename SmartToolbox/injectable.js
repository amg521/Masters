// ==UserScript==
// @name         AI-Personalized Toolbar with Smart Toolbox
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Shows AI configuration popup first, then loads smart toolbox with drag-scroll functionality
// @author       Axelle Groothaert
// @match        https://www.selfcad.com/app/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // Inject Inter font globally
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
    `);

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

    // Popup HTML and CSS
    shadow.innerHTML = `
        <style>
            :host {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                font-family: 'Inter', sans-serif;
            }

            .container {
                background-color: #fff;
                padding: 8px 24px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                width: 380px;
                border: 1px solid #D9D9D9;
                position: relative;
            }

            h1 {
                font-size: 24px;
                font-weight: 600;
                letter-spacing: -0.02em;
                line-height: 120%;
                margin-bottom: 4px;
                background: linear-gradient(90deg, #14708E 0%, #26C9FF 69%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            p {
                font-size: 16px;
                font-weight: 400;
                color: #757575;
                margin-top: 4px;
                margin-bottom: 24px;
            }

            label {
      display: block;
      font-size: 16px;
      margin-bottom: 8px;
      color: #464646;
    }

    input, select, textarea {
      width: 100%;
      height: 40px;
      padding: 8px;
      margin-bottom: 24px;
      border: 1px solid #26C9FF;
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 16px;
    }
    select {
      margin-bottom: 8px;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      font-weight: 400;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 16px center;
      background-size: 20px;
      padding-right: 44px;
    }
 .button {
      background: linear-gradient(90deg, #14708E 0%, #26C9FF 69%);
      color: white;
      padding: 12px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      font-weight: 600;
      font-size: 16px;
      height: 44px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 24px;
      margin-bottom: 24px;
    }
#build::placeholder,
    textarea#approach::placeholder {
      color: #B3B3B3;
    }

    .button img {
      height: 16px;
      width: 16px;
    }

    .checkbox {
      display: flex;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .checkbox input {
      width: 16px;
      height: 16px;
      margin-right: 12px;
      border-radius: 4px;
      background-color: #464646;
      border: 1px solid #464646;
      align-self: flex-start;
    }

    .checkbox label {
      font-size: 16px;
      margin: 0;
    }

    .checkbox label span {
      color: #464646;
      font-weight: 300;
    }
       .checkbox small {
      color: #757575;
      font-size: 16px;
      display: block;
      margin-top: 4px;
    }

    .checkbox input:checked + label span {
      font-weight: 600;
    }

    #build, #help {
      padding-left: 16px;
      color: #464646;
    }
     textarea#approach {
      height: 80px;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      padding-left: 16px;
      margin-bottom: 8px;
    }

    #dynamic-section {
      margin-top: 12px;
    }
  </style>


        <div class="container">
            <h1>Let AI personalize your toolbar</h1>
            <p>Don’t worry- the default toolbar will be untouched</p>

            <label for="build">What would you like to build today?</label>
            <input type="text" id="build" placeholder="e.g. a door hinge" />

            <label for="help">How can we best help you?</label>
            <select id="help">
                <option>I’d like to be guided through every step</option>
                <option>I’d like to choose from a set of approaches</option>
                <option>I’d like to choose my own approach</option>
            </select>

            <div id="dynamic-section"></div>

            <button class="button">Generate smart toolbar <img src="sparkle-icon.png" alt="sparkle" /></button>
        </div>
    `;

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
// ... rest of the original code remains unchanged ...

    function initializeSmartToolbox() {
    console.log("smart toolbox script has started running.");

    // MODIFIED: Added check for projects-panel.hidden
    const waitForTargetDiv = () => {
        const targetDiv = document.querySelector(".tool-items.fix-toolbar-width.ui-draggable.ui-draggable-handle");
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

    // initialize the smart toolbox
    const createSmartToolbox = (targetDiv, toolbar) => {
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
    }
}

waitForStartButton(); // This starts looking for .start-project
})();

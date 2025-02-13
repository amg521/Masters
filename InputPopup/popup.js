const helpSelect = document.getElementById('help');
const dynamicSection = document.getElementById('dynamic-section');

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
  dynamicSection.style.marginBottom = '24px'; // Ensure consistent spacing
});

dynamicSection.addEventListener('change', (e) => {
  if (e.target.type === 'radio') {
    const radios = dynamicSection.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      if (radio !== e.target) {
        radio.checked = false;
      }
    });
  }
});

// Initialize the form with the first option
helpSelect.dispatchEvent(new Event('change'));


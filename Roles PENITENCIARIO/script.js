document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const MONITOR_DATA = {
        'toranzo': { role: 'persona_poderosa', count: 1 },
        'sara': { role: 'familia_numerosa', count: 4 },
        'carla': { role: 'enfermos_mentales', count: 2 },
        'chuchi': { role: 'jefe_de_pandilla', count: 1 },
        'tito': { role: 'indigentes', count: 3 }, // Monitor for 3 indigents
        'carmen': { role: 'drogadicto', count: 1 },
        // Assign remaining monitors (Bellido, Miguel, Ernesto, Henar, Raquel) to other roles or shared roles
        // Example: Assigning multiple roles or sharing supervision
        'bellido': { role: 'policias', count: 2 }, // Manages 2 potential police officers
        'miguel': { role: 'policias', count: 3 }, // Manages other 3 potential police officers
        'ernesto': { role: 'endeudado', count: 1 },
        'henar': { role: 'ciudadanos', count: 4 }, // Manages half the citizens
        'raquel': { role: 'ciudadanos', count: 4 } // Manages other half
        // NOTE: Ensure total counts match 26 participants. Adjust assignments as needed.
        // Current count: 1+4+2+1+3+1+2+3+1+4+4 = 26
    };
    const VALID_MONITORS = Object.keys(MONITOR_DATA);
    const STORAGE_KEY_PREFIX = 'activityStates_'; // Prefix for localStorage keys

    // --- DOM Elements ---
    const loginView = document.getElementById('login-view');
    const mainContentView = document.getElementById('main-content');
    const monitorNameInput = document.getElementById('monitorNameInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('login-error');
    const monitorDisplayName = document.getElementById('monitor-display-name');
    const roleContainersWrapper = document.getElementById('role-containers-wrapper');
    const logoutBtn = document.getElementById('logoutBtn');

    let currentMonitor = null; // Store the logged-in monitor name

    // --- Functions ---

    // Get current state object for the logged-in monitor from localStorage
    const loadMonitorState = () => {
        if (!currentMonitor) return {};
        try {
            const state = localStorage.getItem(STORAGE_KEY_PREFIX + currentMonitor);
            return state ? JSON.parse(state) : {};
        } catch (e) {
            console.error("Error loading state for monitor " + currentMonitor, e);
            return {}; // Return empty object on error
        }
    };

    // Save the entire state object for the logged-in monitor
    const saveMonitorState = (state) => {
        if (!currentMonitor) return;
        try {
            localStorage.setItem(STORAGE_KEY_PREFIX + currentMonitor, JSON.stringify(state));
        } catch (e) {
            console.error("Error saving state for monitor " + currentMonitor, e);
        }
    };

    // Update a specific value within the state
    const updateStateValue = (participantId, key, value) => {
        const state = loadMonitorState();
        if (!state[participantId]) {
            state[participantId] = { participantName: '', tasks: {}, properties: {} };
        }
        if (key === 'participantName') {
            state[participantId].participantName = value;
        } else if (key.startsWith('task_')) {
             if (!state[participantId].tasks) state[participantId].tasks = {};
            state[participantId].tasks[key] = value;
        } else if (key.startsWith('prop_')) {
             if (!state[participantId].properties) state[participantId].properties = {};
            state[participantId].properties[key] = value;
        }
        saveMonitorState(state);
    };


    // Display role containers for the logged-in monitor
    const displayRoleContainers = () => {
        roleContainersWrapper.innerHTML = ''; // Clear previous containers
        if (!currentMonitor || !MONITOR_DATA[currentMonitor]) return;

        const { role, count } = MONITOR_DATA[currentMonitor];
        const template = document.getElementById(`role-template-${role}`);

        if (!template) {
            console.error(`Template not found for role: ${role}`);
            roleContainersWrapper.innerHTML = `<p class="error-message">Error: No se encontró la plantilla para el rol ${role}.</p>`;
            return;
        }

        for (let i = 0; i < count; i++) {
            const clone = template.content.cloneNode(true);
            const container = clone.querySelector('.role-container');
            const participantId = `${role}_${i}`; // Unique ID for this participant instance

            container.dataset.participantId = participantId; // Store ID on container

            // Update participant number display
            const participantNumberSpan = container.querySelector('.participant-number');
            if(participantNumberSpan) participantNumberSpan.textContent = `Participante ${i + 1}`;

            // Assign unique IDs to inputs/labels within the clone
            const nameInput = container.querySelector('.participant-name-input');
            if (nameInput) nameInput.id = `name_${participantId}`;

            container.querySelectorAll('.tasks input[type="checkbox"]').forEach((checkbox, taskIndex) => {
                const taskId = `task_${participantId}_${taskIndex}`;
                checkbox.id = taskId;
                const label = checkbox.nextElementSibling;
                if (label && label.tagName === 'LABEL') {
                    label.setAttribute('for', taskId);
                }
            });

            container.querySelectorAll('.properties input[type="checkbox"]').forEach((checkbox) => {
                const propName = checkbox.id; // Original ID like prop_casa_parcela
                const propId = `prop_${participantId}_${propName.split('_').slice(1).join('_')}`; // Make it unique: prop_familia_numerosa_0_casa_parcela
                checkbox.id = propId;
                 const label = checkbox.nextElementSibling;
                 if (label && label.tagName === 'LABEL') {
                     label.setAttribute('for', propId);
                 }
            });

            // Assign unique IDs or classes to calculator elements if needed for specific targeting
            container.querySelectorAll('.calc-input').forEach((input, calcIndex) => {
                input.id = `calc_${participantId}_${calcIndex}`;
            });
             const differenceSpan = container.querySelector('.difference');
             if(differenceSpan) differenceSpan.id = `diff_${participantId}`;

             // Special handling for Indigente's secret task
             if (role === 'indigentes' && i === 0) { // Assume first indigente gets the task
                const secretTaskLi = container.querySelector('.secret-task');
                if(secretTaskLi) secretTaskLi.style.display = 'list-item'; // Show for the designated one
             }


            roleContainersWrapper.appendChild(clone);
        }

        // Load saved states after containers are in the DOM
        loadAllParticipantStates();
    };

    // Load names and checkbox states for all displayed containers
    const loadAllParticipantStates = () => {
         const state = loadMonitorState();
         document.querySelectorAll('.role-container').forEach(container => {
            const participantId = container.dataset.participantId;
            if (!participantId || !state[participantId]) return; // No saved state for this one

            const participantState = state[participantId];

            // Load name
            const nameInput = container.querySelector(`#name_${participantId}`);
            if (nameInput) {
                nameInput.value = participantState.participantName || '';
            }

            // Load task checkboxes
            if(participantState.tasks) {
                Object.keys(participantState.tasks).forEach(taskId => {
                    const checkbox = container.querySelector(`#${taskId}`);
                    if (checkbox) {
                        checkbox.checked = participantState.tasks[taskId];
                    }
                });
            }

            // Load property checkboxes
             if(participantState.properties) {
                 Object.keys(participantState.properties).forEach(propId => {
                    const checkbox = container.querySelector(`#${propId}`);
                    if (checkbox) {
                        checkbox.checked = participantState.properties[propId];
                    }
                 });
             }
         });
    };


    // Handle Login
    const handleLogin = () => {
        const monitorName = monitorNameInput.value.trim().toLowerCase();
        if (VALID_MONITORS.includes(monitorName)) {
            currentMonitor = monitorName;
            monitorDisplayName.textContent = monitorNameInput.value.trim(); // Display original casing
            loginView.classList.remove('active');
            mainContentView.classList.add('active');
            loginError.style.display = 'none';
            displayRoleContainers(); // Display containers for this monitor
        } else {
            loginError.style.display = 'block';
            currentMonitor = null;
        }
    };

    // Handle Logout
    const handleLogout = () => {
        currentMonitor = null;
        monitorNameInput.value = ''; // Clear input
        mainContentView.classList.remove('active');
        loginView.classList.add('active');
        roleContainersWrapper.innerHTML = ''; // Clear containers
    }

    // Handle Calculator Input
    const handleCalculation = (inputElement) => {
        const container = inputElement.closest('.role-container');
        if (!container) return;

        const inputs = container.querySelectorAll('.calc-input');
        const differenceSpan = container.querySelector('.difference');
        if (inputs.length !== 2 || !differenceSpan) return;

        const val1 = parseFloat(inputs[0].value);
        const val2 = parseFloat(inputs[1].value);

        if (!isNaN(val1) && !isNaN(val2)) {
            differenceSpan.textContent = val1 - val2;
        } else {
            differenceSpan.textContent = '?';
        }
    };


    // --- Event Listeners ---
    loginBtn.addEventListener('click', handleLogin);
    monitorNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    logoutBtn.addEventListener('click', handleLogout);


    // Event Delegation for inputs/checkboxes within the main content area
    mainContentView.addEventListener('change', (event) => {
        const target = event.target;
        const container = target.closest('.role-container');
        if (!container) return;
        const participantId = container.dataset.participantId;

        if (target.matches('.participant-name-input')) {
             // Use 'blur' event instead of 'change' for name saving maybe? Or save on change.
            // updateStateValue(participantId, 'participantName', target.value);
        } else if (target.matches('.tasks input[type="checkbox"]') || target.matches('.properties input[type="checkbox"]')) {
            updateStateValue(participantId, target.id, target.checked);
        }
    });

     // Use 'input' for real-time updates on name (optional, can be heavy)
     // Or use 'blur' to save when focus is lost
      mainContentView.addEventListener('blur', (event) => {
          const target = event.target;
          const container = target.closest('.role-container');
           if (!container) return;
           const participantId = container.dataset.participantId;

          if (target.matches('.participant-name-input')) {
              updateStateValue(participantId, 'participantName', target.value);
          }
      }, true); // Use capture phase for blur


    // Event delegation for calculator inputs
    mainContentView.addEventListener('input', (event) => {
         if (event.target.matches('.calc-input')) {
            handleCalculation(event.target);
        }
    });

});
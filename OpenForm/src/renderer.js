// DOM elements
const modelDescriptionInput = document.getElementById('modelDescription');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const scadCodeElement = document.getElementById('scadCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const saveCodeBtn = document.getElementById('saveCodeBtn');
const renderBtn = document.getElementById('renderBtn');
const checkOpenScadBtn = document.getElementById('checkOpenScadBtn');
const statusIndicator = document.getElementById('statusIndicator');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toastContainer = document.getElementById('toastContainer');
const parametersBtn = document.getElementById('parametersBtn');
const parametersModal = document.getElementById('parametersModal');
const closeParametersBtn = document.getElementById('closeParametersBtn');
const modifyBtn = document.getElementById('modifyBtn');
const modifyPrompt = document.getElementById('modifyPrompt');
const pngPreviewContainer = document.getElementById('pngPreviewContainer');
const modelPng = document.getElementById('modelPng');

let currentScadCode = '';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkOpenSCADInstallation();
    setupEventListeners();
});

// Event listeners
function setupEventListeners() {
    generateBtn.addEventListener('click', handleGenerate);
    clearBtn.addEventListener('click', handleClear);
    copyCodeBtn.addEventListener('click', handleCopyCode);
    saveCodeBtn.addEventListener('click', handleSaveCode);
    renderBtn.addEventListener('click', handleRender);
    checkOpenScadBtn.addEventListener('click', checkOpenSCADInstallation);
    parametersBtn.addEventListener('click', showParametersModal);
    closeParametersBtn.addEventListener('click', hideParametersModal);
    modifyBtn.addEventListener('click', handleModify);
    
    // Auto-resize textarea
    modelDescriptionInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    // Enable/disable buttons based on content
    modelDescriptionInput.addEventListener('input', updateButtonStates);
}

// Update button states
function updateButtonStates() {
    const hasDescription = modelDescriptionInput.value.trim().length > 0;
    const hasCode = currentScadCode.trim().length > 0;
    
    generateBtn.disabled = !hasDescription;
    copyCodeBtn.disabled = !hasCode;
    saveCodeBtn.disabled = !hasCode;
    renderBtn.disabled = !hasCode;
    
    // Also check if we have parametric variables
    if (hasCode) {
        extractAndDisplayParameters();
    }
}

// Handle generate button click
async function handleGenerate() {
    const description = modelDescriptionInput.value.trim();
    
    if (!description) {
        showToast('Please enter a model description', 'warning');
        return;
    }

    showLoading('Generating OpenSCAD code...');
    
    try {
        const result = await window.electronAPI.generateSCAD(description);
        
        if (result.success) {
            currentScadCode = result.code;
            displayCode(result.code);
            showToast('OpenSCAD code generated successfully!', 'success');
        } else {
            showToast(`Generation failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showToast('Failed to generate code. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Check OpenSCAD installation
async function checkOpenSCADInstallation() {
    updateStatus('Checking OpenSCAD...', 'warning');
    
    try {
        const result = await window.electronAPI.checkOpenSCAD();
        
        if (result.installed) {
            updateStatus('OpenSCAD Ready', 'success');
        } else {
            updateStatus('OpenSCAD Not Found', 'error');
            showToast('OpenSCAD is not installed or not in PATH. Please install OpenSCAD to render models.', 'warning');
        }
    } catch (error) {
        console.error('OpenSCAD check error:', error);
        updateStatus('Check Failed', 'error');
    }
}

// Display generated code
function displayCode(code) {
    scadCodeElement.textContent = code;
    // Trigger Prism.js syntax highlighting
    if (window.Prism) {
        window.Prism.highlightElement(scadCodeElement);
    }
    // Force update button states after displaying code
    setTimeout(updateButtonStates, 100);
}

// Show loading overlay
function showLoading(message) {
    loadingText.textContent = message;
    loadingOverlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

// Update status indicator
function updateStatus(text, type) {
    statusIndicator.textContent = text;
    statusIndicator.className = `status ${type}`;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
    
    // Remove toast on click
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Utility functions for better UX
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter or Cmd+Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!generateBtn.disabled) {
            handleGenerate();
        }
    }
    
    // Ctrl+S or Cmd+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saveCodeBtn.disabled) {
            handleSaveCode();
        }
    }
    
    // Ctrl+C or Cmd+C to copy (when focused on code area)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target === scadCodeElement) {
        e.preventDefault();
        if (!copyCodeBtn.disabled) {
            handleCopyCode();
        }
    }
});

// Initialize button states
updateButtonStates();

// Extract and display parametric variables
function extractAndDisplayParameters() {
    const parametersContainer = document.getElementById('parametersContainer');
    if (!parametersContainer || !currentScadCode) return;
    
    // Clear existing parameters
    parametersContainer.innerHTML = '';
    
    // Extract variable declarations (e.g., height = 10; diameter = 5;)
    const variableRegex = /^(?:\s*\/\/.*\n)?\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^;]+);/gm;
    const variables = [];
    let match;
    
    while ((match = variableRegex.exec(currentScadCode)) !== null) {
        const [, name, value] = match;
        // Skip complex expressions and focus on simple numeric values
        if (/^[\d.-]+$/.test(value.trim()) || /^"[^"]*"$/.test(value.trim())) {
            variables.push({
                name: name.trim(),
                value: value.trim(),
                type: /^"[^"]*"$/.test(value.trim()) ? 'string' : 'number'
            });
        }
    }
    
    if (variables.length === 0) {
        parametersContainer.innerHTML = '<p class="no-params">No parametric variables found in the generated code.</p>';
        return;
    }
    
    // Create parameter controls
    const parametersList = document.createElement('div');
    parametersList.className = 'parameters-list';
    
    variables.forEach(variable => {
        const paramGroup = document.createElement('div');
        paramGroup.className = 'param-group';
        
        const label = document.createElement('label');
        label.textContent = variable.name;
        label.className = 'param-label';
        
        const input = document.createElement('input');
        input.type = variable.type === 'number' ? 'number' : 'text';
        input.value = variable.type === 'string' ? variable.value.replace(/"/g, '') : variable.value;
        input.className = 'param-input';
        input.dataset.paramName = variable.name;
        
        if (variable.type === 'number') {
            input.step = 'any';
        }
        
        // Update code when parameter changes
        input.addEventListener('input', debounce(updateParameterInCode, 300));
        
        paramGroup.appendChild(label);
        paramGroup.appendChild(input);
        parametersList.appendChild(paramGroup);
    });
    
    parametersContainer.appendChild(parametersList);
}

// Update parameter value in the code
function updateParameterInCode(event) {
    const paramName = event.target.dataset.paramName;
    const newValue = event.target.value;
    const isString = event.target.type === 'text';
    
    // Create regex to find and replace the parameter
    const paramRegex = new RegExp(`(^\\s*${paramName}\\s*=\\s*)([^;]+)(;)`, 'm');
    const replacement = isString ? `$1"${newValue}"$3` : `$1${newValue}$3`;
    
    currentScadCode = currentScadCode.replace(paramRegex, replacement);
    displayCode(currentScadCode);
}
updateButtonStates();

// Handle clear button click
function handleClear() {
    modelDescriptionInput.value = '';
    currentScadCode = '';
    scadCodeElement.textContent = '// Generated OpenSCAD code will appear here...';
    updateButtonStates();
    showToast('Input cleared', 'success');
}

// Handle copy code button click
async function handleCopyCode() {
    if (!currentScadCode) return;
    
    try {
        await navigator.clipboard.writeText(currentScadCode);
        showToast('Code copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy code', 'error');
    }
}

// Handle save code button click
async function handleSaveCode() {
    if (!currentScadCode) return;
    
    try {
        const result = await window.electronAPI.saveSCADFile(currentScadCode, 'generated_model.scad');
        
        if (result.success) {
            showToast(`File saved successfully to: ${result.path}`, 'success');
        } else {
            showToast(`Save failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save file', 'error');
    }
}

// Handle render button click
async function handleRender() {
    if (!currentScadCode) return;
    showLoading('Rendering 3D model...');
    try {
        const result = await window.electronAPI.renderModel(currentScadCode);
        if (result.success) {
            showToast('Model rendered successfully! STL file created.', 'success');
            displaySTLPreview(result.stlPath);
        } else {
            showToast(`Render failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Render error:', error);
        showToast('Failed to render model', 'error');
    } finally {
        hideLoading();
    }
}

function displaySTLPreview(stlPath) {
    const stlPreviewContainer = document.getElementById('stlPreviewContainer');
    stlPreviewContainer.classList.remove('hidden');
    // Remove previous viewer if any
    stlPreviewContainer.innerHTML = '<h4>STL Preview</h4><div id="stlViewer"></div>';
    // Use stl-viewer to render STL
    new StlViewer(document.getElementById('stlViewer'), {
        models: [{ id: 0, filename: stlPath }]
    });
}

function showParametersModal() {
    extractAndDisplayParameters();
    parametersModal.classList.remove('hidden');
}

function hideParametersModal() {
    parametersModal.classList.add('hidden');
}

async function handleModify() {
    const modification = modifyPrompt.value.trim();
    if (!modification || !currentScadCode) {
        showToast('Enter a modification and generate code first.', 'warning');
        return;
    }
    showLoading('Modifying OpenSCAD code...');
    try {
        // Send both current code and modification prompt to AI
        const prompt = `Modify the following OpenSCAD code as described: \"${modification}\".\nReturn only the updated OpenSCAD code, no explanation or markdown fences.\n\nCurrent code:\n${currentScadCode}`;
        const result = await window.electronAPI.generateSCAD(prompt);
        if (result.success) {
            currentScadCode = result.code;
            displayCode(result.code);
            showToast('Model modified!', 'success');
        } else {
            showToast(`Modification failed: ${result.error}`, 'error');
        }
    } catch (error) {
        console.error('Modification error:', error);
        showToast('Failed to modify code', 'error');
    } finally {
        hideLoading();
    }
}
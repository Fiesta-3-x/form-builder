// Master database of templates
let templates = [];
let activeTemplateIndex = null;

// Failsafe App Initialization on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = localStorage.getItem('job_sheet_templates');
        if (saved) {
            templates = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Could not load templates from storage:", e);
    }
    
    // Safety check: Ensure all base views exist before running render sequences
    const homeView = document.getElementById('home-view');
    const settingsView = document.getElementById('settings-view');
    
    if (homeView) {
        homeView.classList.remove('hidden');
        renderHomeTemplates();
    } else {
        console.error("Fatal Error: 'home-view' element not found in HTML.");
    }
});

function saveTemplatesToStorage() {
    try {
        localStorage.setItem('job_sheet_templates', JSON.stringify(templates));
    } catch (e) {
        console.error("Could not save templates to storage:", e);
    }
}

// ==========================================================
// VIEW NAVIGATION
// ==========================================================
function showHome() {
    activeTemplateIndex = null;
    document.getElementById('home-view').classList.remove('hidden');
    document.getElementById('builder-view').classList.add('hidden');
    document.getElementById('preview-view').classList.add('hidden');
    document.getElementById('settings-view').classList.add('hidden');
    renderHomeTemplates();
}

function showBuilder() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('builder-view').classList.remove('hidden');
    document.getElementById('preview-view').classList.add('hidden');
    document.getElementById('settings-view').classList.add('hidden');
}

function showPreview() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('builder-view').classList.add('hidden');
    document.getElementById('preview-view').classList.remove('hidden');
    document.getElementById('settings-view').classList.add('hidden');
}

function showSettings() {
    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('builder-view').classList.add('hidden');
    document.getElementById('preview-view').classList.add('hidden');
    document.getElementById('settings-view').classList.remove('hidden');
    
    // Load saved settings data into the input fields
    const logoData = localStorage.getItem('settings_logo');
    const companyDetails = localStorage.getItem('settings_company_details');
    
    const logoPreview = document.getElementById('settings-logo-preview');
    const placeholder = document.getElementById('logo-upload-placeholder');
    if (logoData) {
        logoPreview.src = logoData;
        logoPreview.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        logoPreview.style.display = 'none';
        placeholder.style.display = 'block';
    }
    
    document.getElementById('settings-company-details').value = companyDetails || '';
    
    // Initialize settings signature pad
    setTimeout(() => {
        initSignaturePad('settings-sig-canvas');
        const savedSig = localStorage.getItem('settings_saved_signature');
        const sigCanvas = document.getElementById('settings-sig-canvas');
        const sigPreview = document.getElementById('settings-sig-preview');
        if (savedSig && sigCanvas && sigPreview) {
            sigPreview.src = savedSig;
            sigPreview.style.display = 'block';
            sigCanvas.style.display = 'none';
        }
    }, 100);
}

// ==========================================================
// 1. HOME DASHBOARD LOGIC
// ==========================================================
function createNewTemplate() {
    const newTemplate = {
        name: 'New Job Sheet',
        fields: [],
        locked: false
    };
    templates.push(newTemplate);
    activeTemplateIndex = templates.length - 1;
    saveTemplatesToStorage();
    
    document.getElementById('template-name').value = newTemplate.name;
    renderBuilderList();
    showBuilder();
}

function editTemplate(index) {
    activeTemplateIndex = index;
    const template = templates[activeTemplateIndex];
    document.getElementById('template-name').value = template.name;
    renderBuilderList();
    showBuilder();
}

function deleteTemplate(index, event) {
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this template?")) {
        templates.splice(index, 1);
        saveTemplatesToStorage();
        renderHomeTemplates();
    }
}

function renderHomeTemplates() {
    const container = document.getElementById('templates-list');
    container.innerHTML = '';
    
    if (templates.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:14px; margin: 30px 0;">No templates created yet. Tap "+ Create New Template" above to begin!</p>';
        return;
    }
    
    templates.forEach((t, i) => {
        const row = document.createElement('div');
        row.className = 'template-item';
        row.onclick = () => editTemplate(i);
        row.innerHTML = `
            <div class="template-details">
                <span class="template-name">${t.name}</span>
                <span class="template-meta">${t.fields ? t.fields.length : 0} Fields Configured</span>
            </div>
            <button class="btn btn-danger" onclick="deleteTemplate(${i}, event)">Delete</button>
        `;
        container.appendChild(row);
    });
}
// ==========================================================
// 2. BUILDER LOGIC
// ==========================================================

// Helper to lock/unlock background page scrolling
function setBackgroundScroll(lock) {
    if (lock) {
        document.body.dataset.scrollTop = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${window.scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
    } else {
        const scrollTop = parseInt(document.body.dataset.scrollTop || '0');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollTop);
    }
}

// Helper function to show a custom iOS-style text input dialog (replaces default prompt)
function askTextInput(message, callback) {
    const existing = document.getElementById('custom-input-modal');
    if (existing) existing.remove();

    setBackgroundScroll(true);

    const modal = document.createElement('div');
    modal.id = 'custom-input-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px; box-sizing:border-box; pointer-events:auto;';

    modal.innerHTML = `
        <div style="background:#fff; border-radius:14px; width:100%; max-width:270px; text-align:center; font-family:-apple-system, BlinkMacSystemFont, sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.15); overflow:hidden; transform:translateY(-80px);">
            <div style="padding:16px 16px 8px 16px; font-size:17px; font-weight:600; color:#000; line-height:1.4;">${message}</div>
            <div style="padding:0 16px 12px 16px;">
                <input type="text" id="custom-modal-text-field" style="width:100%; padding:8px; border:1px solid #e5e5ea; border-radius:8px; font-size:15px; box-sizing:border-box; outline:none; -webkit-appearance:none;">
            </div>
            <div style="display:flex; border-top:1px solid #e5e5ea;">
                <button id="input-cancel-btn" style="flex:1; background:transparent; border:none; padding:12px; font-size:17px; color:#ff3b30; cursor:pointer; border-right:1px solid #e5e5ea; font-weight:400; outline:none;">Cancel</button>
                <button id="input-ok-btn" style="flex:1; background:transparent; border:none; padding:12px; font-size:17px; color:#007aff; cursor:pointer; font-weight:600; outline:none;">Ok</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

    const inputField = document.getElementById('custom-modal-text-field');
    inputField.focus();

    document.getElementById('input-cancel-btn').onclick = function() {
        modal.remove();
        setBackgroundScroll(false);
        callback(null);
    };

    document.getElementById('input-ok-btn').onclick = function() {
        const val = inputField.value;
        modal.remove();
        setBackgroundScroll(false);
        callback(val);
    };
}

// Helper function to show a true Yes/No dialog
function askYesNo(message, callback) {
    const existing = document.getElementById('custom-confirm-modal');
    if (existing) existing.remove();

    setBackgroundScroll(true);

    const modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:99999; padding:20px; box-sizing:border-box; pointer-events:auto;';

    modal.innerHTML = `
        <div style="background:#fff; border-radius:14px; width:100%; max-width:270px; text-align:center; font-family:-apple-system, BlinkMacSystemFont, sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.15); overflow:hidden; transform:translateY(0);">
            <div style="padding:16px; font-size:17px; font-weight:600; color:#000; line-height:1.4;">${message}</div>
            <div style="display:flex; border-top:1px solid #e5e5ea;">
                <button id="confirm-no-btn" style="flex:1; background:transparent; border:none; padding:12px; font-size:17px; color:#ff3b30; cursor:pointer; border-right:1px solid #e5e5ea; font-weight:400; outline:none;">No</button>
                <button id="confirm-yes-btn" style="flex:1; background:transparent; border:none; padding:12px; font-size:17px; color:#007aff; cursor:pointer; font-weight:600; outline:none;">Yes</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });

    document.getElementById('confirm-no-btn').onclick = function() {
        modal.remove();
        setBackgroundScroll(false);
        callback(false);
    };

    document.getElementById('confirm-yes-btn').onclick = function() {
        modal.remove();
        setBackgroundScroll(false);
        callback(true);
    };
}

function addField(type) {
    const currentTemplate = templates[activeTemplateIndex];
    
    if (currentTemplate.locked) {
        alert("This template is locked. Turn off the safety lock first.");
        return;
    }

    // Configured clear title strings for all field types using mixed case
    let displayType = 'Field';
    if (type === 'text') displayType = 'Short Text (Max 50)';
    else if (type === 'longtext') displayType = 'Long Text (Max 3500)';
    else if (type === 'boolean') displayType = 'Yes/No';
    else if (type === 'dropdown') displayType = 'Drop-down';
    else if (type === 'photo') displayType = 'Photo';
    else if (type === 'gps') displayType = 'GPS Stamp';
    else if (type === 'barcode') displayType = 'Barcode';
    else if (type === 'signature') displayType = 'Signature';
    else if (type === 'checkbox') displayType = 'Multiple Select';

    askTextInput(`Enter label/question for the ${displayType} field:`, function(rawLabel) {
        if (!rawLabel) return;

        let label = rawLabel.trim();
        if (label.length === 0) return;
        label = label.charAt(0).toUpperCase() + label.slice(1);

        const fieldId = 'field_' + Date.now();
        
        const processDropdownAndConditions = (optionsList) => {
            const booleanFields = currentTemplate.fields.filter(f => f.type === 'boolean');
            
            const finalizeField = (conditionObj) => {
                const newField = {
                    id: fieldId,
                    label: label,
                    type: type,
                    options: optionsList,
                    condition: conditionObj,
                    // Rule setup: Short text gets 50 characters, long text gets 3500
                    maxlength: type === 'text' ? 50 : (type === 'longtext' ? 3500 : null)
                };
                currentTemplate.fields.push(newField);
                saveTemplatesToStorage();
                renderBuilderList();
            };

            if (booleanFields.length > 0) {
                setTimeout(() => {
                    askYesNo("Do you want this field to be conditional (show/hide based on a Yes/No question)?", function(makeConditional) {
                        if (makeConditional) {
                            let promptText = "Select which question controls this field (type the number):\n";
                            booleanFields.forEach((bf, idx) => {
                                promptText += `${idx + 1}. ${bf.label}\n`;
                            });
                            
                            setTimeout(() => {
                                askTextInput(promptText, function(selectionRaw) {
                                    const selection = parseInt(selectionRaw) - 1;
                                    if (selection >= 0 && selection < booleanFields.length) {
                                        setTimeout(() => {
                                            askYesNo("Should this field appear if that question is marked YES? (Choose No for NO)", function(showOnYes) {
                                                finalizeField({
                                                    dependsOn: booleanFields[selection].id,
                                                    showIf: showOnYes ? 'yes' : 'no'
                                                });
                                            });
                                        }, 100);
                                    } else {
                                        finalizeField(null);
                                    }
                                });
                            }, 100);
                        } else {
                            finalizeField(null);
                        }
                    });
                }, 100);
            } else {
                finalizeField(null);
            }
        };

        // Both dropdown and checkbox will use the comma-separated options collector
        if (type === 'dropdown' || type === 'checkbox') {
            setTimeout(() => {
                askTextInput("Enter options separated by commas (e.g., Apple, Banana, Orange):", function(optionsRaw) {
                    let options = [];
                    if (optionsRaw) {
                        options = optionsRaw.split(',')
                            .map(o => o.trim())
                            .filter(o => o.length > 0)
                            .map(o => o.charAt(0).toUpperCase() + o.slice(1));
                    }
                    processDropdownAndConditions(options);
                });
                
                const modalInput = document.querySelector('.modal input, .alert input, input[type="text"]');
                if (modalInput) {
                    modalInput.style.textTransform = 'none';
                    modalInput.removeAttribute('autocapitalize');
                    modalInput.setAttribute('autocapitalize', 'sentences');
                }
            }, 100);
        } else {
            processDropdownAndConditions([]);
        } 
    });
}

// STEP 2 ENGINE CODE LINKED HERE PERFECTLY
function editField(fieldId) {
    const currentTemplate = templates[activeTemplateIndex];
    if (currentTemplate.locked) {
        alert("This template is locked. Turn off the safety lock first.");
        return;
    }

    const field = currentTemplate.fields.find(f => f.id === fieldId);
    if (!field) return;

    askTextInput(`Edit question label/title:`, function(newLabelRaw) {
        if (!newLabelRaw) return;
        let newLabel = newLabelRaw.trim();
        if (newLabel.length === 0) return;
        
        field.label = newLabel.charAt(0).toUpperCase() + newLabel.slice(1);

        if (field.type === 'dropdown' || field.type === 'checkbox') {
            setTimeout(() => {
                const currentOptionsString = field.options ? field.options.join(', ') : '';
                
                askTextInput("Edit options (separated by commas):", function(optionsRaw) {
                    if (optionsRaw) {
                        field.options = optionsRaw.split(',')
                            .map(o => o.trim())
                            .filter(o => o.length > 0)
                            .map(o => o.charAt(0).toUpperCase() + o.slice(1));
                    }
                    
                    saveTemplatesToStorage();
                    renderBuilderList();
                    if (typeof renderPreviewForm === 'function') renderPreviewForm();
                });

                const modalInput = document.querySelector('.modal input, .alert input, input[type="text"]');
                if (modalInput) {
                    modalInput.style.textTransform = 'none';
                    modalInput.removeAttribute('autocapitalize');
                    modalInput.setAttribute('autocapitalize', 'sentences');
                    if (currentOptionsString) modalInput.value = currentOptionsString;
                }
            }, 100);
        } else {
            saveTemplatesToStorage();
            renderBuilderList();
            if (typeof renderPreviewForm === 'function') renderPreviewForm();
        }
    });
    
    setTimeout(() => {
        const modalInput = document.querySelector('.modal input, .alert input, input[type="text"]');
        if (modalInput) modalInput.value = field.label;
    }, 50);
}

function deleteField(index) {
    const currentTemplate = templates[activeTemplateIndex];
    if (currentTemplate.locked) {
        alert("This template is locked. Turn off the safety lock first.");
        return;
    }
    currentTemplate.fields.splice(index, 1);
    saveTemplatesToStorage();
    renderBuilderList();
}

function moveField(index, direction) {
    const template = templates[activeTemplateIndex];
    if (!template || !template.fields) return;
    if (template.locked) return;

    const fields = template.fields;
    
    if (direction === 'up' && index > 0) {
        [fields[index], fields[index - 1]] = [fields[index - 1], fields[index]];
    } else if (direction === 'down' && index < fields.length - 1) {
        [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
    }

    saveTemplatesToStorage();
    renderBuilderList();
}

function toggleGlobalLock() {
    const template = templates[activeTemplateIndex];
    if (!template) return;

    template.locked = !template.locked;
    saveTemplatesToStorage();
    renderBuilderList();
}

document.getElementById('template-name').addEventListener('input', (e) => {
    if (activeTemplateIndex !== null) {
        const template = templates[activeTemplateIndex];
        if (template.locked) {
            e.target.value = template.name;
            return;
        }
        template.name = e.target.value;
        saveTemplatesToStorage();
    }
});

function renderBuilderList() {
    const listContainer = document.getElementById('fields-list');
    const currentTemplate = templates[activeTemplateIndex];

    if (!currentTemplate) return;

    let lockHeader = document.getElementById('global-lock-header');
    if (!lockHeader) {
        lockHeader = document.createElement('div');
        lockHeader.id = 'global-lock-header';
        listContainer.parentNode.insertBefore(lockHeader, listContainer);
    }

    const isLocked = currentTemplate.locked || false;

    const nameInput = document.getElementById('template-name');
    if (nameInput) {
        nameInput.disabled = isLocked;
    }

    const addButtons = document.querySelectorAll('.builder-actions button, .add-field-btn');
    addButtons.forEach(btn => {
        btn.disabled = isLocked;
        btn.style.opacity = isLocked ? '0.5' : '1';
    });

    lockHeader.innerHTML = `
        <div class="global-lock-wrapper">
            <span class="lock-label">${isLocked ? '🔒 Form Locked' : '🔓 Form Unlocked'}</span>
            <div class="ios-switch-container">
                <label class="ios-switch">
                    <input type="checkbox" onchange="toggleGlobalLock()" ${isLocked ? 'checked' : ''}>
                    <span class="ios-slider">
                        <span class="slider-icon">${isLocked ? '🔒' : '🔓'}</span>
                    </span>
                </label>
            </div>
        </div>
    `;

    listContainer.innerHTML = '';

    if (currentTemplate.fields.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#8e8e93; font-size:14px; margin-top:20px;">No fields configured. Tap a button above to add some!</p>';
        return;
    }

    currentTemplate.fields.forEach((field, index) => {
        const row = document.createElement('div');
        row.className = `builder-field-row ${isLocked ? 'field-is-locked' : ''}`;
        
        let conditionBadgeHtml = '';
        if (field.condition) {
            const parentField = currentTemplate.fields.find(f => f.id === field.condition.dependsOn);
            const parentLabel = parentField ? parentField.label : 'another question';
            conditionBadgeHtml = `<div class="conditional-badge">Only shows if "${parentLabel}" is "${field.condition.showIf.toUpperCase()}"</div>`;
        }

        let displayLabelType = field.type.toUpperCase();
        if (field.type === 'text') displayLabelType = 'SHORT TEXT';
        if (field.type === 'longtext') displayLabelType = 'LONG TEXT';
        if (field.type === 'boolean') displayLabelType = 'YES/NO';
        if (field.type === 'checkbox') displayLabelType = 'MULTI SELECT';

        const trashSvg = `
            <svg class="bin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
        `;

        // STEP 1 BUTTON INSERTED DIRECTLY HERE NEXT TO THE TRASH BIN
        row.innerHTML = `
            <div class="builder-row-top">
                <div class="field-info">
                    <strong>${field.label}</strong> 
                    <span>${displayLabelType}</span>
                    ${conditionBadgeHtml}
                </div>
                <div class="field-controls" style="display: flex; gap: 6px; align-items: center;">
                    <button type="button" class="btn-icon" onclick="moveField(${index}, 'up')" ${index === 0 || isLocked ? 'disabled' : ''}>▲</button>
                    <button type="button" class="btn-icon" onclick="moveField(${index}, 'down')" ${index === currentTemplate.fields.length - 1 || isLocked ? 'disabled' : ''}>▼</button>
                    
                    <button type="button" class="btn-icon" style="background:#e5e5ea; color:#000; font-size:11px;" onclick="editField('${field.id}')" ${isLocked ? 'disabled' : ''}>✏️</button>
                    
                    <button class="btn-delete-bin" onclick="deleteField(${index})" ${isLocked ? 'disabled' : ''} aria-label="Delete field">
                        ${trashSvg}
                    </button>
                </div>
            </div>
        `;
        listContainer.appendChild(row);
    });
}

// ==========================================================
// 3. PREVIEW & RUNTIME INTERACTIONS
// ==========================================================
function saveAndPreview() {
    showPreview();
    renderPreviewForm();
}

function renderPreviewForm() {
    const currentTemplate = templates[activeTemplateIndex];
    document.getElementById('preview-title').innerText = currentTemplate.name;
    document.getElementById('current-date').innerText = new Date().toLocaleDateString();
    
    // Inject dynamic Settings Branding (Logo & Company Info)
    const savedLogo = localStorage.getItem('settings_logo');
    const savedDetails = localStorage.getItem('settings_company_details');

    const headerLogoImg = document.getElementById('pdf-header-logo');
    const headerDetailsDiv = document.getElementById('pdf-header-details');

    if (savedLogo && headerLogoImg) {
        headerLogoImg.src = savedLogo;
        headerLogoImg.style.display = 'block';
    } else if (headerLogoImg) {
        headerLogoImg.style.display = 'none';
    }

    if (savedDetails && headerDetailsDiv) {
        headerDetailsDiv.innerHTML = savedDetails.replace(/\n/g, '<br>');
    } else if (headerDetailsDiv) {
        headerDetailsDiv.innerHTML = '';
    }

    const form = document.getElementById('rendered-form');
    form.innerHTML = '';

    currentTemplate.fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'input-group';
        group.id = `group-${field.id}`;
        
        // Add CSS tags for conditional items
        if (field.condition) {
            group.classList.add('conditional-hidden');
            group.setAttribute('data-depends-on', field.condition.dependsOn);
            group.setAttribute('data-show-if', field.condition.showIf);
        }

        if (field.type === 'text') {
            // Standard short field
            group.innerHTML = `
                <label>${field.label}</label>
                <input type="text" maxlength="50" style="width:100%;" />
            `;
            form.appendChild(group);

       } else if (field.type === 'longtext') {
            // Multi-line area configured to match short text inputs completely (3500 max limit)
            group.innerHTML = `
                <label>${field.label}</label>
                <textarea maxlength="3500" rows="4" style="width:100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 17px; padding: 14px; border: 1px solid #e5e5ea; border-radius: 10px; background-color: #f2f2f7; box-sizing: border-box; resize: vertical; word-wrap: break-word; white-space: pre-wrap; color: #000000; -webkit-appearance: none;"></textarea>
            `;
            form.appendChild(group);

        } else if (field.type === 'boolean') {
            group.innerHTML = `
                <label>${field.label}</label>
                <select id="input-${field.id}" onchange="evaluateConditions()">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                </select>
            `;
            form.appendChild(group);

        } else if (field.type === 'dropdown') {
            let optionsHtml = field.options.map(o => `<option value="${o}">${o}</option>`).join('');
            group.innerHTML = `
                <label>${field.label}</label>
                <select id="input-${field.id}">
                    ${optionsHtml}
                </select>
            `;
            form.appendChild(group);

        } else if (field.type === 'photo') {
            group.innerHTML = `
                <label>${field.label}</label>
                <div class="photo-upload-container" onclick="document.getElementById('${field.id}').click();">
                    <span style="color:#007aff; font-weight:600;">+ Capture / Select Photo</span>
                    <input type="file" id="${field.id}" accept="image/*" style="display:none;" onchange="handlePhotoUpload(event, 'preview-${field.id}')">
                    <img id="preview-${field.id}" class="photo-preview">
                </div>
            `;
            form.appendChild(group);

        } else if (field.type === 'gps') {
            group.innerHTML = `
                <label>${field.label}</label>
                <button class="btn btn-action" onclick="fetchGPS('gps-${field.id}', 'address-${field.id}')" id="btn-gps-${field.id}">📍 Get GPS Stamp</button>
                <input type="text" id="address-${field.id}" readonly style="margin-top: 8px; display:none; font-weight: 600;" placeholder="Street address & postcode...">
                <input type="text" id="gps-${field.id}" readonly style="margin-top: 4px; display:none; font-size: 12px; color: #8e8e93; border: none; background: transparent; padding: 0;" placeholder="Coordinates...">
            `;
            form.appendChild(group);

        } else if (field.type === 'barcode') {
            group.innerHTML = `
                <label>${field.label}</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="barcode-${field.id}" placeholder="Enter or scan serial barcode..." style="flex: 1;">
                    <button class="btn btn-secondary" style="width: 100px; padding: 14px;" onclick="scanBarcode('barcode-${field.id}')">Scan</button>
                </div>
            `;
            form.appendChild(group);

        } else if (field.type === 'signature') {
            group.innerHTML = `
                <label>${field.label}</label>
                <div class="signature-container">
                    <canvas id="canvas-${field.id}" class="signature-canvas"></canvas>
                    <!-- Static image fallback for PDF printing -->
                    <img id="print-img-${field.id}" class="signature-print-image" alt="Signature preview">
                    <div class="signature-actions">
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size:12px;" onclick="clearSignature('canvas-${field.id}')">Clear</button>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size:12px; background-color: #e8f4fd; color: #007aff;" onclick="applySavedSignature('${field.id}')">✍️ Use Saved Signature</button>
                    </div>
                </div>
            `;
            form.appendChild(group);
            setTimeout(() => { initSignaturePad(`canvas-${field.id}`); }, 50);
        } else if (field.type === 'checkbox') {
            // Generates a group of multiple-choice checkboxes matching the iOS hue
            let optionsHtml = field.options.map(o => `
                <label style="display: flex; align-items: center; gap: 10px; margin-top: 8px; font-weight: normal; cursor: pointer;">
                    <input type="checkbox" name="${field.id}" value="${o}" style="width: 20px; height: 20px; accent-color: #007aff; border-radius: 4px;" />
                    <span style="font-size: 16px; color: #000000;">${o}</span>
                </label>
            `).join('');

            group.innerHTML = `
                <label>${field.label}</label>
                <div style="background-color: #f2f2f7; border: 1px solid #e5e5ea; border-radius: 10px; padding: 12px 14px; box-sizing: border-box;">
                    ${optionsHtml}
                </div>
            `;
            form.appendChild(group);
        }
    });

    evaluateConditions(); // Initial run to hide/show conditional fields properly
}

// CONDITIONAL ENGINE RUNTIME EVALUATION
function evaluateConditions() {
    const currentTemplate = templates[activeTemplateIndex];
    currentTemplate.fields.forEach(field => {
        const element = document.getElementById(`group-${field.id}`);
        if (element && field.condition) {
            const parentInput = document.getElementById(`input-${field.condition.dependsOn}`);
            if (parentInput) {
                const parentVal = parentInput.value;
                if (parentVal === field.condition.showIf) {
                    element.classList.remove('conditional-hidden');
                } else {
                    element.classList.add('conditional-hidden');
                }
            }
        }
    });
}

// ==========================================================
// SETTINGS LOGIC & ACTION HANDLERS
// ==========================================================
function handleSettingsLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result;
            localStorage.setItem('settings_logo', base64Data);
            
            const preview = document.getElementById('settings-logo-preview');
            preview.src = base64Data;
            preview.style.display = 'block';
            document.getElementById('logo-upload-placeholder').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function clearSettingsLogo() {
    localStorage.removeItem('settings_logo');
    document.getElementById('settings-logo-preview').style.display = 'none';
    document.getElementById('logo-upload-placeholder').style.display = 'block';
}

function saveSettingsData() {
    const details = document.getElementById('settings-company-details').value;
    localStorage.setItem('settings_company_details', details);
}

function saveSettingsSignature() {
    const canvas = document.getElementById('settings-sig-canvas');
    if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        localStorage.setItem('settings_saved_signature', dataUrl);
        
        const preview = document.getElementById('settings-sig-preview');
        preview.src = dataUrl;
        preview.style.display = 'block';
        canvas.style.display = 'none';
        alert("Signature saved successfully!");
    }
}

function clearSettingsSignature() {
    clearSignature('settings-sig-canvas');
    localStorage.removeItem('settings_saved_signature');
    document.getElementById('settings-sig-preview').style.display = 'none';
    document.getElementById('settings-sig-canvas').style.display = 'block';
}

function applySavedSignature(fieldId) {
    const savedSig = localStorage.getItem('settings_saved_signature');
    if (!savedSig) {
        alert("No saved signature found! Set one up in the app Settings first.");
        return;
    }
    
    const canvas = document.getElementById(`canvas-${fieldId}`);
    const printImg = document.getElementById(`print-img-${fieldId}`);
    
    if (printImg && canvas) {
        printImg.src = savedSig;
        printImg.style.display = 'block';
        canvas.style.display = 'none';
    }
}

// ==========================================================
// PLUGIN INTERACTIONS (GPS, BARCODE, PHOTO, SIGNATURES)
// ==========================================================
function fetchGPS(coordInputId, addressInputId) {
    const coordInput = document.getElementById(coordInputId);
    const addressInput = document.getElementById(addressInputId);
    const btn = document.getElementById(`btn-${coordInputId}`);
    
    btn.innerText = "Locating...";
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            coordInput.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
            coordInput.style.display = 'block';
            
            try {
                const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
                const response = await fetch(url, {
                    headers: { 'User-Agent': 'JobSheetApp/1.0' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const road = data.address.road || '';
                    const houseNumber = data.address.house_number || '';
                    const postcode = data.address.postcode || '';
                    
                    const streetAddress = `${houseNumber} ${road}`.trim();
                    const fullAddress = `${streetAddress}${streetAddress ? ', ' : ''}${postcode}`.trim();
                    
                    addressInput.value = fullAddress || "Address found, details missing";
                } else {
                    addressInput.value = "Address lookup failed";
                }
            } catch (err) {
                console.error("Reverse geocoding error:", err);
                addressInput.value = "Network error retrieving address";
            }
            
            addressInput.style.display = 'block';
            btn.innerText = "📍 Update GPS Stamp";
        },
        (error) => {
            alert("Could not get location. Ensure your device location services are enabled.");
            btn.innerText = "📍 Get GPS Stamp";
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function scanBarcode(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    try {
        const BarcodeScanner = window.Capacitor?.Plugins?.CapacitorBarcodeScanner;
        if (!BarcodeScanner) {
            alert("Barcode Scanner plugin is not loaded. Ensure you are testing on a real device.");
            return;
        }

        const result = await BarcodeScanner.scanBarcode({
            hint: 17,
            scanInstructions: "Align the barcode inside the camera frame",
            scanButton: true,
            scanText: "Scan",
            cameraDirection: 1,
            scanOrientation: 1
        });

        const scannedValue = result?.ScanResult || result?.value || result;

        if (scannedValue && typeof scannedValue === "string" && scannedValue.trim() !== "") {
            input.value = scannedValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            const flash = document.getElementById('scan-success-flash');
            if (flash) {
                flash.style.display = 'flex';
                flash.style.opacity = '1';
                
                setTimeout(() => {
                    flash.style.opacity = '0';
                    setTimeout(() => {
                        flash.style.display = 'none';
                    }, 200);
                }, 800);
            }
        }
    } catch (error) {
        console.error("Barcode scanning failed:", error);
    }
}

function handlePhotoUpload(event, imgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(imgId);
            img.src = e.target.result;
            img.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function initSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    let drawing = false;

    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - r.left, y: clientY - r.top };
    }

    function startDraw(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function draw(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopDraw() { 
        drawing = false; 
        const fieldId = canvasId.replace('canvas-', '');
        const printImg = document.getElementById(`print-img-${fieldId}`);
        if (printImg) {
            printImg.src = canvas.toDataURL('image/png');
        }
    }

    canvas.addEventListener('touchstart', startDraw, { passive: true });
    canvas.addEventListener('touchmove', draw, { passive: true });
    canvas.addEventListener('touchend', stopDraw);

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
}

function clearSignature(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const fieldId = canvasId.replace('canvas-', '');
        const printImg = document.getElementById(`print-img-${fieldId}`);
        if (printImg) {
            printImg.removeAttribute('src');
        }
    }
}

// Safely dynamically load external scripts
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ==========================================================
// 4. GENERATE PDF / SHARE SYSTEM
// ==========================================================
async function shareJobSheet() {
    const shareBtn = document.querySelector('.sticky-footer button') || document.querySelector('.btn-primary');
    const originalBtnText = shareBtn ? shareBtn.innerText : "Share";
    
    if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.innerText = "Generating PDF...";
    }

    const appContainer = document.querySelector('.app-container');
    const originalScrollY = window.scrollY;

    try {
        const currentTemplate = templates[activeTemplateIndex];

        // 1. Swap active signature canvases to static images in-place
        currentTemplate.fields.forEach(field => {
            if (field.type === 'signature') {
                const canvas = document.getElementById(`canvas-${field.id}`);
                const printImg = document.getElementById(`print-img-${field.id}`);
                if (canvas && printImg) {
                    printImg.src = canvas.toDataURL('image/png');
                    printImg.style.display = 'block'; 
                    canvas.style.display = 'none'; 
                }
            }
        });

        // 2. Dynamically load html2pdf engine if not already loaded
        if (typeof html2pdf === 'undefined') {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
        }

        // 3. TARGET the live printable layout sheet directly
        const element = document.querySelector('.printable-job-sheet');
        if (!element) throw new Error("Printable sheet element not found");

        // 4. Force parent container expansion (bypassing the iOS WebView scroll-cut constraint)
        if (appContainer) {
            appContainer.style.height = 'auto';
            appContainer.style.overflow = 'visible';
            appContainer.style.minHeight = 'none';
        }
        document.body.classList.add('is-generating-pdf');

        // Scroll to the absolute top of the page to allow the renderer to capture cleanly
        window.scrollTo(0, 0);

        // Give iOS WebKit 80ms to repaint the expanded layout before capturing
        await new Promise(resolve => setTimeout(resolve, 80));

        const fileName = `${currentTemplate.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        
        const opt = {
            margin:       10,
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                scrollY: 0,
                scrollX: 0,
                windowWidth: element.offsetWidth,
                windowHeight: element.scrollHeight 
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css', 'legacy'] }
        };

        const isApp = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

        if (isApp) {
            const pdfDataUri = await html2pdf().set(opt).from(element).toPdf().output('datauristring');
            const base64Data = pdfDataUri.split(',')[1];
            
            const Filesystem = window.Capacitor.Plugins.Filesystem;
            const Share = window.Capacitor.Plugins.Share;
            
            if (Filesystem && Share) {
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: 'CACHE'
                });
                
                await Share.share({
                    title: currentTemplate.name,
                    url: result.uri
                });
            } else {
                throw new Error("Capacitor Filesystem or Share plugins not available.");
            }
        } else {
            await html2pdf().set(opt).from(element).save();
        }

    } catch (e) {
        console.error("PDF generation failed:", e);
        alert("Could not generate PDF: " + e.message);
    } finally {
        // 5. TEARDOWN: Instantly restore native app structures
        if (appContainer) {
            appContainer.style.height = '';
            appContainer.style.overflow = '';
            appContainer.style.minHeight = '';
        }
        document.body.classList.remove('is-generating-pdf');
        window.scrollTo(0, originalScrollY);

        // Restore interactive signature canvases back to the screen
        const currentTemplate = templates[activeTemplateIndex];
        currentTemplate.fields.forEach(field => {
            if (field.type === 'signature') {
                const canvas = document.getElementById(`canvas-${field.id}`);
                const printImg = document.getElementById(`print-img-${field.id}`);
                if (canvas && printImg) {
                    canvas.style.display = 'block';
                    printImg.style.display = 'none';
                }
            }
        });

        if (shareBtn) {
            shareBtn.disabled = false;
            shareBtn.innerText = originalBtnText;
        }
    }
}

// ==========================================================
// PREVENT NATIVE IOS WEBVIEW PINCH & DOUBLE-TAP ZOOMING
// ==========================================================
document.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);
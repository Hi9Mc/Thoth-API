// Global state
let customFields = {};
let currentObject = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    showMessage('Welcome to Thoth Data Management System', 'info');
    loadExampleData();
});

// Utility functions
function showMessage(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type} show`;
    
    setTimeout(() => {
        statusDiv.classList.remove('show');
    }, 5000);
}

function generateId() {
    return 'field_' + Math.random().toString(36).substr(2, 9);
}

// Dynamic field management
function addField() {
    const nameInput = document.getElementById('newFieldName');
    const typeSelect = document.getElementById('newFieldType');
    
    const fieldName = nameInput.value.trim();
    const fieldType = typeSelect.value;
    
    if (!fieldName) {
        showMessage('Please enter a field name', 'error');
        return;
    }
    
    if (customFields[fieldName]) {
        showMessage('Field already exists', 'error');
        return;
    }
    
    customFields[fieldName] = {
        type: fieldType,
        value: getDefaultValue(fieldType)
    };
    
    renderCustomFields();
    nameInput.value = '';
    showMessage(`Field "${fieldName}" added successfully`, 'success');
}

function removeField(fieldName) {
    delete customFields[fieldName];
    renderCustomFields();
    showMessage(`Field "${fieldName}" removed`, 'info');
}

function getDefaultValue(type) {
    switch (type) {
        case 'string': return '';
        case 'number': return 0;
        case 'boolean': return false;
        case 'date': return new Date().toISOString().split('T')[0];
        case 'json': return '{}';
        case 'array': return '[]';
        default: return '';
    }
}

function createFieldInput(fieldName, fieldData) {
    const fieldId = generateId();
    let inputElement;
    
    switch (fieldData.type) {
        case 'string':
            inputElement = `<input type="text" id="${fieldId}" value="${fieldData.value}" onchange="updateFieldValue('${fieldName}', this.value)">`;
            break;
        case 'number':
            inputElement = `<input type="number" id="${fieldId}" value="${fieldData.value}" onchange="updateFieldValue('${fieldName}', parseFloat(this.value) || 0)">`;
            break;
        case 'boolean':
            const checked = fieldData.value ? 'checked' : '';
            inputElement = `<input type="checkbox" id="${fieldId}" ${checked} onchange="updateFieldValue('${fieldName}', this.checked)">`;
            break;
        case 'date':
            inputElement = `<input type="date" id="${fieldId}" value="${fieldData.value}" onchange="updateFieldValue('${fieldName}', this.value)">`;
            break;
        case 'json':
            inputElement = `<textarea id="${fieldId}" class="json-editor" onchange="updateFieldValue('${fieldName}', this.value)">${fieldData.value}</textarea>`;
            break;
        case 'array':
            inputElement = `<textarea id="${fieldId}" class="json-editor" onchange="updateFieldValue('${fieldName}', this.value)">${fieldData.value}</textarea>`;
            break;
        default:
            inputElement = `<input type="text" id="${fieldId}" value="${fieldData.value}" onchange="updateFieldValue('${fieldName}', this.value)">`;
    }
    
    return inputElement;
}

function updateFieldValue(fieldName, value) {
    if (customFields[fieldName]) {
        customFields[fieldName].value = value;
    }
}

function changeFieldType(fieldName, newType) {
    if (customFields[fieldName]) {
        customFields[fieldName].type = newType;
        customFields[fieldName].value = getDefaultValue(newType);
        renderCustomFields();
        showMessage(`Field "${fieldName}" type changed to ${newType}`, 'info');
    }
}

function renderCustomFields() {
    const container = document.getElementById('customFields');
    
    if (Object.keys(customFields).length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">No custom fields added yet.</p>';
        return;
    }
    
    container.innerHTML = Object.entries(customFields).map(([fieldName, fieldData]) => `
        <div class="custom-field">
            <label>${fieldName}:</label>
            ${createFieldInput(fieldName, fieldData)}
            <span class="field-type">${fieldData.type}</span>
            <select onchange="changeFieldType('${fieldName}', this.value)">
                <option value="string" ${fieldData.type === 'string' ? 'selected' : ''}>Text</option>
                <option value="number" ${fieldData.type === 'number' ? 'selected' : ''}>Number</option>
                <option value="boolean" ${fieldData.type === 'boolean' ? 'selected' : ''}>Boolean</option>
                <option value="date" ${fieldData.type === 'date' ? 'selected' : ''}>Date</option>
                <option value="json" ${fieldData.type === 'json' ? 'selected' : ''}>JSON Object</option>
                <option value="array" ${fieldData.type === 'array' ? 'selected' : ''}>Array</option>
            </select>
            <button class="remove-field" onclick="removeField('${fieldName}')">Remove</button>
        </div>
    `).join('');
}

// Object management functions
function getFormData() {
    const data = {
        tenantId: document.getElementById('tenantId').value.trim(),
        resourceType: document.getElementById('resourceType').value.trim(),
        resourceId: document.getElementById('resourceId').value.trim(),
        version: parseInt(document.getElementById('version').value) || 1
    };
    
    // Add custom fields
    Object.entries(customFields).forEach(([fieldName, fieldData]) => {
        let value = fieldData.value;
        
        // Parse JSON and array fields
        if (fieldData.type === 'json' || fieldData.type === 'array') {
            try {
                value = JSON.parse(value);
            } catch (e) {
                showMessage(`Invalid JSON in field "${fieldName}": ${e.message}`, 'error');
                throw new Error(`Invalid JSON in field "${fieldName}"`);
            }
        }
        
        data[fieldName] = value;
    });
    
    return data;
}

function validateRequiredFields(data) {
    const required = ['tenantId', 'resourceType', 'resourceId'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
        showMessage(`Missing required fields: ${missing.join(', ')}`, 'error');
        return false;
    }
    
    return true;
}

async function saveObject() {
    try {
        const data = getFormData();
        
        if (!validateRequiredFields(data)) {
            return;
        }
        
        const url = `/tenants/${encodeURIComponent(data.tenantId)}/resources/${encodeURIComponent(data.resourceType)}/${encodeURIComponent(data.resourceId)}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Object saved successfully!', 'success');
            currentObject = data;
        } else {
            showMessage(`Error saving object: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Error saving object: ${error.message}`, 'error');
    }
}

async function loadObject() {
    try {
        const tenantId = document.getElementById('tenantId').value.trim();
        const resourceType = document.getElementById('resourceType').value.trim();
        const resourceId = document.getElementById('resourceId').value.trim();
        const version = parseInt(document.getElementById('version').value) || 1;
        
        if (!tenantId || !resourceType || !resourceId) {
            showMessage('Please fill in Tenant ID, Resource Type, and Resource ID to load an object', 'error');
            return;
        }
        
        const url = `/tenants/${encodeURIComponent(tenantId)}/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}?version=${version}`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (response.ok && result) {
            loadObjectIntoForm(result);
            showMessage('Object loaded successfully!', 'success');
        } else {
            showMessage(`Object not found or error loading: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Error loading object: ${error.message}`, 'error');
    }
}

function loadObjectIntoForm(object) {
    // Load required fields
    document.getElementById('tenantId').value = object.tenantId || '';
    document.getElementById('resourceType').value = object.resourceType || '';
    document.getElementById('resourceId').value = object.resourceId || '';
    document.getElementById('version').value = object.version || 1;
    
    // Clear and load custom fields
    customFields = {};
    
    Object.entries(object).forEach(([key, value]) => {
        if (!['tenantId', 'resourceType', 'resourceId', 'version'].includes(key)) {
            const type = detectFieldType(value);
            customFields[key] = {
                type: type,
                value: type === 'json' || type === 'array' ? JSON.stringify(value, null, 2) : value
            };
        }
    });
    
    renderCustomFields();
    currentObject = object;
}

function detectFieldType(value) {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
        // Check if it's a date
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
        return 'string';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'json';
    return 'string';
}

async function deleteObject() {
    try {
        const tenantId = document.getElementById('tenantId').value.trim();
        const resourceType = document.getElementById('resourceType').value.trim();
        const resourceId = document.getElementById('resourceId').value.trim();
        const version = parseInt(document.getElementById('version').value) || 1;
        
        if (!tenantId || !resourceType || !resourceId) {
            showMessage('Please fill in Tenant ID, Resource Type, and Resource ID to delete an object', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this object? This action cannot be undone.')) {
            return;
        }
        
        const url = `/tenants/${encodeURIComponent(tenantId)}/resources/${encodeURIComponent(resourceType)}/${encodeURIComponent(resourceId)}?version=${version}`;
        
        const response = await fetch(url, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage('Object deleted successfully!', 'success');
            clearForm();
        } else {
            showMessage(`Error deleting object: ${result.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Error deleting object: ${error.message}`, 'error');
    }
}

function clearForm() {
    // Clear required fields
    document.getElementById('tenantId').value = '';
    document.getElementById('resourceType').value = '';
    document.getElementById('resourceId').value = '';
    document.getElementById('version').value = '1';
    
    // Clear custom fields
    customFields = {};
    renderCustomFields();
    currentObject = null;
    
    showMessage('Form cleared', 'info');
}

// Search functionality
async function searchObjects() {
    try {
        const searchTenant = document.getElementById('searchTenant').value.trim();
        const searchType = document.getElementById('searchType').value.trim();
        
        let url = '/tenants/';
        
        if (searchTenant && searchType) {
            url += `${encodeURIComponent(searchTenant)}/resources/${encodeURIComponent(searchType)}`;
        } else if (searchTenant) {
            // Search all resource types for a specific tenant
            url += `${encodeURIComponent(searchTenant)}/resources/all`;
        } else {
            showMessage('Please provide at least a tenant ID to search', 'error');
            return;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (response.ok && result && result.results && result.results.length > 0) {
            displaySearchResults(result.results);
            showMessage(`Found ${result.results.length} objects`, 'success');
        } else {
            document.getElementById('searchResults').innerHTML = '<p style="color: #6c757d; font-style: italic;">No objects found.</p>';
            showMessage('No objects found', 'info');
        }
    } catch (error) {
        showMessage(`Error searching objects: ${error.message}`, 'error');
    }
}

function displaySearchResults(objects) {
    const container = document.getElementById('searchResults');
    
    container.innerHTML = objects.map(obj => {
        const objectKey = `${obj.tenantId}#${obj.resourceType}#${obj.resourceId}#${obj.version}`;
        const preview = Object.entries(obj)
            .filter(([key]) => !['tenantId', 'resourceType', 'resourceId', 'version'].includes(key))
            .slice(0, 3)
            .map(([key, value]) => `${key}: ${JSON.stringify(value).substring(0, 50)}...`)
            .join(', ');
        
        return `
            <div class="result-item" onclick="loadObjectFromSearch('${encodeURIComponent(JSON.stringify(obj))}')">
                <div class="object-key">${objectKey}</div>
                <div class="object-preview">${preview || 'No additional fields'}</div>
            </div>
        `;
    }).join('');
}

function loadObjectFromSearch(encodedObject) {
    try {
        const object = JSON.parse(decodeURIComponent(encodedObject));
        loadObjectIntoForm(object);
        showMessage('Object loaded from search results', 'success');
    } catch (error) {
        showMessage(`Error loading object from search: ${error.message}`, 'error');
    }
}

// Example data loader
function loadExampleData() {
    // Pre-populate with some example data
    document.getElementById('tenantId').value = 'demo-company';
    document.getElementById('resourceType').value = 'document';
    document.getElementById('resourceId').value = 'user-guide';
    
    // Add some example custom fields
    customFields = {
        'title': { type: 'string', value: 'User Guide Documentation' },
        'isPublished': { type: 'boolean', value: true },
        'wordCount': { type: 'number', value: 1250 },
        'publishedDate': { type: 'date', value: '2024-01-15' },
        'tags': { type: 'array', value: '["documentation", "guide", "tutorial"]' },
        'metadata': { type: 'json', value: '{"author": "John Doe", "department": "Engineering"}' }
    };
    
    renderCustomFields();
}
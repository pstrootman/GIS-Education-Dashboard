// timeline-utils.js - Utility functions for timeline application
// This module contains helper functions used throughout the application

const TimelineUtils = {
    // URL parameter handling
    getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            id: urlParams.get('id') || 'default',
            project: urlParams.get('project'),
            demo: urlParams.get('demo') === 'true',
            embed: urlParams.get('embed') === 'true',
            readonly: urlParams.get('readonly') === 'true',
            theme: urlParams.get('theme') || 'modern',
            date: urlParams.get('date'),
            event: urlParams.get('event'),
            perspective: urlParams.get('perspective'),
            mode: urlParams.get('mode') || 'editor' // editor, viewer, presentation
        };
    },

    // Generate unique ID
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Date formatting utilities
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        switch (format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'YYYY-MM-DDTHH:mm':
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            case 'readable':
                return d.toLocaleDateString();
            case 'long':
                return d.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            default:
                return d.toISOString().split('T')[0];
        }
    },

    // Parse date from various formats
    parseDate(dateString) {
        if (!dateString) return null;
        
        // Handle year-only format (e.g., "1969")
        if (/^\d{4}$/.test(dateString)) {
            return new Date(parseInt(dateString), 0, 1);
        }
        
        // Handle standard date formats
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    },

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate password
    validatePassword(password) {
        return password && password.length >= 6;
    },

    // Show loading state on button
    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (button) {
            if (loading) {
                button.classList.add('btn-loading');
                button.disabled = true;
            } else {
                button.classList.remove('btn-loading');
                button.disabled = false;
            }
        }
    },

    // Show message with type (success, error, warning, info)
    showMessage(message, type = 'info', containerId = 'message-container', duration = 5000) {
        let container = document.getElementById(containerId);
        
        // Create container if it doesn't exist
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(alertDiv);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentElement) {
                    alertDiv.remove();
                }
            }, duration);
        }
    },

    // Clear all messages
    clearMessages(containerId = 'message-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    },

    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Download file
    downloadFile(content, filename, contentType = 'application/json') {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // Import/export utilities
    importFile(acceptTypes = '.json') {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = acceptTypes;
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        resolve({
                            content,
                            filename: file.name,
                            type: file.type
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(new Error('Error reading file'));
                reader.readAsText(file);
            };
            input.click();
        });
    },

    // Event data conversion utilities
    convertEventFromImport(importEvent) {
        const event = {
            id: this.generateId(),
            title: importEvent.title || 'Untitled Event',
            description: importEvent.description || '',
            eventColor: importEvent.color || '#007bff',
            perspectiveIds: []
        };

        // Handle various date formats
        if (importEvent.startDate) {
            event.startDate = importEvent.startDate;
        } else if (importEvent.year) {
            event.startDate = `${importEvent.year}-01-01T00:00`;
        } else if (importEvent.startYear) {
            event.startDate = `${importEvent.startYear}-01-01T00:00`;
        }

        // Handle end dates for ranges
        if (importEvent.endDate) {
            event.endDate = importEvent.endDate;
            event.type = 'range';
        } else if (importEvent.endYear) {
            event.endDate = `${importEvent.endYear}-12-31T23:59`;
            event.type = 'range';
        } else {
            event.type = 'point';
        }

        return event;
    },

    // Generate embed code
    generateEmbedCode(timelineId, options = {}) {
        const {
            width = '100%',
            height = '600px',
            readonly = true,
            theme = 'modern',
            perspective = null
        } = options;

        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        let embedUrl = `${baseUrl}/viewer.html?mode=embed&project=${timelineId}`;
        
        if (readonly) embedUrl += '&readonly=true';
        if (theme !== 'modern') embedUrl += `&theme=${theme}`;
        if (perspective) embedUrl += `&perspective=${perspective}`;

        return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;
    },

    // Color utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },

    // Local storage utilities
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    },

    removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    // Modal utilities
    showModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            return modal;
        }
        return null;
    },

    hideModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement && typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
    },

    // Form utilities
    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    },

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },

    // Check if running in embed mode
    isEmbedMode() {
        return this.getUrlParams().embed || this.getUrlParams().mode === 'embed';
    },

    // Check if running in readonly mode
    isReadonlyMode() {
        const params = this.getUrlParams();
        return params.readonly || params.embed || params.mode === 'viewer';
    },

    // Apply embed styling
    applyEmbedMode() {
        if (this.isEmbedMode()) {
            document.querySelectorAll('.hide-in-embed').forEach(el => {
                el.style.display = 'none';
            });
            
            const timelineContainer = document.querySelector('#timeline-container, #embed-timeline');
            if (timelineContainer) {
                timelineContainer.style.height = '100vh';
            }
        }
    },

    // Apply readonly mode
    applyReadonlyMode() {
        if (this.isReadonlyMode()) {
            document.querySelectorAll('.edit-control').forEach(el => {
                el.style.display = 'none';
            });
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TimelineUtils = TimelineUtils;
}
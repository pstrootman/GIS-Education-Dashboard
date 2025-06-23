// Modal handlers for timeline application
// Streamlined modal functionality for class-based architecture

document.addEventListener('DOMContentLoaded', function() {
    initializeModalHandlers();
});

function initializeModalHandlers() {
    // Authentication modal form switching
    setupAuthModalHandlers();
    
    // Generic modal utilities
    setupGenericModalHandlers();
}

function setupAuthModalHandlers() {
    // Form switching for authentication modal
    const showSignUp = document.getElementById('showSignUp');
    const showSignIn = document.getElementById('showSignIn');
    const showReset = document.getElementById('showReset');
    const backToSignIn = document.getElementById('backToSignIn');
    
    if (showSignUp) {
        showSignUp.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthForm('signUp');
        });
    }
    
    if (showSignIn) {
        showSignIn.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthForm('signIn');
        });
    }
    
    if (showReset) {
        showReset.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthForm('reset');
        });
    }
    
    if (backToSignIn) {
        backToSignIn.addEventListener('click', (e) => {
            e.preventDefault();
            switchAuthForm('signIn');
        });
    }
}

function switchAuthForm(formType) {
    const signInForm = document.getElementById('signInForm');
    const signUpForm = document.getElementById('signUpForm');
    const resetForm = document.getElementById('resetForm');
    
    // Hide all forms
    [signInForm, signUpForm, resetForm].forEach(form => {
        if (form) form.style.display = 'none';
    });
    
    // Show selected form
    switch (formType) {
        case 'signUp':
            if (signUpForm) signUpForm.style.display = 'block';
            break;
        case 'reset':
            if (resetForm) resetForm.style.display = 'block';
            break;
        default:
            if (signInForm) signInForm.style.display = 'block';
    }
    
    // Clear any auth messages
    const authMessage = document.getElementById('authMessage');
    if (authMessage) {
        authMessage.style.display = 'none';
    }
}

function setupGenericModalHandlers() {
    // Modal close handlers for Bootstrap modals
    document.addEventListener('hidden.bs.modal', function (event) {
        const modal = event.target;
        const forms = modal.querySelectorAll('form');
        
        // Clear forms when modal is closed
        forms.forEach(form => {
            form.reset();
        });
        
        // Clear any error messages
        const alerts = modal.querySelectorAll('.alert');
        alerts.forEach(alert => {
            alert.style.display = 'none';
        });
    });
    
    // Prevent modal close on backdrop click for important modals
    const importantModals = ['addEventModal', 'addPerspectiveModal'];
    importantModals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('show.bs.modal', function() {
                const bsModal = bootstrap.Modal.getInstance(this) || new bootstrap.Modal(this);
                bsModal._config.backdrop = 'static';
                bsModal._config.keyboard = false;
            });
        }
    });
}

// Utility functions for modal management
window.ModalUtils = {
    show: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal) || new bootstrap.Modal(modal);
            bsModal.show();
        }
    },
    
    hide: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    },
    
    clearForm: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    },
    
    showMessage: function(message, type = 'info', containerId = 'message-container') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
};

// Expose utilities globally for backward compatibility
window.showModal = window.ModalUtils.show;
window.hideModal = window.ModalUtils.hide;
window.clearForm = window.ModalUtils.clearForm;
window.showMessage = window.ModalUtils.showMessage;
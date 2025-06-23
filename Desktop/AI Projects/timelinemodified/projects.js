// projects.js - Consolidated project dashboard functionality
// Enhanced class-based project management system

class ProjectsDashboard {
    constructor() {
        this.currentUser = null;
        this.userProjects = [];
        this.isFirebaseReady = false;
    }

    // Initialize the dashboard
    init() {
        console.log('Projects dashboard loading...');
        this.setupEventHandlers();
        this.checkFirebaseAndInit();
    }

    // Check Firebase availability and initialize
    checkFirebaseAndInit() {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            console.log('Firebase available, setting up auth state listener');
            this.isFirebaseReady = true;
            
            firebase.auth().onAuthStateChanged((user) => {
                console.log('Auth state changed:', user ? user.email : 'no user');
                this.currentUser = user;
                if (user) {
                    this.showUserInterface();
                    this.loadUserProjects();
                } else {
                    this.showSignInPrompt();
                }
            });
        } else {
            console.warn('Firebase not available, showing demo mode');
            this.showDemoMode();
        }
    }

    // Setup event handlers
    setupEventHandlers() {
        // Sign In Button
        document.getElementById('signInBtn')?.addEventListener('click', () => {
            TimelineUtils.showModal('authModal');
        });

        // Demo Mode Button
        document.getElementById('demoModeBtn')?.addEventListener('click', () => {
            window.location.href = 'index.html?demo=true';
        });

        // User Sign Out
        document.getElementById('userSignOutBtn')?.addEventListener('click', () => {
            this.signOut();
        });

        // Create Project Card
        document.getElementById('createProjectCard')?.addEventListener('click', () => {
            if (this.currentUser) {
                TimelineUtils.showModal('createProjectModal');
            } else {
                TimelineUtils.showModal('authModal');
            }
        });

        // Create Project Button
        document.getElementById('createProjectBtn')?.addEventListener('click', () => {
            this.createProject();
        });

        // Authentication form handlers
        this.setupAuthenticationHandlers();
    }

    // Setup authentication event handlers
    setupAuthenticationHandlers() {
        // Sign In
        document.getElementById('authSignInBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('authSignInEmail').value;
            const password = document.getElementById('authSignInPassword').value;

            if (!TimelineUtils.validateEmail(email)) {
                this.showAuthMessage('Please enter a valid email address', 'error');
                return;
            }

            if (!TimelineUtils.validatePassword(password)) {
                this.showAuthMessage('Password must be at least 6 characters', 'error');
                return;
            }

            TimelineUtils.setButtonLoading('authSignInBtn', true);
            try {
                await this.signIn(email, password);
            } catch (error) {
                // Error handled in signIn function
            } finally {
                TimelineUtils.setButtonLoading('authSignInBtn', false);
            }
        });

        // Sign Up
        document.getElementById('authSignUpBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('authSignUpEmail').value;
            const password = document.getElementById('authSignUpPassword').value;
            const confirmPassword = document.getElementById('authSignUpConfirmPassword').value;

            if (!TimelineUtils.validateEmail(email)) {
                this.showAuthMessage('Please enter a valid email address', 'error');
                return;
            }

            if (!TimelineUtils.validatePassword(password)) {
                this.showAuthMessage('Password must be at least 6 characters', 'error');
                return;
            }

            if (password !== confirmPassword) {
                this.showAuthMessage('Passwords do not match', 'error');
                return;
            }

            TimelineUtils.setButtonLoading('authSignUpBtn', true);
            try {
                await this.signUp(email, password);
            } catch (error) {
                // Error handled in signUp function
            } finally {
                TimelineUtils.setButtonLoading('authSignUpBtn', false);
            }
        });

        // Password Reset
        document.getElementById('authResetBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('authResetEmail').value;

            if (!TimelineUtils.validateEmail(email)) {
                this.showAuthMessage('Please enter a valid email address', 'error');
                return;
            }

            TimelineUtils.setButtonLoading('authResetBtn', true);
            try {
                await this.resetPassword(email);
            } catch (error) {
                // Error handled in resetPassword function
            } finally {
                TimelineUtils.setButtonLoading('authResetBtn', false);
            }
        });

        // Form switching
        document.getElementById('showSignUp')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signUp');
        });

        document.getElementById('showSignIn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signIn');
        });

        document.getElementById('showReset')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('reset');
        });

        document.getElementById('backToSignIn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signIn');
        });
    }

    // Switch authentication form
    switchAuthForm(form) {
        const signInForm = document.getElementById('signInForm');
        const signUpForm = document.getElementById('signUpForm');
        const resetForm = document.getElementById('resetForm');

        // Hide all forms
        [signInForm, signUpForm, resetForm].forEach(f => {
            if (f) f.style.display = 'none';
        });

        // Show selected form
        switch (form) {
            case 'signUp':
                if (signUpForm) signUpForm.style.display = 'block';
                break;
            case 'reset':
                if (resetForm) resetForm.style.display = 'block';
                break;
            default:
                if (signInForm) signInForm.style.display = 'block';
        }

        this.clearAuthMessages();
    }

    // Authentication methods
    async signIn(email, password) {
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            TimelineUtils.hideModal('authModal');
            this.clearAuthForms();
            TimelineUtils.showMessage('Signed in successfully!', 'success');
        } catch (error) {
            console.error('Sign in error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
            throw error;
        }
    }

    async signUp(email, password) {
        try {
            await firebase.auth().createUserWithEmailAndPassword(email, password);
            TimelineUtils.hideModal('authModal');
            this.clearAuthForms();
            TimelineUtils.showMessage('Account created successfully!', 'success');
        } catch (error) {
            console.error('Sign up error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
            throw error;
        }
    }

    async resetPassword(email) {
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            this.showAuthMessage('Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAuthMessage(this.getAuthErrorMessage(error), 'error');
            throw error;
        }
    }

    async signOut() {
        try {
            await firebase.auth().signOut();
            TimelineUtils.showMessage('Signed out successfully!', 'success');
        } catch (error) {
            console.error('Sign out error:', error);
            TimelineUtils.showMessage('Error signing out. Please try again.', 'error');
        }
    }

    // UI state management
    showSignInPrompt() {
        document.getElementById('authPromptSection')?.style.setProperty('display', 'block');
        document.getElementById('userSection')?.style.setProperty('display', 'none');
        document.getElementById('projectsGrid')?.style.setProperty('display', 'none');
    }

    showUserInterface() {
        document.getElementById('authPromptSection')?.style.setProperty('display', 'none');
        document.getElementById('userSection')?.style.setProperty('display', 'block');
        document.getElementById('projectsGrid')?.style.setProperty('display', 'block');

        // Update user info
        const userEmailSpan = document.getElementById('userEmail');
        if (userEmailSpan && this.currentUser) {
            userEmailSpan.textContent = this.currentUser.email;
        }
    }

    showDemoMode() {
        document.getElementById('authPromptSection')?.style.setProperty('display', 'none');
        document.getElementById('userSection')?.style.setProperty('display', 'none');
        document.getElementById('projectsGrid')?.style.setProperty('display', 'none');

        // Show demo message
        const demoMessage = document.createElement('div');
        demoMessage.className = 'alert alert-info text-center';
        demoMessage.innerHTML = `
            <h4>Demo Mode</h4>
            <p>Try the timeline editor without signing up!</p>
            <a href="index.html?demo=true" class="btn btn-primary">
                <i class="fas fa-play"></i> Start Demo
            </a>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(demoMessage, container.firstChild);
        }
    }

    // Project management
    async loadUserProjects() {
        if (!this.currentUser || !this.isFirebaseReady) {
            console.warn('Cannot load projects: user not authenticated or Firebase not ready');
            return;
        }

        try {
            const projectsRef = firebase.firestore().collection('projects');
            const query = projectsRef.where('ownerId', '==', this.currentUser.uid)
                                   .orderBy('lastModified', 'desc');
            
            const snapshot = await query.get();
            this.userProjects = [];

            snapshot.forEach(doc => {
                this.userProjects.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Loaded ${this.userProjects.length} projects for user`);
            this.renderProjects();
        } catch (error) {
            console.error('Error loading projects:', error);
            TimelineUtils.showMessage('Error loading projects. Please refresh the page.', 'error');
        }
    }

    // Render projects grid
    renderProjects() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        const projectsContainer = grid.querySelector('.row') || grid;
        projectsContainer.innerHTML = '';

        if (this.userProjects.length === 0) {
            projectsContainer.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-timeline fa-3x text-muted mb-3"></i>
                        <h5 class="text-muted">No projects yet</h5>
                        <p class="text-muted">Create your first timeline project to get started!</p>
                        <button class="btn btn-primary" onclick="projectsDashboard.showCreateProjectModal()">
                            <i class="fas fa-plus"></i> Create Project
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        this.userProjects.forEach(project => {
            const projectCard = this.createProjectCard(project);
            projectsContainer.appendChild(projectCard);
        });
    }

    // Create a project card element
    createProjectCard(project) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 mb-4';

        const eventCount = this.getProjectEventCount(project);
        const lastModified = project.lastModified ? 
            new Date(project.lastModified.seconds * 1000).toLocaleDateString() : 
            'Unknown';

        col.innerHTML = `
            <div class="card project-card h-100">
                <div class="project-thumbnail">
                    <i class="fas fa-timeline"></i>
                </div>
                <div class="card-body">
                    <h5 class="card-title text-truncate" title="${TimelineUtils.escapeHtml(project.name)}">
                        ${TimelineUtils.escapeHtml(project.name)}
                    </h5>
                    <p class="card-text text-muted small">
                        ${project.description ? TimelineUtils.escapeHtml(project.description) : 'No description'}
                    </p>
                    <div class="project-meta">
                        <small class="text-muted">
                            <i class="fas fa-calendar"></i> Events: ${eventCount} |
                            <i class="fas fa-clock"></i> Modified: ${lastModified}
                        </small>
                    </div>
                </div>
                <div class="card-footer bg-transparent">
                    <div class="btn-group w-100" role="group">
                        <button class="btn btn-primary btn-sm" onclick="projectsDashboard.openProject('${project.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="projectsDashboard.viewProject('${project.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="projectsDashboard.deleteProject('${project.id}', '${TimelineUtils.escapeHtml(project.name)}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }

    // Get event count for a project
    getProjectEventCount(project) {
        if (!project.timelineData || !project.timelineData.perspectives) {
            return 0;
        }

        let totalEvents = 0;
        project.timelineData.perspectives.forEach(perspective => {
            if (perspective.events) {
                totalEvents += perspective.events.length;
            }
        });

        return totalEvents;
    }

    // Create new project
    async createProject() {
        const name = document.getElementById('projectName').value.trim();
        const description = document.getElementById('projectDescription').value.trim();

        if (!name) {
            TimelineUtils.showMessage('Please enter a project name.', 'error');
            return;
        }

        if (!this.currentUser) {
            TimelineUtils.showMessage('You must be signed in to create projects.', 'error');
            return;
        }

        TimelineUtils.setButtonLoading('createProjectBtn', true);

        try {
            const projectId = TimelineUtils.generateId();
            const projectData = {
                id: projectId,
                name: name,
                description: description,
                ownerId: this.currentUser.uid,
                ownerEmail: this.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                timelineData: {
                    timelineTitle: name,
                    timelineDescription: description,
                    globalSettings: { defaultTheme: 'modern' },
                    perspectives: [{
                        perspectiveId: TimelineUtils.generateId(),
                        perspectiveName: "Main Perspective",
                        perspectiveColor: "#3498db",
                        events: []
                    }],
                    themes: []
                }
            };

            await firebase.firestore().collection('projects').doc(projectId).set(projectData);
            
            TimelineUtils.hideModal('createProjectModal');
            TimelineUtils.clearForm('createProjectForm');
            TimelineUtils.showMessage('Project created successfully!', 'success');
            
            // Redirect to editor
            window.location.href = `index.html?project=${projectId}`;
        } catch (error) {
            console.error('Error creating project:', error);
            TimelineUtils.showMessage('Error creating project. Please try again.', 'error');
        } finally {
            TimelineUtils.setButtonLoading('createProjectBtn', false);
        }
    }

    // Show create project modal
    showCreateProjectModal() {
        if (this.currentUser) {
            TimelineUtils.showModal('createProjectModal');
        } else {
            TimelineUtils.showModal('authModal');
        }
    }

    // Open project in editor
    openProject(projectId) {
        window.location.href = `index.html?project=${projectId}`;
    }

    // View project in viewer
    viewProject(projectId) {
        window.open(`viewer.html?mode=presentation&project=${projectId}`, '_blank');
    }

    // Delete project
    async deleteProject(projectId, projectName) {
        if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await firebase.firestore().collection('projects').doc(projectId).delete();
            TimelineUtils.showMessage('Project deleted successfully.', 'success');
            this.loadUserProjects(); // Refresh the project list
        } catch (error) {
            console.error('Error deleting project:', error);
            TimelineUtils.showMessage('Error deleting project. Please try again.', 'error');
        }
    }

    // Utility methods
    showAuthMessage(message, type) {
        const alertDiv = document.getElementById('authAlert');
        if (!alertDiv) return;

        alertDiv.className = `alert ${type === 'error' ? 'alert-danger' : 'alert-success'}`;
        alertDiv.textContent = message;
        alertDiv.style.display = 'block';
    }

    clearAuthMessages() {
        const alertDiv = document.getElementById('authAlert');
        if (alertDiv) {
            alertDiv.style.display = 'none';
        }
    }

    clearAuthForms() {
        ['signInForm', 'signUpForm', 'resetForm'].forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.reset();
        });
        this.clearAuthMessages();
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/weak-password':
                return 'Password should be at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later.';
            default:
                return 'An error occurred. Please try again.';
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.projectsDashboard = new ProjectsDashboard();
    window.projectsDashboard.init();
});

// For backward compatibility
window.userProjects = [];
window.currentUser = null;
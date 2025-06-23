// timeline-viewer.js - Timeline viewer functionality
// This file contains the viewer functionality for all viewing modes (embed, presentation, standard)

class TimelineViewer extends TimelineCore {
    constructor() {
        super();
        this.params = TimelineUtils.getUrlParams();
        this.viewMode = this.params.mode || 'viewer'; // embed, presentation, viewer
        this.isFirebaseReady = false;
    }

    // Initialize the viewer
    async init() {
        console.log('Timeline viewer initializing with mode:', this.viewMode);
        
        // Show the appropriate container
        this.showModeContainer();
        
        // Wait for Firebase to be ready
        this.checkFirebaseAndInit();
    }

    // Check Firebase availability and initialize
    checkFirebaseAndInit() {
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                console.log('✅ Firebase ready, loading timeline data');
                this.isFirebaseReady = true;
                this.loadTimelineData();
            } else if (attempts < maxAttempts) {
                console.log(`⏳ Waiting for Firebase... (attempt ${attempts}/${maxAttempts})`);
                setTimeout(checkFirebase, 250);
            } else {
                console.error('❌ Firebase failed to initialize');
                this.showError('Firebase connection failed');
            }
        };
        
        checkFirebase();
    }

    // Show the appropriate container based on mode
    showModeContainer() {
        const containers = {
            embed: 'embed-container',
            presentation: 'presentation-container',
            viewer: 'viewer-container'
        };
        
        Object.entries(containers).forEach(([mode, containerId]) => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = mode === this.viewMode ? 'block' : 'none';
            }
        });
        
        // Apply embed-specific styling
        if (this.viewMode === 'embed') {
            document.body.style.margin = '0';
            document.body.style.padding = '0';
            document.body.style.overflow = 'hidden';
        }
    }

    // Load timeline data
    async loadTimelineData() {
        try {
            this.showLoading();
            
            if (this.params.project) {
                await this.loadProjectData(this.params.project);
            } else if (this.params.id && this.params.id !== 'default') {
                await this.loadLegacyTimelineData(this.params.id);
            } else {
                throw new Error('No valid project or timeline ID provided');
            }
            
            this.initializeViewer();
        } catch (error) {
            console.error('Error loading timeline:', error);
            this.showError('Failed to load timeline data');
        }
    }

    // Load project data from Firebase
    async loadProjectData(projectId) {
        if (!this.isFirebaseReady) {
            throw new Error('Firebase not ready');
        }
        
        const projectRef = firebase.firestore().collection('projects').doc(projectId);
        const doc = await projectRef.get();
        
        if (!doc.exists) {
            throw new Error('Project not found');
        }
        
        const projectData = doc.data();
        this.timelineData = projectData.timelineData;
        
        // Add project metadata
        if (!this.timelineData.timelineTitle) {
            this.timelineData.timelineTitle = projectData.name;
        }
        if (!this.timelineData.timelineDescription) {
            this.timelineData.timelineDescription = projectData.description;
        }
        
        console.log('Project data loaded successfully');
    }

    // Load legacy timeline data
    async loadLegacyTimelineData(timelineId) {
        if (typeof getTimelineFromFirestore === "function") {
            this.timelineData = await getTimelineFromFirestore(timelineId);
        } else {
            const savedData = TimelineUtils.loadFromLocalStorage(`timelineData-${timelineId}`);
            if (!savedData) {
                throw new Error('Timeline not found');
            }
            this.timelineData = savedData;
        }
        
        console.log('Legacy timeline data loaded successfully');
    }

    // Initialize the viewer after data is loaded
    initializeViewer() {
        this.hideLoading();
        this.initialize(this.timelineData);
        
        // Update titles and descriptions
        this.updateTitlesAndDescriptions();
        
        // Apply theme
        const theme = this.params.theme || this.timelineData.globalSettings?.defaultTheme || 'modern';
        this.applyTheme(theme);
        
        // Create timeline
        const containerId = this.getTimelineContainerId();
        this.createTimeline(containerId);
        
        // Setup controls
        this.setupViewerControls();
        this.setupPerspectiveControls();
        this.setupThemeControls();
        
        // Apply initial filters
        if (this.params.perspective) {
            this.setActivePerspective(this.params.perspective);
        } else {
            this.filterAndUpdateTimeline();
        }
        
        // Focus on specific elements
        setTimeout(() => {
            if (this.params.event) {
                this.focusOnEvent(this.params.event);
            } else if (this.params.date) {
                this.focusOnDate(this.params.date);
            }
        }, 1000);
        
        console.log('Timeline viewer initialized successfully');
    }

    // Update titles and descriptions based on mode
    updateTitlesAndDescriptions() {
        const title = this.timelineData.timelineTitle || 'Interactive Timeline';
        const description = this.timelineData.timelineDescription || '';
        
        // Update title elements
        const titleElements = {
            embed: 'embed-title',
            presentation: 'presentation-title',
            viewer: 'viewer-title'
        };
        
        const titleElement = document.getElementById(titleElements[this.viewMode]);
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        // Update description elements
        const descriptionElements = {
            embed: 'embed-timeline-description',
            presentation: 'presentation-description',
            viewer: 'viewer-description'
        };
        
        const descriptionElement = document.getElementById(descriptionElements[this.viewMode]);
        if (descriptionElement && description && !description.includes('Describe your timeline')) {
            descriptionElement.innerHTML = description;
            
            // Show description container for embed mode
            if (this.viewMode === 'embed') {
                const container = document.getElementById('embed-description-container');
                if (container) {
                    container.style.display = 'block';
                }
            }
        }
        
        // Set page title
        document.title = `${title} - Timeline Viewer`;
    }

    // Get the timeline container ID based on mode
    getTimelineContainerId() {
        const containerIds = {
            embed: 'embed-timeline',
            presentation: 'presentation-timeline',
            viewer: 'viewer-timeline'
        };
        
        return containerIds[this.viewMode];
    }

    // Setup viewer controls (navigation, fullscreen, share)
    setupViewerControls() {
        const prefix = this.viewMode === 'viewer' ? 'viewer-' : this.viewMode + '-';
        
        // Navigation controls
        document.getElementById(prefix + 'move-left')?.addEventListener('click', () => this.moveLeft());
        document.getElementById(prefix + 'move-right')?.addEventListener('click', () => this.moveRight());
        document.getElementById(prefix + 'zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById(prefix + 'zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById(prefix + 'fit-all')?.addEventListener('click', () => this.fitTimeline());
        
        // Fullscreen controls
        document.getElementById(prefix + 'fullscreen')?.addEventListener('click', () => this.toggleFullscreen());
        
        // Share controls
        document.getElementById(prefix + 'share')?.addEventListener('click', () => this.showShareModal());
        
        // Back to editor (for viewer mode)
        if (this.viewMode === 'viewer' && this.params.project) {
            const backBtn = document.getElementById('back-to-editor');
            if (backBtn) {
                backBtn.style.display = 'inline-block';
                backBtn.addEventListener('click', () => {
                    window.location.href = `index.html?project=${this.params.project}`;
                });
            }
        }
        
        // Copy buttons in share modal
        document.getElementById('copy-link')?.addEventListener('click', () => this.copyShareLink());
        document.getElementById('copy-embed')?.addEventListener('click', () => this.copyEmbedCode());
    }

    // Setup perspective controls
    setupPerspectiveControls() {
        if (!this.timelineData.perspectives || this.timelineData.perspectives.length <= 1) {
            return;
        }
        
        const prefix = this.viewMode === 'viewer' ? 'viewer-' : this.viewMode + '-';
        const controlsContainer = document.getElementById(prefix + 'perspective-controls');
        const buttonsContainer = document.getElementById(prefix + 'perspective-buttons');
        
        if (!controlsContainer || !buttonsContainer) return;
        
        // Clear existing buttons
        buttonsContainer.innerHTML = '';
        
        // Add "All" button
        const allBtn = this.createFilterButton('All', true, () => this.setActivePerspective(null));
        buttonsContainer.appendChild(allBtn);
        
        // Add perspective buttons
        this.timelineData.perspectives.forEach(perspective => {
            const btn = this.createFilterButton(
                perspective.perspectiveName,
                false,
                () => this.setActivePerspective(perspective.perspectiveId),
                perspective.perspectiveColor
            );
            buttonsContainer.appendChild(btn);
        });
        
        // Show controls
        controlsContainer.style.display = 'block';
    }

    // Setup theme controls
    setupThemeControls() {
        if (!this.timelineData.themes || this.timelineData.themes.length === 0) {
            return;
        }
        
        const prefix = this.viewMode === 'viewer' ? 'viewer-' : this.viewMode + '-';
        const controlsContainer = document.getElementById(prefix + 'theme-controls');
        const buttonsContainer = document.getElementById(prefix + 'theme-buttons');
        
        if (!controlsContainer || !buttonsContainer) return;
        
        // Clear existing buttons
        buttonsContainer.innerHTML = '';
        
        // Add theme buttons
        this.timelineData.themes.forEach(theme => {
            const btn = this.createFilterButton(
                theme.name,
                false,
                () => this.toggleTheme(theme.id),
                theme.color
            );
            buttonsContainer.appendChild(btn);
        });
        
        // Show controls
        controlsContainer.style.display = 'block';
    }

    // Create a filter button
    createFilterButton(text, active = false, onClick = null, color = null) {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'} me-2 mb-2`;
        btn.textContent = text;
        
        if (color) {
            btn.style.borderLeftColor = color;
            btn.style.borderLeftWidth = '4px';
        }
        
        if (onClick) {
            btn.addEventListener('click', () => {
                // Update button states
                const parent = btn.parentElement;
                parent.querySelectorAll('.btn').forEach(b => {
                    b.className = b.className.replace('btn-primary', 'btn-outline-secondary');
                });
                btn.className = btn.className.replace('btn-outline-secondary', 'btn-primary');
                
                onClick();
            });
        }
        
        return btn;
    }

    // Override setActivePerspective to update button states
    setActivePerspective(perspectiveId) {
        super.setActivePerspective(perspectiveId);
        this.updatePerspectiveButtonStates(perspectiveId);
    }

    // Update perspective button states
    updatePerspectiveButtonStates(activePerspectiveId) {
        const prefix = this.viewMode === 'viewer' ? 'viewer-' : this.viewMode + '-';
        const buttonsContainer = document.getElementById(prefix + 'perspective-buttons');
        
        if (!buttonsContainer) return;
        
        const buttons = buttonsContainer.querySelectorAll('.btn');
        buttons.forEach((btn, index) => {
            const isAllButton = index === 0;
            const shouldBeActive = (isAllButton && !activePerspectiveId) || 
                                   (!isAllButton && this.getPerspectiveByName(btn.textContent)?.perspectiveId === activePerspectiveId);
            
            if (shouldBeActive) {
                btn.className = btn.className.replace('btn-outline-secondary', 'btn-primary');
            } else {
                btn.className = btn.className.replace('btn-primary', 'btn-outline-secondary');
            }
        });
    }

    // Get perspective by name
    getPerspectiveByName(name) {
        return this.timelineData.perspectives.find(p => p.perspectiveName === name);
    }

    // Toggle fullscreen
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // Show share modal
    showShareModal() {
        this.generateShareContent();
        TimelineUtils.showModal('shareModal');
    }

    // Generate share content
    generateShareContent() {
        const currentUrl = window.location.href;
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        
        // Generate direct link
        let shareLink = currentUrl;
        if (this.viewMode !== 'presentation') {
            shareLink = `${baseUrl}/viewer.html?mode=presentation&project=${this.params.project || this.params.id}`;
        }
        
        // Generate embed code
        const embedUrl = `${baseUrl}/viewer.html?mode=embed&project=${this.params.project || this.params.id}`;
        const embedCode = `<iframe src="${embedUrl}" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`;
        
        // Update modal content
        document.getElementById('share-link').value = shareLink;
        document.getElementById('embed-code').value = embedCode;
    }

    // Copy share link
    copyShareLink() {
        const linkInput = document.getElementById('share-link');
        linkInput.select();
        navigator.clipboard.writeText(linkInput.value).then(() => {
            TimelineUtils.showMessage('Share link copied to clipboard!', 'success');
        });
    }

    // Copy embed code
    copyEmbedCode() {
        const codeInput = document.getElementById('embed-code');
        codeInput.select();
        navigator.clipboard.writeText(codeInput.value).then(() => {
            TimelineUtils.showMessage('Embed code copied to clipboard!', 'success');
        });
    }

    // Show loading state
    showLoading() {
        document.getElementById('loading-indicator').style.display = 'flex';
        document.getElementById('error-indicator').style.display = 'none';
    }

    // Hide loading state
    hideLoading() {
        document.getElementById('loading-indicator').style.display = 'none';
    }

    // Show error state
    showError(message = 'Failed to load timeline data') {
        document.getElementById('loading-indicator').style.display = 'none';
        const errorIndicator = document.getElementById('error-indicator');
        errorIndicator.style.display = 'flex';
        
        const errorText = errorIndicator.querySelector('span');
        if (errorText) {
            errorText.textContent = message;
        }
    }

    // Override event selection for viewer-specific handling
    handleEventSelection(eventId) {
        const result = this.findEventById(eventId);
        if (result) {
            // Create a more detailed event display for viewer modes
            this.showEventDetailsModal(result.event, result.perspective);
        }
    }

    // Show event details in a modal (for viewer modes)
    showEventDetailsModal(event, perspective) {
        const details = {
            title: event.title,
            description: event.description,
            startDate: TimelineUtils.formatDate(event.startDate, 'long'),
            endDate: event.endDate ? TimelineUtils.formatDate(event.endDate, 'long') : null,
            perspective: perspective.perspectiveName,
            type: event.type === 'range' ? 'Date Range' : 'Single Date'
        };
        
        // Create a simple alert with event details
        // TODO: Could be enhanced with a proper modal
        const detailsText = [
            details.title,
            `Type: ${details.type}`,
            `Date: ${details.startDate}${details.endDate ? ` - ${details.endDate}` : ''}`,
            `Perspective: ${details.perspective}`,
            '',
            details.description
        ].filter(Boolean).join('\n');
        
        alert(detailsText);
    }
}

// Initialize the viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.timelineViewer = new TimelineViewer();
    window.timelineViewer.init();
});
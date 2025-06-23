// timeline-editor.js - Timeline editor functionality
// This file contains the editor-specific functionality for the timeline application

class TimelineEditor extends TimelineCore {
    constructor() {
        super();
        this.currentProject = null;
        this.params = TimelineUtils.getUrlParams();
        this.isEmbedMode = TimelineUtils.isEmbedMode();
        this.isReadonlyMode = TimelineUtils.isReadonlyMode();
    }

    // Initialize the editor
    async init() {
        // Apply embed and readonly modes
        TimelineUtils.applyEmbedMode();
        TimelineUtils.applyReadonlyMode();

        // Set up Firebase ready callback
        window.firebaseReady = () => {
            console.log('🔥 Firebase ready, loading timeline data');
            this.loadTimelineData();
        };

        // Try loading immediately if Firebase is already ready
        if (window.isFirebaseReady && window.isFirebaseReady()) {
            console.log('🔥 Firebase already ready, loading timeline data');
            this.loadTimelineData();
        } else {
            console.log('⏳ Waiting for Firebase to be ready...');
            // Fallback: try loading after a delay
            setTimeout(() => {
                if (!this.timelineData) {
                    console.log('⚠️ Firebase not ready after timeout, attempting fallback load');
                    this.loadTimelineData();
                }
            }, 3000);
        }

        // Redirect to projects if no ID specified and not in demo mode
        if (!this.params.id && !this.params.project && !this.params.demo) {
            console.log('No project specified, redirecting to projects dashboard');
            window.location.href = 'projects.html';
            return;
        }

        this.setupEventHandlers();
    }

    // Load timeline data based on parameters
    async loadTimelineData() {
        try {
            if (this.params.project) {
                await this.loadProjectData(this.params.project);
            } else if (typeof getTimelineFromFirestore === "function") {
                try {
                    this.timelineData = await getTimelineFromFirestore(this.params.id);
                    console.log("Data loaded from Firestore");
                    this.initializePage();
                } catch (error) {
                    console.log('Unable to load from Firestore, falling back to LocalStorage:', error);
                    this.loadFromLocalStorage();
                }
            } else {
                console.log('Firestore not configured, falling back to LocalStorage');
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading timeline data:', error);
            this.showDefaultTimeline();
        }
    }

    // Load project data from Firebase
    async loadProjectData(projectId) {
        if (!window.isFirebaseReady || !window.isFirebaseReady()) {
            console.error('Firebase not ready for project loading');
            this.loadFromLocalStorage();
            return;
        }

        try {
            console.log('Loading project:', projectId);
            const projectRef = firebase.firestore().collection('projects').doc(projectId);
            const doc = await projectRef.get();

            if (doc.exists) {
                const projectData = doc.data();
                console.log('Project data loaded from Firestore');

                this.timelineData = projectData.timelineData;
                this.currentProject = {
                    id: projectData.id,
                    name: projectData.name,
                    description: projectData.description,
                    ownerId: projectData.ownerId
                };

                document.title = `${projectData.name} - Timeline Editor`;
                this.initializePage();
            } else {
                console.error('Project not found:', projectId);
                TimelineUtils.showMessage('Project not found. Redirecting to projects dashboard.', 'error');
                setTimeout(() => window.location.href = 'projects.html', 2000);
            }
        } catch (error) {
            console.error('Error loading project:', error);
            TimelineUtils.showMessage('Error loading project. Please try again.', 'error');
            setTimeout(() => window.location.href = 'projects.html', 2000);
        }
    }

    // Load from localStorage
    loadFromLocalStorage() {
        const savedData = TimelineUtils.loadFromLocalStorage(`timelineData-${this.params.id}`);
        if (savedData) {
            console.log("Data loaded from LocalStorage");
            this.timelineData = savedData;
            this.initializePage();
        } else {
            console.log("No data in LocalStorage, loading default");
            this.showDefaultTimeline();
        }
    }

    // Show default timeline
    showDefaultTimeline() {
        this.timelineData = {
            timelineTitle: "New Timeline",
            timelineDescription: "Describe your timeline.",
            globalSettings: { defaultTheme: 'modern' },
            perspectives: [{
                perspectiveId: TimelineUtils.generateId(),
                perspectiveName: "Main Perspective",
                perspectiveColor: "#3498db",
                events: []
            }],
            themes: []
        };
        this.initializePage();
    }

    // Initialize the page after data is loaded
    initializePage() {
        this.initialize(this.timelineData);
        
        // Update UI elements
        document.getElementById('timeline-title').textContent = this.timelineData.timelineTitle || "Timeline";
        const descriptionEl = document.getElementById('timeline-description');
        if (descriptionEl) {
            descriptionEl.innerHTML = this.timelineData.timelineDescription || "";
        }

        // Apply theme
        this.applyTheme(this.params.theme || this.timelineData.globalSettings?.defaultTheme || 'modern');

        // Create timeline
        this.createTimeline('timeline-container', {
            editable: !this.isReadonlyMode
        });

        // Setup perspectives and update display
        this.updatePerspectiveUI();
        this.filterAndUpdateTimeline();

        // Set initial perspective if specified
        if (this.params.perspective) {
            this.setActivePerspective(this.params.perspective);
        }

        // Focus on specific elements if specified
        if (this.params.event) {
            setTimeout(() => this.focusOnEvent(this.params.event), 1000);
        } else if (this.params.date) {
            setTimeout(() => this.focusOnDate(this.params.date), 1000);
        }

        console.log('Timeline editor initialized successfully');
    }

    // Set up event handlers
    setupEventHandlers() {
        // Navigation buttons
        document.getElementById('move-left')?.addEventListener('click', () => this.moveLeft());
        document.getElementById('move-right')?.addEventListener('click', () => this.moveRight());
        document.getElementById('zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('fit-all')?.addEventListener('click', () => this.fitTimeline());

        // Menu handlers
        document.getElementById('menu-add-event')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAddEventModal();
        });

        document.getElementById('menu-add-perspective')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAddPerspectiveModal();
        });

        document.getElementById('menu-save-firebase')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.saveToFirebase();
        });

        document.getElementById('menu-generate-embed')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.generateEmbedCode();
        });

        document.getElementById('menu-export')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportTimeline();
        });

        document.getElementById('menu-import')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.importTimeline();
        });

        // Modal handlers
        document.getElementById('modal-save-event')?.addEventListener('click', () => this.saveEvent());
        document.getElementById('modal-save-perspective')?.addEventListener('click', () => this.savePerspective());

        // Rich text editor
        document.getElementById('edit-description-btn')?.addEventListener('click', () => this.openRichTextEditor());
        document.getElementById('save-rich-text')?.addEventListener('click', () => this.saveDescription());

        // Title editing
        this.setupTitleEditing();

        // Event type change handler
        document.querySelectorAll('input[name="modal-event-type"]').forEach(radio => {
            radio.addEventListener('change', this.handleEventTypeChange);
        });

        // Back to projects
        document.getElementById('back-to-projects-btn')?.addEventListener('click', () => {
            window.location.href = 'projects.html';
        });

        // Presentation viewer
        document.getElementById('presentation-viewer-btn')?.addEventListener('click', () => {
            const viewerUrl = this.currentProject 
                ? `viewer.html?mode=presentation&project=${this.currentProject.id}`
                : `viewer.html?mode=presentation&id=${this.params.id}`;
            window.open(viewerUrl, '_blank');
        });

        // Rich text formatting buttons
        this.setupRichTextToolbar();
    }

    // Setup title editing
    setupTitleEditing() {
        const title = document.getElementById('timeline-title');
        const input = document.getElementById('title-edit-input');
        const controls = document.getElementById('title-edit-controls');
        const saveBtn = document.getElementById('save-title-btn');
        const cancelBtn = document.getElementById('cancel-title-btn');

        if (!title || !input || !controls || !saveBtn || !cancelBtn) return;

        title.addEventListener('click', () => {
            if (this.isReadonlyMode) return;
            
            input.value = title.textContent;
            title.style.display = 'none';
            input.style.display = 'block';
            controls.style.display = 'block';
            input.focus();
        });

        saveBtn.addEventListener('click', () => {
            const newTitle = input.value.trim();
            if (newTitle) {
                title.textContent = newTitle;
                this.timelineData.timelineTitle = newTitle;
                this.saveToLocalStorage();
            }
            this.cancelTitleEdit();
        });

        cancelBtn.addEventListener('click', () => this.cancelTitleEdit());

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
            if (e.key === 'Escape') cancelBtn.click();
        });
    }

    cancelTitleEdit() {
        const title = document.getElementById('timeline-title');
        const input = document.getElementById('title-edit-input');
        const controls = document.getElementById('title-edit-controls');

        title.style.display = 'block';
        input.style.display = 'none';
        controls.style.display = 'none';
    }

    // Setup rich text toolbar
    setupRichTextToolbar() {
        const commands = {
            'bold-btn': 'bold',
            'italic-btn': 'italic',
            'underline-btn': 'underline',
            'h1-btn': () => document.execCommand('formatBlock', false, '<h1>'),
            'h2-btn': () => document.execCommand('formatBlock', false, '<h2>'),
            'h3-btn': () => document.execCommand('formatBlock', false, '<h3>'),
            'ul-btn': 'insertUnorderedList',
            'ol-btn': 'insertOrderedList'
        };

        Object.entries(commands).forEach(([btnId, command]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof command === 'function') {
                        command();
                    } else {
                        document.execCommand(command);
                    }
                });
            }
        });
    }

    // Show add event modal
    showAddEventModal() {
        this.updateModalPerspectiveCheckboxes();
        TimelineUtils.showModal('addEventModal');
    }

    // Show add perspective modal
    showAddPerspectiveModal() {
        TimelineUtils.showModal('addPerspectiveModal');
    }

    // Update perspective checkboxes in modal
    updateModalPerspectiveCheckboxes() {
        const container = document.getElementById('modal-event-perspective-checkboxes');
        if (!container) return;

        if (!this.timelineData.perspectives || this.timelineData.perspectives.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">No perspectives available. Add a perspective first.</p>';
            return;
        }

        container.innerHTML = '';
        this.timelineData.perspectives.forEach(perspective => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check';
            checkboxDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${perspective.perspectiveId}" id="perspective-${perspective.perspectiveId}">
                <label class="form-check-label" for="perspective-${perspective.perspectiveId}">
                    <span style="color: ${perspective.perspectiveColor};">●</span> ${perspective.perspectiveName}
                </label>
            `;
            container.appendChild(checkboxDiv);
        });
    }

    // Handle event type change
    handleEventTypeChange(e) {
        const endDateInput = document.getElementById('modal-event-end-date');
        if (endDateInput) {
            endDateInput.disabled = e.target.value !== 'range';
            if (e.target.value !== 'range') {
                endDateInput.value = '';
            }
        }
    }

    // Save event
    saveEvent() {
        const form = document.getElementById('modal-event-form');
        const formData = new FormData(form);
        
        const event = {
            id: TimelineUtils.generateId(),
            title: formData.get('modal-event-title') || document.getElementById('modal-event-title').value,
            description: document.getElementById('modal-event-description').value,
            startDate: document.getElementById('modal-event-start-date').value,
            endDate: document.getElementById('modal-event-end-date').value || null,
            type: document.querySelector('input[name="modal-event-type"]:checked').value,
            eventColor: document.getElementById('modal-event-color').value,
            perspectiveIds: []
        };

        // Get selected perspectives
        const checkboxes = document.querySelectorAll('#modal-event-perspective-checkboxes input[type="checkbox"]:checked');
        event.perspectiveIds = Array.from(checkboxes).map(cb => cb.value);

        if (event.perspectiveIds.length === 0) {
            TimelineUtils.showMessage('Please select at least one perspective for this event.', 'error');
            return;
        }

        // Add event to selected perspectives
        event.perspectiveIds.forEach(perspectiveId => {
            const perspective = this.getPerspectiveById(perspectiveId);
            if (perspective) {
                perspective.events.push({ ...event });
            }
        });

        this.filterAndUpdateTimeline();
        this.saveToLocalStorage();
        TimelineUtils.hideModal('addEventModal');
        TimelineUtils.clearForm('modal-event-form');
        TimelineUtils.showMessage('Event added successfully!', 'success');
    }

    // Save perspective
    savePerspective() {
        const name = document.getElementById('modal-perspective-name').value.trim();
        const color = document.getElementById('modal-perspective-color').value;

        if (!name) {
            TimelineUtils.showMessage('Please enter a perspective name.', 'error');
            return;
        }

        const perspective = {
            perspectiveId: TimelineUtils.generateId(),
            perspectiveName: name,
            perspectiveColor: color,
            events: []
        };

        this.timelineData.perspectives.push(perspective);
        this.updatePerspectiveUI();
        this.saveToLocalStorage();
        TimelineUtils.hideModal('addPerspectiveModal');
        TimelineUtils.clearForm('modal-perspective-form');
        TimelineUtils.showMessage('Perspective added successfully!', 'success');
    }

    // Update perspective UI
    updatePerspectiveUI() {
        const indicator = document.getElementById('current-perspective-name');
        if (indicator) {
            const currentPerspective = this.activePerspective 
                ? this.getPerspectiveById(this.activePerspective)
                : null;
            indicator.textContent = currentPerspective 
                ? currentPerspective.perspectiveName 
                : 'All Perspectives';
        }
    }

    // Open rich text editor
    openRichTextEditor() {
        const editor = document.getElementById('rich-text-editor');
        const descriptionDisplay = document.getElementById('timeline-description');
        
        if (descriptionDisplay && editor) {
            const currentContent = descriptionDisplay.innerHTML;
            if (currentContent && currentContent.trim() !== '' && !currentContent.includes('Describe your timeline')) {
                editor.innerHTML = currentContent;
            } else {
                editor.innerHTML = '<p>Describe your timeline...</p>';
            }
        }
        
        TimelineUtils.showModal('richTextModal');
        
        setTimeout(() => {
            if (editor) {
                editor.focus();
                if (editor.textContent.trim() === 'Describe your timeline...') {
                    const range = document.createRange();
                    range.selectNodeContents(editor);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }, 300);
    }

    // Save description
    saveDescription() {
        const editor = document.getElementById('rich-text-editor');
        const descriptionDisplay = document.getElementById('timeline-description');
        
        if (editor && descriptionDisplay) {
            const content = editor.innerHTML;
            descriptionDisplay.innerHTML = content;
            this.timelineData.timelineDescription = content;
            this.saveToLocalStorage();
        }
        
        TimelineUtils.hideModal('richTextModal');
        TimelineUtils.showMessage('Description saved successfully!', 'success');
    }

    // Save to Firebase
    async saveToFirebase() {
        if (!window.currentUser) {
            TimelineUtils.showModal('authModal');
            return;
        }

        try {
            if (this.currentProject) {
                // Update existing project
                await this.updateProject();
            } else {
                // Save as new timeline
                await this.saveAsNewTimeline();
            }
            TimelineUtils.showMessage('Timeline saved to Firebase successfully!', 'success');
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            TimelineUtils.showMessage('Error saving to Firebase. Please try again.', 'error');
        }
    }

    // Update existing project
    async updateProject() {
        const projectRef = firebase.firestore().collection('projects').doc(this.currentProject.id);
        await projectRef.update({
            timelineData: this.timelineData,
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Save as new timeline
    async saveAsNewTimeline() {
        const timelineId = this.params.id || TimelineUtils.generateId();
        await saveTimelineToFirestore(timelineId, this.timelineData);
    }

    // Generate embed code
    generateEmbedCode() {
        const projectId = this.currentProject ? this.currentProject.id : this.params.id;
        const embedCode = TimelineUtils.generateEmbedCode(projectId, {
            theme: this.timelineData.globalSettings?.defaultTheme
        });
        
        // Show embed code in a modal or copy to clipboard
        navigator.clipboard.writeText(embedCode).then(() => {
            TimelineUtils.showMessage('Embed code copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback: show in alert
            alert('Embed code:\n\n' + embedCode);
        });
    }

    // Export timeline
    exportTimeline() {
        const filename = `${this.timelineData.timelineTitle || 'timeline'}.json`;
        const content = this.exportData();
        TimelineUtils.downloadFile(content, filename, 'application/json');
        TimelineUtils.showMessage('Timeline exported successfully!', 'success');
    }

    // Import timeline
    async importTimeline() {
        try {
            const result = await TimelineUtils.importFile('.json');
            const success = this.importData(result.content);
            
            if (success) {
                this.initializePage();
                TimelineUtils.showMessage('Timeline imported successfully!', 'success');
            } else {
                TimelineUtils.showMessage('Error importing timeline. Please check the file format.', 'error');
            }
        } catch (error) {
            console.error('Import error:', error);
            TimelineUtils.showMessage('Error importing timeline.', 'error');
        }
    }

    // Save to localStorage
    saveToLocalStorage() {
        const key = this.currentProject 
            ? `projectData-${this.currentProject.id}`
            : `timelineData-${this.params.id}`;
        TimelineUtils.saveToLocalStorage(key, this.timelineData);
    }

    // Create enhanced timeline with all script.js features
    createEnhancedTimeline() {
        const container = document.getElementById('timeline-container');
        if (!container) {
            console.error('Timeline container not found!');
            return;
        }
        container.innerHTML = '';

        const options = {
            height: '100%',
            minHeight: '500px',
            zoomMin: 1000 * 60 * 60,
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 100,
            orientation: 'bottom',
            showCurrentTime: false,
            tooltip: { followMouse: false, overflowMethod: 'flip' },
            zoomable: true,
            moveable: true,
            selectable: true,
            editable: !this.isReadonlyMode,
            align: 'center',
            format: {
                minorLabels: {
                    millisecond: 'SSS', second: 's', minute: 'h:mma',
                    hour: 'ha', weekday: 'ddd D', day: 'D',
                    month: 'MMM', year: 'YYYY'
                },
                majorLabels: {
                    millisecond: 'HH:mm:ss', second: 'D MMMM HH:mm',
                    minute: 'ddd D MMMM', hour: 'ddd D MMMM',
                    weekday: 'MMMM YYYY', day: 'MMMM YYYY',
                    month: 'YYYY', year: ''
                }
            },
            start: moment().subtract(1, 'months').toDate(),
            end: moment().add(1, 'months').toDate(),
            stack: true,
            stackSubgroups: true
        };

        this.timeline = new vis.Timeline(container, this.visTimelineItems, options);
        this.attachTimelineEventListeners();
        
        if (this.visTimelineItems.length > 0) {
            this.timeline.fit({ animation: true });
        }
    }

    // Enhanced timeline event listeners with script.js functionality
    attachTimelineEventListeners() {
        if (!this.timeline) return;

        this.timeline.on('select', (properties) => {
            if (properties.items.length > 0) {
                this.handleEventSelection(properties.items[0]);
            }
        });

        this.timeline.on('doubleClick', (properties) => {
            if (this.isReadonlyMode) return;
            if (properties.item) {
                this.editEvent(properties.item);
            } else {
                this.addEventAtDate(properties.time);
            }
        });

        this.timeline.on('rangechanged', () => {
            this.updateNavigationState();
        });
    }

    // Enhanced filter and update with event layering
    filterAndUpdateTimeline() {
        if (!this.timelineData?.perspectives) {
            console.warn('No timeline data or perspectives available');
            return;
        }

        if (this.preserveViewport) {
            this.savedViewportState = this.timeline?.getWindow();
        }

        const eventsToDisplay = this.getFilteredEvents();
        const layeredEvents = this.applyEventLayering(eventsToDisplay);
        
        const itemsForVis = layeredEvents.map(event => ({
            id: event.id,
            content: event.title,
            start: event.startDate,
            end: event.type === 'range' ? event.endDate : undefined,
            className: `event-${event.id} layer-${event._assignedLane || 0}`,
            style: `background-color: ${event.eventColor || '#007bff'}; border-color: ${event.eventColor || '#007bff'};`,
            title: event.description,
            type: event.type === 'range' ? 'range' : 'point'
        }));

        this.visTimelineItems.clear();
        this.visTimelineItems.add(itemsForVis);

        if (this.preserveViewport && this.savedViewportState) {
            this.timeline.setWindow(this.savedViewportState.start, this.savedViewportState.end, { animation: false });
        }
    }

    // Get filtered events with perspective filtering
    getFilteredEvents() {
        const allEvents = [];
        this.timelineData.perspectives.forEach(perspective => {
            if (!perspective.events) return;
            perspective.events.forEach(event => {
                if (this.activePerspective && perspective.perspectiveId !== this.activePerspective) return;
                allEvents.push({ ...event, _perspectiveId: perspective.perspectiveId });
            });
        });
        return allEvents;
    }

    // Apply smart event layering to prevent overlaps
    applyEventLayering(events) {
        const sortedEvents = events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const lanes = [];
        
        sortedEvents.forEach(event => {
            const eventStart = new Date(event.startDate);
            const eventEnd = event.type === 'range' && event.endDate ? new Date(event.endDate) : eventStart;
            
            let assignedLane = 0;
            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const lastEvent = lane[lane.length - 1];
                const lastEventEnd = lastEvent.type === 'range' && lastEvent.endDate ? 
                    new Date(lastEvent.endDate) : new Date(lastEvent.startDate);
                
                if (eventStart >= lastEventEnd) {
                    assignedLane = i;
                    break;
                }
            }
            
            if (assignedLane >= lanes.length) {
                lanes.push([]);
            }
            
            event._assignedLane = assignedLane;
            lanes[assignedLane].push(event);
        });
        
        return sortedEvents;
    }

    // Add event at specific date
    addEventAtDate(date) {
        const startDateInput = document.getElementById('modal-event-start-date');
        if (startDateInput) {
            startDateInput.value = moment(date).format('YYYY-MM-DDTHH:mm');
        }
        this.showAddEventModal();
    }

    // Edit existing event
    editEvent(eventId) {
        const result = this.findEventById(eventId);
        if (!result) return;
        
        const event = result.event;
        document.getElementById('modal-event-title').value = event.title || '';
        document.getElementById('modal-event-description').value = event.description || '';
        document.getElementById('modal-event-start-date').value = event.startDate || '';
        document.getElementById('modal-event-end-date').value = event.endDate || '';
        document.getElementById('modal-event-color').value = event.eventColor || '#007bff';
        
        const typeRadio = document.querySelector(`input[name="modal-event-type"][value="${event.type || 'point'}"]`);
        if (typeRadio) typeRadio.checked = true;
        
        this.updateModalPerspectiveCheckboxes();
        if (event.perspectiveIds) {
            event.perspectiveIds.forEach(perspectiveId => {
                const checkbox = document.getElementById(`perspective-${perspectiveId}`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        this.editingEventId = eventId;
        TimelineUtils.showModal('addEventModal');
    }

    // Delete event
    deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) return;
        
        const result = this.findEventById(eventId);
        if (result) {
            result.perspective.events = result.perspective.events.filter(e => e.id !== eventId);
            this.filterAndUpdateTimeline();
            this.saveToLocalStorage();
            TimelineUtils.showMessage('Event deleted successfully!', 'success');
        }
    }

    // Enhanced save event with edit support
    saveEvent() {
        const eventData = {
            title: document.getElementById('modal-event-title').value,
            description: document.getElementById('modal-event-description').value,
            startDate: document.getElementById('modal-event-start-date').value,
            endDate: document.getElementById('modal-event-end-date').value || null,
            type: document.querySelector('input[name="modal-event-type"]:checked').value,
            eventColor: document.getElementById('modal-event-color').value,
            perspectiveIds: []
        };

        const checkboxes = document.querySelectorAll('#modal-event-perspective-checkboxes input[type="checkbox"]:checked');
        eventData.perspectiveIds = Array.from(checkboxes).map(cb => cb.value);

        if (eventData.perspectiveIds.length === 0) {
            TimelineUtils.showMessage('Please select at least one perspective for this event.', 'error');
            return;
        }

        if (this.editingEventId) {
            this.updateExistingEvent(this.editingEventId, eventData);
            this.editingEventId = null;
            TimelineUtils.showMessage('Event updated successfully!', 'success');
        } else {
            eventData.id = TimelineUtils.generateId();
            this.addNewEvent(eventData);
            TimelineUtils.showMessage('Event added successfully!', 'success');
        }

        this.filterAndUpdateTimeline();
        this.saveToLocalStorage();
        TimelineUtils.hideModal('addEventModal');
        TimelineUtils.clearForm('modal-event-form');
    }

    // Update existing event
    updateExistingEvent(eventId, eventData) {
        this.timelineData.perspectives.forEach(perspective => {
            perspective.events = perspective.events.filter(e => e.id !== eventId);
        });
        
        eventData.perspectiveIds.forEach(perspectiveId => {
            const perspective = this.getPerspectiveById(perspectiveId);
            if (perspective) {
                perspective.events.push({ ...eventData, id: eventId });
            }
        });
    }

    // Add new event
    addNewEvent(eventData) {
        eventData.perspectiveIds.forEach(perspectiveId => {
            const perspective = this.getPerspectiveById(perspectiveId);
            if (perspective) {
                perspective.events.push({ ...eventData });
            }
        });
    }

    // Update navigation state
    updateNavigationState() {
        // Placeholder for navigation state updates
    }

    // Override event selection to show detailed modal
    handleEventSelection(eventId) {
        if (this.isReadonlyMode) {
            super.handleEventSelection(eventId);
            return;
        }
        
        const result = this.findEventById(eventId);
        if (result) {
            this.showEnhancedEventDetails(result.event, result.perspective);
        }
    }

    // Show enhanced event details
    showEnhancedEventDetails(event, perspective) {
        const details = [
            `Title: ${event.title}`,
            `Description: ${event.description || 'No description'}`,
            `Start: ${new Date(event.startDate).toLocaleDateString()}`,
            event.endDate ? `End: ${new Date(event.endDate).toLocaleDateString()}` : '',
            `Perspective: ${perspective.perspectiveName}`,
            `Type: ${event.type || 'point'}`
        ].filter(Boolean).join('\n');
        
        alert(details);
    }
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.timelineEditor = new TimelineEditor();
    window.timelineEditor.init();
});
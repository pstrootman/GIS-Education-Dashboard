// timeline-core.js - Shared functionality for timeline application
// This module contains core timeline functionality used by both editor and viewer

class TimelineCore {
    constructor() {
        this.timelineData = null;
        this.timeline = null;
        this.visTimelineItems = new vis.DataSet([]);
        this.activePerspective = null;
        this.activeThemes = new Set();
        this.preserveViewport = false;
        this.savedViewportState = null;
    }

    // Initialize timeline with data
    initialize(data) {
        this.timelineData = data;
        this.validateAndFixData();
    }

    // Validate and fix timeline data structure
    validateAndFixData() {
        if (!this.timelineData.perspectives || !Array.isArray(this.timelineData.perspectives) || this.timelineData.perspectives.length === 0) {
            this.timelineData.perspectives = [{
                perspectiveId: `p${Date.now()}`,
                perspectiveName: "Main Perspective",
                perspectiveColor: "#3498db",
                events: []
            }];
        }

        this.timelineData.perspectives.forEach(p => { 
            if (!p.events || !Array.isArray(p.events)) p.events = [];
            p.events.forEach(e => {
                if (!Array.isArray(e.perspectiveIds)) {
                    e.perspectiveIds = [p.perspectiveId]; 
                }
            });
        });

        if (!this.timelineData.themes || !Array.isArray(this.timelineData.themes)) {
            this.timelineData.themes = [];
        }

        if (!this.timelineData.globalSettings) {
            this.timelineData.globalSettings = { defaultTheme: 'modern' };
        }
    }

    // Create vis.js timeline instance
    createTimeline(containerId, options = {}) {
        console.log('🚀 createTimeline called with containerId:', containerId);
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ Timeline container not found: ${containerId}`);
            throw new Error(`Timeline container not found: ${containerId}`);
        }

        // Check if timeline already exists in this container
        if (container.hasTimelineInstance) {
            console.log('🛑 Timeline already exists in this container, clearing first');
            container.innerHTML = '';
        }
        container.hasTimelineInstance = true;

        console.log('✅ Timeline container found:', container);
        console.log('Container dimensions:', {
            width: container.offsetWidth,
            height: container.offsetHeight,
            clientWidth: container.clientWidth,
            clientHeight: container.clientHeight
        });

        const defaultOptions = {
            orientation: 'both',
            stack: true,
            showCurrentTime: false,
            zoomable: true,
            moveable: true,
            selectable: true,
            multiselect: false,
            editable: false,
            height: '100%',
            margin: {
                item: 10,
                axis: 20
            },
            template: function(item, element, data) {
                return `<div style="color: ${item.color || '#333'}; font-weight: bold;">${item.content}</div>`;
            }
        };

        const finalOptions = Object.assign(defaultOptions, options);
        console.log('⚙️ Timeline options:', finalOptions);
        console.log('📊 VisTimelineItems at creation:', this.visTimelineItems.get());

        this.timeline = new vis.Timeline(container, this.visTimelineItems, finalOptions);
        console.log('✅ Timeline created successfully:', this.timeline);

        // Set up event handlers
        this.timeline.on('select', (properties) => {
            if (properties.items.length > 0) {
                const eventId = properties.items[0];
                this.handleEventSelection(eventId);
            }
        });

        return this.timeline;
    }

    // Filter and update timeline based on active perspective and themes
    filterAndUpdateTimeline() {
        console.log('🔍 filterAndUpdateTimeline called');
        console.log('Timeline data:', this.timelineData);
        console.log('Active perspective:', this.activePerspective);
        console.log('Active themes:', this.activeThemes);
        
        if (!this.timelineData || !this.timelineData.perspectives) {
            console.warn('❌ No timeline data or perspectives available');
            return;
        }

        const filteredEvents = [];

        this.timelineData.perspectives.forEach(perspective => {
            console.log(`🔍 Processing perspective: ${perspective.perspectiveName} (${perspective.perspectiveId})`);
            
            // Filter by active perspective
            if (this.activePerspective && perspective.perspectiveId !== this.activePerspective) {
                console.log(`⏩ Skipping perspective ${perspective.perspectiveName} (not active)`);
                return;
            }

            if (!perspective.events || perspective.events.length === 0) {
                console.log(`⚠️ No events in perspective ${perspective.perspectiveName}`);
                return;
            }

            console.log(`📅 Processing ${perspective.events.length} events in perspective ${perspective.perspectiveName}`);

            perspective.events.forEach(event => {
                console.log(`🔍 Processing event: ${event.title}`);
                
                // Filter by active themes
                if (this.activeThemes.size > 0) {
                    const hasActiveTheme = event.themeIds && 
                        event.themeIds.some(themeId => this.activeThemes.has(themeId));
                    if (!hasActiveTheme) {
                        console.log(`⏩ Skipping event ${event.title} (theme filter)`);
                        return;
                    }
                }

                // Validate event data
                if (!event.startDate) {
                    console.warn(`❌ Event missing start date: ${event.title}`);
                    return;
                }

                console.log(`📅 Event ${event.title} start date: ${event.startDate}`);

                try {
                    // Convert event to vis timeline format
                    const timelineItem = {
                        id: event.id,
                        content: event.title,
                        start: new Date(event.startDate),
                        type: event.type === 'range' ? 'range' : 'point',
                        style: `background-color: ${event.eventColor || perspective.perspectiveColor}; border-color: ${event.eventColor || perspective.perspectiveColor};`,
                        title: event.description // Tooltip
                    };

                    if (event.type === 'range' && event.endDate) {
                        timelineItem.end = new Date(event.endDate);
                    }

                    console.log(`✅ Created timeline item:`, timelineItem);
                    filteredEvents.push(timelineItem);
                } catch (error) {
                    console.error(`❌ Error converting event ${event.title}:`, error);
                }
            });
        });

        console.log(`📊 Total filtered events: ${filteredEvents.length}`);
        console.log('Filtered events:', filteredEvents);

        // Update timeline
        this.visTimelineItems.clear();
        this.visTimelineItems.add(filteredEvents);
        
        console.log('📊 VisTimelineItems after update:', this.visTimelineItems.get());
        
        // If timeline exists, trigger a fit to ensure visibility
        if (this.timeline && filteredEvents.length > 0) {
            console.log('🔄 Timeline exists, attempting to fit timeline');
            try {
                // Wait a bit for DOM to update, then fit
                setTimeout(() => {
                    this.timeline.fit();
                    console.log('✅ Timeline fit completed');
                }, 100);
            } catch (error) {
                console.error('❌ Error fitting timeline:', error);
            }
        } else if (this.timeline) {
            console.log('⚠️ Timeline exists but no events to display');
        } else {
            console.log('⚠️ No timeline instance available');
        }
    }

    // Set active perspective
    setActivePerspective(perspectiveId) {
        this.activePerspective = perspectiveId;
        this.filterAndUpdateTimeline();
    }

    // Toggle theme filter
    toggleTheme(themeId) {
        if (this.activeThemes.has(themeId)) {
            this.activeThemes.delete(themeId);
            return false;
        } else {
            this.activeThemes.add(themeId);
            return true;
        }
    }

    // Diagnostic function to check timeline state
    diagnoseTimeline() {
        console.log('=== TIMELINE DIAGNOSIS ===');
        console.log('Timeline data:', this.timelineData);
        console.log('Timeline instance:', this.timeline);
        console.log('VisTimelineItems:', this.visTimelineItems.get());
        console.log('Active perspective:', this.activePerspective);
        console.log('Active themes:', this.activeThemes);
        
        const container = document.getElementById('timeline-container');
        console.log('Timeline container:', container);
        if (container) {
            console.log('Container computed styles:', {
                height: window.getComputedStyle(container).height,
                width: window.getComputedStyle(container).width,
                display: window.getComputedStyle(container).display,
                visibility: window.getComputedStyle(container).visibility
            });
        }
        
        if (this.timeline) {
            console.log('Timeline window:', this.timeline.getWindow());
            console.log('Timeline options available:', typeof this.timeline.getOptions === 'function');
        }
        
        console.log('=== END DIAGNOSIS ===');
    }

    // Apply theme to timeline
    applyTheme(themeName) {
        const body = document.body;
        body.classList.remove('theme-modern', 'theme-ancient-scroll', 'theme-futuristic');
        body.classList.add(`theme-${themeName}`);
        
        if (this.timelineData.globalSettings) {
            this.timelineData.globalSettings.defaultTheme = themeName;
        }
    }

    // Get perspective by ID
    getPerspectiveById(perspectiveId) {
        return this.timelineData.perspectives.find(p => p.perspectiveId === perspectiveId);
    }

    // Get theme by ID
    getThemeById(themeId) {
        return this.timelineData.themes.find(t => t.id === themeId);
    }

    // Get all events from a specific perspective
    getEventsFromPerspective(perspectiveId) {
        const perspective = this.getPerspectiveById(perspectiveId);
        return perspective ? perspective.events : [];
    }

    // Find event by ID across all perspectives
    findEventById(eventId) {
        for (const perspective of this.timelineData.perspectives) {
            const event = perspective.events.find(e => e.id === eventId);
            if (event) {
                return { event, perspective };
            }
        }
        return null;
    }

    // Handle event selection (can be overridden)
    handleEventSelection(eventId) {
        const result = this.findEventById(eventId);
        if (result) {
            this.showEventDetails(result.event, result.perspective);
        }
    }

    // Show event details (can be overridden)
    showEventDetails(event, perspective) {
        const details = [
            event.title,
            event.description,
            `Date: ${new Date(event.startDate).toLocaleDateString()}`,
            `Perspective: ${perspective.perspectiveName}`
        ].filter(Boolean).join('\n\n');
        
        alert(details); // Simple implementation - can be enhanced
    }

    // Focus timeline on specific date
    focusOnDate(date) {
        if (this.timeline) {
            this.timeline.moveTo(new Date(date));
        }
    }

    // Focus timeline on specific event
    focusOnEvent(eventId) {
        if (this.timeline) {
            this.timeline.focus(eventId);
        }
    }

    // Get timeline window (viewport)
    getTimelineWindow() {
        return this.timeline ? this.timeline.getWindow() : null;
    }

    // Set timeline window (viewport)
    setTimelineWindow(start, end) {
        if (this.timeline) {
            this.timeline.setWindow(start, end);
        }
    }

    // Fit all events in view
    fitTimeline() {
        if (this.timeline) {
            this.timeline.fit();
        }
    }

    // Export timeline data
    exportData() {
        return JSON.stringify(this.timelineData, null, 2);
    }

    // Import timeline data
    importData(jsonData) {
        try {
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            this.initialize(data);
            this.filterAndUpdateTimeline();
            return true;
        } catch (error) {
            console.error('Error importing timeline data:', error);
            return false;
        }
    }

    // Save viewport state
    saveViewportState() {
        if (this.timeline) {
            this.savedViewportState = this.timeline.getWindow();
        }
    }

    // Restore viewport state
    restoreViewportState() {
        if (this.timeline && this.savedViewportState) {
            this.timeline.setWindow(this.savedViewportState.start, this.savedViewportState.end);
        }
    }

    // Timeline navigation methods
    moveLeft() {
        if (this.timeline) {
            const window = this.timeline.getWindow();
            const interval = window.end - window.start;
            const moveAmount = interval * 0.2;
            this.timeline.setWindow(
                new Date(window.start.getTime() - moveAmount),
                new Date(window.end.getTime() - moveAmount)
            );
        }
    }

    moveRight() {
        if (this.timeline) {
            const window = this.timeline.getWindow();
            const interval = window.end - window.start;
            const moveAmount = interval * 0.2;
            this.timeline.setWindow(
                new Date(window.start.getTime() + moveAmount),
                new Date(window.end.getTime() + moveAmount)
            );
        }
    }

    zoomIn() {
        if (this.timeline) {
            const window = this.timeline.getWindow();
            const interval = window.end - window.start;
            const zoomAmount = interval * 0.2;
            this.timeline.setWindow(
                new Date(window.start.getTime() + zoomAmount),
                new Date(window.end.getTime() - zoomAmount)
            );
        }
    }

    zoomOut() {
        if (this.timeline) {
            const window = this.timeline.getWindow();
            const interval = window.end - window.start;
            const zoomAmount = interval * 0.2;
            this.timeline.setWindow(
                new Date(window.start.getTime() - zoomAmount),
                new Date(window.end.getTime() + zoomAmount)
            );
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TimelineCore = TimelineCore;
}
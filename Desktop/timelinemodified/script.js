// script.js (Full version based on advanced index.html, for theme management review)
document.addEventListener('DOMContentLoaded', function() {
    let timelineData;
    let timeline; // This will be the Vis Timeline instance
    let visTimelineItems = new vis.DataSet([]);
    let activePerspective = null; 

    const urlParams = new URLSearchParams(window.location.search);
    const timelineId = urlParams.get('id') || 'default';
    const embedded = urlParams.get('embed') === 'true';
    const readonly = urlParams.get('readonly') === 'true' || embedded;
    const initialTheme = urlParams.get('theme') || 'modern';
    const initialDate = urlParams.get('date');
    const focusEventId = urlParams.get('event');
    const initialPerspectiveIdFromUrl = urlParams.get('perspective');

    if (embedded) {
        document.querySelectorAll('.hide-in-embed').forEach(el => el.style.display = 'none');
        const timelineContainerForEmbed = document.getElementById('timeline-container');
        if (timelineContainerForEmbed) timelineContainerForEmbed.style.height = '100vh';
    }
    if (readonly) {
        document.querySelectorAll('.edit-control').forEach(el => el.style.display = 'none');
    }

    loadTimelineData();

    function loadTimelineData() {
        if (typeof getTimelineFromFirestore === "function") {
            getTimelineFromFirestore(timelineId)
                .then(data => { console.log("Data loaded from Firestore."); timelineData = data; initializePage(timelineData); })
                .catch(error => { console.log('Unable to load from Firestore, falling back to LocalStorage:', error); loadFromLocalStorage(); });
        } else {
            console.log('Firestore not configured, falling back to LocalStorage.');
            loadFromLocalStorage();
        }
    }

    function loadFromLocalStorage() {
        const savedData = localStorage.getItem(`timelineData-${timelineId}`);
        if (savedData) {
            try {
                console.log("Data loaded from LocalStorage.");
                timelineData = JSON.parse(savedData);
                initializePage(timelineData);
            } catch (error) {
                console.error('Error parsing saved data from LocalStorage:', error);
                loadFromFile();
            }
        } else {
            console.log("No data in LocalStorage, falling back to local JSON file.");
            loadFromFile();
        }
    }

    function loadFromFile() {
        fetch('timeline-data.json')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Data loaded from timeline-data.json file.");
                timelineData = data;
                initializePage(timelineData);
            })
            .catch(error => {
                console.error('Error loading timeline data from file:', error);
                const timelineContainer = document.getElementById('timeline-container');
                if(timelineContainer) timelineContainer.innerHTML = '<div class="alert alert-danger">Error loading timeline data. Default file not found or invalid.</div>';
                timelineData = {
                    timelineTitle: "New Timeline", timelineDescription: "Describe your timeline.",
                    globalSettings: { defaultTheme: 'modern' },
                    perspectives: [{ perspectiveId: `p${Date.now()}`, perspectiveName: "Main Perspective", perspectiveColor: "#3498db", events: [] }],
                    themes: []
                };
                initializePage(timelineData);
            });
    }

    function initializePage(data) {
        timelineData = data;
        if (!timelineData.perspectives || !Array.isArray(timelineData.perspectives) || timelineData.perspectives.length === 0) {
            timelineData.perspectives = [{
                perspectiveId: `p${Date.now()}`,
                perspectiveName: "Main Perspective",
                perspectiveColor: "#3498db",
                events: []
            }];
        }
        timelineData.perspectives.forEach(p => { 
            if (!p.events || !Array.isArray(p.events)) p.events = [];
            p.events.forEach(e => {
                if (!Array.isArray(e.perspectiveIds)) {
                    e.perspectiveIds = [p.perspectiveId]; 
                }
            });
        });
        if (!timelineData.themes || !Array.isArray(timelineData.themes)) timelineData.themes = [];
        if (!timelineData.globalSettings) timelineData.globalSettings = { defaultTheme: 'modern' };

        document.getElementById('timeline-title').textContent = timelineData.timelineTitle || "Timeline";
        const descriptionEl = document.getElementById('timeline-description');
        if (descriptionEl) descriptionEl.textContent = timelineData.timelineDescription || "";
        
        applyTheme(initialTheme || timelineData.globalSettings.defaultTheme || 'modern');
        
        refreshThemesDisplay();
        setupPerspectiveDropdownAndFilter(); 
        renderManagePerspectivesList();
        
        initializeVisTimeline(); 
        
        setupEventForm();
        setupPerspectiveForm();
        setupThemeForm();
        setupTimelineNavigation();
        setupEditableTitle();
        setupEditableDescription();
        checkAndFixNavigationIcons();
        
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.value = initialTheme || timelineData.globalSettings.defaultTheme || 'modern';
            themeSelector.addEventListener('change', function() {
                applyTheme(this.value);
                saveTimelineData();
            });
        }
        applyInitialViewParams();

        const currentYearSpan = document.getElementById('currentYear');
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
    }

    function applyInitialViewParams() {
        if (!timeline) return;
        const autoFit = urlParams.get('autofit') !== 'false';

        if (focusEventId) {
            setTimeout(() => {
                if (visTimelineItems.get(focusEventId)) {
                    timeline.setSelection(focusEventId, { focus: true });
                    timeline.focus(focusEventId, {animation: true, zoom: true});
                } else {
                    console.warn(`Event ID ${focusEventId} not found for focusing.`);
                    if (autoFit && visTimelineItems.length > 0) timeline.fit({animation: true});
                }
            }, 500); 
        } else if (initialDate) {
            timeline.moveTo(initialDate, {animation: true});
        } else if (autoFit && visTimelineItems.length > 0) {
             setTimeout(() => timeline.fit({animation: true}), 500);
        }
    }

    function initializeVisTimeline() {
        const container = document.getElementById('timeline-container');
        if (!container) { console.error("Vis Timeline container not found!"); return; }
        container.innerHTML = '';

        const options = {
            height: '100%', 
            minHeight: '500px',
            zoomMin: 1000 * 60 * 60, 
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, 
            orientation: 'bottom', 
            showCurrentTime: false,
            tooltip: { followMouse: false, overflowMethod: 'flip', enabled: false },
            zoomable: true, 
            moveable: true, 
            selectable: true,
            editable: !readonly, 
            align: 'center',
            format: { 
                minorLabels: { 
                    millisecond:'SSS', second: 's', minute: 'h:mma', 
                    hour: 'ha', weekday: 'ddd D', day: 'D', 
                    month: 'MMM', year: 'YYYY' 
                },
                majorLabels: { 
                    millisecond:'HH:mm:ss', second: 'D MMMM HH:mm', 
                    minute: 'ddd D MMMM', hour: 'ddd D MMMM', 
                    weekday: 'MMMM YYYY', day: 'MMMM YYYY', 
                    month: 'YYYY', year: '' 
                }
            },
            start: moment().subtract(1, 'months').toDate(),
            end: moment().add(1, 'months').toDate(),
            stack: true, // Enable stacking by default
            stackSubgroups: true // Enable subgroup stacking
        };
        
        timeline = new vis.Timeline(container, visTimelineItems, options);
        
        // Attach event listeners using the centralized function
        attachTimelineEventListeners();
        if(visTimelineItems.length > 0) {
            timeline.fit({animation: true});
        }
    }

    function updateTimelineEvents(eventsToDisplay) {
        if (!timeline) return;
        
        // Apply smart layering to prevent overlaps
        const layeredEvents = applyEventLayering(eventsToDisplay);
        
        const itemsForVis = layeredEvents.map(event => {
            const eventColor = event.eventColor || '#007bff';
            return {
                id: event.id,
                content: event.title,
                start: event.startDate, 
                end: event.type === 'range' ? event.endDate : undefined,
                className: `event-${event.id} theme-${event.themeIds && event.themeIds.length > 0 ? event.themeIds[0] : 'default'} layer-${event._assignedLane || 0}`,
                style: `color: ${getContrastYIQ(eventColor)}; border-color: ${eventColor}; background-color: ${eventColor + 'CC'};`,
                originalData: event,
                subgroup: event._assignedLane || 0 // Use subgroups for layering
            };
        });
        
        // Update timeline configuration for multiple lanes
        updateTimelineConfiguration(layeredEvents);
        
        visTimelineItems.clear();
        visTimelineItems.add(itemsForVis);
        
        if (itemsForVis.length > 0) {
            timeline.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        } else {
            const defaultStart = moment().subtract(6, 'months').toDate();
            const defaultEnd = moment().add(6, 'months').toDate();
            timeline.setWindow(defaultStart, defaultEnd, { animation: true });
        }
    }

    function applyEventLayering(events) {
        if (events.length === 0) return events;
        
        // Create working copies with normalized dates
        const workingEvents = events.map(event => {
            const start = new Date(event.startDate);
            let end = start;
            
            if (event.type === 'range' && event.endDate) {
                end = new Date(event.endDate);
            } else {
                // For point events, give them a small duration for overlap calculation
                end = new Date(start.getTime() + (1000 * 60 * 60)); // 1 hour
            }
            
            return {
                ...event,
                _start: start,
                _end: end,
                _duration: end.getTime() - start.getTime()
            };
        });
        
        // Sort by duration (longest first) for better layering
        workingEvents.sort((a, b) => b._duration - a._duration);
        
        // Assign lanes using interval scheduling algorithm
        const lanes = [];
        
        workingEvents.forEach(event => {
            let assignedLane = 0;
            
            // Find the first available lane
            while (assignedLane < lanes.length) {
                const laneEvents = lanes[assignedLane];
                const hasOverlap = laneEvents.some(laneEvent => 
                    eventsOverlap(event, laneEvent)
                );
                
                if (!hasOverlap) {
                    break;
                }
                assignedLane++;
            }
            
            // Create new lane if needed
            if (assignedLane >= lanes.length) {
                lanes.push([]);
            }
            
            // Assign event to lane
            event._assignedLane = assignedLane;
            lanes[assignedLane].push(event);
        });
        
        console.log(`Layering complete: ${events.length} events arranged in ${lanes.length} lanes`);
        return workingEvents;
    }

    function eventsOverlap(event1, event2) {
        // Check if two events overlap in time
        return event1._start < event2._end && event2._start < event1._end;
    }

    function updateTimelineConfiguration(layeredEvents) {
        if (!timeline) return;
        
        // Handle empty events case
        if (layeredEvents.length === 0) {
            const newOptions = {
                height: '500px',
                minHeight: '500px',
                stack: true,
                stackSubgroups: true
            };
            timeline.setOptions(newOptions);
            return;
        }
        
        const maxLanes = Math.max(...layeredEvents.map(e => e._assignedLane || 0), 0) + 1;
        const laneHeight = 50; // Height per lane in pixels (increased for better readability)
        const minHeight = 500;
        const calculatedHeight = Math.max(minHeight, maxLanes * laneHeight + 120); // Add more padding
        
        // Update timeline options
        const newOptions = {
            height: `${calculatedHeight}px`,
            minHeight: `${calculatedHeight}px`,
            zoomMin: 1000 * 60 * 60, 
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, 
            orientation: 'bottom', 
            showCurrentTime: false,
            tooltip: { followMouse: false, overflowMethod: 'flip', enabled: false },
            zoomable: true, 
            moveable: true, 
            selectable: true,
            editable: !readonly, 
            align: 'center',
            format: { 
                minorLabels: { 
                    millisecond:'SSS', second: 's', minute: 'h:mma', 
                    hour: 'ha', weekday: 'ddd D', day: 'D', 
                    month: 'MMM', year: 'YYYY' 
                },
                majorLabels: { 
                    millisecond:'HH:mm:ss', second: 'D MMMM HH:mm', 
                    minute: 'ddd D MMMM', hour: 'ddd D MMMM', 
                    weekday: 'MMMM YYYY', day: 'MMMM YYYY', 
                    month: 'YYYY', year: '' 
                }
            },
            start: moment().subtract(1, 'months').toDate(),
            end: moment().add(1, 'months').toDate(),
            stack: true, // Enable stacking
            stackSubgroups: true, // Enable subgroup stacking
            maxHeight: calculatedHeight + 'px',
            verticalScroll: maxLanes > 8, // Enable vertical scroll for many lanes
            horizontalScroll: true
        };
        
        // Update container styling
        const container = document.getElementById('timeline-container');
        if (container) {
            container.style.height = `${calculatedHeight}px`;
            container.style.minHeight = `${calculatedHeight}px`;
        }
        
        // Apply configuration to timeline
        if (timeline.setOptions) {
            timeline.setOptions(newOptions);
        }
        
        console.log(`Timeline configured for ${maxLanes} lanes with height ${calculatedHeight}px`);
        
        // Force a redraw to apply changes
        if (timeline.redraw) {
            setTimeout(() => timeline.redraw(), 100);
        }
    }

    function attachTimelineEventListeners() {
        if (!timeline) return;
        
        timeline.on('click', function(properties) {
            if (properties.item) {
                const eventId = properties.item;
                const visItem = visTimelineItems.get(eventId);
                if (visItem && visItem.originalData) {
                    showEventDetails(visItem.originalData);
                } else {
                    let eventData = null;
                    for (const p of timelineData.perspectives) {
                        const found = p.events.find(e => e.id === eventId);
                        if (found) {
                            eventData = found;
                            break;
                        }
                    }
                    if (eventData) showEventDetails(eventData);
                }
            }
        });
        
        timeline.on('doubleClick', function(properties) {
            if (properties.item && !readonly) {
                const eventId = properties.item;
                let eventToEdit = null;
                for (const p of timelineData.perspectives) {
                    const found = p.events.find(e => e.id === eventId);
                    if (found) {
                        eventToEdit = {...found, _originalPerspectiveId: p.perspectiveId};
                        break;
                    }
                }
                if (eventToEdit) {
                    setupEventForm(eventToEdit);
                }
            }
        });
    }
    
    function setupPerspectiveDropdownAndFilter() {
        const perspectiveSelect = document.getElementById('active-perspective');
        if (!perspectiveSelect) return;
        perspectiveSelect.innerHTML = ''; 

        const allOption = document.createElement('option');
        allOption.value = "all";
        allOption.textContent = "All Perspectives";
        perspectiveSelect.appendChild(allOption);

        timelineData.perspectives.forEach(p => {
            const option = document.createElement('option');
            option.value = p.perspectiveId;
            option.textContent = p.perspectiveName;
            perspectiveSelect.appendChild(option);
        });

        if (initialPerspectiveIdFromUrl && timelineData.perspectives.some(p => p.perspectiveId === initialPerspectiveIdFromUrl)) {
            activePerspective = timelineData.perspectives.find(p => p.perspectiveId === initialPerspectiveIdFromUrl);
            perspectiveSelect.value = initialPerspectiveIdFromUrl;
        } else {
            activePerspective = null; 
            perspectiveSelect.value = "all";
        }
        
        filterAndDisplayEvents(); 

        perspectiveSelect.addEventListener('change', function() {
            const selectedId = this.value;
            if (selectedId === "all") {
                activePerspective = null; 
            } else {
                activePerspective = timelineData.perspectives.find(p => p.perspectiveId === selectedId) || null;
            }
            filterAndDisplayEvents();
        });
    }

    function filterAndDisplayEvents() {
        let eventsToShow = [];
        const selectedPerspectiveId = document.getElementById('active-perspective').value;

        if (selectedPerspectiveId === "all") {
            timelineData.perspectives.forEach(p => {
                eventsToShow = eventsToShow.concat(p.events.map(e => ({...e, _originalPerspectiveId: p.perspectiveId })));
            });
        } else {
            timelineData.perspectives.forEach(p => { 
                p.events.forEach(event => {
                    if (Array.isArray(event.perspectiveIds) && event.perspectiveIds.includes(selectedPerspectiveId)) {
                        eventsToShow.push({...event, _originalPerspectiveId: p.perspectiveId });
                    }
                });
            });
        }
        eventsToShow.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        updateTimelineEvents(eventsToShow);
    }

    function renderManagePerspectivesList() {
        const container = document.getElementById('perspectives-list-manage');
        if (!container) return;
        if (readonly) { container.innerHTML = ''; return; }

        container.innerHTML = ''; 

        if (!timelineData.perspectives || timelineData.perspectives.length === 0) {
            container.innerHTML = '<p class="text-muted small">No perspectives defined yet.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'list-group list-group-flush';
        timelineData.perspectives.forEach(p => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';
            
            const nameDiv = document.createElement('div');
            const colorIndicator = document.createElement('span');
            colorIndicator.className = 'badge rounded-pill me-2';
            colorIndicator.style.backgroundColor = p.perspectiveColor;
            colorIndicator.innerHTML = ' '; 
            nameDiv.appendChild(colorIndicator);
            nameDiv.append(p.perspectiveName); 
            li.appendChild(nameDiv);

            if (timelineData.perspectives.length > 1) { 
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'btn btn-outline-danger btn-sm edit-control';
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                deleteBtn.title = `Delete perspective "${p.perspectiveName}"`;
                deleteBtn.onclick = () => handleDeletePerspective(p.perspectiveId);
                li.appendChild(deleteBtn);
            }
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    function handleDeletePerspective(perspectiveIdToDelete) {
        if (timelineData.perspectives.length <= 1) {
            alert("Cannot delete the last perspective. Your timeline must have at least one perspective.");
            return;
        }
        const perspectiveToDelete = timelineData.perspectives.find(p => p.perspectiveId === perspectiveIdToDelete);
        if (!perspectiveToDelete) { console.error("Perspective to delete not found:", perspectiveIdToDelete); return; }
        if (!confirm(`Are you sure you want to delete the perspective "${perspectiveToDelete.perspectiveName}"? \nEvents primarily stored under this perspective will be removed, and this perspective tag will be removed from all other events.`)) {
            return;
        }
        const perspectiveIndex = timelineData.perspectives.findIndex(p => p.perspectiveId === perspectiveIdToDelete);
        if (perspectiveIndex > -1) {
            const eventsToDeleteFromVis = timelineData.perspectives[perspectiveIndex].events.map(e => e.id);
            visTimelineItems.remove(eventsToDeleteFromVis);
            timelineData.perspectives.splice(perspectiveIndex, 1);
        }
        timelineData.perspectives.forEach(p => { 
            p.events.forEach(event => {
                if (Array.isArray(event.perspectiveIds)) {
                    event.perspectiveIds = event.perspectiveIds.filter(id => id !== perspectiveIdToDelete);
                }
            });
        });
        const activePerspectiveSelect = document.getElementById('active-perspective');
        if (activePerspective && activePerspective.perspectiveId === perspectiveIdToDelete) {
            activePerspective = null; 
            if(activePerspectiveSelect) activePerspectiveSelect.value = "all";
        } else if (activePerspectiveSelect && activePerspectiveSelect.value === perspectiveIdToDelete) {
            activePerspectiveSelect.value = "all";
        }
        setupPerspectiveDropdownAndFilter(); 
        renderManagePerspectivesList();
        saveTimelineData();
        alert(`Perspective "${perspectiveToDelete.perspectiveName}" has been deleted.`);
    }

    // --- Theme Management ---
    function refreshThemesDisplay() {
        const themesContainer = document.getElementById('themes-container');
        const themeCheckboxesContainer = document.getElementById('theme-checkboxes');
        if (!themesContainer || !themeCheckboxesContainer) return;

        themesContainer.innerHTML = '';
        themeCheckboxesContainer.innerHTML = '';

        if (!timelineData.themes || timelineData.themes.length === 0) {
            themesContainer.innerHTML = '<p class="text-muted small">No themes defined yet.</p>';
            themeCheckboxesContainer.innerHTML = '<p class="text-muted small">No themes available to assign.</p>';
            return;
        }

        timelineData.themes.forEach(theme => {
            const themeElement = document.createElement('div');
            themeElement.className = 'theme-item d-flex justify-content-between align-items-center py-1'; // Bootstrap flex
            themeElement.innerHTML = `
                <div>
                    <span class="theme-indicator" style="background-color: ${theme.color};"></span>
                    <span>${theme.name}</span>
                </div>
                <button type="button" class="btn btn-outline-danger btn-sm theme-item-remove edit-control" data-theme-id="${theme.id}" title="Delete Theme">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            themesContainer.appendChild(themeElement);

            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'form-check form-check-inline';
            checkboxDiv.innerHTML = `
                <input class="form-check-input theme-checkbox" type="checkbox" value="${theme.id}" id="theme-check-${theme.id}">
                <label class="form-check-label small" for="theme-check-${theme.id}">
                    <span class="theme-indicator" style="background-color: ${theme.color};"></span>
                    ${theme.name}
                </label>
            `;
            themeCheckboxesContainer.appendChild(checkboxDiv);
        });

        document.querySelectorAll('.theme-item-remove').forEach(btn => {
            btn.addEventListener('click', function() {
                if (readonly) return;
                const themeName = this.parentElement.querySelector('span:last-child').textContent;
                if (confirm(`Are you sure you want to delete the theme "${themeName}"? This will remove it from all events.`)) {
                    deleteTheme(this.dataset.themeId);
                }
            });
        });
         if (readonly) {
            document.querySelectorAll('.theme-item-remove.edit-control').forEach(el => el.style.display = 'none');
        }
    }
    
    function checkAndFixNavigationIcons() {
        // Check if Font Awesome is loaded by testing a known icon
        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-home';
        testIcon.style.position = 'absolute';
        testIcon.style.left = '-9999px';
        document.body.appendChild(testIcon);
        
        const computed = window.getComputedStyle(testIcon);
        const fontFamily = computed.getPropertyValue('font-family');
        
        // If Font Awesome isn't loaded properly, add fallback classes
        if (!fontFamily || !fontFamily.includes('Font Awesome')) {
            console.warn('Font Awesome not detected, using fallback icons');
            
            const navigationButtons = [
                'move-left', 'zoom-out', 'fit-all', 
                'zoom-in', 'move-right'
            ];
            
            navigationButtons.forEach(buttonId => {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.classList.add('icon-fallback');
                    // Hide the icon element if it exists
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.style.display = 'none';
                    }
                }
            });
        } else {
            console.log('Font Awesome icons detected and working properly');
        }
        
        // Remove test icon
        document.body.removeChild(testIcon);
        
        // Also ensure icons have proper accessibility attributes
        const buttons = document.querySelectorAll('.timeline-navigation .btn');
        buttons.forEach(button => {
            if (!button.getAttribute('aria-label') && button.getAttribute('title')) {
                button.setAttribute('aria-label', button.getAttribute('title'));
            }
        });
    }

    
    function getContrastYIQ(hexcolor){
        if (!hexcolor) return '#000000';
        hexcolor = hexcolor.replace("#", "");
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(char => char + char).join('');
        if (hexcolor.length !== 6) return '#000000';
        const r = parseInt(hexcolor.substr(0,2),16);
        const g = parseInt(hexcolor.substr(2,2),16);
        const b = parseInt(hexcolor.substr(4,2),16);
        const yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    }

    function getVideoEmbedCode(url) {
        if (!url) return null;
        
        // Extract YouTube video ID from various URL formats
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const youtubeMatch = url.match(youtubeRegex);
        
        if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            return {
                type: 'youtube',
                embedCode: `<div class="ratio ratio-16x9"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`,
                fallbackUrl: url
            };
        }
        
        // Extract Vimeo video ID
        const vimeoRegex = /(?:vimeo\.com\/)(\d+)/i;
        const vimeoMatch = url.match(vimeoRegex);
        
        if (vimeoMatch) {
            const videoId = vimeoMatch[1];
            return {
                type: 'vimeo',
                embedCode: `<div class="ratio ratio-16x9"><iframe src="https://player.vimeo.com/video/${videoId}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`,
                fallbackUrl: url
            };
        }
        
        // Return fallback for other video URLs
        return {
            type: 'other',
            embedCode: null,
            fallbackUrl: url
        };
    }

    function formatTextContent(text) {
        if (!text) return 'No description available.';
        
        // Convert line breaks to HTML
        let formatted = text.replace(/\n/g, '<br>');
        
        // Add spacing after sentences (periods followed by space and capital letter)
        formatted = formatted.replace(/\. ([A-Z])/g, '.<br><br>$1');
        
        // Ensure proper paragraph spacing
        formatted = formatted.replace(/\. <br><br>/g, '.</p><p>');
        
        // Wrap in paragraph tags if not already
        if (!formatted.startsWith('<p>')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }

    function showEventDetails(event) {
        const modalEl = document.getElementById('eventModal') || createEventModal();
        const modalTitleEl = modalEl.querySelector('.modal-title');
        const modalBodyEl = modalEl.querySelector('.modal-body');
        const modalDeleteBtn = modalEl.querySelector('#modal-delete-event-btn');
        const modalEditBtn = modalEl.querySelector('#modal-edit-event-btn');

        modalTitleEl.textContent = event.title;
        const headerEl = modalEl.querySelector('.modal-header');
        if (headerEl) {
            headerEl.style.backgroundColor = event.eventColor || '#6c757d'; 
            headerEl.style.color = getContrastYIQ(event.eventColor || '#6c757d');
        }

        let modalContent = `
            <div class="event-details-container">
                <div class="event-header mb-4">
                    <div class="d-flex align-items-center mb-2">
                        <i class="fas fa-calendar-alt text-muted me-2"></i>
                        <span class="fw-medium">
                            ${moment(event.startDate || event.start).format('MMMM D, YYYY, h:mm a')}
                            ${event.type === 'range' && (event.endDate || event.end) ? ' - ' + moment(event.endDate || event.end).format('MMMM D, YYYY, h:mm a') : ''}
                        </span>
                    </div>
                    ${event.type === 'range' ? '<span class="badge bg-info">Date Range</span>' : '<span class="badge bg-primary">Point in Time</span>'}
                </div>
                
                <div class="event-description mb-4">
                    <h6 class="section-header"><i class="fas fa-align-left me-2"></i>Description</h6>
                    <div class="content-text">${formatTextContent(event.description)}</div>
                </div>
            </div>`;

        if (event.multimedia && event.multimedia.length > 0) {
            modalContent += `<div class="multimedia-section mb-4">
                <h6 class="section-header"><i class="fas fa-photo-video me-2"></i>Multimedia</h6>`;
            event.multimedia.forEach(media => {
                modalContent += `<div class="media-item card mb-3">`;
                
                if (media.type === 'image' && media.url) {
                    modalContent += `<img src="${media.url}" class="card-img-top img-fluid" alt="${media.caption || event.title}" style="max-height: 300px; object-fit: contain; border-radius: var(--bs-card-inner-border-radius) var(--bs-card-inner-border-radius) 0 0;">`;
                } else if (media.type === 'youtube' && (media.videoId || media.url)) {
                    const videoUrl = media.url || `https://www.youtube.com/watch?v=${media.videoId}`;
                    const videoEmbed = getVideoEmbedCode(videoUrl);
                    
                    if (videoEmbed && videoEmbed.embedCode) {
                        modalContent += videoEmbed.embedCode;
                    } else {
                        modalContent += `<div class="card-body text-center py-4">
                            <i class="fas fa-video fa-2x text-muted mb-2"></i>
                            <p class="card-text">Video content</p>
                            <a href="${videoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                                <i class="fas fa-external-link-alt me-1"></i>Open Video
                            </a>
                        </div>`;
                    }
                } else if (media.type === 'audio' && media.url) {
                    modalContent += `<div class="card-body py-3">
                        <audio controls class="w-100">
                            <source src="${media.url}" type="audio/mpeg">
                            <source src="${media.url}" type="audio/wav">
                            <source src="${media.url}" type="audio/ogg">
                            Your browser does not support the audio element.
                        </audio>
                    </div>`;
                } else if (media.type === '3dmodel' && media.embedUrl) {
                    modalContent += `<div class="ratio ratio-16x9">
                        <iframe src="${media.embedUrl}" frameborder="0" allowfullscreen></iframe>
                    </div>`;
                } else if (media.url) {
                    modalContent += `<div class="card-body text-center py-4">
                        <i class="fas fa-file fa-2x text-muted mb-2"></i>
                        <p class="card-text">Media content</p>
                        <a href="${media.url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                            <i class="fas fa-external-link-alt me-1"></i>Open Link
                        </a>
                    </div>`;
                }
                
                if (media.caption) {
                    modalContent += `<div class="card-body py-2">
                        <p class="card-text small text-muted mb-0"><i class="fas fa-comment me-1"></i>${media.caption}</p>
                    </div>`;
                }
                modalContent += `</div>`;
            });
            modalContent += `</div>`;
        }

        if (event.location && event.location.latitude && event.location.longitude) {
            modalContent += `<div class="location-section mb-4">
                <h6 class="section-header"><i class="fas fa-map-marker-alt me-2"></i>Location</h6>
                <div class="card">
                    <div class="ratio ratio-16x9">
                        <iframe src="https://www.arcgis.com/apps/Embed/index.html?webmap=de6476a04e6844b2bab7c8c33a8a5ebf&marker=${event.location.longitude};${event.location.latitude};;;${encodeURIComponent(event.title)}&level=${event.location.zoomLevel || 10}" allowfullscreen title="Event Location Map"></iframe>
                    </div>
                    ${event.location.address ? `<div class="card-body py-2">
                        <p class="card-text small text-muted mb-0">
                            <i class="fas fa-map-pin me-1"></i>${event.location.address}
                        </p>
                        <p class="card-text small text-muted mb-0">
                            <i class="fas fa-globe me-1"></i>Coordinates: ${event.location.latitude}, ${event.location.longitude}
                        </p>
                    </div>` : `<div class="card-body py-2">
                        <p class="card-text small text-muted mb-0">
                            <i class="fas fa-globe me-1"></i>Coordinates: ${event.location.latitude}, ${event.location.longitude}
                        </p>
                    </div>`}
                </div>
            </div>`;
        }

        if (event.sources && event.sources.length > 0) {
            modalContent += `<div class="sources-section mb-4">
                <h6 class="section-header"><i class="fas fa-book me-2"></i>Sources</h6>`;
            event.sources.forEach(s => {
                modalContent += `<div class="source-item card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${s.title}</h6>
                            <span class="badge bg-secondary ms-2">${s.type}</span>
                        </div>
                        ${s.author ? `<p class="card-text small text-muted mb-1">
                            <i class="fas fa-user me-1"></i>By: ${s.author}
                        </p>` : ''}
                        ${s.date ? `<p class="card-text small text-muted mb-1">
                            <i class="fas fa-calendar me-1"></i>Date: ${s.date}
                        </p>` : ''}
                        ${s.description ? `<p class="card-text small mb-2">${s.description}</p>` : ''}
                        ${s.url ? `<p class="card-text small mb-0">
                            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="text-decoration-none">
                                <i class="fas fa-external-link-alt me-1"></i>View Source
                            </a>
                        </p>` : ''}
                    </div>
                </div>`;
            });
            modalContent += `</div>`;
        }

        if (event.annotations && event.annotations.length > 0) {
            modalContent += `<div class="annotations-section mb-4">
                <h6 class="section-header"><i class="fas fa-comment-dots me-2"></i>Annotations</h6>`;
            event.annotations.forEach(a => {
                modalContent += `<div class="annotation-item card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${a.title}</h6>
                            <span class="badge bg-info ms-2">${a.type}</span>
                        </div>
                        <div class="annotation-content mb-2">
                            ${formatTextContent(a.content)}
                        </div>
                        ${a.tags ? `<p class="card-text small text-muted mb-0">
                            <i class="fas fa-tags me-1"></i>Tags: ${a.tags}
                        </p>` : ''}
                    </div>
                </div>`;
            });
            modalContent += `</div>`;
        }
        
        // Create a metadata section for perspectives and themes
        let hasMetadata = false;
        let metadataContent = '';
        
        if (Array.isArray(event.perspectiveIds) && event.perspectiveIds.length > 0) {
            hasMetadata = true;
            metadataContent += `<div class="metadata-item mb-3">
                <h6 class="small text-muted mb-2"><i class="fas fa-layer-group me-1"></i>Assigned Perspectives</h6>
                <div>`;
            event.perspectiveIds.forEach(pId => {
                const persp = timelineData.perspectives.find(p => p.perspectiveId === pId);
                if (persp) {
                    metadataContent += `<span class="badge rounded-pill me-2 mb-1" style="background-color:${persp.perspectiveColor || '#6c757d'}; color: ${getContrastYIQ(persp.perspectiveColor || '#6c757d')}">${persp.perspectiveName}</span>`;
                }
            });
            metadataContent += `</div></div>`;
        }

        if (event.themeIds && event.themeIds.length > 0 && timelineData.themes) {
            hasMetadata = true;
            metadataContent += `<div class="metadata-item mb-3">
                <h6 class="small text-muted mb-2"><i class="fas fa-palette me-1"></i>Themes</h6>
                <div>`;
            event.themeIds.forEach(themeId => {
                const theme = timelineData.themes.find(t => t.id === themeId);
                if (theme) {
                    metadataContent += `<span class="badge rounded-pill me-2 mb-1" style="background-color: ${theme.color}; color: ${getContrastYIQ(theme.color)}">${theme.name}</span>`;
                }
            });
            metadataContent += `</div></div>`;
        }
        
        if (hasMetadata) {
            modalContent += `<div class="metadata-section">
                <hr class="my-4">
                <h6 class="section-header mb-3"><i class="fas fa-tags me-2"></i>Metadata</h6>
                ${metadataContent}
            </div>`;
        }

        modalContent += `</div>`; 
        modalBodyEl.innerHTML = modalContent;

        if (modalDeleteBtn) {
            if (readonly) modalDeleteBtn.style.display = 'none';
            else {
                modalDeleteBtn.style.display = 'inline-block';
                const newDeleteBtn = modalDeleteBtn.cloneNode(true); 
                modalDeleteBtn.parentNode.replaceChild(newDeleteBtn, modalDeleteBtn);
                newDeleteBtn.onclick = function() {
                     if (confirm(`Are you sure you want to delete the event "${event.title}"?`)) {
                        const primaryPerspectiveId = event._originalPerspectiveId || (activePerspective ? activePerspective.perspectiveId : timelineData.perspectives[0].perspectiveId);
                        deleteEvent(event.id, primaryPerspectiveId);
                        bootstrap.Modal.getInstance(modalEl).hide();
                    }
                };
            }
        }
        if (modalEditBtn) {
            if (readonly) modalEditBtn.style.display = 'none';
            else {
                modalEditBtn.style.display = 'inline-block';
                const newEditBtn = modalEditBtn.cloneNode(true); 
                modalEditBtn.parentNode.replaceChild(newEditBtn, modalEditBtn);
                newEditBtn.onclick = function() {
                    bootstrap.Modal.getInstance(modalEl).hide();
                    editEvent(event.id);
                };
            }
        }
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
    
    function createEventModal() { 
        let modalElement = document.getElementById('eventModal');
        if (!modalElement) {
            const modalHTML = `
            <div class="modal fade" id="eventModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header border-0 pb-2">
                            <h4 class="modal-title fw-bold">Event Details</h4>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body px-4"></div>
                        <div class="modal-footer border-0 pt-2 d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-danger btn-sm edit-control" id="modal-delete-event-btn">
                                <i class="fas fa-trash me-1"></i>Delete Event
                            </button>
                            <div>
                                <button type="button" class="btn btn-outline-primary btn-sm edit-control me-2" id="modal-edit-event-btn">
                                    <i class="fas fa-edit me-1"></i>Edit Event
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modalElement = document.getElementById('eventModal');
        }
        return modalElement;
    }

    function setupEventForm(eventToEdit = null) {
        const eventFormContainer = document.getElementById('event-form-container');
        const eventForm = document.getElementById('event-form');
        const cancelEventBtn = document.getElementById('cancel-event-btn');
        const addEventBtn = document.getElementById('add-event-btn');
        const perspectiveCheckboxesContainer = document.getElementById('event-perspective-checkboxes');

        perspectiveCheckboxesContainer.innerHTML = ''; 
        if (timelineData.perspectives && timelineData.perspectives.length > 0) {
            timelineData.perspectives.forEach(p => {
                const div = document.createElement('div');
                div.className = 'form-check form-check-inline';
                div.innerHTML = `
                    <input class="form-check-input event-perspective-checkbox" type="checkbox" value="${p.perspectiveId}" id="event-persp-check-${p.perspectiveId}">
                    <label class="form-check-label small" for="event-persp-check-${p.perspectiveId}">${p.perspectiveName}</label>
                `;
                perspectiveCheckboxesContainer.appendChild(div);
            });
        } else {
            perspectiveCheckboxesContainer.innerHTML = '<p class="text-muted small">No perspectives defined. Please add perspectives first.</p>';
        }
        
        refreshThemesDisplay(); // Ensure theme checkboxes in form are up-to-date

        if (addEventBtn && !readonly) {
             addEventBtn.onclick = () => {
                eventForm.reset(); 
                eventForm.dataset.editingEventId = ''; 
                eventFormContainer.querySelector('h3').textContent = "Add New Event";
                document.getElementById('multimedia-container').innerHTML = '';
                document.getElementById('sources-container').innerHTML = '';
                document.getElementById('annotations-container').innerHTML = '';
                document.querySelectorAll('.event-perspective-checkbox').forEach(cb => cb.checked = false);
                document.querySelectorAll('.theme-checkbox').forEach(cb => cb.checked = false);
                eventFormContainer.style.display = 'block';
            };
        }
        if (cancelEventBtn) {
            cancelEventBtn.onclick = () => {
                eventFormContainer.style.display = 'none';
                eventForm.reset();
            };
        }
        const typePoint = document.getElementById('type-point');
        const typeRange = document.getElementById('type-range');
        const endDateInput = document.getElementById('event-end-date');
        if(typePoint && typeRange && endDateInput) {
            const updateEndDateState = () => {
                endDateInput.disabled = !typeRange.checked;
                if (typePoint.checked) endDateInput.value = '';
            };
            typePoint.onchange = updateEndDateState;
            typeRange.onchange = updateEndDateState;
            updateEndDateState(); 
        }

        setupDynamicFormSection('add-multimedia-btn', 'multimedia-container', 'multimedia-template', setupMultimediaItem);
        setupDynamicFormSection('add-source-btn', 'sources-container', 'source-template', null);
        setupDynamicFormSection('add-annotation-btn', 'annotations-container', 'annotation-template', null);

        eventForm.onsubmit = function(e) {
            e.preventDefault();
            const editingEventId = eventForm.dataset.editingEventId;
            
            const selectedPerspectiveIds = Array.from(document.querySelectorAll('#event-perspective-checkboxes .event-perspective-checkbox:checked')).map(cb => cb.value);
            if (selectedPerspectiveIds.length === 0 && !readonly) {
                alert("Please assign the event to at least one perspective.");
                return;
            }

            const eventDataPayload = {
                id: editingEventId || `ev${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                title: document.getElementById('event-title').value,
                type: document.querySelector('input[name="event-type"]:checked').value,
                startDate: document.getElementById('event-start-date').value,
                endDate: document.getElementById('event-end-date').disabled ? null : document.getElementById('event-end-date').value,
                description: document.getElementById('event-description').value,
                location: {
                    latitude: parseFloat(document.getElementById('event-latitude').value) || null,
                    longitude: parseFloat(document.getElementById('event-longitude').value) || null,
                    zoomLevel: parseInt(document.getElementById('event-zoom').value) || 10,
                    address: document.getElementById('event-address').value
                },
                eventColor: document.getElementById('event-color').value,
                customMarkerStyle: document.getElementById('event-marker').value,
                themeIds: Array.from(document.querySelectorAll('#theme-checkboxes .theme-checkbox:checked')).map(cb => cb.value),
                multimedia: [], sources: [], annotations: [],
                perspectiveIds: selectedPerspectiveIds 
            };
            
            document.querySelectorAll('#multimedia-container .multimedia-item').forEach(item => {
                const type = item.querySelector('.multimedia-type').value;
                const caption = item.querySelector('.multimedia-caption').value;
                const multimedia = { type: type, caption: caption };
                if (type === 'youtube') multimedia.videoId = item.querySelector('.multimedia-video-id').value;
                else if (type === '3dmodel') multimedia.embedUrl = item.querySelector('.multimedia-embed-url').value;
                else multimedia.url = item.querySelector('.multimedia-url').value;
                if (multimedia.url || multimedia.videoId || multimedia.embedUrl) eventDataPayload.multimedia.push(multimedia);
            });
            document.querySelectorAll('#sources-container .source-item').forEach(item => {
                const title = item.querySelector('.source-title').value;
                if (title.trim()) {
                    eventDataPayload.sources.push({
                        title: title,
                        type: item.querySelector('.source-type').value,
                        author: item.querySelector('.source-author').value,
                        date: item.querySelector('.source-date').value,
                        url: item.querySelector('.source-url').value,
                        description: item.querySelector('.source-description').value
                    });
                }
            });
            document.querySelectorAll('#annotations-container .annotation-item').forEach(item => {
                const title = item.querySelector('.annotation-title').value;
                const content = item.querySelector('.annotation-content').value;
                if (title.trim() && content.trim()) {
                    eventDataPayload.annotations.push({
                        title: title,
                        type: item.querySelector('.annotation-type').value,
                        content: content,
                        tags: item.querySelector('.annotation-tags').value
                    });
                }
            });

            let primaryStoragePerspectiveId = eventForm.dataset.originalPerspectiveId; 
            if (!primaryStoragePerspectiveId) { 
                primaryStoragePerspectiveId = activePerspective ? activePerspective.perspectiveId : (timelineData.perspectives[0] ? timelineData.perspectives[0].perspectiveId : null);
                if (!primaryStoragePerspectiveId && selectedPerspectiveIds.length > 0) { 
                    primaryStoragePerspectiveId = selectedPerspectiveIds[0];
                }
            }
             if (!primaryStoragePerspectiveId && timelineData.perspectives.length > 0) { 
                primaryStoragePerspectiveId = timelineData.perspectives[0].perspectiveId;
            }
            if (!primaryStoragePerspectiveId) {
                alert("Critical error: No perspective available to store the event."); return;
            }

            let perspectiveForStorage = timelineData.perspectives.find(p => p.perspectiveId === primaryStoragePerspectiveId);
             if (!perspectiveForStorage) { 
                perspectiveForStorage = timelineData.perspectives[0]; 
            }

            if (editingEventId) { 
                const oldPrimaryPerspectiveId = eventForm.dataset.originalPerspectiveId;
                const oldPerspective = timelineData.perspectives.find(p => p.perspectiveId === oldPrimaryPerspectiveId);
                
                if (oldPerspective && oldPrimaryPerspectiveId !== perspectiveForStorage.perspectiveId) {
                    const oldEventIndex = oldPerspective.events.findIndex(ev => ev.id === editingEventId);
                    if (oldEventIndex > -1) oldPerspective.events.splice(oldEventIndex, 1);
                    perspectiveForStorage.events.push(eventDataPayload); 
                } else if (oldPerspective) { 
                    const eventIndex = oldPerspective.events.findIndex(ev => ev.id === editingEventId);
                    if (eventIndex > -1) {
                        oldPerspective.events[eventIndex] = eventDataPayload; // Update in place
                    } else { 
                         perspectiveForStorage.events.push(eventDataPayload);
                    }
                } else { 
                    perspectiveForStorage.events.push(eventDataPayload);
                }
                
                const visItem = visTimelineItems.get(editingEventId);
                if (visItem) {
                    visTimelineItems.update({
                        id: eventDataPayload.id,
                        content: eventDataPayload.title,
                        start: eventDataPayload.startDate,
                        end: eventDataPayload.type === 'range' ? eventDataPayload.endDate : undefined,
                        style: `color: ${getContrastYIQ(eventDataPayload.eventColor)}; border-color: ${eventDataPayload.eventColor}; background-color: ${eventDataPayload.eventColor + 'CC'};`,
                        originalData: eventDataPayload
                    });
                } else { 
                     visTimelineItems.add({ /* ... same as new event ... */ });
                }
            } else { // Add new event
                perspectiveForStorage.events.push(eventDataPayload);
                visTimelineItems.add({
                    id: eventDataPayload.id,
                    content: eventDataPayload.title,
                    start: eventDataPayload.startDate,
                    end: eventDataPayload.type === 'range' ? eventDataPayload.endDate : undefined,
                    style: `color: ${getContrastYIQ(eventDataPayload.eventColor)}; border-color: ${eventDataPayload.eventColor}; background-color: ${eventDataPayload.eventColor + 'CC'};`,
                    originalData: eventDataPayload
                });
            }
            
            filterAndDisplayEvents(); 
            saveTimelineData();
            
            eventFormContainer.style.display = 'none';
            eventForm.reset();
            document.getElementById('multimedia-container').innerHTML = '';
            document.getElementById('sources-container').innerHTML = '';
            document.getElementById('annotations-container').innerHTML = '';
            document.querySelectorAll('.event-perspective-checkbox').forEach(cb => cb.checked = false);
            if(timeline) timeline.redraw();
            alert(`Event "${eventDataPayload.title}" ${editingEventId ? 'updated' : 'added'} successfully!`);
        };
        
        if (eventToEdit) {
            eventFormContainer.querySelector('h3').textContent = "Edit Event";
            eventForm.dataset.editingEventId = eventToEdit.id;
            eventForm.dataset.originalPerspectiveId = eventToEdit._originalPerspectiveId || 
                                                    (activePerspective ? activePerspective.perspectiveId : timelineData.perspectives[0].perspectiveId);

            document.getElementById('event-title').value = eventToEdit.title || '';
            document.querySelector(`input[name="event-type"][value="${eventToEdit.type || 'point'}"]`).checked = true;
            document.getElementById('event-start-date').value = moment(eventToEdit.startDate || eventToEdit.start).format('YYYY-MM-DDTHH:mm');
            const eventEndDateInput = document.getElementById('event-end-date');
            if (eventToEdit.type === 'range' && (eventToEdit.endDate || eventToEdit.end)) {
                eventEndDateInput.value = moment(eventToEdit.endDate || eventToEdit.end).format('YYYY-MM-DDTHH:mm');
                eventEndDateInput.disabled = false;
            } else {
                eventEndDateInput.value = '';
                eventEndDateInput.disabled = true;
            }
            document.getElementById('event-description').value = eventToEdit.description || '';
            if (eventToEdit.location) {
                document.getElementById('event-latitude').value = eventToEdit.location.latitude || '';
                document.getElementById('event-longitude').value = eventToEdit.location.longitude || '';
                document.getElementById('event-zoom').value = eventToEdit.location.zoomLevel || 10;
                document.getElementById('event-address').value = eventToEdit.location.address || '';
            }
            document.getElementById('event-color').value = eventToEdit.eventColor || '#007bff';
            document.getElementById('event-marker').value = eventToEdit.customMarkerStyle || 'default';
            
            if (Array.isArray(eventToEdit.perspectiveIds)) {
                eventToEdit.perspectiveIds.forEach(pId => {
                    const checkbox = document.getElementById(`event-persp-check-${pId}`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            document.querySelectorAll('#theme-checkboxes .theme-checkbox').forEach(cb => {
                cb.checked = eventToEdit.themeIds && eventToEdit.themeIds.includes(cb.value);
            });

            const multimediaContainer = document.getElementById('multimedia-container');
            multimediaContainer.innerHTML = ''; 
            if (eventToEdit.multimedia) {
                eventToEdit.multimedia.forEach(m => addDynamicFormItem('multimedia-template', multimediaContainer, m, setupMultimediaItem));
            }
            const sourcesContainer = document.getElementById('sources-container');
            sourcesContainer.innerHTML = '';
            if (eventToEdit.sources) {
                eventToEdit.sources.forEach(s => addDynamicFormItem('source-template', sourcesContainer, s));
            }
            const annotationsContainer = document.getElementById('annotations-container');
            annotationsContainer.innerHTML = '';
            if (eventToEdit.annotations) {
                eventToEdit.annotations.forEach(a => addDynamicFormItem('annotation-template', annotationsContainer, a));
            }
            eventFormContainer.style.display = 'block';
        }
    }

    function editEvent(eventId) {
        let eventToEdit = null;
        for (const p of timelineData.perspectives) {
            const foundEvent = p.events.find(e => e.id === eventId);
            if (foundEvent) {
                eventToEdit = {...foundEvent, _originalPerspectiveId: p.perspectiveId };
                break;
            }
        }
        if (eventToEdit) {
            setupEventForm(eventToEdit);
        } else {
            alert("Event not found for editing. It might be filtered out by the current perspective view.");
        }
    }

    function setupDynamicFormSection(addButtonId, containerId, templateId, itemSetupCallback) {
        const addButton = document.getElementById(addButtonId);
        const container = document.getElementById(containerId);
        const template = document.getElementById(templateId);

        if (addButton && container && template && !readonly) {
            addButton.onclick = () => addDynamicFormItem(templateId, container, null, itemSetupCallback);
        }
    }
    
    function addDynamicFormItem(templateId, containerElement, itemData = null, itemSetupCallback = null) {
        const template = document.getElementById(templateId);
        if (!template) return;
        const clone = document.importNode(template.content, true);
        
        // Find the main item div based on template type
        let itemDiv;
        if (templateId === 'multimedia-template') {
            itemDiv = clone.querySelector('.multimedia-item');
        } else if (templateId === 'source-template') {
            itemDiv = clone.querySelector('.source-item');
        } else if (templateId === 'annotation-template') {
            itemDiv = clone.querySelector('.annotation-item');
        }

        if (itemData) { 
            if (templateId === 'multimedia-template') {
                itemDiv.querySelector('.multimedia-type').value = itemData.type || 'image';
                itemDiv.querySelector('.multimedia-caption').value = itemData.caption || '';
                if (itemData.type === 'youtube') itemDiv.querySelector('.multimedia-video-id').value = itemData.videoId || itemData.originalUrl || '';
                else if (itemData.type === '3dmodel') itemDiv.querySelector('.multimedia-embed-url').value = itemData.embedUrl || '';
                else itemDiv.querySelector('.multimedia-url').value = itemData.url || '';
            } else if (templateId === 'source-template') {
                itemDiv.querySelector('.source-title').value = itemData.title || '';
                itemDiv.querySelector('.source-type').value = itemData.type || 'website';
                itemDiv.querySelector('.source-author').value = itemData.author || '';
                itemDiv.querySelector('.source-date').value = itemData.date || '';
                itemDiv.querySelector('.source-url').value = itemData.url || '';
                itemDiv.querySelector('.source-description').value = itemData.description || '';
            } else if (templateId === 'annotation-template') {
                itemDiv.querySelector('.annotation-title').value = itemData.title || '';
                itemDiv.querySelector('.annotation-type').value = itemData.type || 'note';
                itemDiv.querySelector('.annotation-content').value = itemData.content || '';
                itemDiv.querySelector('.annotation-tags').value = itemData.tags || '';
            }
        }

        const removeBtn = clone.querySelector('.remove-button');
        if (removeBtn) removeBtn.onclick = () => itemDiv.remove();
        if (itemSetupCallback) itemSetupCallback(itemDiv, itemData ? itemData.type : null);
        
        containerElement.appendChild(clone);
    }

    function setupMultimediaItem(itemElement, currentType = null) { 
        const typeSelect = itemElement.querySelector('.multimedia-type');
        const urlField = itemElement.querySelector('.url-field');
        const videoIdField = itemElement.querySelector('.video-id-field');
        const embedUrlField = itemElement.querySelector('.embed-url-field');

        function toggleMultimediaFields() {
            const selectedType = typeSelect.value;
            if (urlField) urlField.style.display = (selectedType === 'image' || selectedType === 'audio') ? 'block' : 'none';
            if (videoIdField) videoIdField.style.display = selectedType === 'youtube' ? 'block' : 'none';
            if (embedUrlField) embedUrlField.style.display = selectedType === '3dmodel' ? 'block' : 'none';
        }
        if (typeSelect) {
            typeSelect.addEventListener('change', toggleMultimediaFields);
            if (currentType) typeSelect.value = currentType; 
            toggleMultimediaFields(); 
        }
    }

    function setupPerspectiveForm() { 
        const formContainer = document.getElementById('perspective-form-container');
        const form = document.getElementById('perspective-form');
        const addBtn = document.getElementById('add-perspective-btn');
        const cancelBtn = document.getElementById('cancel-perspective-btn');

        if (addBtn && !readonly) addBtn.onclick = () => { form.reset(); formContainer.style.display = 'block'; };
        if (cancelBtn) cancelBtn.onclick = () => { formContainer.style.display = 'none'; form.reset(); };
        if (form && !readonly) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const perspectiveNameInput = document.getElementById('perspective-name');
                const perspectiveColorInput = document.getElementById('perspective-color');
                if (!perspectiveNameInput.value.trim()) {
                    alert("Perspective name cannot be empty.");
                    return;
                }
                const newPerspective = {
                    perspectiveId: `p${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                    perspectiveName: perspectiveNameInput.value,
                    perspectiveColor: perspectiveColorInput.value,
                    events: [] 
                };
                timelineData.perspectives.push(newPerspective);
                setupPerspectiveDropdownAndFilter(); 
                renderManagePerspectivesList(); 
                saveTimelineData();
                formContainer.style.display = 'none'; form.reset();
                alert("Perspective added!");
            };
        }
    }
    function setupThemeForm() {
        const formContainer = document.getElementById('theme-form-container');
        const form = document.getElementById('theme-form');
        const addBtn = document.getElementById('add-theme-btn');
        const cancelBtn = document.getElementById('cancel-theme-btn');

        if (addBtn && !readonly) addBtn.onclick = () => { form.reset(); formContainer.style.display = 'block'; };
        if (cancelBtn) cancelBtn.onclick = () => { formContainer.style.display = 'none'; form.reset(); };
        if (form && !readonly) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const themeNameInput = document.getElementById('theme-name');
                const themeColorInput = document.getElementById('theme-color');
                const themeDescriptionInput = document.getElementById('theme-description');
                
                if (!themeNameInput.value.trim()) {
                    alert("Theme name cannot be empty.");
                    return;
                }
                
                const newTheme = {
                    id: `t${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                    name: themeNameInput.value.trim(),
                    color: themeColorInput.value,
                    description: themeDescriptionInput.value.trim() || ''
                };
                
                timelineData.themes.push(newTheme);
                refreshThemesDisplay(); // This will update both display and checkboxes
                saveTimelineData();
                formContainer.style.display = 'none'; 
                form.reset();
                alert("Theme added!");
            };
        }
    }
    
    function deleteEvent(eventId, perspectiveIdOfPrimaryStorage) {
        const perspective = timelineData.perspectives.find(p => p.perspectiveId === perspectiveIdOfPrimaryStorage);
        let eventTitle = "Unknown Event";
        if (perspective) {
            const index = perspective.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                eventTitle = perspective.events[index].title;
                perspective.events.splice(index, 1);
                visTimelineItems.remove(eventId);
                filterAndDisplayEvents();
                saveTimelineData();
                alert(`Event "${eventTitle}" deleted.`);
            } else {
                 if (visTimelineItems.get(eventId)) {
                     visTimelineItems.remove(eventId);
                     filterAndDisplayEvents();
                     saveTimelineData();
                     alert(`Event (ID: ${eventId}) removed from display as its primary perspective was not found.`);
                 } else {
                    alert("Error: Event not found for deletion.");
                 }
            }
        } else {
            alert("Error: Could not find the perspective where the event was stored.");
        }
    }
    function deleteTheme(themeId) {
        const index = timelineData.themes.findIndex(t => t.id === themeId);
        if (index !== -1) {
            const themeName = timelineData.themes[index].name;
            timelineData.themes.splice(index, 1);
            timelineData.perspectives.forEach(p => p.events.forEach(ev => {
                if (ev.themeIds) ev.themeIds = ev.themeIds.filter(tid => tid !== themeId);
            }));
            refreshThemesDisplay(); // This will also update checkboxes in event form when it's opened
            saveTimelineData();
            alert(`Theme "${themeName}" deleted.`);
        }
    }
    function setupTimelineNavigation() {
        document.getElementById('move-left').addEventListener('click', () => {
            if (timeline) {
                const range = timeline.getWindow();
                const duration = range.end - range.start;
                const moveAmount = duration * 0.2; // Move 20% of current view
                timeline.move(-moveAmount);
            }
        });
        document.getElementById('move-right').addEventListener('click', () => {
            if (timeline) {
                const range = timeline.getWindow();
                const duration = range.end - range.start;
                const moveAmount = duration * 0.2; // Move 20% of current view
                timeline.move(moveAmount);
            }
        });
        document.getElementById('zoom-in').addEventListener('click', () => timeline && timeline.zoomIn(0.5));
        document.getElementById('zoom-out').addEventListener('click', () => timeline && timeline.zoomOut(0.5));
        document.getElementById('fit-all').addEventListener('click', () => timeline && (visTimelineItems.length > 0 ? timeline.fit() : timeline.setWindow(moment().subtract(1,'year'), moment().add(1,'year'))));
    }
    
    function setupEditableTitle() {
        const titleElement = document.getElementById('timeline-title');
        const titleInput = document.getElementById('title-edit-input');
        const titleControls = document.getElementById('title-edit-controls');
        const saveBtn = document.getElementById('save-title-btn');
        const cancelBtn = document.getElementById('cancel-title-btn');
        
        if (!titleElement || readonly) return;
        
        let isEditing = false;
        let originalTitle = '';
        
        titleElement.addEventListener('click', function() {
            if (isEditing) return;
            
            isEditing = true;
            originalTitle = titleElement.textContent;
            
            titleInput.value = originalTitle;
            titleElement.style.display = 'none';
            titleInput.style.display = 'block';
            titleControls.style.display = 'block';
            
            titleInput.focus();
            titleInput.select();
        });
        
        function saveTitle() {
            const newTitle = titleInput.value.trim();
            if (!newTitle) {
                alert('Title cannot be empty');
                return;
            }
            
            titleElement.textContent = newTitle;
            timelineData.timelineTitle = newTitle;
            saveTimelineData();
            
            exitEditMode();
        }
        
        function cancelEdit() {
            titleInput.value = originalTitle;
            exitEditMode();
        }
        
        function exitEditMode() {
            isEditing = false;
            titleElement.style.display = 'block';
            titleInput.style.display = 'none';
            titleControls.style.display = 'none';
        }
        
        if (saveBtn) saveBtn.addEventListener('click', saveTitle);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);
        
        // Handle Enter and Escape keys
        if (titleInput) {
            titleInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveTitle();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                }
            });
        }
    }
    
    function setupEditableDescription() {
        const descriptionElement = document.getElementById('timeline-description');
        const descriptionDisplay = document.getElementById('description-display');
        const descriptionEdit = document.getElementById('description-edit');
        const descriptionInput = document.getElementById('description-edit-input');
        const editBtn = document.getElementById('edit-description-btn');
        const saveBtn = document.getElementById('save-description-btn');
        const cancelBtn = document.getElementById('cancel-description-btn');
        
        if (!descriptionElement || readonly) return;
        
        let isEditing = false;
        let originalDescription = '';
        
        function enterEditMode() {
            if (isEditing) return;
            
            isEditing = true;
            originalDescription = descriptionElement.textContent || '';
            
            descriptionInput.value = originalDescription;
            descriptionDisplay.style.display = 'none';
            descriptionEdit.style.display = 'block';
            
            descriptionInput.focus();
        }
        
        function saveDescription() {
            const newDescription = descriptionInput.value.trim();
            
            descriptionElement.textContent = newDescription;
            timelineData.timelineDescription = newDescription;
            saveTimelineData();
            
            exitEditMode();
        }
        
        function cancelEdit() {
            descriptionInput.value = originalDescription;
            exitEditMode();
        }
        
        function exitEditMode() {
            isEditing = false;
            descriptionDisplay.style.display = 'block';
            descriptionEdit.style.display = 'none';
        }
        
        // Click to edit functionality
        if (descriptionElement) {
            descriptionElement.addEventListener('click', enterEditMode);
        }
        
        // Edit button
        if (editBtn) {
            editBtn.addEventListener('click', enterEditMode);
        }
        
        // Save and cancel buttons
        if (saveBtn) saveBtn.addEventListener('click', saveDescription);
        if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);
        
        // Handle keyboard shortcuts
        if (descriptionInput) {
            descriptionInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEdit();
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    saveDescription();
                }
            });
        }
    }
    function applyTheme(themeName) {
        const container = document.getElementById('timeline-container');
        if (!container) return;
        container.className = 'vis-timeline'; // Reset to base Vis class
        if (themeName && themeName !== 'default' && themeName !== 'modern') { // modern is often default vis style
            container.classList.add(`timeline-theme-${themeName}`);
        }
        if(timelineData && timelineData.globalSettings) {
            timelineData.globalSettings.defaultTheme = themeName;
        }
        if (timeline) timeline.redraw();
    }
    function saveTimelineData() {
        localStorage.setItem(`timelineData-${timelineId}`, JSON.stringify(timelineData));
        console.log("Timeline data saved to LocalStorage.");
        if (typeof saveTimelineToFirestore === "function" && typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
            const dataToSave = { ...timelineData, lastModified: new Date().toISOString(), ownerId: firebase.auth().currentUser.uid, isPublic: true };
            saveTimelineToFirestore(timelineId, dataToSave)
                .then(() => console.log('Timeline data saved to Firestore.'))
                .catch(error => console.error('Error saving to Firestore:', error));
        }
    }
    
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const fileInputForImport = document.getElementById('file-input');
    if (exportBtn) { 
        exportBtn.onclick = function() { 
            const existingModal = document.getElementById('exportTimelineModal');
            if (existingModal) existingModal.remove(); // Clean up previous modal
            const exportModalHTML = `
                <div class="modal fade" id="exportTimelineModal" tabindex="-1"> <div class="modal-dialog"> <div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">Export Timeline</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                <div class="modal-body">
                    <p>Download the current timeline data as a JSON file.</p>
                    <button id="exportActualJsonBtn" class="btn btn-primary btn-sm">Download JSON</button><hr>
                    <h6>Embed as iFrame</h6>
                    <div class="mb-2"><label for="hostedJsonUrlForExport" class="form-label small">Public URL of your saved JSON file:</label><input type="url" class="form-control form-control-sm" id="hostedJsonUrlForExport" placeholder="https://your-public-url/timeline.json"></div>
                    <div class="form-check mb-1 small"><input class="form-check-input" type="checkbox" id="iframeReadonlyOption" checked><label class="form-check-label" for="iframeReadonlyOption">Read-only</label></div>
                    <div class="form-check mb-2 small"><input class="form-check-input" type="checkbox" id="iframeAutofitOption" checked><label class="form-check-label" for="iframeAutofitOption">Auto-fit</label></div>
                    <div class="input-group input-group-sm mb-2"><span class="input-group-text">Width</span><input type="text" class="form-control" id="iframeWidthOption" value="100%"><span class="input-group-text">Height</span><input type="text" class="form-control" id="iframeHeightOption" value="600px"></div>
                    <button id="generateActualIframeBtn" class="btn btn-success btn-sm">Generate iFrame Code</button>
                    <textarea id="generatedIframeCodeOutput" class="form-control form-control-sm mt-2" rows="3" readonly></textarea>
                    <button id="copyGeneratedIframeCodeBtn" class="btn btn-outline-secondary btn-sm mt-1" style="display:none;">Copy</button>
                </div></div></div></div>`;
            document.body.insertAdjacentHTML('beforeend', exportModalHTML);
            const modalInstance = new bootstrap.Modal(document.getElementById('exportTimelineModal'));
            document.getElementById('exportActualJsonBtn').onclick = function() {
                const dataStr = JSON.stringify(timelineData, null, 2); const blob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
                link.download = `${(timelineData.timelineTitle || 'timeline').replace(/\s+/g, '_').toLowerCase()}-data.json`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); modalInstance.hide();
            };
            document.getElementById('generateActualIframeBtn').onclick = function() {
                const hostedJson = document.getElementById('hostedJsonUrlForExport').value.trim();
                const isReadonly = document.getElementById('iframeReadonlyOption').checked;
                const isAutofit = document.getElementById('iframeAutofitOption').checked;
                const iWidth = document.getElementById('iframeWidthOption').value;
                const iHeight = document.getElementById('iframeHeightOption').value;
                if (!hostedJson) { alert("Please provide the URL of your hosted JSON file."); return; }
                const embedBaseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1) + 'embed.html';
                let iframeSrc = `${embedBaseUrl}?id=${encodeURIComponent(hostedJson)}`; 
                if (isReadonly) iframeSrc += '&readonly=true'; else iframeSrc += '&readonly=false'; // explicitly set
                if (isAutofit) iframeSrc += '&autofit=true'; else iframeSrc += '&autofit=false'; // explicitly set
                const currentTheme = document.getElementById('theme-selector') ? document.getElementById('theme-selector').value : 'modern';
                iframeSrc += `&theme=${currentTheme}`;
                const code = `<iframe src="${iframeSrc}" width="${iWidth}" height="${iHeight}" frameborder="0" allowfullscreen title="${timelineData.timelineTitle || 'Timeline'}"></iframe>`;
                document.getElementById('generatedIframeCodeOutput').value = code;
                document.getElementById('copyGeneratedIframeCodeBtn').style.display = 'inline-block';
            };
            document.getElementById('copyGeneratedIframeCodeBtn').onclick = function() {
                const outputArea = document.getElementById('generatedIframeCodeOutput');
                outputArea.select(); document.execCommand('copy');
                this.textContent = 'Copied!'; setTimeout(() => { this.textContent = 'Copy';}, 2000);
            };
            modalInstance.show();
        }; 
    }
    if (importBtn && fileInputForImport && !readonly) {
        importBtn.onclick = () => fileInputForImport.click(); 
        fileInputForImport.onchange = (event) => { 
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.perspectives && importedData.themes !== undefined) { 
                        timelineData = importedData;
                        saveTimelineData(); // Save imported data immediately
                        initializePage(timelineData); 
                        alert('Timeline data imported and saved successfully!');
                    } else { throw new Error('Invalid timeline data format.'); }
                } catch (error) { console.error('Error importing timeline data:', error); alert('Error importing timeline data: ' + error.message); }
            };
            reader.readAsText(file);
            event.target.value = ''; 
        };
    }
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});
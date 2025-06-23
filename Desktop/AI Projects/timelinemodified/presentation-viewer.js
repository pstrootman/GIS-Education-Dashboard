// Presentation Viewer JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let timelineData = null;
    let timeline = null;
    let visTimelineItems = new vis.DataSet([]);
    let currentEvents = [];
    let currentEventIndex = -1;
    let activePerspective = null;

    // Get timeline data from URL parameters or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const timelineId = urlParams.get('id') || 'default';
    
    loadTimelineData();

    function loadTimelineData() {
        console.log('Loading timeline data...');
        console.log('Timeline ID:', timelineId);
        
        // Use localStorage directly (cross-origin restrictions prevent window communication)
        console.log('Loading from localStorage...');
        const savedData = localStorage.getItem(`timelineData-${timelineId}`);
        console.log('LocalStorage data exists:', !!savedData);
        
        if (savedData) {
            try {
                timelineData = JSON.parse(savedData);
                console.log('Parsed data from localStorage:', timelineData);
                console.log('Perspectives found:', timelineData.perspectives?.length || 0);
                initializeViewer();
            } catch (error) {
                console.error('Error parsing timeline data:', error);
                showError('Error loading timeline data');
            }
        } else {
            showError('No timeline data found. Please create a timeline first.');
        }
    }

    function initializeViewer() {
        if (!timelineData) {
            showError('No timeline data available');
            return;
        }

        // Set title and description
        document.getElementById('timeline-title').textContent = timelineData.timelineTitle || 'Timeline';
        document.getElementById('timeline-description').textContent = timelineData.timelineDescription || '';

        // Initialize perspective selector
        setupPerspectiveSelector();
        
        // Initialize timeline
        initializeTimeline();
        
        // Setup navigation
        setupNavigation();
        
        // Load initial events
        filterAndDisplayEvents();
    }

    function setupPerspectiveSelector() {
        const selector = document.getElementById('perspective-selector');
        selector.innerHTML = '<option value="all">All Perspectives</option>';
        
        if (timelineData.perspectives) {
            timelineData.perspectives.forEach(p => {
                const option = document.createElement('option');
                option.value = p.perspectiveId;
                option.textContent = p.perspectiveName;
                selector.appendChild(option);
            });
        }
        
        selector.addEventListener('change', function() {
            const selectedId = this.value;
            activePerspective = selectedId === 'all' ? null : 
                timelineData.perspectives.find(p => p.perspectiveId === selectedId);
            filterAndDisplayEvents();
        });
    }

    function initializeTimeline() {
        const container = document.getElementById('timeline-container');
        container.innerHTML = '';

        const options = {
            height: '100%',
            zoomMin: 1000 * 60 * 60, // 1 hour
            zoomMax: 1000 * 60 * 60 * 24 * 365 * 100, // 100 years
            orientation: 'bottom',
            showCurrentTime: false,
            tooltip: { followMouse: false, overflowMethod: 'flip' },
            zoomable: true,
            moveable: true,
            selectable: true,
            editable: false,
            stack: true,
            stackSubgroups: true,
            format: {
                minorLabels: {
                    millisecond: 'SSS',
                    second: 's',
                    minute: 'h:mma',
                    hour: 'ha',
                    weekday: 'ddd D',
                    day: 'D',
                    month: 'MMM',
                    year: 'YYYY'
                },
                majorLabels: {
                    millisecond: 'HH:mm:ss',
                    second: 'D MMMM HH:mm',
                    minute: 'ddd D MMMM',
                    hour: 'ddd D MMMM',
                    weekday: 'MMMM YYYY',
                    day: 'MMMM YYYY',
                    month: 'YYYY',
                    year: ''
                }
            }
        };

        timeline = new vis.Timeline(container, visTimelineItems, options);
        
        // Event listeners
        timeline.on('click', function(properties) {
            if (properties.item) {
                const eventId = properties.item;
                const eventIndex = currentEvents.findIndex(e => e.id === eventId);
                if (eventIndex !== -1) {
                    currentEventIndex = eventIndex;
                    showEventDetails(currentEvents[eventIndex]);
                    updateNavigationButtons();
                }
            }
        });
    }

    function filterAndDisplayEvents() {
        console.log('Filtering and displaying events...');
        console.log('Timeline data:', timelineData);
        console.log('Active perspective:', activePerspective);
        
        let eventsToShow = [];
        
        if (!activePerspective) {
            // Show all events
            timelineData.perspectives.forEach(p => {
                console.log('Processing perspective:', p.perspectiveName, 'Events:', p.events?.length || 0);
                eventsToShow = eventsToShow.concat(p.events || []);
            });
        } else {
            // Show events from selected perspective
            timelineData.perspectives.forEach(p => {
                (p.events || []).forEach(event => {
                    if (Array.isArray(event.perspectiveIds) && 
                        event.perspectiveIds.includes(activePerspective.perspectiveId)) {
                        eventsToShow.push(event);
                    }
                });
            });
        }
        
        console.log('Events to show before deduplication:', eventsToShow.length);
        
        // Remove duplicates and sort by date
        const uniqueEvents = eventsToShow.filter((event, index, self) => 
            index === self.findIndex(e => e.id === event.id)
        );
        
        currentEvents = uniqueEvents.sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );
        
        console.log('Final events to display:', currentEvents.length);
        console.log('Current events:', currentEvents);
        
        updateTimelineDisplay();
        resetEventNavigation();
    }

    function updateTimelineDisplay() {
        // Apply smart layering
        const layeredEvents = applyEventLayering(currentEvents);
        
        const itemsForVis = layeredEvents.map(event => {
            const eventColor = event.eventColor || '#007bff';
            return {
                id: event.id,
                content: event.title,
                start: event.startDate,
                end: event.type === 'range' ? event.endDate : undefined,
                className: `event-${event.id} layer-${event._assignedLane || 0}`,
                style: `color: ${getContrastYIQ(eventColor)}; border-color: ${eventColor}; background-color: ${eventColor}CC;`,
                originalData: event,
                subgroup: event._assignedLane || 0
            };
        });
        
        visTimelineItems.clear();
        visTimelineItems.add(itemsForVis);
        
        if (itemsForVis.length > 0) {
            setTimeout(() => {
                timeline.fit({ animation: { duration: 1000, easingFunction: 'easeInOutQuad' } });
            }, 100);
        }
        
        updateTimelineHeight(layeredEvents);
    }

    function applyEventLayering(events) {
        if (events.length === 0) return events;
        
        const workingEvents = events.map(event => {
            const start = new Date(event.startDate);
            let end = start;
            
            if (event.type === 'range' && event.endDate) {
                end = new Date(event.endDate);
            } else {
                end = new Date(start.getTime() + (1000 * 60 * 60)); // 1 hour
            }
            
            return {
                ...event,
                _start: start,
                _end: end,
                _duration: end.getTime() - start.getTime()
            };
        });
        
        workingEvents.sort((a, b) => b._duration - a._duration);
        
        const lanes = [];
        
        workingEvents.forEach(event => {
            let assignedLane = 0;
            
            while (assignedLane < lanes.length) {
                const laneEvents = lanes[assignedLane];
                const hasOverlap = laneEvents.some(laneEvent => 
                    event._start < laneEvent._end && laneEvent._start < event._end
                );
                
                if (!hasOverlap) break;
                assignedLane++;
            }
            
            if (assignedLane >= lanes.length) {
                lanes.push([]);
            }
            
            event._assignedLane = assignedLane;
            lanes[assignedLane].push(event);
        });
        
        return workingEvents;
    }

    function updateTimelineHeight(layeredEvents) {
        if (!timeline || layeredEvents.length === 0) return;
        
        const maxLanes = Math.max(...layeredEvents.map(e => e._assignedLane || 0), 0) + 1;
        const laneHeight = 50;
        const minHeight = 400;
        const calculatedHeight = Math.max(minHeight, maxLanes * laneHeight + 100);
        
        const container = document.getElementById('timeline-container');
        container.style.height = `${calculatedHeight}px`;
        
        timeline.setOptions({
            height: `${calculatedHeight}px`,
            maxHeight: `${calculatedHeight}px`
        });
    }

    function setupNavigation() {
        document.getElementById('zoom-in-btn').addEventListener('click', () => {
            if (timeline) timeline.zoomIn(0.5);
        });
        
        document.getElementById('zoom-out-btn').addEventListener('click', () => {
            if (timeline) timeline.zoomOut(0.5);
        });
        
        document.getElementById('fit-all-btn').addEventListener('click', () => {
            if (timeline) timeline.fit();
        });
        
        document.getElementById('prev-event-btn').addEventListener('click', () => {
            if (currentEventIndex > 0) {
                currentEventIndex--;
                showEventDetails(currentEvents[currentEventIndex]);
                focusOnEvent(currentEvents[currentEventIndex]);
                updateNavigationButtons();
            }
        });
        
        document.getElementById('next-event-btn').addEventListener('click', () => {
            if (currentEventIndex < currentEvents.length - 1) {
                currentEventIndex++;
                showEventDetails(currentEvents[currentEventIndex]);
                focusOnEvent(currentEvents[currentEventIndex]);
                updateNavigationButtons();
            }
        });
    }

    function updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-event-btn');
        const nextBtn = document.getElementById('next-event-btn');
        
        prevBtn.disabled = currentEventIndex <= 0;
        nextBtn.disabled = currentEventIndex >= currentEvents.length - 1;
    }

    function focusOnEvent(event) {
        if (timeline && event) {
            timeline.setSelection(event.id, { focus: true });
            timeline.focus(event.id, { animation: true, zoom: false });
        }
    }

    function resetEventNavigation() {
        currentEventIndex = -1;
        updateNavigationButtons();
        document.getElementById('event-details-panel').innerHTML = `
            <div class="no-events-message">
                <i class="fas fa-mouse-pointer fa-2x mb-3"></i>
                <p>Click on an event in the timeline above to view its details</p>
            </div>
        `;
    }

    function showEventDetails(event) {
        const panel = document.getElementById('event-details-panel');
        
        let content = `
            <div class="event-card">
                <div class="event-card-header">
                    <h2 class="event-title">${event.title}</h2>
                    <div class="event-date">
                        ${moment(event.startDate).format('MMMM D, YYYY, h:mm a')}
                        ${event.type === 'range' && event.endDate ? 
                            ' - ' + moment(event.endDate).format('MMMM D, YYYY, h:mm a') : ''}
                    </div>
                </div>
                
                <div class="event-description">
                    ${formatTextContent(event.description)}
                </div>
        `;

        // Add multimedia section
        if (event.multimedia && event.multimedia.length > 0) {
            content += `
                <div class="event-section">
                    <div class="event-section-title">
                        <i class="fas fa-photo-video"></i>
                        Multimedia
                    </div>
                    <div class="multimedia-grid">
            `;
            
            event.multimedia.forEach(media => {
                content += `<div class="multimedia-item">`;
                
                if (media.type === 'image' && media.url) {
                    content += `<img src="${media.url}" alt="${media.caption || event.title}">`;
                } else if (media.type === 'youtube' && (media.videoId || media.url)) {
                    const videoUrl = media.url || `https://www.youtube.com/watch?v=${media.videoId}`;
                    const videoEmbed = getVideoEmbedCode(videoUrl);
                    if (videoEmbed && videoEmbed.embedCode) {
                        content += videoEmbed.embedCode;
                    }
                } else if (media.type === 'audio' && media.url) {
                    content += `<audio controls style="width: 100%;"><source src="${media.url}"></audio>`;
                } else if (media.type === '3dmodel' && media.embedUrl) {
                    content += `<iframe src="${media.embedUrl}" style="width: 100%; height: 300px; border: none;"></iframe>`;
                }
                
                if (media.caption) {
                    content += `<div class="multimedia-caption">${media.caption}</div>`;
                }
                
                content += `</div>`;
            });
            
            content += `</div></div>`;
        }

        // Add location/map section
        if (event.location && (event.location.latitude && event.location.longitude || event.location.shapefileData)) {
            content += `
                <div class="event-section">
                    <div class="event-section-title">
                        <i class="fas fa-map-marker-alt"></i>
                        Location
                    </div>
                    <div id="event-map-${event.id}" class="event-map-container"></div>
                    ${event.location.address ? `<p><i class="fas fa-map-pin"></i> ${event.location.address}</p>` : ''}
                </div>
            `;
        }

        // Add sources section
        if (event.sources && event.sources.length > 0) {
            content += `
                <div class="event-section">
                    <div class="event-section-title">
                        <i class="fas fa-book"></i>
                        Sources
                    </div>
            `;
            
            event.sources.forEach(source => {
                content += `
                    <div class="source-item">
                        <div class="source-title">${source.title}</div>
                        ${source.author ? `<p><strong>Author:</strong> ${source.author}</p>` : ''}
                        ${source.date ? `<p><strong>Date:</strong> ${source.date}</p>` : ''}
                        ${source.description ? `<p>${source.description}</p>` : ''}
                        ${source.url ? `<p><a href="${source.url}" target="_blank" rel="noopener noreferrer">View Source</a></p>` : ''}
                    </div>
                `;
            });
            
            content += `</div>`;
        }

        // Add annotations section
        if (event.annotations && event.annotations.length > 0) {
            content += `
                <div class="event-section">
                    <div class="event-section-title">
                        <i class="fas fa-comment-dots"></i>
                        Annotations
                    </div>
            `;
            
            event.annotations.forEach(annotation => {
                content += `
                    <div class="annotation-item">
                        <div class="annotation-title">${annotation.title}</div>
                        <div>${formatTextContent(annotation.content)}</div>
                        ${annotation.tags ? `<p><strong>Tags:</strong> ${annotation.tags}</p>` : ''}
                    </div>
                `;
            });
            
            content += `</div>`;
        }

        // Add metadata badges
        const metadataBadges = [];
        
        if (Array.isArray(event.perspectiveIds) && event.perspectiveIds.length > 0) {
            event.perspectiveIds.forEach(pId => {
                const persp = timelineData.perspectives.find(p => p.perspectiveId === pId);
                if (persp) {
                    metadataBadges.push(`
                        <span class="metadata-badge" style="background-color: ${persp.perspectiveColor}; color: ${getContrastYIQ(persp.perspectiveColor)}">
                            ${persp.perspectiveName}
                        </span>
                    `);
                }
            });
        }
        
        if (event.themeIds && event.themeIds.length > 0 && timelineData.themes) {
            event.themeIds.forEach(themeId => {
                const theme = timelineData.themes.find(t => t.id === themeId);
                if (theme) {
                    metadataBadges.push(`
                        <span class="metadata-badge" style="background-color: ${theme.color}; color: ${getContrastYIQ(theme.color)}">
                            ${theme.name}
                        </span>
                    `);
                }
            });
        }
        
        if (metadataBadges.length > 0) {
            content += `
                <div class="event-section">
                    <div class="event-section-title">
                        <i class="fas fa-tags"></i>
                        Tags
                    </div>
                    <div class="metadata-badges">
                        ${metadataBadges.join('')}
                    </div>
                </div>
            `;
        }

        content += `</div>`;
        panel.innerHTML = content;

        // Initialize map if needed
        if (event.location && (event.location.latitude && event.location.longitude || event.location.shapefileData)) {
            setTimeout(() => {
                initializeEventMap(event);
            }, 100);
        }
    }

    // Utility functions
    function getContrastYIQ(hexcolor) {
        if (!hexcolor) return '#000000';
        hexcolor = hexcolor.replace("#", "");
        if (hexcolor.length === 3) {
            hexcolor = hexcolor.split('').map(char => char + char).join('');
        }
        if (hexcolor.length !== 6) return '#000000';
        const r = parseInt(hexcolor.substr(0, 2), 16);
        const g = parseInt(hexcolor.substr(2, 2), 16);
        const b = parseInt(hexcolor.substr(4, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    }

    function formatTextContent(text) {
        if (!text) return 'No description available.';
        
        let formatted = text.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\. ([A-Z])/g, '.<br><br>$1');
        formatted = formatted.replace(/\. <br><br>/g, '.</p><p>');
        
        if (!formatted.startsWith('<p>')) {
            formatted = '<p>' + formatted + '</p>';
        }
        
        return formatted;
    }

    function getVideoEmbedCode(url) {
        if (!url) return null;
        
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const youtubeMatch = url.match(youtubeRegex);
        
        if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            return {
                type: 'youtube',
                embedCode: `<div class="youtube-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`
            };
        }
        
        return null;
    }

    function initializeEventMap(event) {
        const mapContainer = document.getElementById(`event-map-${event.id}`);
        if (!mapContainer || !window.require) return;

        require([
            "esri/Map",
            "esri/views/MapView",
            "esri/Graphic",
            "esri/layers/GraphicsLayer",
            "esri/geometry/Point",
            "esri/symbols/SimpleMarkerSymbol"
        ], function(Map, MapView, Graphic, GraphicsLayer, Point, SimpleMarkerSymbol) {
            const map = new Map({
                basemap: "hybrid"
            });

            const view = new MapView({
                container: mapContainer,
                map: map,
                center: [event.location.longitude || 0, event.location.latitude || 0],
                zoom: event.location.zoomLevel || 10
            });

            if (event.location.latitude && event.location.longitude) {
                const graphicsLayer = new GraphicsLayer();
                map.add(graphicsLayer);

                const point = new Point({
                    longitude: event.location.longitude,
                    latitude: event.location.latitude
                });

                const markerSymbol = new SimpleMarkerSymbol({
                    color: event.eventColor || "#007bff",
                    outline: {
                        color: [255, 255, 255],
                        width: 2
                    },
                    size: 12
                });

                const pointGraphic = new Graphic({
                    geometry: point,
                    symbol: markerSymbol
                });

                graphicsLayer.add(pointGraphic);
            }
        });
    }

    function showError(message) {
        document.getElementById('timeline-container').innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #dc3545;">
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }
});
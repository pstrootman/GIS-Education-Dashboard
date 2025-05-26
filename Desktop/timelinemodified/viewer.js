// viewer.js - Handles displaying a timeline from a data URL

console.log("Timeline Viewer script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    loadTimelineDataFromUrl();
});

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function loadTimelineDataFromUrl() {
    const dataUrl = getQueryParam('dataUrl');
    const titleElement = document.getElementById('viewerTimelineTitle');
    const container = document.getElementById('viewerEventDisplayContainer');

    if (!dataUrl) {
        console.error("No dataUrl parameter found in URL.");
        if (titleElement) titleElement.textContent = "Error: Timeline data source not specified.";
        if (container) container.innerHTML = "<p>Cannot display timeline: The 'dataUrl' parameter is missing in the address.</p>";
        return;
    }

    console.log("Attempting to load timeline data from:", dataUrl);
    if (titleElement) titleElement.textContent = "Loading Timeline Data...";
    if (container) container.innerHTML = "<p>Fetching data from provided URL...</p>";

    try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching ${dataUrl}`);
        }
        const timelineData = await response.json();
        console.log("Timeline data loaded successfully:", timelineData);

        if (timelineData && timelineData.timelineTitle) {
            if (titleElement) titleElement.textContent = timelineData.timelineTitle;
            document.title = timelineData.timelineTitle + " (Viewer)";
        } else {
            if (titleElement) titleElement.textContent = "Timeline Data Loaded";
        }
        
        renderViewerEvents(timelineData, container);

    } catch (error) {
        console.error("Failed to load or parse timeline data:", error);
        if (titleElement) titleElement.textContent = "Error Loading Timeline";
        if (container) container.innerHTML = `<p>Could not load timeline data from the specified URL. Please check the URL and ensure the file is publicly accessible and a valid JSON timeline format. <br><br>Error: ${error.message}</p>`;
    }
}

function renderViewerEvents(timelineData, container) {
    if (!container) {
        console.error("Event display container not found for viewer.");
        return;
    }

    if (!timelineData || !timelineData.perspectives || !Array.isArray(timelineData.perspectives) || timelineData.perspectives.length === 0) {
        container.innerHTML = "<p>No events or perspectives found in the timeline data.</p>";
        return;
    }

    let allEvents = [];
    timelineData.perspectives.forEach(perspective => {
        if (perspective.events && Array.isArray(perspective.events)) {
            const eventsWithPerspective = perspective.events.map(event => ({
                ...event,
                perspectiveName: timelineData.perspectives.length > 1 ? perspective.name : null
            }));
            allEvents = allEvents.concat(eventsWithPerspective);
        }
    });

    allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    if (allEvents.length === 0) {
        container.innerHTML = "<p>No events found in this timeline.</p>";
        return;
    }

    let html = '<ul>';
    allEvents.forEach(event => {
        const startDate = new Date(event.startDate).toLocaleString();
        let eventPeriod = startDate;
        if (event.type === 'range' && event.endDate) {
            const endDate = new Date(event.endDate).toLocaleString();
            eventPeriod += ` - ${endDate}`;
        }

        html += `<li class="event-item">`; // Added class from viewer.html styles
        if (event.perspectiveName) {
            html += `<em>Perspective: ${event.perspectiveName}</em><br>`;
        }
        html += `<strong class="event-title">${event.title || 'Untitled Event'}</strong>`; // Added class
        html += `<div class="event-details"><strong>Date:</strong> ${eventPeriod}</div>`;
        if (event.location && event.location.address) {
            html += `<div class="event-details"><strong>Location:</strong> ${event.location.address}</div>`;
        }
        if (event.description) {
             html += `<p>${event.description}</p>`;
        }

        // Display Multimedia
        if (event.multimedia && event.multimedia.length > 0) {
            html += `<h5 class="event-section-title">Multimedia:</h5>`;
            event.multimedia.forEach(item => {
                html += `<div class="event-multimedia-item">`;
                if (item.type === 'image' && item.url) {
                    html += `<img src="${item.url}" alt="${item.caption || event.title || 'Timeline image'}" onerror="this.style.display='none'; this.nextElementSibling.textContent='Image not available: ' + this.alt;">`;
                    if (item.caption) {
                        html += `<span class="multimedia-caption-viewer">${item.caption}</span>`;
                    }
                } else if (item.type === 'youtube' && item.videoId) {
                    html += `<div class="youtube-embed-container">`;
                    html += `<iframe src="https://www.youtube.com/embed/${item.videoId}" allowfullscreen></iframe>`;
                    html += `</div>`;
                    if (item.caption) {
                        html += `<span class="multimedia-caption-viewer">${item.caption}</span>`;
                    }
                } else {
                    // Handle other multimedia types or unknown types
                    html += `<p><em>Unsupported media type: ${item.type || 'unknown'}</em></p>`;
                }
                html += `</div>`;
            });
        }

        // Display Sources
        if (event.sources && event.sources.length > 0) {
            html += `<h5 class="event-section-title">Sources:</h5><ul class="item-list">`;
            event.sources.forEach(source => {
                html += `<li>${source.text}`;
                if (source.url) {
                    html += ` (<a href="${source.url}" target="_blank">link</a>)`;
                }
                html += `</li>`;
            });
            html += `</ul>`;
        }

        // Display Annotations
        if (event.annotations && event.annotations.length > 0) {
            html += `<h5 class="event-section-title">Annotations:</h5><ul class="item-list">`;
            event.annotations.forEach(annotation => {
                html += `<li>"${annotation.text}"`;
                if (annotation.author) {
                    html += ` - <em>${annotation.author}</em>`;
                }
                html += `</li>`;
            });
            html += `</ul>`;
        }
        html += `</li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
}
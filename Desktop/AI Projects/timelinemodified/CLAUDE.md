# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an interactive timeline application built with vanilla JavaScript, HTML, and CSS. The application uses a **streamlined class-based architecture** that allows users to create, edit, and view timelines with multiple perspectives and themes, and includes Firebase integration for authentication and data persistence.

### Core Application Structure

- **Frontend**: Pure JavaScript/HTML/CSS application with Bootstrap styling
- **Database**: Firebase Firestore for cloud storage with project-based organization
- **Authentication**: Firebase Auth with email/password authentication
- **Hosting**: Firebase Hosting for static web app deployment
- **Architecture**: Class-based ES6 modules with clear separation of concerns

### Main Application Files

**Core Timeline System (Class-Based Architecture):**
- `timeline-core.js` - Base TimelineCore class with shared timeline functionality
- `timeline-editor.js` - TimelineEditor class extending TimelineCore for editing features
- `timeline-viewer.js` - TimelineViewer class for read-only timeline display
- `timeline-utils.js` - TimelineUtils utility namespace with helper functions

**Application Interfaces:**
- `index.html` - Primary timeline editor interface using TimelineEditor class
- `projects.html` - Dashboard for managing multiple timeline projects
- `projects.js` - ProjectsDashboard class for project management
- `viewer.html` - Standalone timeline viewer for embedded display
- `presentation-viewer.js` - Enhanced viewer for presentation mode

**Supporting Modules:**
- `firebase-config.js` - Firebase initialization and authentication setup
- `modal-handlers.js` - Streamlined modal utilities and form handling
- `rich-text-editor.js` - Rich text editing functionality
- `styles.css` - Consolidated CSS with custom properties

### Key Features

1. **Timeline Management**: Create events with dates, descriptions, multimedia, sources
2. **Perspectives**: Organize events by different viewpoints or themes with color coding
3. **Project System**: Organize multiple timelines into projects with metadata
4. **Embedding**: Generate iframe codes for ArcGIS StoryMaps integration
5. **Authentication**: User accounts with personal timeline storage
6. **Import/Export**: JSON data format with JavaScript file import support
7. **Multi-Mode Support**: Editor, viewer, presentation, and embed modes

## Development Commands

This is a static web application with **no build process**. Development workflow:

### Local Development
```bash
# Option 1: Open HTML files directly in browser
open index.html
open projects.html

# Option 2: Simple HTTP server (if needed for CORS)
python3 -m http.server 8000
# or
npx serve .
```

### Firebase Development
```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Serve locally with Firebase hosting simulation
firebase serve

# Deploy to Firebase Hosting
firebase deploy

# Deploy only hosting (faster)
firebase deploy --only hosting

# Deploy only Firestore rules/indexes
firebase deploy --only firestore
```

## Firebase Configuration

**Project**: `dynamic-timeline-3f9aa`

**Services Used:**
- **Firestore**: Document storage for projects and timelines
- **Authentication**: Email/password authentication (requires manual setup in console)
- **Hosting**: Static web hosting with URL rewrites

**Authentication Setup Required:**
- Enable Email/Password provider in Firebase Console
- See `AUTHENTICATION_SETUP.md` for detailed instructions

**URL Rewrites (configured in firebase.json):**
- `/` → `/projects.html` (dashboard as homepage)
- `/timeline` → `/index.html` (direct timeline access)
- `/timeline/**` → `/index.html` (timeline with parameters)

## Class-Based Architecture

### Core Inheritance Pattern
```javascript
TimelineCore (base class)
├── TimelineEditor (extends TimelineCore) - editing functionality
├── TimelineViewer (extends TimelineCore) - viewing functionality
└── ProjectsDashboard (standalone) - project management
```

### Key Classes and Responsibilities

**TimelineCore**:
- Base timeline functionality, data validation, vis.js integration
- Event filtering, perspective management, theme application
- Viewport management, event selection handling

**TimelineEditor**:
- Enhanced timeline with full editing capabilities
- Event creation, editing, deletion with modal interfaces
- Perspective management, Firebase integration
- Context menus, keyboard shortcuts, advanced interactions

**TimelineUtils**:
- Static utility functions for URL parsing, date formatting
- Local storage operations, form handling, modal utilities
- Import/export functions, embed code generation

**ProjectsDashboard**:
- Complete project lifecycle management
- User authentication flows, project CRUD operations
- Project grid rendering, user interface state management

## Data Structure

### Project Data Format (Firestore)
```javascript
{
  id: "project_id",
  name: "Project Name", 
  description: "Description",
  ownerId: "user_id",
  ownerEmail: "user@example.com",
  createdAt: timestamp,
  lastModified: timestamp,
  timelineData: {
    timelineTitle: "Timeline Name",
    timelineDescription: "Rich HTML description",
    globalSettings: { defaultTheme: 'modern' },
    perspectives: [
      {
        perspectiveId: "unique_id",
        perspectiveName: "Perspective Name",
        perspectiveColor: "#3498db",
        events: [...]
      }
    ],
    themes: [...] // Custom theme definitions
  }
}
```

### Event Data Format
```javascript
{
  id: "unique_event_id",
  title: "Event Title",
  description: "Event description",
  startDate: "2024-01-01T12:00", // ISO format
  endDate: "2024-01-02T12:00", // Optional for range events
  type: "point" | "range",
  eventColor: "#ff0000",
  perspectiveIds: ["perspective_id_1", "perspective_id_2"],
  themeIds: ["theme_id_1"], // Optional
  // Additional metadata can be added
}
```

## URL Parameters

### Timeline Editor (`index.html`)
- `project=<id>` - Load specific project
- `id=<id>` - Legacy timeline ID loading
- `demo=true` - Demo mode without authentication
- `embed=true` - Embedded view mode (hides UI controls)
- `readonly=true` - Read-only mode (disables editing)
- `theme=<theme>` - Initial theme (modern, ancient_scroll, futuristic)
- `perspective=<id>` - Initial perspective filter
- `date=<date>` - Initial viewport date
- `event=<id>` - Focus on specific event

### Viewer (`viewer.html`)
- `dataUrl=<url>` - URL to JSON timeline data for external hosting
- `mode=presentation` - Presentation viewer mode
- `project=<id>` - Project-based viewer

## Key Dependencies

**External Libraries (CDN):**
- **vis-timeline** (7.7.0) - Core timeline visualization
- **Bootstrap** (5.2.3) - UI framework and responsive design
- **Firebase** (9.0.0) - Backend services (auth, firestore)
- **jQuery** (3.6.0) - DOM manipulation (legacy support)
- **Moment.js** (2.29.4) - Date parsing and formatting
- **UUID** (8.3.2) - Unique identifier generation

**Optional Integrations:**
- **ArcGIS JS API** (4.29) - Map integration for geographic timelines

## Important Development Notes

### Architecture Principles
- **No Build Process**: Static files served directly
- **Class-Based**: Modern ES6 classes with inheritance
- **Modular**: Clear separation between core, editor, viewer, and utilities
- **Progressive Enhancement**: Works without JavaScript for basic viewing

### Firebase Integration
- Authentication is **optional** - app works in demo mode
- Project-based data model for better organization
- Firestore security rules enforce user-based access control
- Local storage fallback when Firebase unavailable

### Embedding and Integration
- Generates iframe embed codes for external sites
- Supports ArcGIS StoryMaps integration
- URL parameters allow deep linking and customization
- Responsive design works across devices

### Event System
- Events can belong to multiple perspectives
- Smart event layering prevents visual overlaps
- Context menus for quick actions
- Double-click to add/edit events

### State Management
- Local storage for offline capability
- Real-time Firebase sync when authenticated
- Viewport preservation during data operations
- URL parameter state restoration
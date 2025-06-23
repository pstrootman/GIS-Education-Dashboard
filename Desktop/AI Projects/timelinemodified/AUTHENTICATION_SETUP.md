# Firebase Authentication Setup Instructions

## Required Setup in Firebase Console

To complete the authentication setup for the Dynamic Timeline app, you need to enable Email/Password authentication in the Firebase Console:

### Steps:

1. **Go to Firebase Console**: https://console.firebase.google.com/project/dynamic-timeline-3f9aa

2. **Navigate to Authentication**:
   - Click on "Authentication" in the left sidebar
   - Click on the "Sign-in method" tab

3. **Enable Email/Password Provider**:
   - Find "Email/Password" in the list of providers
   - Click on it to configure
   - Toggle "Enable" to ON
   - Click "Save"

4. **Optional - Configure Settings**:
   - Email enumeration protection: Recommended to leave enabled
   - Password policy: Can be customized if needed

### Security Rules

The Firestore security rules have already been deployed and configured to:
- Allow public read access to timelines (for embedding)
- Require authentication for creating/editing timelines
- Ensure users can only edit their own timelines

### Testing the Authentication

After enabling Email/Password authentication:

1. Visit: https://dynamic-timeline-3f9aa.web.app
2. Create a timeline
3. Click "Save to Firebase" - this should show the authentication modal
4. Sign up with an email and password
5. The timeline should save successfully
6. Sign out and sign back in to verify persistence

### For Students

Students can now:
- Create accounts with their email addresses
- Save multiple timelines to the cloud
- Access their timelines from any device
- Share timeline embeds in ArcGIS StoryMaps

### Embed Usage

The embed functionality works at: https://dynamic-timeline-3f9aa.web.app/embed.html?id=TIMELINE_ID

No authentication is required for viewing embedded timelines.
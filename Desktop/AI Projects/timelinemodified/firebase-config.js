// Firebase configuration for timeline data storage
const firebaseConfig = {
    apiKey: "AIzaSyDXopEtwluJMaxYYxu38I3QORR5jMonNuo",
    authDomain: "dynamic-timeline-3f9aa.firebaseapp.com",
    projectId: "dynamic-timeline-3f9aa",
    storageBucket: "dynamic-timeline-3f9aa.firebasestorage.app",
    messagingSenderId: "22425078843",
    appId: "1:22425078843:web:e5ca2b8371465c0611a01e",
    measurementId: "G-D07KFP4YNM"
};

// Initialize Firebase
let db;
let auth;
let currentUser = null;
let firebaseInitialized = false;

try {
    if (typeof firebase !== 'undefined') {
        // Initialize Firebase app
        if (firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Initialize services
        db = firebase.firestore();
        auth = firebase.auth();
        firebaseInitialized = true;
        
        // Make Firebase available globally
        window.firebase = firebase;
        window.db = db;
        window.auth = auth;
        window.firebaseConfig = firebaseConfig;
        
        // Monitor authentication state
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            if (user) {
                showAuthenticatedUI(user);
                enableTimelineSaving();
            } else {
                showAuthenticationUI();
                disableTimelineSaving();
            }
        });
        
        // Signal Firebase ready
        if (typeof window.firebaseReady === 'function') {
            window.firebaseReady();
        }
        
    } else {
        throw new Error("Firebase SDK not available");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
    firebaseInitialized = false;
    showFirebaseError(error);
}

// Helper function to check if Firebase is ready
function isFirebaseReady() {
    return firebaseInitialized && !!db && !!auth && typeof firebase !== 'undefined';
}

// Make readiness check available globally
window.isFirebaseReady = isFirebaseReady;

function showFirebaseError(error) {
    console.error('Firebase Error:', error.message);
    
    // Only show visual error in browser environments
    if (typeof document !== 'undefined') {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #dc3545; color: white;
            padding: 15px; border-radius: 8px; max-width: 400px; z-index: 10000;
        `;
        errorDiv.innerHTML = `
            <strong>Firebase Connection Error</strong><br>
            ${error.message}
            <button onclick="this.parentElement.remove()" style="
                float: right; margin-top: 10px; background: none; border: 1px solid #fff;
                color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;
            ">×</button>
        `;
        document.body?.appendChild(errorDiv);
        
        setTimeout(() => errorDiv.remove(), 30000);
    }
}

// Authentication Functions
async function signUp(email, password) {
    if (!auth) throw new Error("Firebase Auth not initialized");
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        showAuthMessage('Account created successfully!', 'success');
        closeAuthModal();
        return userCredential.user;
    } catch (error) {
        showAuthMessage(getAuthErrorMessage(error.code), 'error');
        throw error;
    }
}

async function signIn(email, password) {
    if (!auth) throw new Error("Firebase Auth not initialized");
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        showAuthMessage('Signed in successfully!', 'success');
        closeAuthModal();
        return userCredential.user;
    } catch (error) {
        showAuthMessage(getAuthErrorMessage(error.code), 'error');
        throw error;
    }
}

async function signOutUser() {
    if (!auth) throw new Error("Firebase Auth not initialized");
    
    try {
        await auth.signOut();
        showAuthMessage('Signed out successfully', 'success');
    } catch (error) {
        showAuthMessage('Error signing out', 'error');
        throw error;
    }
}

async function resetPassword(email) {
    if (!auth) throw new Error("Firebase Auth not initialized");
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAuthMessage('Password reset email sent! Check your inbox.', 'success');
        showSignInForm();
    } catch (error) {
        showAuthMessage(getAuthErrorMessage(error.code), 'error');
        throw error;
    }
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/user-not-found': 'No account found with this email address.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account already exists with this email address.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.'
    };
    return messages[errorCode] || 'An error occurred. Please try again.';
}

// Firestore Functions
async function saveTimelineToFirestore(timelineId, timelineData) {
    if (!db || !currentUser) throw new Error("Firestore not initialized or user not authenticated");
    
    const dataToSave = {
        ...timelineData,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        lastModified: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: timelineData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
        version: "1.0"
    };
    
    await db.collection('timelines').doc(timelineId).set(dataToSave);
    return true;
}

async function getTimelineFromFirestore(timelineId) {
    if (!db) throw new Error("Firestore not initialized");
    
    const doc = await db.collection('timelines').doc(timelineId).get();
    if (!doc.exists) throw new Error("Timeline not found");
    
    return doc.data();
}

async function listTimelinesFromFirestore() {
    if (!db) throw new Error("Firestore not initialized");
    
    const snapshot = await db.collection('timelines').get();
    const timelines = [];
    snapshot.forEach(doc => {
        timelines.push({
            id: doc.id,
            ...doc.data()
        });
    });
    return timelines;
}

// UI Helper Functions
function showAuthenticatedUI(user) {
    const elements = {
        authModal: document.getElementById('authModal'),
        userInfo: document.getElementById('userInfo'),
        userEmail: document.getElementById('userEmail'),
        saveBtn: document.getElementById('save-firebase-btn')
    };
    
    if (elements.authModal) elements.authModal.style.display = 'none';
    if (elements.userInfo) elements.userInfo.style.display = 'block';
    if (elements.userEmail) elements.userEmail.textContent = user.email;
    if (elements.saveBtn) {
        elements.saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Save to Firebase';
        elements.saveBtn.disabled = false;
    }
}

function showAuthenticationUI() {
    const userInfo = document.getElementById('userInfo');
    const saveBtn = document.getElementById('save-firebase-btn');
    
    if (userInfo) userInfo.style.display = 'none';
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-lock"></i> Sign in to Save';
        saveBtn.disabled = false;
    }
}

function enableTimelineSaving() {
    const saveBtn = document.getElementById('save-firebase-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.title = 'Save your timeline to Firebase';
    }
}

function disableTimelineSaving() {
    const saveBtn = document.getElementById('save-firebase-btn');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.title = 'Sign in to save your timeline';
    }
}

function showSignInForm() {
    const forms = ['signInForm', 'signUpForm', 'resetForm'];
    forms.forEach((id, index) => {
        const form = document.getElementById(id);
        if (form) form.style.display = index === 0 ? 'block' : 'none';
    });
    
    const authTitle = document.getElementById('authTitle');
    if (authTitle) authTitle.textContent = 'Sign In to Save Timelines';
    clearAuthMessage();
}

function showSignUpForm() {
    const forms = ['signInForm', 'signUpForm', 'resetForm'];
    forms.forEach((id, index) => {
        const form = document.getElementById(id);
        if (form) form.style.display = index === 1 ? 'block' : 'none';
    });
    
    const authTitle = document.getElementById('authTitle');
    if (authTitle) authTitle.textContent = 'Create Account';
    clearAuthMessage();
}

function showResetForm() {
    const forms = ['signInForm', 'signUpForm', 'resetForm'];
    forms.forEach((id, index) => {
        const form = document.getElementById(id);
        if (form) form.style.display = index === 2 ? 'block' : 'none';
    });
    
    const authTitle = document.getElementById('authTitle');
    if (authTitle) authTitle.textContent = 'Reset Password';
    clearAuthMessage();
}

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(clearAuthMessage, 3000);
        }
    }
}

function clearAuthMessage() {
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
        messageEl.textContent = '';
        messageEl.className = 'auth-message';
    }
}

function showAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(authModal);
        modal.show();
        showSignInForm();
    }
}

function closeAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal && typeof bootstrap !== 'undefined') {
        const modal = bootstrap.Modal.getInstance(authModal);
        if (modal) modal.hide();
    }
}

// Initialize auth event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeAuthEventListeners, 1000);
});

function initializeAuthEventListeners() {
    const handlers = {
        signInBtn: async () => {
            const email = document.getElementById('signInEmail')?.value;
            const password = document.getElementById('signInPassword')?.value;
            
            if (!email || !password) return;
            
            try {
                await signIn(email, password);
            } catch (error) {
                console.error('Sign in error:', error);
            }
        },
        
        signUpBtn: async () => {
            const email = document.getElementById('signUpEmail')?.value;
            const password = document.getElementById('signUpPassword')?.value;
            const confirm = document.getElementById('confirmPassword')?.value;
            
            if (!email || !password || password !== confirm) return;
            
            try {
                await signUp(email, password);
            } catch (error) {
                console.error('Sign up error:', error);
            }
        },
        
        resetBtn: async () => {
            const email = document.getElementById('resetEmail')?.value;
            if (!email) return;
            
            try {
                await resetPassword(email);
            } catch (error) {
                console.error('Reset password error:', error);
            }
        },
        
        signOutBtn: async () => {
            try {
                await signOutUser();
            } catch (error) {
                console.error('Sign out error:', error);
            }
        }
    };
    
    // Attach event handlers
    Object.entries(handlers).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) element.onclick = handler;
    });
    
    // Form switching links
    const formSwitchers = {
        showSignUp: () => showSignUpForm(),
        showSignIn: () => showSignInForm(),
        forgotPassword: () => showResetForm(),
        backToSignIn: () => showSignInForm()
    };
    
    Object.entries(formSwitchers).forEach(([id, handler]) => {
        const element = document.getElementById(id);
        if (element) {
            element.onclick = (e) => {
                e.preventDefault();
                handler();
            };
        }
    });
}
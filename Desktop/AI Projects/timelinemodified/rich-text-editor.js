// Rich Text Editor functionality for timeline descriptions
// This file handles the rich text editing modal and formatting controls

document.addEventListener('DOMContentLoaded', function() {
    // Wait for the main script to load before setting up RTF handlers
    setTimeout(initializeRichTextEditor, 1000);
    
    // Also load content when page loads
    setTimeout(loadRichTextContent, 1500);
});

function initializeRichTextEditor() {
    setupEditDescriptionButton();
    setupRichTextFormattingButtons();
    setupRichTextSaveButton();
}

function setupEditDescriptionButton() {
    const editBtn = document.getElementById('edit-description-btn');
    if (editBtn) {
        editBtn.onclick = function(e) {
            e.preventDefault();
            openRichTextEditor();
        };
    }
}

function openRichTextEditor() {
    const modal = new bootstrap.Modal(document.getElementById('richTextModal'));
    const editor = document.getElementById('rich-text-editor');
    const descriptionDisplay = document.getElementById('timeline-description');
    
    // Load current description content into editor
    if (descriptionDisplay && editor) {
        const currentContent = descriptionDisplay.innerHTML;
        if (currentContent && currentContent.trim() !== '' && !currentContent.includes('Describe your timeline')) {
            editor.innerHTML = currentContent;
        } else {
            editor.innerHTML = '<p>Describe your timeline...</p>';
        }
    }
    
    modal.show();
    
    // Focus on the editor when modal opens
    setTimeout(() => {
        if (editor) {
            editor.focus();
            // Select all text if it's the placeholder
            if (editor.textContent.trim() === 'Describe your timeline...') {
                selectAllText(editor);
            }
        }
    }, 300);
}

function setupRichTextFormattingButtons() {
    // Basic formatting buttons
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    
    // Header buttons
    const h1Btn = document.getElementById('h1-btn');
    const h2Btn = document.getElementById('h2-btn');
    const h3Btn = document.getElementById('h3-btn');
    
    // List buttons
    const ulBtn = document.getElementById('ul-btn');
    const olBtn = document.getElementById('ol-btn');
    
    // Alignment buttons
    const alignLeftBtn = document.getElementById('align-left-btn');
    const alignCenterBtn = document.getElementById('align-center-btn');
    const alignRightBtn = document.getElementById('align-right-btn');
    
    // Set up event listeners
    if (boldBtn) boldBtn.onclick = () => formatText('bold');
    if (italicBtn) italicBtn.onclick = () => formatText('italic');
    if (underlineBtn) underlineBtn.onclick = () => formatText('underline');
    
    if (h1Btn) h1Btn.onclick = () => formatText('formatBlock', '<h1>');
    if (h2Btn) h2Btn.onclick = () => formatText('formatBlock', '<h2>');
    if (h3Btn) h3Btn.onclick = () => formatText('formatBlock', '<h3>');
    
    if (ulBtn) ulBtn.onclick = () => formatText('insertUnorderedList');
    if (olBtn) olBtn.onclick = () => formatText('insertOrderedList');
    
    if (alignLeftBtn) alignLeftBtn.onclick = () => formatText('justifyLeft');
    if (alignCenterBtn) alignCenterBtn.onclick = () => formatText('justifyCenter');
    if (alignRightBtn) alignRightBtn.onclick = () => formatText('justifyRight');
    
    // Update button states when selection changes
    const editor = document.getElementById('rich-text-editor');
    if (editor) {
        editor.addEventListener('mouseup', updateButtonStates);
        editor.addEventListener('keyup', updateButtonStates);
        editor.addEventListener('focus', updateButtonStates);
    }
}

function formatText(command, value = null) {
    const editor = document.getElementById('rich-text-editor');
    if (!editor) return;
    
    // Focus the editor first
    editor.focus();
    
    try {
        // Execute the formatting command
        document.execCommand(command, false, value);
        
        // Update button states
        updateButtonStates();
        
        // If editor was empty with placeholder, clear it
        if (editor.textContent.trim() === 'Describe your timeline...') {
            editor.innerHTML = '<p><br></p>';
            // Place cursor at the beginning
            const range = document.createRange();
            const sel = window.getSelection();
            range.setStart(editor.firstChild, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } catch (error) {
        console.error('Error executing format command:', error);
    }
}

function updateButtonStates() {
    // Update button active states based on current selection
    const boldBtn = document.getElementById('bold-btn');
    const italicBtn = document.getElementById('italic-btn');
    const underlineBtn = document.getElementById('underline-btn');
    
    if (boldBtn) {
        boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    }
    if (italicBtn) {
        italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    }
    if (underlineBtn) {
        underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
    }
}

function selectAllText(element) {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function setupRichTextSaveButton() {
    const saveBtn = document.getElementById('save-rich-text');
    if (saveBtn) {
        saveBtn.onclick = function() {
            saveRichTextContent();
        };
    }
}

function saveRichTextContent() {
    const editor = document.getElementById('rich-text-editor');
    const descriptionDisplay = document.getElementById('timeline-description');
    
    if (!editor || !descriptionDisplay) {
        console.error('Rich text editor or display element not found');
        return;
    }
    
    // Get the content from the editor
    let content = editor.innerHTML;
    
    // Clean up the content
    content = cleanRichTextContent(content);
    
    // Check if content is empty or just placeholder
    const textContent = editor.textContent || editor.innerText;
    if (!textContent.trim() || textContent.trim() === 'Describe your timeline...') {
        content = '<p class="text-muted" style="font-style: italic;">Describe your timeline...</p>';
    }
    
    // Update the display
    descriptionDisplay.innerHTML = content;
    
    // Save to timeline data
    if (typeof timelineData !== 'undefined') {
        timelineData.timelineDescription = content;
        
        // Save to localStorage and Firebase
        if (typeof saveTimelineData === 'function') {
            saveTimelineData();
        }
    }
    
    // Close the modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('richTextModal'));
    if (modal) {
        modal.hide();
    }
    
    console.log('Rich text content saved');
}

function cleanRichTextContent(html) {
    // Remove any unwanted HTML tags and attributes
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove any script tags for security
    const scripts = tempDiv.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove any style attributes that might break the layout
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(element => {
        // Keep only basic formatting attributes
        const allowedAttributes = ['class'];
        const attributes = Array.from(element.attributes);
        attributes.forEach(attr => {
            if (!allowedAttributes.includes(attr.name)) {
                element.removeAttribute(attr.name);
            }
        });
    });
    
    return tempDiv.innerHTML;
}

// Function to load rich text content when page initializes
function loadRichTextContent() {
    const descriptionDisplay = document.getElementById('timeline-description');
    
    if (descriptionDisplay && typeof timelineData !== 'undefined') {
        if (timelineData.timelineDescription && timelineData.timelineDescription.trim() !== '') {
            descriptionDisplay.innerHTML = timelineData.timelineDescription;
        } else {
            descriptionDisplay.innerHTML = '<p class="text-muted" style="font-style: italic;">Describe your timeline...</p>';
        }
    }
}

// Export function for use in other scripts
window.loadRichTextContent = loadRichTextContent;
/* ===================================
   PAGE NAVIGATION
   =================================== */

/**
 * Check authentication status on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

/**
 * Check if user is logged in and update UI
 */
function checkAuthStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const authLink = document.getElementById('authLink');
    
    if (currentUser) {
        // User is logged in
        authLink.textContent = 'Logout';
        authLink.onclick = handleLogout;
    } else {
        // User is not logged in
        authLink.textContent = 'Login';
        authLink.onclick = () => {
            window.location.href = 'login.html';
        };
    }
}

/**
 * Handle user logout
 */
function handleLogout(event) {
    event.preventDefault();
    localStorage.removeItem('currentUser');
    alert('You have been logged out successfully!');
    checkAuthStatus();
}

/**
 * Show specific page and update active navigation link
 * @param {string} pageName - Name of the page to display
 */
function showPage(pageName) {
    // Hide all pages
    const allPages = document.querySelectorAll('.page-content');
    allPages.forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav links
    const allLinks = document.querySelectorAll('.nav-link');
    allLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Show selected page
    const pageId = pageName + 'Page';
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Add active class to clicked nav link
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

/* ===================================
   VOICE RECORDING FUNCTIONALITY
   =================================== */

// Get DOM elements
const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const audioPreview = document.getElementById('audioPreview');
const recordedAudio = document.getElementById('recordedAudio');

// Recording variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

/**
 * Handle record button click
 * Start or stop recording based on current state
 */
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
});

/**
 * Start audio recording
 */
async function startRecording() {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create media recorder
        mediaRecorder = new MediaRecorder(stream);
        
        // Handle data available event
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        // Handle stop event
        mediaRecorder.onstop = () => {
            // Create audio blob from chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Set audio source and show preview
            recordedAudio.src = audioUrl;
            audioPreview.classList.add('visible');
            
            // Reset chunks for next recording
            audioChunks = [];
        };
        
        // Start recording
        mediaRecorder.start();
        isRecording = true;
        
        // Update UI
        recordBtn.classList.add('recording');
        recordingStatus.textContent = '🔴 Recording... Click to stop';
        recordingStatus.classList.add('active');
        
    } catch (error) {
        // Handle errors (e.g., microphone access denied)
        recordingStatus.textContent = '❌ Microphone access denied';
        recordingStatus.classList.remove('active');
        console.error('Error accessing microphone:', error);
    }
}

/**
 * Stop audio recording
 */
function stopRecording() {
    // Stop media recorder
    mediaRecorder.stop();
    
    // Stop all tracks to release microphone
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    isRecording = false;
    
    // Update UI
    recordBtn.classList.remove('recording');
    recordingStatus.textContent = '✅ Recording saved! Play it below';
    recordingStatus.classList.remove('active');
}


const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

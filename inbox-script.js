// Inbox page script
const API_BASE = '';

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Check if user is authenticated
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// API call with auth
async function apiCall(endpoint, options = {}) {
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE + endpoint, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
        return null;
    }

    return await response.json();
}

// Load user profile and stats
async function loadProfile() {
    const data = await apiCall('/api/me');

    if (data && data.success) {
        const user = data.user;

        // Set share link
        const shareLink = `${window.location.origin}/profile/${user.profile_link}`;
        document.getElementById('shareLink').value = shareLink;

        // Update auth link
        const authLink = document.getElementById('authLink');
        authLink.textContent = 'Logout';
        authLink.onclick = handleLogout;

        // Load stats
        loadStats();
    }
}

// Load statistics
async function loadStats() {
    const data = await apiCall('/api/stats');

    if (data && data.success) {
        const stats = data.stats;
        document.getElementById('statsMessages').textContent = stats.messages;
        document.getElementById('statsUnread').textContent = stats.unread;
        document.getElementById('statsFavorites').textContent = stats.favorites;
        document.getElementById('statsSent').textContent = stats.sent;
    }
}

// Load recordings
async function loadRecordings(type = 'inbox') {
    const containerId = type + 'Messages';
    const container = document.getElementById(containerId);

    // Show loading
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading messages...</p></div>';

    const data = await apiCall(`/api/recordings/${type}`);

    if (data && data.success) {
        const recordings = data.recordings;

        if (recordings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${type === 'inbox' ? '📭' : type === 'favorites' ? '⭐' : '✉️'}</div>
                    <h3>No messages yet</h3>
                    <p>${type === 'inbox' ? 'Share your profile link to receive messages!' : type === 'favorites' ? 'Star messages to add them to favorites' : 'You haven\'t sent any messages'}</p>
                </div>
            `;
            return;
        }

        // Render messages
        container.innerHTML = recordings.map(rec => createMessageCard(rec, type)).join('');

        // Add event listeners
        addMessageEventListeners();
    } else {
        container.innerHTML = '<div class="empty-state"><p>Error loading messages</p></div>';
    }
}

// Create message card HTML
function createMessageCard(recording, type) {
    const date = new Date(recording.created_at);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const senderName = type === 'sent'
        ? (recording.recipient_name || 'Unknown')
        : (recording.sender_name || 'Anonymous');

    const duration = recording.duration_seconds
        ? Math.floor(recording.duration_seconds) + 's'
        : 'N/A';

    const isUnread = !recording.is_read && type === 'inbox';
    const isFavorite = recording.is_favorite;

    return `
        <div class="message-card ${isUnread ? 'unread' : ''}" data-id="${recording.id}">
            <div class="message-header">
                <div class="message-info">
                    <div class="message-sender">${senderName}</div>
                    <div class="message-date">${formattedDate}</div>
                </div>
                ${type === 'inbox' ? `
                <div class="message-actions">
                    <button class="action-btn favorite ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${recording.id})" title="Favorite">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                    <button class="action-btn delete" onclick="deleteRecording(${recording.id})" title="Delete">
                        🗑️
                    </button>
                </div>
                ` : ''}
            </div>
            <div class="message-meta">
                <div class="meta-item">
                    <span>⏱️</span>
                    <span>${duration}</span>
                </div>
                <div class="meta-item">
                    <span>🎭</span>
                    <span>${recording.transformation_type}</span>
                </div>
                ${isUnread ? '<div class="meta-item"><span>🆕</span><span>New</span></div>' : ''}
            </div>
            <div class="message-audio">
                <audio controls onplay="markAsRead(${recording.id})" data-recording-id="${recording.id}">
                    Your browser does not support audio playback.
                </audio>
            </div>
        </div>
    `;
}

// Add event listeners to messages
function addMessageEventListeners() {
    // Load audio with authentication
    document.querySelectorAll('.message-audio audio').forEach(audio => {
        const recordingId = audio.dataset.recordingId;
        if (recordingId) {
            loadAudioWithAuth(audio, recordingId);
        }

        // Auto-mark as read on play
        audio.addEventListener('play', function() {
            const messageCard = this.closest('.message-card');
            if (messageCard.classList.contains('unread')) {
                const recordingId = messageCard.dataset.id;
                markAsRead(recordingId);
            }
        });
    });
}

// Load audio with authentication
async function loadAudioWithAuth(audioElement, recordingId) {
    try {
        const token = getAuthToken();
        const response = await fetch(`/api/audio/${recordingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            audioElement.src = url;
        } else {
            console.error('Failed to load audio:', response.status);
            audioElement.parentElement.innerHTML = '<p style="color: red;">Failed to load audio</p>';
        }
    } catch (error) {
        console.error('Error loading audio:', error);
        audioElement.parentElement.innerHTML = '<p style="color: red;">Error loading audio</p>';
    }
}

// Mark as read
async function markAsRead(recordingId) {
    await apiCall(`/api/recordings/${recordingId}/read`, { method: 'POST' });

    // Remove unread class
    const messageCard = document.querySelector(`[data-id="${recordingId}"]`);
    if (messageCard) {
        messageCard.classList.remove('unread');
        const newBadge = messageCard.querySelector('.meta-item:has(span:contains("New"))');
        if (newBadge) newBadge.remove();
    }

    // Update stats
    loadStats();
}

// Toggle favorite
async function toggleFavorite(recordingId) {
    await apiCall(`/api/recordings/${recordingId}/favorite`, { method: 'POST' });

    // Toggle star icon
    const messageCard = document.querySelector(`[data-id="${recordingId}"]`);
    if (messageCard) {
        const favoriteBtn = messageCard.querySelector('.favorite');
        if (favoriteBtn.classList.contains('active')) {
            favoriteBtn.classList.remove('active');
            favoriteBtn.textContent = '☆';
        } else {
            favoriteBtn.classList.add('active');
            favoriteBtn.textContent = '⭐';
        }
    }

    // Update stats
    loadStats();
}

// Delete recording
async function deleteRecording(recordingId) {
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }

    const result = await apiCall(`/api/recordings/${recordingId}`, { method: 'DELETE' });

    if (result && result.success) {
        // Remove from DOM
        const messageCard = document.querySelector(`[data-id="${recordingId}"]`);
        if (messageCard) {
            messageCard.remove();
        }

        // Update stats
        loadStats();

        // Check if empty
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        const container = document.getElementById(activeTab + 'Messages');
        if (container.children.length === 0) {
            loadRecordings(activeTab);
        }
    }
}

// Copy share link
document.getElementById('copyBtn').addEventListener('click', () => {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');

    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
        copyBtn.textContent = originalText;
    }, 2000);
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');

        // Load recordings for this tab
        loadRecordings(tabId);
    });
});

// Logout
function handleLogout(event) {
    event.preventDefault();
    apiCall('/api/logout', { method: 'POST' });
    localStorage.removeItem('authToken');
    window.location.href = '/login.html';
}

// Initialize
if (checkAuth()) {
    loadProfile();
    loadRecordings('inbox');
}

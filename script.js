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
let originalAudioBlob = null;
let transformedAudioBlob = null;

// Voice transformation elements
const voiceTransformSection = document.getElementById('voiceTransformSection');
const pitchSlider = document.getElementById('pitchSlider');
const speedSlider = document.getElementById('speedSlider');
const pitchValue = document.getElementById('pitchValue');
const speedValue = document.getElementById('speedValue');
const previewTransformBtn = document.getElementById('previewTransformBtn');
const applyTransformBtn = document.getElementById('applyTransformBtn');
const transformedAudio = document.getElementById('transformedAudio');
const transformedAudioContainer = document.getElementById('transformedAudioContainer');
const downloadTransformedBtn = document.getElementById('downloadTransformedBtn');
const presetButtons = document.querySelectorAll('.preset-btn');

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

            // Store original blob for transformation
            originalAudioBlob = audioBlob;

            // Set audio source and show preview
            recordedAudio.src = audioUrl;
            audioPreview.classList.add('visible');

            // Show voice transformation section
            voiceTransformSection.style.display = 'block';

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

/* ===================================
   VOICE TRANSFORMATION FUNCTIONALITY
   =================================== */

// Voice presets configuration
const voicePresets = {
    'original': { pitch: 0, speed: 1.0 },
    'deep-male': { pitch: -4, speed: 0.95 },
    'male': { pitch: -2, speed: 1.0 },
    'female': { pitch: 4, speed: 1.05 },
    'high-female': { pitch: 6, speed: 1.1 },
    'robotic': { pitch: -1, speed: 0.9 }
};

/**
 * Apply voice preset
 */
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all presets
        presetButtons.forEach(b => b.classList.remove('active'));

        // Add active class to clicked preset
        btn.classList.add('active');

        // Get preset values
        const presetName = btn.dataset.preset;
        const preset = voicePresets[presetName];

        // Update sliders
        pitchSlider.value = preset.pitch;
        speedSlider.value = preset.speed;
        pitchValue.textContent = preset.pitch;
        speedValue.textContent = preset.speed.toFixed(1) + 'x';
    });
});

/**
 * Update pitch value display
 */
pitchSlider.addEventListener('input', () => {
    pitchValue.textContent = pitchSlider.value;
});

/**
 * Update speed value display
 */
speedSlider.addEventListener('input', () => {
    speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
});

/**
 * Transform audio with pitch shift and speed adjustment
 * @param {Blob} audioBlob - Original audio blob
 * @param {number} pitchShift - Pitch shift in semitones
 * @param {number} playbackRate - Speed adjustment (1.0 = normal)
 * @returns {Promise<Blob>} Transformed audio blob
 */
async function transformAudio(audioBlob, pitchShift, playbackRate) {
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate pitch shift ratio
    const pitchRatio = Math.pow(2, pitchShift / 12);

    // Create offline context for rendering
    const duration = audioBuffer.duration / playbackRate;
    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        duration * audioContext.sampleRate,
        audioContext.sampleRate
    );

    // Create source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // Apply playback rate for speed and pitch
    source.playbackRate.value = playbackRate * pitchRatio;

    // Create a simple low-pass filter to reduce artifacts
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000; // Preserve clarity for speech

    // Connect nodes
    source.connect(filter);
    filter.connect(offlineContext.destination);

    // Start source
    source.start(0);

    // Render audio
    const renderedBuffer = await offlineContext.startRendering();

    // Convert back to blob
    const wavBlob = await audioBufferToWav(renderedBuffer);

    return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 * @param {AudioBuffer} audioBuffer - Audio buffer to convert
 * @returns {Promise<Blob>} WAV blob
 */
async function audioBufferToWav(audioBuffer) {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    // Write WAV header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // Write interleaved data
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
    }

    while (pos < length - 44) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([buffer], { type: 'audio/wav' });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}

/**
 * Preview voice transformation
 */
previewTransformBtn.addEventListener('click', async () => {
    if (!originalAudioBlob) {
        alert('Please record audio first!');
        return;
    }

    try {
        previewTransformBtn.disabled = true;
        previewTransformBtn.textContent = '⏳ Processing...';

        const pitchShift = parseFloat(pitchSlider.value);
        const playbackRate = parseFloat(speedSlider.value);

        // Transform audio
        transformedAudioBlob = await transformAudio(originalAudioBlob, pitchShift, playbackRate);

        // Create URL and play preview
        const transformedUrl = URL.createObjectURL(transformedAudioBlob);
        transformedAudio.src = transformedUrl;
        transformedAudioContainer.style.display = 'block';
        transformedAudio.play();

        previewTransformBtn.textContent = '🎧 Preview Transform';
        previewTransformBtn.disabled = false;

        recordingStatus.textContent = '✅ Preview ready! Compare original vs transformed audio';
        recordingStatus.classList.add('active');
        setTimeout(() => {
            recordingStatus.classList.remove('active');
        }, 3000);

    } catch (error) {
        console.error('Transformation error:', error);
        alert('Error transforming audio. Please try again.');
        previewTransformBtn.textContent = '🎧 Preview Transform';
        previewTransformBtn.disabled = false;
    }
});

/**
 * Apply and download transformed voice
 */
applyTransformBtn.addEventListener('click', async () => {
    if (!originalAudioBlob) {
        alert('Please record audio first!');
        return;
    }

    try {
        applyTransformBtn.disabled = true;
        applyTransformBtn.textContent = '⏳ Processing...';

        const pitchShift = parseFloat(pitchSlider.value);
        const playbackRate = parseFloat(speedSlider.value);

        // Transform audio if not already transformed
        if (!transformedAudioBlob) {
            transformedAudioBlob = await transformAudio(originalAudioBlob, pitchShift, playbackRate);
            const transformedUrl = URL.createObjectURL(transformedAudioBlob);
            transformedAudio.src = transformedUrl;
            transformedAudioContainer.style.display = 'block';
        }

        // Get the active preset name for filename
        const activePreset = document.querySelector('.preset-btn.active');
        const presetName = activePreset ? activePreset.dataset.preset : 'custom';

        // Download the transformed audio file
        const transformedUrl = transformedAudio.src;
        const link = document.createElement('a');
        link.href = transformedUrl;
        link.download = `voice-anonymized-${presetName}-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update status
        recordingStatus.textContent = `✅ Voice anonymized as "${presetName}" and downloaded to your computer!`;
        recordingStatus.classList.add('active');

        applyTransformBtn.textContent = '✅ Downloaded';

        setTimeout(() => {
            applyTransformBtn.textContent = '✅ Apply & Download';
            applyTransformBtn.disabled = false;
            recordingStatus.classList.remove('active');
        }, 3000);

    } catch (error) {
        console.error('Apply transformation error:', error);
        alert('Error applying transformation. Please try again.');
        applyTransformBtn.textContent = '✅ Apply & Download';
        applyTransformBtn.disabled = false;
    }
});

/**
 * Download transformed audio button handler
 */
downloadTransformedBtn.addEventListener('click', () => {
    if (!transformedAudioBlob) {
        alert('Please preview the transformation first!');
        return;
    }

    // Get the active preset name for filename
    const activePreset = document.querySelector('.preset-btn.active');
    const presetName = activePreset ? activePreset.dataset.preset : 'custom';

    // Download the transformed audio file
    const transformedUrl = transformedAudio.src;
    const link = document.createElement('a');
    link.href = transformedUrl;
    link.download = `voice-anonymized-${presetName}-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Update status
    recordingStatus.textContent = `💾 Downloaded as "${presetName}" voice`;
    recordingStatus.classList.add('active');
    setTimeout(() => {
        recordingStatus.classList.remove('active');
    }, 2000);
});

// Profile page script for sending anonymous voice messages

const API_BASE = '';  // Same origin

// Get profile link from URL
const profileLink = window.location.pathname.split('/').pop();

// DOM elements
const profileName = document.getElementById('profileName');
const profileBio = document.getElementById('profileBio');
const recordBtn = document.getElementById('recordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const audioPreview = document.getElementById('audioPreview');
const recordedAudio = document.getElementById('recordedAudio');
const voiceTransformSection = document.getElementById('voiceTransformSection');
const transformedAudioContainer = document.getElementById('transformedAudioContainer');
const transformedAudio = document.getElementById('transformedAudio');
const sendBtn = document.getElementById('sendBtn');
const successMessage = document.getElementById('successMessage');
const anotherBtn = document.getElementById('anotherBtn');
const recordingSection = document.querySelector('.recording-section');

// Recording variables
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let originalAudioBlob = null;
let transformedAudioBlob = null;
let currentPreset = 'original';

// Voice transformation elements
const pitchSlider = document.getElementById('pitchSlider');
const speedSlider = document.getElementById('speedSlider');
const pitchValue = document.getElementById('pitchValue');
const speedValue = document.getElementById('speedValue');
const previewTransformBtn = document.getElementById('previewTransformBtn');
const presetButtons = document.querySelectorAll('.preset-btn');

// Voice presets configuration
const voicePresets = {
    'original': { pitch: 0, speed: 1.0 },
    'deep-male': { pitch: -4, speed: 0.95 },
    'male': { pitch: -2, speed: 1.0 },
    'female': { pitch: 4, speed: 1.05 },
    'high-female': { pitch: 6, speed: 1.1 },
    'robotic': { pitch: -1, speed: 0.9 }
};

// Load user profile
async function loadProfile() {
    try {
        const response = await fetch(`/api/profile/${profileLink}`);
        const data = await response.json();

        if (data.success) {
            profileName.textContent = data.user.full_name;
            profileBio.textContent = data.user.bio || 'Send me an anonymous voice message!';
        } else {
            profileName.textContent = 'User Not Found';
            profileBio.textContent = 'This profile link is invalid.';
            recordingSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        profileName.textContent = 'Error Loading Profile';
    }
}

// Initialize
loadProfile();

// Record button handler
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        await startRecording();
    } else {
        stopRecording();
    }
});

// Start recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            originalAudioBlob = audioBlob;

            recordedAudio.src = audioUrl;
            audioPreview.classList.add('visible');
            voiceTransformSection.classList.add('visible');

            audioChunks = [];
        };

        mediaRecorder.start();
        isRecording = true;

        recordBtn.classList.add('recording');
        recordingStatus.textContent = '🔴 Recording... Click to stop';
        recordingStatus.classList.add('active');

    } catch (error) {
        recordingStatus.textContent = '❌ Microphone access denied';
        recordingStatus.classList.remove('active');
        console.error('Error accessing microphone:', error);
    }
}

// Stop recording
function stopRecording() {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());

    isRecording = false;

    recordBtn.classList.remove('recording');
    recordingStatus.textContent = '✅ Recording saved! Anonymize and send';
    recordingStatus.classList.remove('active');
}

// Preset button handlers
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const presetName = btn.dataset.preset;
        currentPreset = presetName;
        const preset = voicePresets[presetName];

        pitchSlider.value = preset.pitch;
        speedSlider.value = preset.speed;
        pitchValue.textContent = preset.pitch;
        speedValue.textContent = preset.speed.toFixed(1) + 'x';
    });
});

// Slider handlers
pitchSlider.addEventListener('input', () => {
    pitchValue.textContent = pitchSlider.value;
    currentPreset = 'custom';
});

speedSlider.addEventListener('input', () => {
    speedValue.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
    currentPreset = 'custom';
});

// Preview transformation
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

        transformedAudioBlob = await transformAudio(originalAudioBlob, pitchShift, playbackRate);

        const transformedUrl = URL.createObjectURL(transformedAudioBlob);
        transformedAudio.src = transformedUrl;
        transformedAudioContainer.style.display = 'block';
        transformedAudio.play();

        previewTransformBtn.textContent = '🎧 Preview';
        previewTransformBtn.disabled = false;

        recordingStatus.textContent = '✅ Preview ready! Compare both versions';
        recordingStatus.classList.add('active');
        setTimeout(() => {
            recordingStatus.classList.remove('active');
        }, 3000);

    } catch (error) {
        console.error('Transformation error:', error);
        alert('Error transforming audio. Please try again.');
        previewTransformBtn.textContent = '🎧 Preview';
        previewTransformBtn.disabled = false;
    }
});

// Transform audio function (from script.js)
async function transformAudio(audioBlob, pitchShift, playbackRate) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const pitchRatio = Math.pow(2, pitchShift / 12);
    const duration = audioBuffer.duration / playbackRate;
    const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        duration * audioContext.sampleRate,
        audioContext.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRate * pitchRatio;

    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);

    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = await audioBufferToWav(renderedBuffer);

    return wavBlob;
}

// Convert AudioBuffer to WAV
async function audioBufferToWav(audioBuffer) {
    const numOfChan = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(audioBuffer.sampleRate);
    setUint32(audioBuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

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

// Send message
sendBtn.addEventListener('click', async () => {
    if (!originalAudioBlob) {
        alert('Please record a voice message first!');
        return;
    }

    try {
        sendBtn.disabled = true;
        sendBtn.textContent = '📤 Sending...';

        // Use transformed audio if available, otherwise original
        const audioToSend = transformedAudioBlob || originalAudioBlob;

        // Convert blob to base64
        const base64Audio = await blobToBase64(audioToSend);

        // Get audio duration
        const duration = await getAudioDuration(audioToSend);

        // Send to server
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient_profile: profileLink,
                audio_data: base64Audio,
                transformation_type: currentPreset,
                pitch_shift: parseFloat(pitchSlider.value),
                speed_rate: parseFloat(speedSlider.value),
                duration: duration
            })
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            recordingSection.style.display = 'none';
            successMessage.style.display = 'block';
        } else {
            alert('Error sending message: ' + data.error);
            sendBtn.disabled = false;
            sendBtn.textContent = '📤 Send Anonymous Message';
        }

    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
        sendBtn.disabled = false;
        sendBtn.textContent = '📤 Send Anonymous Message';
    }
});

// Send another message
anotherBtn.addEventListener('click', () => {
    window.location.reload();
});

// Helper function: Convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Helper function: Get audio duration
function getAudioDuration(blob) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => {
            resolve(audio.duration);
        };
        audio.src = URL.createObjectURL(blob);
    });
}

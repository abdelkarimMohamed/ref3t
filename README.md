# 🎙️ Anonymous Voice Messaging App

A Saraha-like web application for sending and receiving anonymous voice messages with voice anonymization. Users share a profile link, and others can send them anonymous voice messages with transformed voices.

## ✨ Features

- 🔐 User authentication (signup/login)
- 🎤 Browser-based voice recording
- 🎭 Voice anonymization with 6 presets + manual controls
- 📬 Personal inbox for received messages
- ⭐ Favorite and manage messages
- 🔗 Shareable profile links
- 📊 Message statistics dashboard

## 🏗️ Tech Stack

- **Backend**: Python (http.server, no framework)
- **Database**: SQLite
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Audio**: Web Audio API

## 🚀 Quick Start

### Prerequisites
- Python 3.6+
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# 1. Clone or download the repository
cd ref3t

# 2. Initialize database
python3 database.py

# 3. Start server
python3 server.py
# Or use: ./start.sh

# 4. Open browser
# Go to: http://localhost:4000
```

## 📖 Usage

### For Profile Owners (Recipients)

1. **Sign up**: Go to `/signup.html`
2. **Get your link**: After signup, copy your profile link from inbox
   - Example: `http://localhost:4000/profile/john-abc123`
3. **Share it**: Post on social media or share with anyone
4. **View messages**: Check `/inbox.html` for received messages

### For Senders (Anonymous)

1. **Visit profile**: Open someone's profile link
2. **Record**: Click microphone, speak your message
3. **Transform** (optional): Choose voice preset or adjust pitch/speed
4. **Send**: Click "Send Anonymous Message"

## 📁 Project Structure

```
ref3t/
├── database.py              # Database layer
├── server.py                # HTTP server
├── index.html               # Landing page
├── login.html               # Login
├── signup.html              # Registration
├── profile.html             # Send messages
├── inbox.html               # View messages
├── auth.js                  # Authentication
├── script.js                # Main logic
├── profile-script.js        # Profile logic
├── inbox-script.js          # Inbox logic
├── *.css                    # Stylesheets
├── voice_messages.db        # SQLite database (auto-created)
├── uploads/                 # Audio files (auto-created)
└── start.sh                 # Startup script
```

## 🎯 How It Works

### Voice Transformation
1. Records audio using Web Audio API
2. Applies pitch shifting (-12 to +12 semitones)
3. Adjusts playback speed (0.7x to 1.3x)
4. Uses low-pass filter at 3000Hz for clarity
5. Converts to WAV format

### Database Schema

**users**: id, email, password_hash, full_name, profile_link, bio, created_at

**recordings**: id, sender_id, recipient_id, audio_file_path, transformation_type, pitch_shift, speed_rate, is_read, is_favorite, created_at

**sessions**: id, user_id, token, expires_at, created_at

## 🔧 API Endpoints

### Authentication
- `POST /api/signup` - Register user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `GET /api/me` - Get current user

### Messages
- `POST /api/upload` - Upload voice message
- `GET /api/recordings/inbox` - Get inbox
- `GET /api/recordings/favorites` - Get favorites
- `GET /api/recordings/sent` - Get sent messages
- `GET /api/audio/:id` - Stream audio file
- `POST /api/recordings/:id/read` - Mark as read
- `POST /api/recordings/:id/favorite` - Toggle favorite
- `DELETE /api/recordings/:id` - Delete message

### Profile
- `GET /api/profile/:link` - Get user profile
- `GET /api/stats` - Get user statistics

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 4000 is in use
lsof -ti:4000 | xargs kill -9

# Or change port in server.py (line 435)
```

### Microphone not working
- Grant browser permission for microphone
- Use HTTPS or localhost (required for `getUserMedia`)
- Check browser console for errors

### Audio won't play
- Restart server after updates
- Clear browser cache (Ctrl+Shift+R)
- Check browser console for auth errors
- Verify file exists: `ls uploads/`

### Database issues
```bash
# Reset database (deletes all data)
rm voice_messages.db
python3 database.py
```

## 🔒 Security Notes

**Current Implementation:**
- Password hashing (SHA-256)
- Session tokens (30-day expiry)
- Anonymous sender support

**For Production:**
- Use bcrypt/argon2 for passwords
- Enable HTTPS/SSL
- Add rate limiting
- Implement CSRF protection
- Migrate to PostgreSQL
- Use cloud storage for audio files

## 📝 Testing

```bash
# 1. Create account at /signup.html
# 2. Copy profile link from inbox
# 3. Open profile link in incognito window
# 4. Record and send a message
# 5. Check inbox for the message

# Verify database
sqlite3 voice_messages.db "SELECT COUNT(*) FROM recordings;"
sqlite3 voice_messages.db "SELECT * FROM users;"

# Check uploads
ls -lh uploads/
```

## 🌟 Voice Presets

- **Original** - No transformation
- **Deep Male** - Lower pitch (-4 semitones, 0.95x speed)
- **Male** - Moderate male voice (-2 semitones)
- **Female** - Higher pitch (+4 semitones, 1.05x speed)
- **High Female** - Very high pitch (+6 semitones, 1.1x speed)
- **Robotic** - Mechanical effect (-1 semitone, 0.9x speed)

## 🤝 Contributing

This is a personal/educational project. Feel free to fork and modify.

## 📄 License

For educational purposes.

---

**Built with Python, SQLite, and vanilla JavaScript** • **No frameworks required** • **Ready to run!** 🚀

"""
Database setup and management for voice messaging app
Uses SQLite for local development
"""

import sqlite3
import hashlib
import secrets
from datetime import datetime
import os


class Database:
    def __init__(self, db_path='voice_messages.db'):
        self.db_path = db_path
        self.init_database()

    def get_connection(self):
        """Create and return database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn

    def init_database(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                profile_link TEXT UNIQUE NOT NULL,
                bio TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Recordings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recordings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER,
                recipient_id INTEGER NOT NULL,
                audio_file_path TEXT NOT NULL,
                audio_file_size INTEGER NOT NULL,
                duration_seconds REAL,
                transformation_type TEXT DEFAULT 'original',
                pitch_shift REAL DEFAULT 0,
                speed_rate REAL DEFAULT 1.0,
                is_read BOOLEAN DEFAULT 0,
                is_favorite BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Sessions table for authentication tokens
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')

        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_profile_link ON users(profile_link)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recordings_recipient ON recordings(recipient_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recordings_sender ON recordings(sender_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)')

        conn.commit()
        conn.close()

    def hash_password(self, password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def generate_profile_link(self, email):
        """Generate unique profile link from email"""
        # Use first part of email + random string
        base = email.split('@')[0].lower().replace('.', '').replace('_', '')
        random_suffix = secrets.token_hex(4)
        return f"{base}-{random_suffix}"

    def create_user(self, email, password, full_name):
        """Create a new user"""
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            password_hash = self.hash_password(password)
            profile_link = self.generate_profile_link(email)

            cursor.execute('''
                INSERT INTO users (email, password_hash, full_name, profile_link)
                VALUES (?, ?, ?, ?)
            ''', (email, password_hash, full_name, profile_link))

            conn.commit()
            user_id = cursor.lastrowid

            # Return user data
            cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            user = dict(cursor.fetchone())
            conn.close()

            # Remove password hash from response
            del user['password_hash']
            return {'success': True, 'user': user}

        except sqlite3.IntegrityError as e:
            conn.close()
            if 'email' in str(e):
                return {'success': False, 'error': 'Email already exists'}
            elif 'profile_link' in str(e):
                # Retry with different profile link
                return self.create_user(email, password, full_name)
            else:
                return {'success': False, 'error': str(e)}

    def authenticate_user(self, email, password):
        """Authenticate user and return user data"""
        conn = self.get_connection()
        cursor = conn.cursor()

        password_hash = self.hash_password(password)

        cursor.execute('''
            SELECT * FROM users
            WHERE email = ? AND password_hash = ?
        ''', (email, password_hash))

        user = cursor.fetchone()
        conn.close()

        if user:
            user_dict = dict(user)
            del user_dict['password_hash']
            return {'success': True, 'user': user_dict}
        else:
            return {'success': False, 'error': 'Invalid email or password'}

    def get_user_by_profile_link(self, profile_link):
        """Get user by their profile link"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE profile_link = ?', (profile_link,))
        user = cursor.fetchone()
        conn.close()

        if user:
            user_dict = dict(user)
            del user_dict['password_hash']
            return {'success': True, 'user': user_dict}
        else:
            return {'success': False, 'error': 'User not found'}

    def get_user_by_id(self, user_id):
        """Get user by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        conn.close()

        if user:
            user_dict = dict(user)
            del user_dict['password_hash']
            return {'success': True, 'user': user_dict}
        else:
            return {'success': False, 'error': 'User not found'}

    def create_session(self, user_id):
        """Create session token for user"""
        conn = self.get_connection()
        cursor = conn.cursor()

        token = secrets.token_urlsafe(32)
        # Token expires in 30 days
        expires_at = datetime.now().timestamp() + (30 * 24 * 60 * 60)

        cursor.execute('''
            INSERT INTO sessions (user_id, token, expires_at)
            VALUES (?, ?, datetime(?, 'unixepoch'))
        ''', (user_id, token, expires_at))

        conn.commit()
        conn.close()

        return token

    def validate_session(self, token):
        """Validate session token and return user_id"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id FROM sessions
            WHERE token = ? AND expires_at > datetime('now')
        ''', (token,))

        result = cursor.fetchone()
        conn.close()

        if result:
            return {'success': True, 'user_id': result['user_id']}
        else:
            return {'success': False, 'error': 'Invalid or expired token'}

    def delete_session(self, token):
        """Delete session (logout)"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('DELETE FROM sessions WHERE token = ?', (token,))
        conn.commit()
        conn.close()

        return {'success': True}

    def save_recording(self, sender_id, recipient_id, audio_file_path,
                      file_size, duration, transformation_type='original',
                      pitch_shift=0, speed_rate=1.0):
        """Save a new voice recording"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO recordings (
                sender_id, recipient_id, audio_file_path, audio_file_size,
                duration_seconds, transformation_type, pitch_shift, speed_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (sender_id, recipient_id, audio_file_path, file_size,
              duration, transformation_type, pitch_shift, speed_rate))

        conn.commit()
        recording_id = cursor.lastrowid
        conn.close()

        return {'success': True, 'recording_id': recording_id}

    def get_user_recordings(self, user_id, recording_type='inbox'):
        """Get recordings for a user (inbox, sent, favorites)"""
        conn = self.get_connection()
        cursor = conn.cursor()

        if recording_type == 'inbox':
            query = '''
                SELECT r.*, u.full_name as sender_name, u.email as sender_email
                FROM recordings r
                LEFT JOIN users u ON r.sender_id = u.id
                WHERE r.recipient_id = ?
                ORDER BY r.created_at DESC
            '''
            cursor.execute(query, (user_id,))

        elif recording_type == 'sent':
            query = '''
                SELECT r.*, u.full_name as recipient_name, u.email as recipient_email
                FROM recordings r
                JOIN users u ON r.recipient_id = u.id
                WHERE r.sender_id = ?
                ORDER BY r.created_at DESC
            '''
            cursor.execute(query, (user_id,))

        elif recording_type == 'favorites':
            query = '''
                SELECT r.*, u.full_name as sender_name, u.email as sender_email
                FROM recordings r
                LEFT JOIN users u ON r.sender_id = u.id
                WHERE r.recipient_id = ? AND r.is_favorite = 1
                ORDER BY r.created_at DESC
            '''
            cursor.execute(query, (user_id,))

        recordings = [dict(row) for row in cursor.fetchall()]
        conn.close()

        return {'success': True, 'recordings': recordings}

    def mark_as_read(self, recording_id, user_id):
        """Mark recording as read"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE recordings
            SET is_read = 1
            WHERE id = ? AND recipient_id = ?
        ''', (recording_id, user_id))

        conn.commit()
        conn.close()

        return {'success': True}

    def toggle_favorite(self, recording_id, user_id):
        """Toggle favorite status"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            UPDATE recordings
            SET is_favorite = NOT is_favorite
            WHERE id = ? AND recipient_id = ?
        ''', (recording_id, user_id))

        conn.commit()
        conn.close()

        return {'success': True}

    def delete_recording(self, recording_id, user_id):
        """Delete a recording"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get file path before deleting
        cursor.execute('''
            SELECT audio_file_path FROM recordings
            WHERE id = ? AND recipient_id = ?
        ''', (recording_id, user_id))

        result = cursor.fetchone()

        if result:
            file_path = result['audio_file_path']

            # Delete from database
            cursor.execute('''
                DELETE FROM recordings
                WHERE id = ? AND recipient_id = ?
            ''', (recording_id, user_id))

            conn.commit()
            conn.close()

            # Delete file from filesystem
            if os.path.exists(file_path):
                os.remove(file_path)

            return {'success': True}
        else:
            conn.close()
            return {'success': False, 'error': 'Recording not found'}

    def get_user_stats(self, user_id):
        """Get user statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Count messages
        cursor.execute('''
            SELECT COUNT(*) as count FROM recordings WHERE recipient_id = ?
        ''', (user_id,))
        messages_count = cursor.fetchone()['count']

        # Count sent
        cursor.execute('''
            SELECT COUNT(*) as count FROM recordings WHERE sender_id = ?
        ''', (user_id,))
        sent_count = cursor.fetchone()['count']

        # Count favorites
        cursor.execute('''
            SELECT COUNT(*) as count FROM recordings
            WHERE recipient_id = ? AND is_favorite = 1
        ''', (user_id,))
        favorites_count = cursor.fetchone()['count']

        # Count unread
        cursor.execute('''
            SELECT COUNT(*) as count FROM recordings
            WHERE recipient_id = ? AND is_read = 0
        ''', (user_id,))
        unread_count = cursor.fetchone()['count']

        conn.close()

        return {
            'success': True,
            'stats': {
                'messages': messages_count,
                'sent': sent_count,
                'favorites': favorites_count,
                'unread': unread_count
            }
        }


# Test the database
if __name__ == '__main__':
    db = Database()
    print("Database initialized successfully!")

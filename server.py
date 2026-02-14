"""
Simple HTTP server for voice messaging app
No framework required - uses built-in http.server
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import mimetypes
import urllib.parse
from database import Database
import base64
from datetime import datetime


class VoiceMessageHandler(BaseHTTPRequestHandler):
    """Handle HTTP requests for voice messaging API"""

    db = Database()
    UPLOADS_DIR = 'uploads'

    def __init__(self, *args, **kwargs):
        # Create uploads directory if it doesn't exist
        os.makedirs(self.UPLOADS_DIR, exist_ok=True)
        super().__init__(*args, **kwargs)

    def _set_headers(self, content_type='application/json', status=200):
        """Set response headers"""
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _send_json(self, data, status=200):
        """Send JSON response"""
        self._set_headers('application/json', status)
        self.wfile.write(json.dumps(data).encode())

    def _send_error(self, message, status=400):
        """Send error response"""
        self._send_json({'success': False, 'error': message}, status)

    def _get_post_data(self):
        """Get POST data as dictionary"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}

        post_data = self.rfile.read(content_length)
        content_type = self.headers.get('Content-Type', '')

        if 'application/json' in content_type:
            return json.loads(post_data.decode())
        else:
            # Parse multipart form data or URL-encoded
            return json.loads(post_data.decode())

    def _get_auth_token(self):
        """Extract auth token from Authorization header"""
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:]
        return None

    def _validate_auth(self):
        """Validate authentication token"""
        token = self._get_auth_token()
        if not token:
            return None

        result = self.db.validate_session(token)
        if result['success']:
            return result['user_id']
        return None

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self._set_headers()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        # Serve static files
        if path == '/' or path == '/index.html':
            self._serve_file('index.html')
        elif path == '/login.html':
            self._serve_file('login.html')
        elif path == '/signup.html':
            self._serve_file('signup.html')
        elif path == '/inbox.html':
            self._serve_file('inbox.html')
        elif path == '/profile.html':
            self._serve_file('profile.html')
        elif path.endswith('.css'):
            self._serve_file(path[1:])
        elif path.endswith('.js'):
            self._serve_file(path[1:])
        elif path.endswith('.jpg') or path.endswith('.png'):
            self._serve_file(path[1:])

        # API endpoints
        elif path == '/api/me':
            self._handle_get_current_user()
        elif path.startswith('/api/profile/'):
            profile_link = path.split('/')[-1]
            self._handle_get_profile(profile_link)
        elif path == '/api/recordings/inbox':
            self._handle_get_recordings('inbox')
        elif path == '/api/recordings/sent':
            self._handle_get_recordings('sent')
        elif path == '/api/recordings/favorites':
            self._handle_get_recordings('favorites')
        elif path == '/api/stats':
            self._handle_get_stats()
        elif path.startswith('/api/audio/'):
            recording_id = path.split('/')[-1]
            self._handle_get_audio(recording_id)
        elif path.startswith('/profile/'):
            # Serve profile page
            self._serve_profile_page(path.split('/')[-1])
        else:
            self._send_error('Not found', 404)

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path == '/api/signup':
            self._handle_signup()
        elif path == '/api/login':
            self._handle_login()
        elif path == '/api/logout':
            self._handle_logout()
        elif path == '/api/upload':
            self._handle_upload_recording()
        elif path.startswith('/api/recordings/') and path.endswith('/read'):
            recording_id = path.split('/')[-2]
            self._handle_mark_as_read(recording_id)
        elif path.startswith('/api/recordings/') and path.endswith('/favorite'):
            recording_id = path.split('/')[-2]
            self._handle_toggle_favorite(recording_id)
        else:
            self._send_error('Not found', 404)

    def do_DELETE(self):
        """Handle DELETE requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path

        if path.startswith('/api/recordings/'):
            recording_id = path.split('/')[-1]
            self._handle_delete_recording(recording_id)
        else:
            self._send_error('Not found', 404)

    def _serve_file(self, filename):
        """Serve static file"""
        try:
            if not os.path.exists(filename):
                self._send_error('File not found', 404)
                return

            # Get MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            if mime_type is None:
                mime_type = 'application/octet-stream'

            # Read and serve file
            with open(filename, 'rb') as f:
                content = f.read()

            self._set_headers(mime_type)
            self.wfile.write(content)

        except Exception as e:
            self._send_error(str(e), 500)

    def _serve_profile_page(self, profile_link):
        """Serve user profile page"""
        # Check if user exists
        result = self.db.get_user_by_profile_link(profile_link)

        if not result['success']:
            self._send_error('User not found', 404)
            return

        # Serve profile.html (we'll create this)
        self._serve_file('profile.html')

    # ===== AUTH HANDLERS =====

    def _handle_signup(self):
        """Handle user registration"""
        try:
            data = self._get_post_data()
            email = data.get('email')
            password = data.get('password')
            full_name = data.get('full_name')

            if not all([email, password, full_name]):
                self._send_error('Missing required fields', 400)
                return

            result = self.db.create_user(email, password, full_name)

            if result['success']:
                # Create session token
                token = self.db.create_session(result['user']['id'])
                result['token'] = token
                self._send_json(result, 201)
            else:
                self._send_error(result['error'], 400)

        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_login(self):
        """Handle user login"""
        try:
            data = self._get_post_data()
            email = data.get('email')
            password = data.get('password')

            if not all([email, password]):
                self._send_error('Missing email or password', 400)
                return

            result = self.db.authenticate_user(email, password)

            if result['success']:
                # Create session token
                token = self.db.create_session(result['user']['id'])
                result['token'] = token
                self._send_json(result)
            else:
                self._send_error(result['error'], 401)

        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_logout(self):
        """Handle user logout"""
        try:
            token = self._get_auth_token()
            if token:
                self.db.delete_session(token)

            self._send_json({'success': True, 'message': 'Logged out successfully'})

        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_get_current_user(self):
        """Get current authenticated user"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.get_user_by_id(user_id)
        self._send_json(result)

    def _handle_get_profile(self, profile_link):
        """Get user profile by profile link"""
        result = self.db.get_user_by_profile_link(profile_link)
        if result['success']:
            # Return only public info
            user = result['user']
            public_user = {
                'full_name': user['full_name'],
                'bio': user['bio'],
                'profile_link': user['profile_link']
            }
            self._send_json({'success': True, 'user': public_user})
        else:
            self._send_error(result['error'], 404)

    # ===== RECORDING HANDLERS =====

    def _handle_upload_recording(self):
        """Handle voice recording upload"""
        try:
            # Parse multipart form data
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            # Simple JSON approach for now
            data = json.loads(post_data.decode())

            recipient_profile = data.get('recipient_profile')
            audio_base64 = data.get('audio_data')
            transformation_type = data.get('transformation_type', 'original')
            pitch_shift = data.get('pitch_shift', 0)
            speed_rate = data.get('speed_rate', 1.0)
            duration = data.get('duration', 0)

            if not all([recipient_profile, audio_base64]):
                self._send_error('Missing required fields', 400)
                return

            # Get recipient user
            recipient_result = self.db.get_user_by_profile_link(recipient_profile)
            if not recipient_result['success']:
                self._send_error('Recipient not found', 404)
                return

            recipient_id = recipient_result['user']['id']

            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)

            # Save audio file
            timestamp = int(datetime.now().timestamp() * 1000)
            filename = f"recording_{recipient_id}_{timestamp}.wav"
            file_path = os.path.join(self.UPLOADS_DIR, filename)

            with open(file_path, 'wb') as f:
                f.write(audio_data)

            file_size = len(audio_data)

            # Save to database (sender_id is None for anonymous)
            result = self.db.save_recording(
                sender_id=None,
                recipient_id=recipient_id,
                audio_file_path=file_path,
                file_size=file_size,
                duration=duration,
                transformation_type=transformation_type,
                pitch_shift=pitch_shift,
                speed_rate=speed_rate
            )

            self._send_json(result, 201)

        except Exception as e:
            self._send_error(str(e), 500)

    def _handle_get_recordings(self, recording_type):
        """Get user recordings (inbox/sent/favorites)"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.get_user_recordings(user_id, recording_type)
        self._send_json(result)

    def _handle_get_audio(self, recording_id):
        """Stream audio file"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        # Get recording directly from database to verify access
        conn = self.db.get_connection()
        cursor = conn.cursor()

        # Check if user is either recipient or sender
        cursor.execute('''
            SELECT audio_file_path
            FROM recordings
            WHERE id = ? AND (recipient_id = ? OR sender_id = ?)
        ''', (int(recording_id), user_id, user_id))

        result = cursor.fetchone()
        conn.close()

        if not result:
            self._send_error('Recording not found or access denied', 404)
            return

        file_path = result['audio_file_path']

        # Serve audio file
        if not os.path.exists(file_path):
            self._send_error('Audio file not found on server', 404)
            return

        with open(file_path, 'rb') as f:
            audio_data = f.read()

        self._set_headers('audio/wav')
        self.wfile.write(audio_data)

    def _handle_mark_as_read(self, recording_id):
        """Mark recording as read"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.mark_as_read(int(recording_id), user_id)
        self._send_json(result)

    def _handle_toggle_favorite(self, recording_id):
        """Toggle favorite status"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.toggle_favorite(int(recording_id), user_id)
        self._send_json(result)

    def _handle_delete_recording(self, recording_id):
        """Delete recording"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.delete_recording(int(recording_id), user_id)
        self._send_json(result)

    def _handle_get_stats(self):
        """Get user statistics"""
        user_id = self._validate_auth()

        if not user_id:
            self._send_error('Unauthorized', 401)
            return

        result = self.db.get_user_stats(user_id)
        self._send_json(result)


def run_server(port=4000):
    """Start the HTTP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, VoiceMessageHandler)
    print(f'🎙️  Voice Message Server running on http://localhost:{port}')
    print(f'📁 Uploads directory: {VoiceMessageHandler.UPLOADS_DIR}')
    print(f'🗄️  Database: voice_messages.db')
    print(f'\n✨ Server is ready! Open http://localhost:{port} in your browser\n')
    httpd.serve_forever()


if __name__ == '__main__':
    run_server()

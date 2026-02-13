#!/usr/bin/env bash
set -euo pipefail

# Upload video to YouTube using YouTube Data API v3
# Requires OAuth2 credentials

usage() {
  cat >&2 <<'EOF'
Usage: upload-youtube.sh <video_file> <title> [description] [tags]

Uploads a video to YouTube using YouTube Data API v3.

Required environment variables:
  YOUTUBE_CLIENT_ID       OAuth2 client ID
  YOUTUBE_CLIENT_SECRET   OAuth2 client secret
  YOUTUBE_REFRESH_TOKEN   OAuth2 refresh token

To obtain credentials:
1. Go to https://console.cloud.google.com/
2. Create a project and enable YouTube Data API v3
3. Create OAuth2 credentials
4. Use OAuth2 flow to get refresh token
EOF
  exit 2
}

if [[ "${1:-}" == "" || "${2:-}" == "" ]]; then
  usage
fi

VIDEO_FILE="${1:-}"
TITLE="${2:-}"
DESCRIPTION="${3:-YouTube Short created with OpenClaw}"
TAGS="${4:-shorts,openclaw}"

if [[ ! -f "$VIDEO_FILE" ]]; then
  echo "Error: Video file not found: $VIDEO_FILE" >&2
  exit 1
fi

# Check for required environment variables
if [[ -z "${YOUTUBE_CLIENT_ID:-}" ]] || [[ -z "${YOUTUBE_CLIENT_SECRET:-}" ]]; then
  echo "Error: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set" >&2
  echo ""
  usage
  exit 1
fi

# Check for Python (needed for YouTube API)
if ! command -v python3 &> /dev/null; then
  echo "Error: python3 not found. YouTube upload requires Python." >&2
  echo "Install Python or skip upload with --no-upload flag" >&2
  exit 1
fi

# Check if google-api-python-client is installed
if ! python3 -c "import googleapiclient.discovery" 2>/dev/null; then
  echo "Installing required Python packages..."
  pip3 install --user google-api-python-client google-auth-httplib2 google-auth-oauthlib 2>&1 | grep -v "already satisfied" || true
fi

# Create a temporary Python script for upload
UPLOAD_SCRIPT=$(mktemp)
cat > "$UPLOAD_SCRIPT" <<'PYTHON_SCRIPT'
import os
import sys
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle

SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

def get_authenticated_service():
    client_id = os.environ.get('YOUTUBE_CLIENT_ID')
    client_secret = os.environ.get('YOUTUBE_CLIENT_SECRET')
    refresh_token = os.environ.get('YOUTUBE_REFRESH_TOKEN')
    
    if not all([client_id, client_secret]):
        print("Error: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set", file=sys.stderr)
        sys.exit(1)
    
    # Create credentials dict
    credentials_info = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"]
        }
    }
    
    creds = None
    token_file = os.path.expanduser('~/.openclaw/youtube_token.pickle')
    
    if os.path.exists(token_file):
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        elif refresh_token:
            # Use refresh token to get new access token
            from google.oauth2.credentials import Credentials
            creds = Credentials(
                None,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=client_id,
                client_secret=client_secret
            )
            creds.refresh(Request())
        else:
            print("Error: No valid credentials. Run OAuth flow or set YOUTUBE_REFRESH_TOKEN", file=sys.stderr)
            sys.exit(1)
        
        os.makedirs(os.path.dirname(token_file), exist_ok=True)
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)
    
    return build('youtube', 'v3', credentials=creds)

def upload_video(video_file, title, description, tags):
    youtube = get_authenticated_service()
    
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags.split(',') if tags else [],
            'categoryId': '24'  # Entertainment
        },
        'status': {
            'privacyStatus': 'private',  # Change to 'public' or 'unlisted' as needed
            'selfDeclaredMadeForKids': False
        }
    }
    
    # YouTube Shorts must be marked as such
    body['snippet']['categoryId'] = '24'
    
    media = MediaFileUpload(video_file, chunksize=-1, resumable=True, mimetype='video/mp4')
    
    insert_request = youtube.videos().insert(
        part=','.join(body.keys()),
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = insert_request.next_chunk()
        if status:
            print(f"Upload progress: {int(status.progress() * 100)}%", file=sys.stderr)
    
    if 'id' in response:
        video_id = response['id']
        print(f"https://www.youtube.com/watch?v={video_id}")
        return video_id
    else:
        print(f"Error: Upload failed: {response}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: upload-youtube.py <video_file> <title> [description] [tags]", file=sys.stderr)
        sys.exit(1)
    
    video_file = sys.argv[1]
    title = sys.argv[2]
    description = sys.argv[3] if len(sys.argv) > 3 else "YouTube Short created with OpenClaw"
    tags = sys.argv[4] if len(sys.argv) > 4 else "shorts,openclaw"
    
    upload_video(video_file, title, description, tags)
PYTHON_SCRIPT

# Run the upload script
python3 "$UPLOAD_SCRIPT" "$VIDEO_FILE" "$TITLE" "$DESCRIPTION" "$TAGS"
EXIT_CODE=$?

rm -f "$UPLOAD_SCRIPT"

exit $EXIT_CODE

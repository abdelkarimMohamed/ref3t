#!/bin/bash

# Voice Messaging App - Quick Start Script

echo "🎙️  Starting Voice Messaging App..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.6 or higher."
    exit 1
fi

# Initialize database if it doesn't exist
if [ ! -f "voice_messages.db" ]; then
    echo "📊 Initializing database..."
    python3 database.py
    echo ""
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir uploads
    echo ""
fi

# Start the server
echo "🚀 Starting server..."
echo ""
python3 server.py

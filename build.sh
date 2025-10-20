#!/usr/bin/env bash
# exit on error
set -o errexit

# Install necessary system packages including ffmpeg
apt-get update && apt-get install -y ffmpeg

# Install Python dependencies
pip install -r requirements.txt

# Run database creation (this will be run once on first build)
# Note: For more complex apps, you would use migrations (e.g., Flask-Migrate)
flask --app app shell <<< "from app import db; db.create_all()"

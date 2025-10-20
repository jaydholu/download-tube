from flask import Flask, render_template, request, send_from_directory, redirect, url_for, flash
from apscheduler.schedulers.background import BackgroundScheduler
import os
import time
from audio_video_downloader import download_video


app = Flask(__name__)
app.secret_key = os.urandom(24)


# Background task to clean up old files
def cleanup_old_files():
    """Delete files in downloads folder older than 10 minutes"""
    downloads_dir = 'downloads'

    if not os.path.exists(downloads_dir):
        return

    current_time = time.time()
    ten_minutes = 10 * 60

    for filename in os.listdir(downloads_dir):
        filepath = os.path.join(downloads_dir, filename)

        if not os.path.isfile(filepath):
            continue

        file_creation_time = os.path.getctime(filepath)
        file_age = current_time - file_creation_time

        if file_age > ten_minutes:
            try:
                os.remove(filepath)
                print(f"[Cleanup] Deleted old file: {filename}")
            except Exception as e:
                print(f"[Cleanup] Error deleting {filename}: {str(e)}")


# Initialize APScheduler
scheduler = BackgroundScheduler()
scheduler.add_job(func=cleanup_old_files, trigger="interval", minutes=5)
scheduler.start()

# Shut down scheduler when exiting the app
import atexit

atexit.register(lambda: scheduler.shutdown())


@app.route('/')
@app.route('/home')
@app.route('/download', methods=['GET', 'POST'])
def download():
    if request.method == 'POST':
        url = request.form.get('url')
        format_type = request.form.get('format')

        try:
            filepath, video_title = download_video(url, format=format_type)
            filename = os.path.basename(filepath)

            return render_template('success.html', filename=filename, video_title=video_title)

        except Exception as e:
            error_message = str(e)
            if 'Sign in to confirm' in error_message or 'bot' in error_message.lower():
                flash('YouTube detected automated access. Please try again later or try a different video.', 'error')
            elif 'Video unavailable' in error_message:
                flash('This video is unavailable or has been removed.', 'error')
            else:
                flash(f'Download failed: {error_message}', 'error')

            return redirect(url_for('download'))

    return render_template('download.html')


@app.route('/files/<filename>')
def serve_file(filename):
    downloads_dir = os.path.join(os.getcwd(), 'downloads')
    return send_from_directory(downloads_dir, filename, as_attachment=True)


@app.route('/about')
def about():
    return render_template('about.html')


if __name__ == '__main__':
    app.run(debug=True)

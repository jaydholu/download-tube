import yt_dlp
import os


def download_video(url, format='mp4'):
    """
    Download a YouTube video or extract audio.
    
    Args:
        url (str): YouTube video URL
        format (str): Either 'mp4' for video or 'mp3' for audio
        
    Returns:
        tuple: (filename, video_title) - The filename of the downloaded file and the video title
    """
    # Create downloads directory if it doesn't exist
    downloads_dir = 'downloads'
    os.makedirs(downloads_dir, exist_ok=True)

    # Base options for yt-dlp
    ydl_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        # Add cookies and user agent to avoid bot detection
        'cookiefile': 'cookies.txt',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        # Additional options to bypass restrictions
        'extractor_args': {'youtube': {'player_client': ['android', 'web']}},
        'nocheckcertificate': True,
    }

    # Configure options based on format
    if format == 'mp3':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    else:  # mp4
        ydl_opts.update({
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        })

    # Download the video/audio
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)

        # Get the video title
        video_title = info.get('title', 'Unknown')

        # Get the filename
        if format == 'mp3':
            filename = ydl.prepare_filename(info)
            filename = os.path.splitext(filename)[0] + '.mp3'
        else:
            filename = ydl.prepare_filename(info)

    return filename, video_title

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
    
    downloads_dir = 'downloads'
    os.makedirs(downloads_dir, exist_ok=True)

    ydl_opts = {
        'outtmpl': os.path.join(downloads_dir, '%(title)s.%(ext)s'),
        'cookiefile': 'cookies.txt',
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'nocheckcertificate': True,
    }

    if format == 'mp3':
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        })
    else:
        ydl_opts.update({
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        })

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_title = info.get('title', 'Unknown')

        if format == 'mp3':
            filename = ydl.prepare_filename(info)
            filename = os.path.splitext(filename)[0] + '.mp3'
        else:
            filename = ydl.prepare_filename(info)

    return filename, video_title

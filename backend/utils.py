import re
import asyncio
import subprocess
import shutil

from config import DOWNLOAD_DIR


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '', name)
    name = name.strip('. ')
    return name[:200] if name else 'download'


def cleanup_task_files(task_id: str):
    task_dir = DOWNLOAD_DIR / task_id
    if task_dir.exists():
        shutil.rmtree(task_dir, ignore_errors=True)


async def run_command(cmd: list[str]) -> tuple[bytes, bytes, int]:
    """Run a shell command asynchronously, with threaded fallback for Windows."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        return stdout, stderr, proc.returncode

    except NotImplementedError:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: subprocess.run(cmd, capture_output=True),
        )
        
        return result.stdout, result.stderr, result.returncode

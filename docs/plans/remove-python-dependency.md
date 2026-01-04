# Future: Remove Python Dependency

## Current Architecture
Spotwire uses `spotdl` (Python CLI) which requires:
- Python 3.10+ on user's system
- venv with spotdl + dependencies (~100MB)
- FFmpeg for audio conversion

## Problem
Users must install Python, and Electron's sandboxed environment doesn't inherit PATH properly.

## Alternative: Bundle yt-dlp Binary Directly

Replace spotdl with direct yt-dlp usage in Node.js:

### What spotdl does:
1. Spotify API → get track metadata (title, artist, album, duration)
2. YouTube Music search → find best matching video
3. yt-dlp → download audio stream
4. FFmpeg → convert to mp3 and embed metadata

### Simplified approach:
1. Call Spotify API for track info (already doing this)
2. Search YouTube via `yt-dlp --dump-json "ytsearch:artist song"`
3. Download with `yt-dlp -x --audio-format mp3`
4. Bundle yt-dlp binary (~40MB) - no Python runtime needed

### Tradeoffs:
- **Pros:** No Python install required, simpler deployment
- **Cons:** Less accurate song matching, simpler metadata handling

### Implementation steps:
1. Download yt-dlp binary for macOS (arm64 + x64)
2. Bundle in extraResources
3. Create Node.js wrapper to shell out to yt-dlp
4. Handle Spotify → YouTube matching (basic: "artist - title" search)
5. Remove Python/venv setup code

## Resources
- yt-dlp releases: https://github.com/yt-dlp/yt-dlp/releases
- spotdl source: https://github.com/spotDL/spotify-downloader

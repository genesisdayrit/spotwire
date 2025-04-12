# spotwire

a local interface to help you download your spotify music.

requirements:
- python3 or higher (Python 3.9-3.11 recommended for best compatibility)
- Spotify developer credentials (follow instructions at https://developer.spotify.com/documentation/web-api)

How to use:
1. clone repo using `git clone https://github.com/genesisdayrit/spotwire.git`
2. `cd spotwire` to move into the directory
3. run `python3 -m venv venv` to create a virtual environment in the project that will help us use the spotDL package
4. run `pip install -r requirements.txt` to install requirements
5. `cd electron` and `npm install` to install Electron app requirements
6. Create a `electron/.env` following the template from `electron/.env.example`
7. run `npm start` within `spotwire/electron/` to start the application
8. Inside the application, login to your Spotify account to see your library of playlists
9. Go to settings (the gear button) to set your default download destination
10. You should now be able to download tracks from your Spotify profile onto your computer to your destination of choice. 

## FFmpeg Integration

The application includes a bundled FFmpeg binary that's used for audio conversion, so you don't need to install FFmpeg separately. It will automatically be used when downloading tracks.

## Build Options

The application has two different approaches for running spotdl:

1. **Virtual Environment Method (Current)**: Uses Python virtual environment with spotdl installed.
2. **Compiled Binary Method (Alternative)**: Uses PyInstaller to create a standalone executable (spotdl_runner).

The repository includes files for both approaches, but the current version uses the Virtual Environment Method.

Will slowly improve features over time. Feel free to request anything. Enjoy!

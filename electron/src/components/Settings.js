// src/components/Settings.js
const { useState } = React;
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

function Settings() {
  const [folder, setFolder] = useState(localStorage.getItem('default_downloads_folder') || '');

  async function selectFolder() {
    if (!ipcRenderer) {
      console.error('IPC not available.');
      return;
    }
    try {
      const selectedFolder = await ipcRenderer.invoke('select-download-folder');
      if (selectedFolder) {
        localStorage.setItem('default_downloads_folder', selectedFolder);
        setFolder(selectedFolder);
      }
    } catch (err) {
      console.error('Error selecting folder:', err);
    }
  }

  function clearFolder() {
    localStorage.removeItem('default_downloads_folder');
    setFolder('');
  }

  return (
    // Full-screen, dark background to match #1e293b, centered content
    <div className="min-h-screen bg-[#1e293b] flex items-center justify-center p-4">
      {/* Card container using #2a3344 for consistency with other pages */}
      <div className="w-full max-w-md bg-[#2a3344] rounded-md p-6 text-white">
        {/* Header row */}
        <div className="flex items-center mb-4">
          {/* “Back” button */}
          <button
            className="text-sm text-gray-300 hover:text-gray-100 mr-2"
            onClick={() => window.location.hash = '#profile'}
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold m-0">Settings</h1>
        </div>
        
        {/* Default Downloads Folder section */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Default Downloads Folder</h2>
          <p className="text-sm text-gray-300 mb-4">
            {folder ? folder : "No folder selected."}
          </p>
          <div className="flex flex-wrap gap-2">
            {/* Use your existing .button class for consistency */}
            <button className="button" onClick={selectFolder}>
              Select Downloads Destination
            </button>
            {folder && (
              <button className="button" onClick={clearFolder}>
                Clear Selection
              </button>
            )}
          </div>
          <p className="text-sm text-gray-300 mt-4">
            This folder will be used as the default destination for your downloads.
          </p>
        </div>
      </div>
    </div>
  );
}

// Attach the component to the global object
window.Settings = Settings;


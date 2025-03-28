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
    <div className="min-h-screen bg-[#1e293b] text-white">
      {/* Main content - centered */}
      <div className="container mx-auto px-4 pt-8">
        {/* Header row: back arrow and title on the same line, centered */}
        <div className="flex justify-center items-center mb-8">
          <button 
            onClick={() => window.location.hash = '#profile'} 
            className="mr-4 px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          >
            ←
          </button>
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        {/* Rest of the settings */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold mb-4">Default Downloads Folder</h2>

          <div className="inline-block mb-6 px-4 py-3 bg-[#2a3344] border border-gray-600 rounded-md text-center max-w-lg mx-auto">
            <span className="text-gray-300 break-all">
              {folder || "No folder selected."}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button className="button" onClick={selectFolder}>
              Select Downloads Destination
            </button>
            {folder && (
              <button className="button" onClick={clearFolder}>
                Clear Selection
              </button>
            )}
          </div>

          <p className="mt-4 text-gray-400">
            This folder will be used as the default destination for your downloads.
          </p>
        </div>
      </div>
    </div>
  );
}

// Attach the component to the global object
window.Settings = Settings;


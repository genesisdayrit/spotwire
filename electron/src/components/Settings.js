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
    <div className="settings-container">
      {/* Main content - centered */}
      <div className="settings-main">
        {/* Header row: back arrow and title on the same line, centered */}
        <div className="settings-header-row">
          <button 
            onClick={() => window.location.hash = '#profile'} 
            className="settings-back-button"
          >
            ←
          </button>
          <h1 className="settings-title">Settings</h1>
        </div>

        {/* Rest of the settings */}
        <div className="settings-section">
          <h2 className="settings-section-title">Default Downloads Folder</h2>

          <div className="settings-folder-display">
            <span className="settings-folder-text">
              {folder || "No folder selected."}
            </span>
          </div>

          <div className="settings-buttons-container">
            <button className="button" onClick={selectFolder}>
              Select Downloads Destination
            </button>
            {folder && (
              <button className="button" onClick={clearFolder}>
                Clear Selection
              </button>
            )}
          </div>

          <p className="settings-description">
            This folder will be used as the default destination for your downloads.
          </p>
        </div>
      </div>
    </div>
  );
}

// Attach the component to the global object
window.Settings = Settings;

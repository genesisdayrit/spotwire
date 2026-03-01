// src/components/Settings.js
const { useState } = React;
const { ipcRenderer } = window.require ? window.require('electron') : { ipcRenderer: null };

function Settings() {
  const [folder, setFolder] = useState(localStorage.getItem('default_downloads_folder') || '');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editClientId, setEditClientId] = useState('');
  const [editClientSecret, setEditClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState({ testing: false, success: false, message: '' });

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

  function openCredentialsModal() {
    setEditClientId(localStorage.getItem('spotify_client_id') || '');
    setEditClientSecret(localStorage.getItem('spotify_client_secret') || '');
    setShowSecret(false);
    setTestStatus({ testing: false, success: false, message: '' });
    setShowCredentialsModal(true);
  }

  function closeCredentialsModal() {
    setShowCredentialsModal(false);
  }

  async function testCredentials() {
    if (!ipcRenderer) return;

    setTestStatus({ testing: true, success: false, message: 'Testing credentials...' });

    try {
      const result = await ipcRenderer.invoke('test-spotify-credentials', {
        clientId: editClientId,
        clientSecret: editClientSecret,
        redirectUri: 'spotwire://callback'
      });

      if (result.success) {
        setTestStatus({ testing: false, success: true, message: 'Credentials verified successfully!' });
      } else {
        setTestStatus({ testing: false, success: false, message: `Validation failed: ${result.error}` });
      }
    } catch (error) {
      setTestStatus({ testing: false, success: false, message: `Error: ${error.message}` });
    }
  }

  function saveCredentials() {
    localStorage.setItem('spotify_client_id', editClientId);
    localStorage.setItem('spotify_client_secret', editClientSecret);

    if (ipcRenderer) {
      ipcRenderer.send('set-spotify-credentials', {
        clientId: editClientId,
        clientSecret: editClientSecret,
        redirectUri: 'spotwire://callback'
      });
    }

    setShowCredentialsModal(false);
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

        <div className="settings-section">
          <h2 className="settings-section-title">Spotify Credentials</h2>

          <div className="settings-buttons-container">
            <button className="button" onClick={openCredentialsModal}>
              View Spotify Credentials
            </button>
          </div>

          <p className="settings-description">
            View or update your Spotify API credentials.
          </p>
        </div>
      </div>

      {showCredentialsModal && (
        <div className="custom-dialog-overlay">
          <div className="custom-dialog" style={{ minWidth: '400px' }}>
            <h3>Spotify Credentials</h3>

            <div className="settings-input-group">
              <label>Client ID</label>
              <input
                type="text"
                value={editClientId}
                onChange={e => { setEditClientId(e.target.value); setTestStatus({ testing: false, success: false, message: '' }); }}
                placeholder="Enter your Spotify Client ID"
                className="settings-input"
              />
            </div>

            <div className="settings-input-group">
              <label>Client Secret</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={editClientSecret}
                  onChange={e => { setEditClientSecret(e.target.value); setTestStatus({ testing: false, success: false, message: '' }); }}
                  placeholder="Enter your Spotify Client Secret"
                  className="settings-input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="secondary-button"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {testStatus.message && (
              <div className={`validation-message ${testStatus.testing ? 'neutral-message' : (testStatus.success ? 'valid-message' : 'invalid-message')}`}>
                {testStatus.message}
              </div>
            )}

            <div className="dialog-buttons" style={{ marginTop: '16px' }}>
              <button onClick={closeCredentialsModal} className="secondary-button">
                Cancel
              </button>
              <button
                onClick={testCredentials}
                className="secondary-button"
                disabled={!editClientId || !editClientSecret || testStatus.testing}
              >
                {testStatus.testing ? 'Testing...' : 'Test Credentials'}
              </button>
              {testStatus.success && (
                <button onClick={saveCredentials} className="primary-button">
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Attach the component to the global object
window.Settings = Settings;

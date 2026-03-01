// src/components/DownloadPanel.js
// This component uses the global useDownloads hook (make sure it's exposed via window.useDownloads in index.html)

function DownloadPanel({ onClose }) {
  const { downloads } = window.useDownloads();
  const [errorModal, setErrorModal] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  function copyError(errorText) {
    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="download-panel">
      <h3>Downloads</h3>
      <table>
        <thead>
          <tr>
            <th>Track</th>
            <th>Status</th>
            <th>Started</th>
            <th>Elapsed (s)</th>
          </tr>
        </thead>
        <tbody>
          {downloads.map(dl => (
            <tr key={dl.downloadId}>
              <td>{dl.trackName} - {dl.artist}</td>
              <td>
                {dl.status}
                {dl.status === "Failed" && dl.error && (
                  <span
                    onClick={() => { setErrorModal(dl); setCopied(false); }}
                    style={{ color: '#e74c3c', marginLeft: '5px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    View Error
                  </span>
                )}
              </td>
              <td>{new Date(dl.startTime).toLocaleTimeString()}</td>
              <td>{dl.elapsed ? dl.elapsed : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="button" onClick={onClose}>Close</button>

      {errorModal && (
        <div className="custom-dialog-overlay" onClick={() => setErrorModal(null)}>
          <div className="custom-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h3>Download Error</h3>
            <p style={{ margin: '0 0 8px', color: '#aaa', fontSize: '0.9rem' }}>
              {errorModal.trackName} - {errorModal.artist}
            </p>
            <pre style={{
              background: '#111',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#e74c3c',
              border: '1px solid #333'
            }}>
              {errorModal.error}
            </pre>
            <div className="dialog-buttons" style={{ marginTop: '16px' }}>
              <button className="secondary-button" onClick={() => setErrorModal(null)}>Close</button>
              <button className="primary-button" onClick={() => copyError(errorModal.error)}>
                {copied ? 'Copied!' : 'Copy Error'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DownloadPanel = DownloadPanel;

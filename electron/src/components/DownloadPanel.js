// src/components/DownloadPanel.js
// This component uses the global useDownloads hook (make sure it's exposed via window.useDownloads in index.html)

function DownloadPanel({ onClose }) {
  const { downloads } = window.useDownloads();
  const [errorModal, setErrorModal] = React.useState(null);
  const [detailsModal, setDetailsModal] = React.useState(null);
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
              <td style={dl.status.startsWith('Skipped') ? { color: '#f39c12' } : undefined}>
                {dl.status === "Started" ? (
                  <div className="download-processing">
                    <div className="download-processing-bar">
                      <div className="download-processing-fill"></div>
                    </div>
                    <span className="download-processing-label">Processing</span>
                  </div>
                ) : dl.status}
                {dl.status === "Failed" && dl.error && (
                  <span
                    onClick={() => { setErrorModal(dl); setCopied(false); }}
                    style={{ color: '#e74c3c', marginLeft: '5px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    View Error
                  </span>
                )}
                {dl.playlistBreakdown && (dl.status.startsWith('Complete') || dl.status === 'Failed') && (
                  <span
                    onClick={() => setDetailsModal(dl)}
                    style={{ color: '#1DB954', marginLeft: '5px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    View Details
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

      {detailsModal && (
        <div className="custom-dialog-overlay" onClick={() => setDetailsModal(null)}>
          <div className="custom-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h3>Playlist Download Details</h3>
            <p style={{ margin: '0 0 12px', color: '#aaa', fontSize: '0.9rem' }}>
              {detailsModal.trackName}
            </p>
            {detailsModal.playlistBreakdown.downloaded.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#1DB954', margin: '0 0 6px', fontSize: '0.85rem' }}>
                  Downloaded ({detailsModal.playlistBreakdown.downloaded.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {detailsModal.playlistBreakdown.downloaded.map((name, i) => (
                    <li key={i} style={{ color: '#ccc', marginBottom: '2px' }}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailsModal.playlistBreakdown.skipped.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#f39c12', margin: '0 0 6px', fontSize: '0.85rem' }}>
                  Skipped ({detailsModal.playlistBreakdown.skipped.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {detailsModal.playlistBreakdown.skipped.map((name, i) => (
                    <li key={i} style={{ color: '#ccc', marginBottom: '2px' }}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailsModal.playlistBreakdown.errored && detailsModal.playlistBreakdown.errored.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#e74c3c', margin: '0 0 6px', fontSize: '0.85rem' }}>
                  Failed ({detailsModal.playlistBreakdown.errored.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {detailsModal.playlistBreakdown.errored.map((msg, i) => (
                    <li key={i} style={{ color: '#e74c3c', marginBottom: '2px' }}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            {detailsModal.playlistBreakdown.notProcessed && detailsModal.playlistBreakdown.notProcessed.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#888', margin: '0 0 6px', fontSize: '0.85rem' }}>
                  Not Processed ({detailsModal.playlistBreakdown.notProcessed.length})
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {detailsModal.playlistBreakdown.notProcessed.map((msg, i) => (
                    <li key={i} style={{ color: '#888', marginBottom: '2px' }}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="dialog-buttons" style={{ marginTop: '16px' }}>
              <button className="secondary-button" onClick={() => setDetailsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DownloadPanel = DownloadPanel;

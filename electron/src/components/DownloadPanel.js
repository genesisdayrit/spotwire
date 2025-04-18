// src/components/DownloadPanel.js
// This component uses the global useDownloads hook (make sure it's exposed via window.useDownloads in index.html)

function DownloadPanel({ onClose }) {
  const { downloads } = window.useDownloads();
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
                  <span title={dl.error} style={{ color: 'red', marginLeft: '5px', cursor: 'help' }}>
                    (details)
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
    </div>
  );
}

window.DownloadPanel = DownloadPanel;


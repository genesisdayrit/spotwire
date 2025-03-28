// src/components/FloatingDownloadsButton.js
function FloatingDownloadsButton({ onToggle }) {
  return (
    <button className="button floating-downloads-button" onClick={onToggle}>
      View Downloads
    </button>
  );
}

window.FloatingDownloadsButton = FloatingDownloadsButton;


// src/components/Instructions.js
function Instructions() {
  return (
    <div className="container">
      <h2 className="title">Instructions</h2>
      <p style={{ maxWidth: "600px", marginBottom: "1rem" }}>
        Here you can add instructions for your Electron app, or anything else you want.
      </p>
      <a href="#" className="button">Back Home</a>
    </div>
  );
}

window.Instructions = Instructions;


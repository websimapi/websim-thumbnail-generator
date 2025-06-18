const { useState, useEffect, useRef } = React;

// --- React App for the Generator ---
function App() {
    const [prompt, setPrompt] = useState('A beautiful fantasy castle under a starry night sky, anime art style, game title screen');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    const generateImage = async () => {
        if (!prompt || isLoading) return;
        setIsLoading(true);
        setGeneratedImage(null);
        try {
            const result = await websim.imageGen({
                prompt: prompt,
                aspect_ratio: "16:9",
            });
            setGeneratedImage(result.url);
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file && !isLoading) {
            setIsLoading(true);
            setGeneratedImage(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                setGeneratedImage(e.target.result);
                setIsLoading(false);
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                alert("Failed to upload image. Please try again.");
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const isDataUrl = generatedImage && generatedImage.startsWith('data:');

    const snippet = generatedImage ? `
// Code snippet to display a title screen for automated browsers.
// Paste this into your project's main script file.

(async () => {
  if (navigator.webdriver) {
    // Hide your main app content if desired
    // document.getElementById('root').style.display = 'none';

    const overlay = document.createElement('div');
    overlay.id = 'title-screen-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw',
      height: '100vh', background: '#000', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    document.body.prepend(overlay);
    
    overlay.innerHTML = \`<img src="${generatedImage}" style="max-width:100%; max-height:100%;" alt="Title Screen" />\`;
  }
})();
    `.trim() : null;

    const copySnippet = () => {
        navigator.clipboard.writeText(snippet).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="container">
            <header>
                <h1><i className="fas fa-magic"></i> AI Title Screen Generator</h1>
                <p>Create a title screen image and get a code snippet to use it anywhere.</p>
            </header>

            <div className="generator-section">
                <h2>1. Create Your Image</h2>
                <p>Generate an image with AI, or upload your own.</p>
                <div className="input-group">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A retro 8-bit game title screen..."
                        rows="3"
                        disabled={isLoading}
                    />
                     <button onClick={generateImage} disabled={isLoading || !prompt}>
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
                        {isLoading ? ' Generating...' : ' Generate'}
                    </button>
                </div>

                <div className="separator">
                    <span>OR</span>
                </div>

                <div className="upload-section">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        disabled={isLoading}
                    />
                    <button onClick={() => fileInputRef.current.click()} disabled={isLoading} className="secondary">
                        <i className="fas fa-upload"></i> Upload Image
                    </button>
                </div>
            </div>

            {isLoading && <div className="loading-placeholder">Processing your image...</div>}

            {generatedImage && (
                <div className="result-section">
                    <h2>2. Your Image</h2>
                    <img src={generatedImage} alt="Generated title screen" className="generated-image" />
                    <div className="button-group">
                        <button onClick={generateImage} disabled={isLoading} className="secondary">
                            <i className="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                </div>
            )}

            {snippet && (
                <div className="snippet-section">
                    <h2>3. Use Your Image</h2>
                     {isDataUrl ? (
                        <p>Copy this snippet to show the title screen in another project. The image data is embedded in the snippet.</p>
                     ) : (
                        <p>Copy this snippet to show the title screen in another project. <strong>Note:</strong> The image URL is temporary and may expire.</p>
                     )}
                    <div className="snippet-box">
                        <pre><code>{snippet}</code></pre>
                        <button onClick={copySnippet} className="copy-btn">
                            {copied ? <><i className="fas fa-check"></i> Copied!</> : <><i className="fas fa-copy"></i> Copy Code</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


if (!navigator.webdriver) {
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
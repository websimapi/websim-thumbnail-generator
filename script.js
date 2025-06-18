const { useState, useEffect, useSyncExternalStore } = React;

// Setup WebsimSocket at the global scope
const room = new WebsimSocket();
const TITLE_SCREEN_COLLECTION = 'titleScreen_v1';

// --- Non-React logic to display title screen for automated browsers ---
(async () => {
    if (navigator.webdriver) {
        // Hide the main app content for automated browsers
        const root = document.getElementById('root');
        if (root) {
            root.style.display = 'none';
        }

        const displayTitleScreen = (records) => {
            const overlay = document.getElementById('title-screen-overlay');
            if (!overlay) return;

            // getList returns newest first, so records[0] is the latest.
            if (records && records.length > 0) {
                const latestTitleScreen = records[0];
                overlay.innerHTML = `<img src="${latestTitleScreen.imageUrl}" alt="Title Screen" />`;
                overlay.classList.add('visible');
            } else {
                overlay.classList.remove('visible');
            }
        };
        
        // Subscribe to changes and display the title screen
        room.collection(TITLE_SCREEN_COLLECTION).subscribe(displayTitleScreen);
    }
})();


// --- React App for the Generator ---
function App() {
    const [prompt, setPrompt] = useState('A beautiful fantasy castle under a starry night sky, anime art style, game title screen');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    const titleScreens = useSyncExternalStore(
        room.collection(TITLE_SCREEN_COLLECTION).subscribe,
        room.collection(TITLE_SCREEN_COLLECTION).getList
    );

    const latestTitleScreenUrl = titleScreens?.[0]?.imageUrl;

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

    const saveAndSetTitleScreen = async () => {
        if (!generatedImage || isSaving) return;
        setIsSaving(true);
        try {
            // Fetch the generated image and create a blob
            const response = await fetch(generatedImage, { mode: 'cors' });
            const blob = await response.blob();
            const file = new File([blob], "title-screen.png", { type: "image/png" });

            // Upload to persistent storage
            const uploadedUrl = await websim.upload(file);

            // Create a new record. The subscription will handle the UI update.
            await room.collection(TITLE_SCREEN_COLLECTION).create({
                imageUrl: uploadedUrl,
                prompt: prompt,
            });
            
            setGeneratedImage(null); // Clear the temp image

        } catch (error) {
            console.error("Error saving title screen:", error);
            alert("Failed to save the title screen. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const snippet = `
// Code snippet to display the title screen on automated browsers.
// Paste this into your project's main script file.
// Requires: <script src="${window.websim.sdkUrl}"></script>

(async () => {
  if (navigator.webdriver) {
    // Hide your main app content if desired
    // document.getElementById('root').style.display = 'none';

    const room = new WebsimSocket();
    const overlay = document.createElement('div');
    overlay.id = 'title-screen-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw',
      height: '100vh', background: '#000', zIndex: '99999',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    });
    document.body.prepend(overlay);
    
    room.collection('${TITLE_SCREEN_COLLECTION}').subscribe(records => {
      if (records && records.length > 0) {
        const latest = records[0]; // Newest first
        overlay.innerHTML = \`<img src="\${latest.imageUrl}" style="max-width:100%; max-height:100%;" />\`;
      }
    });
  }
})();
    `.trim();

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
                <p>Create a title screen image and set it to display for automated browsers visiting this page.</p>
            </header>

            <div className="generator-section">
                <h2>1. Generate an Image</h2>
                <div className="input-group">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A retro 8-bit game title screen..."
                        rows="3"
                    />
                    <button onClick={generateImage} disabled={isLoading || !prompt}>
                        {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
                        {isLoading ? ' Generating...' : ' Generate'}
                    </button>
                </div>
            </div>

            {isLoading && <div className="loading-placeholder">Generating your title screen...</div>}

            {generatedImage && (
                <div className="result-section">
                    <h2>2. Approve and Save</h2>
                    <img src={generatedImage} alt="Generated title screen" className="generated-image" />
                    <div className="button-group">
                        <button onClick={generateImage} disabled={isLoading || isSaving} className="secondary">
                            <i className="fas fa-redo"></i> Try Again
                        </button>
                        <button onClick={saveAndSetTitleScreen} disabled={isSaving}>
                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            {isSaving ? ' Saving...' : 'Use This Title Screen'}
                        </button>
                    </div>
                </div>
            )}

            <div className="live-preview-section">
                <h2>Live Title Screen</h2>
                <p>This is what automated browsers will see as a full-screen overlay.</p>
                <div className="live-preview-box">
                    {latestTitleScreenUrl ? (
                        <img src={latestTitleScreenUrl} alt="Current live title screen" />
                    ) : (
                        <div className="no-image">No title screen set yet.</div>
                    )}
                </div>
            </div>
            
            <div className="snippet-section">
                <h2>3. Implement Elsewhere</h2>
                 <p>Copy this snippet to show the title screen in another project.</p>
                <div className="snippet-box">
                    <pre><code>{snippet}</code></pre>
                    <button onClick={copySnippet} className="copy-btn">
                        {copied ? <><i className="fas fa-check"></i> Copied!</> : <><i className="fas fa-copy"></i> Copy Code</>}
                    </button>
                </div>
            </div>
        </div>
    );
}


if (!navigator.webdriver) {
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
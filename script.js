const { useState, useEffect, useRef } = React;

const FONT_OPTIONS = [
    { name: 'Roboto', family: '"Roboto", sans-serif' },
    { name: 'Press Start 2P', family: '"Press Start 2P", cursive' },
    { name: 'Bungee', family: '"Bungee", cursive' },
    { name: 'Nosifier', family: '"Nosifier", cursive' },
    { name: 'Cinzel Decorative', family: '"Cinzel Decorative", cursive' },
];

// --- React App for the Generator ---
function App() {
    const [prompt, setPrompt] = useState('A beautiful fantasy castle under a starry night sky, anime art style, game title screen');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    // Text state
    const [texts, setTexts] = useState([]);
    const [activeTextId, setActiveTextId] = useState(null);

    useEffect(() => {
        // When a new image is loaded, reset texts and add a default one
        if (generatedImage && texts.length === 0) {
            const defaultText = {
                id: Date.now(),
                content: 'My Awesome Game',
                fontFamily: FONT_OPTIONS[0].family,
                fontSize: 60,
                color: '#FFFFFF',
                strokeColor: '#000000',
                strokeWidth: 2,
                top: 50,
                left: 50,
            };
            setTexts([defaultText]);
            setActiveTextId(defaultText.id);
        } else if (!generatedImage) {
            // Clear texts if image is removed
            setTexts([]);
            setActiveTextId(null);
        }
    }, [generatedImage]);

    const handleTextChange = (id, field, value) => {
        setTexts(texts.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const activeText = texts.find(t => t.id === activeTextId);

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
            setTexts([]); // Reset text on new image generation
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
            setTexts([]); // Reset text on new image upload
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

    const generateSnippet = () => {
        if (!generatedImage) return null;

        const textElementsHTML = texts.map(text => {
            const textStyle = {
                fontFamily: text.fontFamily,
                fontSize: `${text.fontSize}px`,
                color: text.color,
                position: 'absolute',
                top: `${text.top}%`,
                left: `${text.left}%`,
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                textShadow: `${text.strokeWidth}px ${text.strokeWidth}px 0 ${text.strokeColor}, -${text.strokeWidth}px -${text.strokeWidth}px 0 ${text.strokeColor}, ${text.strokeWidth}px -${text.strokeWidth}px 0 ${text.strokeColor}, -${text.strokeWidth}px ${text.strokeWidth}px 0 ${text.strokeColor}`
            };
            const styleString = Object.entries(textStyle)
                .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value};`)
                .join(' ');

            // Use textContent to prevent XSS issues with user-provided content
            const textDiv = document.createElement('div');
            textDiv.textContent = text.content;
            Object.assign(textDiv.style, textStyle);
            
            return `
      const textEl${text.id} = document.createElement('div');
      textEl${text.id}.textContent = \`${text.content.replace(/`/g, '\\`')}\`;
      Object.assign(textEl${text.id}.style, JSON.parse(\`${JSON.stringify(JSON.stringify(textStyle))}\`));
      overlay.appendChild(textEl${text.id});
    `;
        }).join('');

        const fontLink = texts.length > 0 ? `
    // Add Google Fonts to display text correctly
    const fontFamilies = [...new Set([${texts.map(t => `'${t.fontFamily.split(',')[0].replace(/"/g, '')}'`).join(',')}])];
    const fontApiUrl = \`https://fonts.googleapis.com/css2?family=\${fontFamilies.map(f => \`\${f.replace(/ /g, '+')}:wght@700\`).join('&')}&display=swap\`;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontApiUrl;
    document.head.appendChild(link);` : '';

        return `
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
    
    const img = document.createElement('img');
    img.src = "${generatedImage}";
    Object.assign(img.style, {
        position: 'absolute', top: '0', left: '0',
        width: '100%', height: '100%', objectFit: 'cover'
    });
    overlay.appendChild(img);
    
    document.body.prepend(overlay);
    
    ${fontLink}
    ${textElementsHTML}
  }
})();
    `.trim();
    };

    const snippet = generateSnippet();

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
                    <h2>2. Customize Your Title Screen</h2>
                    <div className="live-preview-box">
                         <div className="preview-image-container">
                            <img src={generatedImage} alt="Generated title screen" className="generated-image" />
                            {texts.map(text => (
                                <div
                                    key={text.id}
                                    className={`draggable-text ${activeTextId === text.id ? 'active' : ''}`}
                                    style={{
                                        position: 'absolute',
                                        top: `${text.top}%`,
                                        left: `${text.left}%`,
                                        transform: 'translate(-50%, -50%)',
                                        fontFamily: text.fontFamily,
                                        fontSize: `${text.fontSize}px`,
                                        color: text.color,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        textShadow: `${text.strokeWidth}px ${text.strokeWidth}px 0 ${text.strokeColor}, -${text.strokeWidth}px -${text.strokeWidth}px 0 ${text.strokeColor}, ${text.strokeWidth}px -${text.strokeWidth}px 0 ${text.strokeColor}, -${text.strokeWidth}px ${text.strokeWidth}px 0 ${text.strokeColor}`,
                                    }}
                                    onClick={() => setActiveTextId(text.id)}
                                >
                                    {text.content}
                                </div>
                            ))}
                        </div>
                        {renderTextEditor()}
                    </div>
                    <div className="button-group">
                        <button onClick={generateImage} disabled={isLoading} className="secondary">
                            <i className="fas fa-redo"></i> Regenerate Image
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

const renderTextEditor = () => {
    if (!activeText) return null;
    return (
        <div className="text-editor">
            <h4>Edit Text</h4>
            <div className="form-group">
                <label>Content</label>
                <input type="text" value={activeText.content} onChange={e => handleTextChange(activeTextId, 'content', e.target.value)} />
            </div>
            <div className="form-group">
                <label>Font</label>
                <select value={activeText.fontFamily} onChange={e => handleTextChange(activeTextId, 'fontFamily', e.target.value)}>
                    {FONT_OPTIONS.map(font => <option key={font.name} value={font.family}>{font.name}</option>)}
                </select>
            </div>
            <div className="form-group-row">
                <div className="form-group">
                    <label>Size (px)</label>
                    <input type="number" value={activeText.fontSize} min="10" max="200" onChange={e => handleTextChange(activeTextId, 'fontSize', parseInt(e.target.value, 10))} />
                </div>
                <div className="form-group">
                     <label>Color</label>
                    <input type="color" value={activeText.color} onChange={e => handleTextChange(activeTextId, 'color', e.target.value)} />
                </div>
            </div>
             <div className="form-group-row">
                <div className="form-group">
                    <label>Stroke (px)</label>
                    <input type="number" value={activeText.strokeWidth} min="0" max="10" onChange={e => handleTextChange(activeTextId, 'strokeWidth', parseInt(e.target.value, 10))} />
                </div>
                <div className="form-group">
                     <label>Stroke Color</label>
                    <input type="color" value={activeText.strokeColor} onChange={e => handleTextChange(activeTextId, 'strokeColor', e.target.value)} />
                </div>
            </div>
        </div>
    );
};

if (!navigator.webdriver) {
    const container = document.getElementById('root');
    const root = ReactDOM.createRoot(container);
    root.render(<App />);
}
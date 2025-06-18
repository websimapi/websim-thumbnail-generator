const { useState, useEffect, useRef } = React;

// --- React App for the Generator ---
function App() {
    const [prompt, setPrompt] = useState('A beautiful fantasy castle under a starry night sky, anime art style, game title screen');
    const [loadingState, setLoadingState] = useState(null); // null, 'prompt', 'upload', 'project'
    const [generatedImage, setGeneratedImage] = useState(null);
    const [isUploadedImage, setIsUploadedImage] = useState(false);
    const [copied, setCopied] = useState(false);
    const [projectIdentifier, setProjectIdentifier] = useState('');
    const fileInputRef = useRef(null);

    // Text overlay states
    const [titleText, setTitleText] = useState('My Awesome Game');
    const [textColor, setTextColor] = useState('#ffffff');
    const [fontSize, setFontSize] = useState(72);
    const [fontFamily, setFontFamily] = useState('Bungee');
    const [textX, setTextX] = useState(50);
    const [textY, setTextY] = useState(50);

    // Advanced text styling states
    const [textStrokeEnabled, setTextStrokeEnabled] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(1);
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [textShadowEnabled, setTextShadowEnabled] = useState(true);
    const [shadowColor, setShadowColor] = useState('#000000');
    const [shadowBlur, setShadowBlur] = useState(8);
    const [shadowOffsetX, setShadowOffsetX] = useState(2);
    const [shadowOffsetY, setShadowOffsetY] = useState(2);

    const generateImage = async () => {
        if (!prompt || loadingState) return;
        setLoadingState('prompt');
        setGeneratedImage(null);
        setIsUploadedImage(false);
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
            setLoadingState(null);
        }
    };
    
    const generateFromProject = async () => {
        if (!projectIdentifier || loadingState) return;
        setLoadingState('project');
        setGeneratedImage(null);
        setIsUploadedImage(false);

        try {
            // 1. Parse identifier
            let projectId = null;
            let projectVersion = null;
            let initialSite = null;

            const idRegex = /^[a-z0-9_-]{20}$/;
            const urlIdRegex = /websim\.com\/p\/([a-z0-9_-]{20})/;
            const urlSlugRegex = /websim\.com\/@([^/]+)\/([^/]+)/;
            const slugRegex = /^([^/]+)\/([^/]+)$/;

            let match;
            if (idRegex.test(projectIdentifier)) {
                projectId = projectIdentifier;
            } else if ((match = projectIdentifier.match(urlIdRegex))) {
                projectId = match[1];
            } else {
                let user, slug;
                if ((match = projectIdentifier.match(urlSlugRegex))) {
                    user = match[1];
                    slug = match[2].split('?')[0].split('#')[0];
                } else if ((match = projectIdentifier.match(slugRegex))) {
                    user = match[1];
                    slug = match[2];
                }

                if (user && slug) {
                    const res = await fetch(`/api/v1/users/${user}/slugs/${slug}`);
                    if (!res.ok) throw new Error(`Could not find project for slug: ${user}/${slug}`);
                    const data = await res.json();
                    projectId = data.project.id;
                    projectVersion = data.project.current_version;
                    initialSite = data.site;
                }
            }
            
            if (!projectId) {
                throw new Error("Invalid project identifier. Please use a project ID, URL, or slug (user/slug).");
            }

            // 2. Fetch project details if not known
            if (!projectVersion) {
                 const res = await fetch(`/api/v1/projects/${projectId}`);
                 if (!res.ok) throw new Error(`Could not find project with ID: ${projectId}`);
                 const data = await res.json();
                 projectVersion = data.project.current_version;
                 initialSite = data.site;
            }

            if (!projectVersion) {
                throw new Error(`Project ${projectId} has no published version.`);
            }

            // 3. Fetch project HTML
            const htmlRes = await fetch(`/api/v1/projects/${projectId}/revisions/${projectVersion}/html`);
            if (!htmlRes.ok) throw new Error(`Could not fetch HTML for project ${projectId} version ${projectVersion}`);
            const htmlContent = await htmlRes.text();

            // 4. Fetch prompt history from revisions
            const revisionsRes = await fetch(`/api/v1/projects/${projectId}/revisions`);
            let promptHistory = [];
            if (revisionsRes.ok) {
                const revisionsData = await revisionsRes.json();
                promptHistory = revisionsData.revisions.data
                    .map(item => item.site?.prompt?.text)
                    .filter(Boolean)
                    .reverse(); // oldest to newest
            }
            const promptHistoryText = promptHistory.length > 0
                ? `Here is the history of prompts used for this project, from oldest to newest:\n${promptHistory.map(p => `- ${p}`).join('\n')}`
                : "There is no available prompt history for this project.";


            // 5. Get image prompt from AI
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `Analyze the following project information, which includes its code and its prompt history. Based on all of this context, generate a single, concise, and artistic image generation prompt for a game title screen that captures the essence of the web page. The prompt should be creative and suitable for a text-to-image AI like DALL-E. Respond with ONLY the prompt text and no other explanations or text. For example: "A vibrant, synthwave-inspired city skyline at dusk, retro gaming aesthetic, pixel art."`,
                    },
                    {
                        role: "user",
                        content: `${promptHistoryText}\n\nHere is the project's latest code:\n\n\`\`\`html\n${htmlContent.substring(0, 8000)}\n\`\`\``
                    },
                ],
            });
            
            const imagePrompt = completion.content.trim().replace(/"/g, '');
            setPrompt(imagePrompt);

            // 6. Generate image
            const result = await websim.imageGen({
                prompt: imagePrompt,
                aspect_ratio: "16:9",
            });
            setGeneratedImage(result.url);

        } catch (error) {
            console.error("Error generating from project:", error);
            alert(`Failed to generate from project: ${error.message}`);
        } finally {
            setLoadingState(null);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file && !loadingState) {
            setLoadingState('upload');
            setGeneratedImage(null);
            setIsUploadedImage(false);
            try {
                const url = await websim.upload(file);
                setGeneratedImage(url);
                setIsUploadedImage(true);
            } catch (error) {
                console.error("Error uploading file:", error);
                alert("Failed to upload image. Please try again.");
            } finally {
                setLoadingState(null);
            }
        }
    };

    const isDataUrl = generatedImage && generatedImage.startsWith('data:');

    const shadowStyleString = textShadowEnabled ? `text-shadow: ${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor};` : '';
    const strokeStyleString = textStrokeEnabled ? `-webkit-text-stroke: ${strokeWidth}px ${strokeColor}; paint-order: stroke fill;` : '';

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
      overflow: 'hidden'
    });
    document.body.prepend(overlay);

    const imageHTML = \`<img src="${generatedImage}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" alt="Title Screen" />\`;
    
    const textHTML = \`${titleText ? `<div style="position: absolute; top: ${textY}%; left: ${textX}%; transform: translate(-50%, -50%); color: ${textColor}; font-size: ${fontSize}px; font-family: '${fontFamily}', sans-serif; ${shadowStyleString} ${strokeStyleString} text-align: center; white-space: pre-wrap; width: 90%; line-height: 1.2;">${titleText.replace(/\\/g, '\\\\').replace(/`/g, '\\`')}</div>` : ''}\`;

    overlay.innerHTML = imageHTML + textHTML;
  }
})();
    `.trim() : null;

    const copySnippet = () => {
        navigator.clipboard.writeText(snippet).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const textStyle = {
        position: 'absolute',
        top: `${textY}%`,
        left: `${textX}%`,
        transform: 'translate(-50%, -50%)',
        color: textColor,
        fontSize: `${fontSize}px`,
        fontFamily: `'${fontFamily}', sans-serif`,
        textShadow: textShadowEnabled ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}` : 'none',
        WebkitTextStroke: textStrokeEnabled ? `${strokeWidth}px ${strokeColor}` : 'undefined',
        paintOrder: textStrokeEnabled ? 'stroke fill' : 'undefined',
        textAlign: 'center',
        width: '90%',
        lineHeight: 1.2,
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap'
    };

    const fontOptions = [
        { name: 'Arcade', value: "'Press Start 2P'" },
        { name: 'Pixel', value: 'Silkscreen' },
        { name: 'Fantasy', value: 'MedievalSharp' },
        { name: 'Elegant', value: 'Cinzel Decorative' },
        { name: 'Impact', value: 'Bungee' },
        { name: 'Horror', value: 'Creepster' },
        { name: 'Sci-Fi', value: 'Orbitron' },
        { name: 'Handwritten', value: "'Permanent Marker'" },
        { name: 'Sans Serif', value: 'Arial' },
        { name: 'Serif', value: 'Times New Roman' },
    ];

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
                        disabled={!!loadingState}
                    />
                     <button onClick={generateImage} disabled={!!loadingState || !prompt}>
                        {loadingState === 'prompt' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-bolt"></i>}
                        {loadingState === 'prompt' ? ' Generating...' : ' Generate'}
                    </button>
                </div>

                <div className="separator">
                    <span>OR</span>
                </div>

                <div className="input-group">
                    <input
                        type="text"
                        value={projectIdentifier}
                        onChange={(e) => setProjectIdentifier(e.target.value)}
                        placeholder="Websim Project ID, URL or Slug (user/slug)"
                        disabled={!!loadingState}
                    />
                     <button onClick={generateFromProject} disabled={!!loadingState || !projectIdentifier}>
                        {loadingState === 'project' ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cogs"></i>}
                        {loadingState === 'project' ? ' Analyzing...' : ' Analyze Project'}
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
                        disabled={!!loadingState}
                    />
                    <button onClick={() => fileInputRef.current.click()} disabled={!!loadingState} className="secondary">
                        {loadingState === 'upload' ? <><i className="fas fa-spinner fa-spin"></i> Uploading...</> : <><i className="fas fa-upload"></i> Upload Image</>}
                    </button>
                </div>
            </div>

            {loadingState && <div className="loading-placeholder">
                {loadingState === 'prompt' && 'Generating your image...'}
                {loadingState === 'upload' && 'Uploading your image...'}
                {loadingState === 'project' && 'Analyzing project and generating image...'}
            </div>}

            {generatedImage && (
                <>
                    <div className="text-customization-section">
                        <h2>2. Add Text</h2>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label>Title Text</label>
                                <input type="text" value={titleText} onChange={e => setTitleText(e.target.value)} placeholder="Enter title..."/>
                            </div>
                             <div className="form-group">
                                <label>Font</label>
                                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
                                    {fontOptions.map(font => (
                                        <option key={font.value} value={font.value}>{font.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Font Color</label>
                                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Font Size: {fontSize}px</label>
                                <input type="range" min="12" max="200" value={fontSize} onChange={e => setFontSize(e.target.value)} />
                            </div>
                             <div className="form-group">
                                <label>Position X: {textX}%</label>
                                <input type="range" min="0" max="100" value={textX} onChange={e => setTextX(e.target.value)} />
                            </div>
                             <div className="form-group">
                                <label>Position Y: {textY}%</label>
                                <input type="range" min="0" max="100" value={textY} onChange={e => setTextY(e.target.value)} />
                            </div>
                        </div>
                        
                        <div className="sub-section">
                            <div className="sub-section-header">
                                <input type="checkbox" id="textStrokeCheckbox" checked={textStrokeEnabled} onChange={e => setTextStrokeEnabled(e.target.checked)} />
                                <label htmlFor="textStrokeCheckbox">Text Stroke</label>
                            </div>
                            {textStrokeEnabled && (
                                <div className="form-grid indented">
                                    <div className="form-group">
                                        <label>Stroke Width: {strokeWidth}px</label>
                                        <input type="range" min="1" max="10" value={strokeWidth} onChange={e => setStrokeWidth(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Stroke Color</label>
                                        <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sub-section">
                             <div className="sub-section-header">
                                <input type="checkbox" id="textShadowCheckbox" checked={textShadowEnabled} onChange={e => setTextShadowEnabled(e.target.checked)} />
                                <label htmlFor="textShadowCheckbox">Text Shadow</label>
                            </div>
                            {textShadowEnabled && (
                                <div className="form-grid indented">
                                    <div className="form-group">
                                        <label>Shadow Color</label>
                                        <input type="color" value={shadowColor} onChange={e => setShadowColor(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Shadow Blur: {shadowBlur}px</label>
                                        <input type="range" min="0" max="50" value={shadowBlur} onChange={e => setShadowBlur(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Offset X: {shadowOffsetX}px</label>
                                        <input type="range" min="-25" max="25" value={shadowOffsetX} onChange={e => setShadowOffsetX(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Offset Y: {shadowOffsetY}px</label>
                                        <input type="range" min="-25" max="25" value={shadowOffsetY} onChange={e => setShadowOffsetY(e.target.value)} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="result-section">
                        <h2>3. Live Preview</h2>
                         <div className="live-preview-box">
                            <img src={generatedImage} alt="Generated title screen" className="generated-image" />
                            {titleText && <div style={textStyle}>{titleText}</div>}
                        </div>
                        <div className="button-group">
                            <button onClick={generateImage} disabled={!!loadingState} className="secondary">
                                {loadingState === 'prompt' 
                                    ? <><i className="fas fa-spinner fa-spin"></i> Regenerating...</>
                                    : <><i className="fas fa-redo"></i> Regenerate Image</>
                                }
                            </button>
                        </div>
                    </div>
                </>
            )}

            {snippet && (
                <div className="snippet-section">
                    <h2>4. Use Your Image</h2>
                     {isUploadedImage ? (
                        <p>Copy this snippet to show the title screen in another project. Your uploaded image is hosted with a permanent URL.</p>
                     ) : (
                        <p>Copy this snippet to show the title screen in another project. <strong>Note:</strong> The AI-generated image URL is temporary and may expire.</p>
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
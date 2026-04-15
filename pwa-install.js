
/**
 * PWA Install Helper
 * Handles the "Add to Home Screen" prompt for Android/Chrome
 * and shows instructions for iOS users.
 */

let deferredPrompt;
const pwaModalId = 'pwa-install-modal';

// Inject basic styles for the modal in case Tailwind is missing
const style = document.createElement('style');
style.textContent = `
    .pwa-backdrop { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: flex-end; justify-content: center; padding: 1rem; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    @media (min-width: 640px) { .pwa-backdrop { align-items: center; } }
    .pwa-card { background: white; border-radius: 1.5rem; width: 100%; max-width: 24rem; padding: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: pwa-pop 0.3s ease-out; }
    @keyframes pwa-pop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .pwa-btn-primary { width: 100%; background: #2563eb; color: white; font-weight: bold; padding: 1rem; border-radius: 0.75rem; border: none; font-size: 1.125rem; cursor: pointer; margin-bottom: 0.75rem; transition: background 0.2s; }
    .pwa-btn-primary:active { background: #1d4ed8; transform: scale(0.98); }
    .pwa-btn-secondary { width: 100%; background: none; color: #6b7280; font-weight: 600; padding: 0.75rem; border: none; cursor: pointer; }
    .pwa-btn-secondary:hover { color: #374151; }
    .pwa-flex { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .pwa-icon { width: 4rem; height: 4rem; background: #eff6ff; border-radius: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pwa-icon img { width: 3rem; height: 3rem; border-radius: 0.5rem; }
    .pwa-title { font-weight: bold; font-size: 1.25rem; color: #111827; margin: 0; }
    .pwa-text { color: #6b7280; font-size: 0.875rem; margin: 0; }
    .pwa-step { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .pwa-step-num { width: 2.5rem; height: 2.5rem; background: #f3f4f6; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #2563eb; flex-shrink: 0; }
    .pwa-step-text { font-size: 1.0625rem; color: #374151; margin: 0; }
    .pwa-badge { background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 0.25rem; display: inline-flex; align-items: center; gap: 0.25rem; }
`;
document.head.appendChild(style);

function initPWAInstall() {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        console.log('App is already installed');
        return;
    }

    // Capture the beforeinstallprompt event (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // Only show if not dismissed recently (7 days)
        const dismissed = localStorage.getItem('pwa_prompt_dismissed');
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!dismissed || (Date.now() - dismissed > sevenDays)) {
            showPWAModal('android');
        }
    });

    // Handle iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
        // Only show if not dismissed recently (7 days)
        const dismissed = localStorage.getItem('pwa_prompt_dismissed');
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (!dismissed || (Date.now() - dismissed > sevenDays)) {
            showPWAModal('ios');
        }
    }
}

function showPWAModal(platform) {
    // Remove if already exists
    const existing = document.getElementById(pwaModalId);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = pwaModalId;
    modal.className = 'pwa-backdrop';
    
    let content = '';
    
    if (platform === 'android') {
        content = `
            <div class="pwa-card">
                <div class="pwa-flex">
                    <div class="pwa-icon">
                        <img src="icons/icon-192.png" alt="App Icon">
                    </div>
                    <div>
                        <h3 class="pwa-title">Install App</h3>
                        <p class="pwa-text">Add to your home screen for faster access.</p>
                    </div>
                </div>
                
                <div>
                    <button id="pwa-install-btn" class="pwa-btn-primary">
                        INSTALL NOW
                    </button>
                    <button id="pwa-close-btn" class="pwa-btn-secondary">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
    } else if (platform === 'ios') {
        content = `
            <div class="pwa-card" style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; position: absolute; bottom: 0;">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div class="pwa-icon" style="margin: 0 auto 1rem auto; width: 5rem; height: 5rem;">
                        <img src="icons/icon-192.png" style="width: 4rem; height: 4rem;" alt="App Icon">
                    </div>
                    <h3 class="pwa-title">Install This App</h3>
                    <p class="pwa-text" style="margin-top: 0.5rem;">To make it work like a real app, follow these 2 steps:</p>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <div class="pwa-step">
                        <div class="pwa-step-num">1</div>
                        <p class="pwa-step-text">Tap the <span class="pwa-badge"><svg style="width: 1.25rem; height: 1.25rem; color: #3b82f6;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg> Share</span> button below.</p>
                    </div>
                    <div class="pwa-step">
                        <div class="pwa-step-num">2</div>
                        <p class="pwa-step-text">Scroll down and tap <strong style="font-weight: 600;">"Add to Home Screen"</strong>.</p>
                    </div>
                </div>
                
                <button id="pwa-close-btn" class="pwa-btn-primary" style="background: #111827;">
                    GOT IT
                </button>
            </div>
        `;
    }

    modal.innerHTML = content;

    document.body.appendChild(modal);

    // Event Listeners
    if (platform === 'android') {
        document.getElementById('pwa-install-btn').onclick = async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            modal.remove();
        };
    }

    document.getElementById('pwa-close-btn').onclick = () => {
        // Dismiss for 7 days
        localStorage.setItem('pwa_prompt_dismissed', Date.now());
        modal.remove();
    };
}

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPWAInstall);
} else {
    initPWAInstall();
}

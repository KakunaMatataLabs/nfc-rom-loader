// Configurazione globale
const CONFIG = {
    deltaAppStore: 'https://apps.apple.com/app/delta-game-emulator/id1048524688',
    deltaScheme: 'delta://',
    baseURL: window.location.origin,
    romPath: '/roms/homebrew/',
    checkTimeout: 2000
};

// Utility per logging
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${msg}`)
};

// Classe principale per gestire l'app
class NfcRomLoader {
    constructor() {
        this.deltaInstalled = false;
        this.init();
    }

    init() {
        logger.info('Inizializzazione NFC ROM Loader');
        this.setupEventListeners();
        this.detectDevice();
        this.checkDeltaOnLoad();
    }

    setupEventListeners() {
        const checkDeltaBtn = document.getElementById('checkDelta');
        if (checkDeltaBtn) {
            checkDeltaBtn.addEventListener('click', () => this.checkDeltaEmulator());
        }

        // Gestione click sui link ROM
        document.querySelectorAll('a[href^="/rom/"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleRomClick(link.getAttribute('href'));
            });
        });
    }

    detectDevice() {
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        
        logger.info(`Dispositivo rilevato: ${isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop'}`);
        
        if (!isIOS && !isAndroid) {
            this.showDesktopMessage();
        }
    }

    showDesktopMessage() {
        const statusElement = document.getElementById('deltaStatus');
        if (statusElement) {
            statusElement.innerHTML = '💻 Questo servizio funziona solo su dispositivi mobili (iPhone/Android)';
            statusElement.className = 'status-warning';
        }
    }

    checkDeltaOnLoad() {
        // Controllo automatico al caricamento della pagina
        setTimeout(() => {
            this.checkDeltaEmulator();
        }, 1000);
    }

    async checkDeltaEmulator() {
        const statusElement = document.getElementById('deltaStatus');
        const checkButton = document.getElementById('checkDelta');
        
        if (!statusElement || !checkButton) return;

        // Mostra loading
        statusElement.innerHTML = '<div class="loading"></div> Verifica in corso...';
        statusElement.className = '';
        checkButton.disabled = true;

        try {
            const isInstalled = await this.isDeltaInstalled();
            this.deltaInstalled = isInstalled;
            
            if (isInstalled) {
                statusElement.innerHTML = '✅ Delta Emulator è installato e pronto!';
                statusElement.className = 'status-success';
                logger.info('Delta Emulator rilevato');
            } else {
                statusElement.innerHTML = `❌ Delta Emulator non trovato. <a href="${CONFIG.deltaAppStore}" target="_blank">Scarica dall'App Store</a>`;
                statusElement.className = 'status-error';
                logger.warn('Delta Emulator non installato');
            }
        } catch (error) {
            statusElement.innerHTML = '⚠️ Errore durante la verifica. Riprova.';
            statusElement.className = 'status-warning';
            logger.error(`Errore verifica Delta: ${error.message}`);
        } finally {
            checkButton.disabled = false;
        }
    }

    isDeltaInstalled() {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = CONFIG.deltaScheme;
            
            document.body.appendChild(iframe);
            
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                resolve(false);
            }, CONFIG.checkTimeout);
            
            // Se Delta è installato, la pagina potrebbe cambiare
            window.addEventListener('blur', () => {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                resolve(true);
            }, { once: true });
        });
    }

    handleRomClick(romPath) {
        logger.info(`Clic su ROM: ${romPath}`);
        
        // Estrai il nome della ROM dal path
        const romName = romPath.split('/').pop();
        
        // Reindirizza alla pagina specifica della ROM
        window.location.href = romPath;
    }

    // Metodo per importare ROM direttamente (usato dalle pagine specifiche)
    async importRom(romName, romUrl) {
        logger.info(`Importazione ROM: ${romName}`);
        
        if (!this.deltaInstalled) {
            const shouldCheck = confirm('Delta Emulator potrebbe non essere installato. Vuoi verificare?');
            if (shouldCheck) {
                await this.checkDeltaEmulator();
                if (!this.deltaInstalled) {
                    this.redirectToAppStore();
                    return;
                }
            }
        }

        try {
            // Prova l'importazione diretta
            const deltaImportUrl = `${CONFIG.deltaScheme}import?url=${encodeURIComponent(romUrl)}`;
            logger.info(`Tentativo importazione: ${deltaImportUrl}`);
            
            window.location.href = deltaImportUrl;
            
            // Fallback dopo 3 secondi
            setTimeout(() => {
                this.showImportFallback(romUrl);
            }, 3000);
            
        } catch (error) {
            logger.error(`Errore importazione: ${error.message}`);
            this.showImportFallback(romUrl);
        }
    }

    showImportFallback(romUrl) {
        const fallbackHtml = `
            <div style="text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px;">
                <h3>Importazione manuale</h3>
                <p>Se l'importazione automatica non funziona:</p>
                <ol style="text-align: left; max-width: 300px; margin: 20px auto;">
                    <li>Scarica il file ROM</li>
                    <li>Apri Delta Emulator</li>
                    <li>Usa "Importa" nelle impostazioni</li>
                </ol>
                <a href="${romUrl}" download class="btn">Scarica ROM</a>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', fallbackHtml);
    }

    redirectToAppStore() {
        logger.info('Reindirizzamento App Store');
        window.open(CONFIG.deltaAppStore, '_blank');
    }
}

// Classe per gestire pagine ROM specifiche
class RomPage {
    constructor(romName, romFileName) {
        this.romName = romName;
        this.romFileName = romFileName;
        this.romUrl = `${CONFIG.baseURL}${CONFIG.romPath}${romFileName}`;
        this.loader = new NfcRomLoader();
        this.init();
    }

    init() {
        logger.info(`Inizializzazione pagina ROM: ${this.romName}`);
        this.updatePageContent();
        this.startAutoImport();
    }

    updatePageContent() {
        document.title = `${this.romName} - NFC ROM Loader`;
        
        // Aggiorna il contenuto della pagina se presente
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            titleElement.textContent = `🎮 ${this.romName}`;
        }
    }

    async startAutoImport() {
        logger.info('Inizio importazione automatica');
        
        // Attendi che Delta sia verificato
        await this.loader.checkDeltaEmulator();
        
        // Procedi con l'importazione
        setTimeout(() => {
            this.loader.importRom(this.romName, this.romUrl);
        }, 1000);
    }
}

// Inizializzazione globale
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se siamo su una pagina ROM specifica
    const path = window.location.pathname;
    
    if (path.includes('/pages/') && path.includes('.html')) {
        // Estrai il nome della ROM dal path
        const romName = path.split('/').pop().replace('.html', '');
        
        // Mappa i nomi ROM ai file
        const romFiles = {
            'pokemon-rosso': 'pokemon-red.gb',
            'pokemon-blu': 'pokemon-blue.gb',
            '2048': '2048.gb'
        };
        
        if (romFiles[romName]) {
            new RomPage(romName.replace('-', ' '), romFiles[romName]);
        }
    } else {
        // Pagina principale
        new NfcRomLoader();
    }
});

// Gestione errori globali
window.addEventListener('error', (event) => {
    logger.error(`Errore globale: ${event.error.message}`);
});

// Export per uso in altre pagine
window.NfcRomLoader = NfcRomLoader;
window.RomPage = RomPage;

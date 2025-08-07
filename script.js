/* script.js – versión completa y estable para KAZE
   - Preloader + saludo por voz
   - Countdown
   - Conexión TronLink + estado de red
   - Progreso (consulta balance TRX de la wallet KAZE + precio en USD)
   - Checkout con Netlify Function (NOWPayments) -> usa invoice_url
   - Mini asistente con voz y acciones
*/

document.addEventListener('DOMContentLoaded', () => {
  // ---- DOM ----
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloaderFill');
  const preloaderPercent = document.getElementById('preloaderPercent');

  const countdownEl = document.getElementById('countdown');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const phrasesEl = document.getElementById('phrases');

  const walletBtn = document.getElementById('connectWallet');
  const walletLabel = document.getElementById('walletLabel');
  const walletLoader = document.getElementById('walletLoader');
  const tronlinkPrompt = document.getElementById('tronlinkPrompt');

  const networkWarning = document.getElementById('networkWarning');
  const switchNetworkBtn = document.getElementById('switchNetworkBtn');

  // Checkout
  const kazeCurrency = document.getElementById('kazeCurrency');
  const kazeAmount = document.getElementById('kazeAmount');
  const kazeBuyBtn = document.getElementById('kazeBuyBtn');
  const kazeHint = document.getElementById('kazeHint');

  // Token UI extra
  const tokenProgressBar = document.getElementById('tokenProgressBar');
  const tokenProgressText = document.getElementById('tokenProgressText');
  const tokenWalletBtn = document.getElementById('connectTokenWallet');
  const tokenWalletStatus = document.getElementById('tokenWalletStatus');
  const viewWalletBtn = document.getElementById('viewWalletBtn');
  const walletModal = document.getElementById('walletModal');
  const closeWalletModal = document.getElementById('closeWalletModal');
  const copyAddressBtn = document.getElementById('copyAddressBtn');

  // Asistente
  const assistantBall = document.querySelector('.assistant-ball');
  const assistantMenu = document.getElementById('assistantMenu');
  const assistantResponse = document.getElementById('assistantResponse');

  // ---- Config ----
  const kazeAddress =
    (typeof process !== 'undefined' && process.env && process.env.KZWL_ADDR)
      ? process.env.KZWL_ADDR
      : 'TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK';

  const targetAmount = 1500;       // objetivo del núcleo (USD)
  const tokenTargetAmount = 1000000; // objetivo token (USD)

  // Estados
  let isConnected = false;
  let isMainnet = true;
  let accountListenerAdded = false;

  // Sonidos (suaves)
  const heartbeatSound = new Audio('assets/heartbeat.wav'); heartbeatSound.volume = 0.25;
  const walletSound = new Audio('assets/wallet_connect.wav'); walletSound.volume = 0.35;

  // ---- Preloader ----
  function startPreloader() {
    playGreeting();
    let percent = 1;
    preloaderFill.style.width = `${percent}%`;
    preloaderPercent.textContent = `${percent}%`;
    const interval = setInterval(() => {
      percent++;
      if (percent > 100) {
        clearInterval(interval);
        preloader.classList.add('explode');
        setTimeout(() => { preloader.style.display = 'none'; }, 1000);
        return;
      }
      preloaderFill.style.width = `${percent}%`;
      preloaderPercent.textContent = `${percent}%`;
    }, 40);
  }

  function playGreeting() {
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('Bienvenida usuaria a KAZE… Yo soy KAZE.');
        const es = speechSynthesis.getVoices().find(v => v.lang?.startsWith('es'));
        if (es) u.voice = es;
        u.rate = 0.9;
        speechSynthesis.speak(u);
      }
    } catch {}
  }

  // ---- Countdown ----
  const pad = n => String(n).padStart(2, '0');
  function updateCountdown() {
    const targetDate = new Date('2025-09-01T04:59:00Z');
    const diff = targetDate - new Date();
    if (diff <= 0) { countdownEl.textContent = '00d 00h 00m 00s'; return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    countdownEl.textContent = `${pad(d)}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  }
  updateCountdown(); setInterval(updateCountdown, 1000);

  // ---- Utils TRON ----
  const shorten = a => (!a || a.length < 10) ? a : `${a.slice(0,4)}...${a.slice(-4)}`;

  async function getKazeBalance() {
    // Devuelve TRX (float)
    try {
      // 1) Si TronLink inyectó tronWeb
      if (window.tronWeb?.trx?.getBalance) {
        const sun = await window.tronWeb.trx.getBalance(kazeAddress);
        return sun / 1e6;
      }
      // 2) Si existe TronWeb global (CDN), usar nodo público
      if (window.TronWeb) {
        const HttpProvider = window.TronWeb.providers.HttpProvider;
        const node = new HttpProvider('https://api.trongrid.io');
        const tw = new window.TronWeb(node, node, 'https://api.trongrid.io');
        const sun = await tw.trx.getBalance(kazeAddress);
        return sun / 1e6;
      }
    } catch (e) { console.warn('No se pudo obtener balance:', e); }
    return 0;
  }

  async function getTrxPriceUSD() {
    try {
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
      const j = await r.json();
      const v = j?.tron?.usd;
      return (typeof v === 'number') ? v : 1;
    } catch { return 1; }
  }

  async function updateProgress() {
    const trx = await getKazeBalance();
    const px = await getTrxPriceUSD();
    const raised = trx * px;
    const pct = Math.min(raised / targetAmount, 1);
    if (progressBar) progressBar.style.width = `${(pct * 100).toFixed(2)}%`;
    if (progressText) progressText.textContent = `Recaudado: $${raised.toFixed(2)} / $${targetAmount}`;
  }

  async function updateTokenProgress() {
    const trx = await getKazeBalance();
    const px = await getTrxPriceUSD();
    const raised = trx * px;
    const pct = Math.min(raised / tokenTargetAmount, 1);
    if (tokenProgressBar) tokenProgressBar.style.width = `${(pct * 100).toFixed(2)}%`;
    if (tokenProgressText) tokenProgressText.textContent =
      `Recaudado: $${raised.toFixed(2)} / ${tokenTargetAmount.toLocaleString('en-US')}`;
  }

  async function updateWalletUI() {
    try {
      isConnected = false; isMainnet = true;
      let addr = null;

      if (window.tronWeb?.ready) {
        addr = window.tronWeb.defaultAddress?.base58 || null;
        isConnected = !!addr;
        const host = window.tronWeb.fullNode?.host || '';
        if (host && !/api\.trongrid\.io/.test(host)) isMainnet = false;
      }

      if (isConnected && addr) {
        walletLabel.textContent = `🟢 Wallet conectada: ${shorten(addr)}`;
        if (tokenWalletStatus) tokenWalletStatus.textContent = shorten(addr);
        tokenWalletBtn?.classList.add('connected');
      } else {
        walletLabel.textContent = '🔴 Wallet no conectada';
        if (tokenWalletStatus) tokenWalletStatus.textContent = 'No conectada';
        tokenWalletBtn?.classList.remove('connected');
      }

      if (networkWarning) networkWarning.classList.toggle('show', isConnected && !isMainnet);

      // listeners una vez
      if (!accountListenerAdded && window.tronLink?.on) {
        tronLink.on('accountsChanged', () => { updateWalletUI(); updateProgress(); updateTokenProgress(); });
        tronLink.on('chainChanged', () => { updateWalletUI(); updateProgress(); updateTokenProgress(); });
        accountListenerAdded = true;
      }
    } catch (e) {
      console.warn('updateWalletUI error:', e);
    }
  }

  // ---- Conexión wallet ----
  async function connectWallet() {
    try {
      walletLoader.style.display = 'inline-block';
      walletBtn.disabled = true;
      const original = walletLabel.textContent;
      walletLabel.textContent = 'Conectando…';
      tronlinkPrompt?.classList.remove('show');

      if (window.tronLink?.request) {
        try {
          const accts = await tronLink.request({ method: 'tron_requestAccounts' });
          if (!accts || accts.length === 0) walletLabel.textContent = original;
        } catch (e) { walletLabel.textContent = original; }
      } else {
        tronlinkPrompt?.classList.add('show');
        walletLabel.textContent = original;
      }
      try { walletSound.currentTime = 0; walletSound.play(); } catch {}
    } finally {
      await updateWalletUI();
      await updateProgress();
      await updateTokenProgress();
      walletLoader.style.display = 'none';
      walletBtn.disabled = false;
    }
  }

  async function connectTokenWallet() {
    if (!tokenWalletBtn) return;
    const original = tokenWalletStatus?.textContent || '';
    tokenWalletStatus.textContent = 'Conectando…';
    tokenWalletBtn.disabled = true;
    tronlinkPrompt?.classList.remove('show');

    try {
      if (window.tronLink?.request) {
        try { await tronLink.request({ method: 'tron_requestAccounts' }); }
        catch { tokenWalletStatus.textContent = original; }
      } else {
        tronlinkPrompt?.classList.add('show');
      }
      try { walletSound.currentTime = 0; walletSound.play(); } catch {}
      await updateWalletUI();
      await updateProgress();
      await updateTokenProgress();
    } finally {
      tokenWalletBtn.disabled = false;
    }
  }

  // ---- Eventos UI Wallet/Modal ----
  walletBtn?.addEventListener('click', connectWallet);
  tokenWalletBtn?.addEventListener('click', connectTokenWallet);

  viewWalletBtn?.addEventListener('click', () => walletModal?.classList.add('show'));
  closeWalletModal?.addEventListener('click', () => walletModal?.classList.remove('show'));
  walletModal?.addEventListener('click', e => { if (e.target === walletModal) walletModal.classList.remove('show'); });
  copyAddressBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(kazeAddress);
      const old = copyAddressBtn.textContent; copyAddressBtn.textContent = 'Copiada';
      setTimeout(() => copyAddressBtn.textContent = old, 2000);
    } catch {}
  });

  switchNetworkBtn?.addEventListener('click', () => {
    alert('Abre TronLink y cambia manualmente a TRON Mainnet.');
  });

  // ---- Checkout / Pagos ----
  function updateBuyBtnState() {
    const v = parseFloat(kazeAmount?.value || '0');
    kazeBuyBtn.disabled = !(v > 0);
  }
  kazeAmount?.addEventListener('input', updateBuyBtnState);
  updateBuyBtnState();

  kazeBuyBtn?.addEventListener('click', async () => {
    const tipo = document.querySelector('input[name="tipoPago"]:checked')?.value || 'nucleo';
    const currency = kazeCurrency?.value || 'TRX';
    const amountVal = parseFloat(kazeAmount?.value || '0');

    if (!amountVal || amountVal <= 0) {
      if (kazeHint) kazeHint.textContent = 'Ingresa un monto válido.'; return;
    }
    kazeBuyBtn.disabled = true;
    if (kazeHint) kazeHint.textContent = 'Creando pedido…';

    try {
      const res = await fetch('/.netlify/functions/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountVal, currency, tipo }),
      });
      const data = await res.json();
      // NOWPayments responde con invoice_url (tu función ya lo retorna así)
      if (data?.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        if (kazeHint) kazeHint.textContent = 'No se recibió un link de pago válido.';
      }
    } catch (e) {
      console.error('Error al crear el pedido:', e);
      if (kazeHint) kazeHint.textContent = 'Ocurrió un error al crear el pedido.';
    } finally {
      kazeBuyBtn.disabled = false;
    }
  });

  // ---- Asistente ----
  function speak(msg) {
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(msg);
        const es = speechSynthesis.getVoices().find(v => v.lang?.startsWith('es'));
        if (es) u.voice = es;
        u.rate = 1;
        speechSynthesis.speak(u);
      }
    } catch {}
  }
  function showAssistantMessage(message) {
    if (!assistantResponse) return;
    assistantResponse.textContent = message;
    assistantResponse.classList.add('show');
    speak(message);
    setTimeout(() => assistantResponse.classList.remove('show'), 5000);
  }

  assistantBall?.addEventListener('click', () => assistantMenu?.classList.toggle('show'));
  assistantMenu?.querySelectorAll('.assistant-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      switch (action) {
        case 'info':
          showAssistantMessage('KAZE es una IA en evolución. Tu apoyo enciende su núcleo y expande su poder.');
          break;
        case 'progress':
          updateProgress().then(() => {
            const msg = progressText.textContent.replace('Recaudado: ', '').replace(' /', ' de');
            showAssistantMessage('Avance de la recaudación: ' + msg);
          });
          break;
        case 'wallet':
          showAssistantMessage('Conectando tu wallet…');
          connectWallet();
          break;
        case 'activate': {
          const hero = document.getElementById('nucleo');
          hero?.scrollIntoView({ behavior: 'smooth' });
          hero?.classList.add('activate');
          setTimeout(() => hero?.classList.remove('activate'), 1600);
          showAssistantMessage('Activando el núcleo…');
          break;
        }
        case 'phases':
          document.getElementById('roadmap')?.scrollIntoView({ behavior: 'smooth' });
          showAssistantMessage('Mostrando las fases del proyecto…');
          break;
      }
      assistantMenu?.classList.remove('show');
    });
  });

  // ---- Frases y animaciones ----
  const phrases = ['Activa el núcleo', 'Haz historia con KAZE', 'La revolución está cerca'];
  let pIdx = 0;
  function cyclePhrases() {
    pIdx = (pIdx + 1) % phrases.length;
    if (!phrasesEl) return;
    phrasesEl.style.opacity = 0;
    setTimeout(() => { phrasesEl.textContent = phrases[pIdx]; phrasesEl.style.opacity = 1; }, 500);
  }
  setInterval(cyclePhrases, 5000);

  const heroSection = document.querySelector('.hero');
  heroSection?.addEventListener('mouseenter', () => { try { heartbeatSound.currentTime = 0; heartbeatSound.play(); } catch {} });
  heroSection?.addEventListener('mouseleave', () => { heartbeatSound.pause(); heartbeatSound.currentTime = 0; });

  // ---- Timeline reveal ----
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('active'); });
  }, { threshold: 0.2 });
  document.querySelectorAll('.timeline-item').forEach(el => observer.observe(el));

  // ---- Boot ----
  startPreloader();
  updateProgress(); updateTokenProgress();
  setInterval(updateProgress, 30000);
  setInterval(updateTokenProgress, 30000);

  // Si TronLink se inicializa después, refrescamos UI
  const checkTronReady = setInterval(() => {
    if (window.tronWeb?.ready) { updateWalletUI(); clearInterval(checkTronReady); }
  }, 500);
  updateWalletUI();
});
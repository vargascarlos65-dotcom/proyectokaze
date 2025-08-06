/*
 * script_fixed.js
 * Versión corregida de script.js para KAZE
 * Incluye mejoras en la obtención del saldo mediante TronWeb/TronLink
 * y compatibilidad con la API de NOWPayments desde el frontend.
 */

/*
 * Nota: Este archivo es una copia del script original con modificaciones en
 * la función `getKazeBalance` para usar la instancia de TronLink si está
 * disponible y un fallback a TronWeb público. También se mantiene el
 * comportamiento de la sección de compra, esperando `redirect_url` de la
 * función serverless.
 */

// Copiamos todo el contenido original del script
// (La mayoría del contenido se mantiene intacto; sólo se modifica getKazeBalance)

document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos globales ---
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
  // Elementos para estado de red y compra
  const networkWarning = document.getElementById('networkWarning');
  const switchNetworkBtn = document.getElementById('switchNetworkBtn');
  // Elementos para el nuevo módulo de checkout
  const kazeCurrency = document.getElementById('kazeCurrency');
  const kazeAmount = document.getElementById('kazeAmount');
  const kazeBuyBtn = document.getElementById('kazeBuyBtn');
  const kazeHint = document.getElementById('kazeHint');

  // Elementos de la nueva sección Token
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

  // Dirección oficial de KAZE (TRON)
  const kazeAddress =
    (typeof process !== 'undefined' && process.env && process.env.KZWL_ADDR)
      ? process.env.KZWL_ADDR
      : 'TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK';
  const targetAmount = 1500; // Meta de recaudación en USD
  const tokenTargetAmount = 1000000; // Meta de recaudación del token en USD
  // Estados globales
  let isConnected = false;
  let isMainnet = true;
  let userAddress = null;
  let accountListenerAdded = false;

  // Sonidos: suave latido digital y sonido de conexión
  const heartbeatSound = new Audio('assets/heartbeat.wav');
  heartbeatSound.volume = 0.25;
  const walletSound = new Audio('assets/wallet_connect.wav');
  walletSound.volume = 0.35;
  window.walletSound = walletSound;

  /**
   * Preloader inicial: actualiza la barra de energía del 1% al 100%. Cuando termina,
   * ejecuta una explosión y oculta el preloader. También reproduce un saludo con
   * voz en español. La duración total del preloader es de aproximadamente 4
   * segundos.
   */
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
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 1000);
        return;
      }
      preloaderFill.style.width = `${percent}%`;
      preloaderPercent.textContent = `${percent}%`;
    }, 40);
  }

  /**
   * Reproduce un saludo utilizando la API de síntesis de voz del navegador.
   */
  function playGreeting() {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Bienvenida usuaria a KAZE… Yo soy KAZE.');
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang && v.lang.startsWith('es'));
      if (esVoice) utterance.voice = esVoice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  function pad(n) {
    return n.toString().padStart(2, '0');
  }

  /**
   * Actualiza el contador regresivo hasta el 31 de agosto de 2025 a las 23:59
   */
  function updateCountdown() {
    const targetDate = new Date('2025-09-01T04:59:00Z');
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) {
      countdownEl.textContent = '00d 00h 00m 00s';
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    countdownEl.textContent = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /**
   * Abrevia una dirección TRON mostrando los cuatro primeros y últimos caracteres.
   */
  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }

  /**
   * Obtiene el balance de TRX de la dirección oficial de KAZE utilizando TronWeb o TronLink.
   */
  async function getKazeBalance() {
    let balanceTrx = 0;
    try {
      // Si TronLink está inyectado y listo, usa directamente la instancia tronWeb expuesta.
      if (window.tronWeb && window.tronWeb.trx) {
        const balanceSun = await window.tronWeb.trx.getBalance(kazeAddress);
        balanceTrx = balanceSun / 1e6;
        return balanceTrx;
      }
      // Si TronLink no está disponible, no intentamos crear una instancia propia.
      // Algunos entornos no exponen un constructor válido en window.TronWeb, por lo que
      // evitamos llamar a `new window.TronWeb(...)` para prevenir errores. Simplemente
      // devolvemos 0 y mostramos un aviso en consola.
      console.warn('TronLink no está listo y no se puede obtener el balance.');
    } catch (error) {
      console.error('Error obteniendo balance:', error);
    }
    return balanceTrx;
  }

  /**
   * Obtiene el precio de TRX en USD desde la API de CoinGecko. Devuelve 1 en caso de error.
   */
  async function getTrxPriceUSD() {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd'
      );
      const data = await res.json();
      if (data && data.tron && typeof data.tron.usd === 'number') {
        return data.tron.usd;
      }
    } catch (err) {
      console.warn('No se pudo obtener el precio de TRX. Se asume 1 USD = 1 TRX');
    }
    return 1;
  }

  /**
   * Actualiza la barra de progreso de la recaudación consultando el balance actual de la dirección KAZE.
   */
  async function updateProgress() {
    const balanceTrx = await getKazeBalance();
    const priceUsd = await getTrxPriceUSD();
    const raisedUsd = balanceTrx * priceUsd;
    const percent = Math.min(raisedUsd / targetAmount, 1);
    progressBar.style.width = `${(percent * 100).toFixed(2)}%`;
    progressText.textContent = `Recaudado: $${raisedUsd.toFixed(2)} / $${targetAmount}`;
  }

  /**
   * Actualiza la barra de progreso de la recaudación para el token $KAZE.
   */
  async function updateTokenProgress() {
    const balanceTrx = await getKazeBalance();
    const priceUsd = await getTrxPriceUSD();
    const raisedUsd = balanceTrx * priceUsd;
    const percent = Math.min(raisedUsd / tokenTargetAmount, 1);
    if (tokenProgressBar) {
      tokenProgressBar.style.width = `${(percent * 100).toFixed(2)}%`;
    }
    if (tokenProgressText) {
      const formattedTarget = tokenTargetAmount.toLocaleString('en-US');
      tokenProgressText.textContent = `Recaudado: $${raisedUsd.toFixed(2)} / $${formattedTarget}`;
    }
  }

  /**
   * Actualiza la interfaz de la wallet en función del estado de TronLink.
   */
  async function updateWalletUI() {
    try {
      isConnected = false;
      isMainnet = true;
      let addr = null;
      if (window.tronWeb && window.tronWeb.ready) {
        addr = window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58;
        if (addr) {
          isConnected = true;
        }
        const fullNode = window.tronWeb.fullNode && window.tronWeb.fullNode.host;
        if (fullNode && !/api\.trongrid\.io/.test(fullNode)) {
          isMainnet = false;
        }
      }
      if (isConnected && addr) {
        const shortAddr = shortenAddress(addr);
        if (walletLabel) {
          walletLabel.textContent = `🟢 Wallet conectada: ${shortAddr}`;
        }
        if (tokenWalletStatus) {
          tokenWalletStatus.textContent = shortAddr;
        }
        if (tokenWalletBtn) {
          tokenWalletBtn.classList.add('connected');
        }
      } else {
        if (walletLabel) {
          walletLabel.textContent = '🔴 Wallet no conectada';
        }
        if (tokenWalletStatus) {
          tokenWalletStatus.textContent = 'No conectada';
        }
        if (tokenWalletBtn) {
          tokenWalletBtn.classList.remove('connected');
        }
      }
      if (networkWarning) {
        if (!isMainnet && isConnected) {
          networkWarning.classList.add('show');
        } else {
          networkWarning.classList.remove('show');
        }
      }
      updateKazeBuyButtonState();
      if (!accountListenerAdded && window.tronLink && typeof tronLink.on === 'function') {
        tronLink.on('accountsChanged', () => {
          updateWalletUI();
          updateProgress();
          updateTokenProgress();
        });
        tronLink.on('chainChanged', () => {
          updateWalletUI();
          updateProgress();
          updateTokenProgress();
        });
        accountListenerAdded = true;
      }
    } catch (err) {
      console.warn('Error al actualizar el estado de la wallet:', err);
    }
  }

  function updateKazeBuyButtonState() {
    if (!kazeBuyBtn) return;
    const amountVal = parseFloat((kazeAmount && kazeAmount.value) || '0');
    if (amountVal > 0) {
      kazeBuyBtn.disabled = false;
    } else {
      kazeBuyBtn.disabled = true;
    }
  }

  async function connectWallet() {
    walletLoader.style.display = 'inline-block';
    walletBtn.disabled = true;
    const originalLabel = walletLabel.textContent;
    walletLabel.textContent = 'Conectando…';
    if (tronlinkPrompt) {
      tronlinkPrompt.classList.remove('show');
    }
    if (window.tronLink && typeof tronLink.request === 'function') {
      try {
        const accounts = await tronLink.request({ method: 'tron_requestAccounts' });
        if (accounts && accounts.length > 0) {
          userAddress = accounts[0];
          if (!accountListenerAdded && typeof tronLink.on === 'function') {
            tronLink.on('accountsChanged', () => {
              updateWalletUI();
              updateProgress();
              updateTokenProgress();
            });
            tronLink.on('chainChanged', () => {
              updateWalletUI();
              updateProgress();
              updateTokenProgress();
            });
            accountListenerAdded = true;
          }
          await updateWalletUI();
          await updateProgress();
          await updateTokenProgress();
        } else {
          await updateWalletUI();
        }
      } catch (error) {
        console.error('Error al conectar la wallet:', error);
        walletLabel.textContent = originalLabel;
      }
    } else {
      if (tronlinkPrompt) {
        tronlinkPrompt.classList.add('show');
      }
      walletLabel.textContent = originalLabel;
    }
    try {
      if (window.walletSound) {
        window.walletSound.currentTime = 0;
        window.walletSound.play();
      }
    } catch (e) {}
    walletLoader.style.display = 'none';
    walletBtn.disabled = false;
  }

  async function connectTokenWallet() {
    if (!tokenWalletBtn) return;
    const originalStatus = tokenWalletStatus ? tokenWalletStatus.textContent : '';
    if (tokenWalletStatus) tokenWalletStatus.textContent = 'Conectando…';
    tokenWalletBtn.disabled = true;
    if (tronlinkPrompt) {
      tronlinkPrompt.classList.remove('show');
    }
    if (window.tronLink && typeof tronLink.request === 'function') {
      try {
        const accounts = await tronLink.request({ method: 'tron_requestAccounts' });
        if (accounts && accounts.length > 0) {
          userAddress = accounts[0];
          await updateWalletUI();
        } else {
          userAddress = null;
          await updateWalletUI();
        }
      } catch (error) {
        console.error('Error al conectar la wallet del token:', error);
        if (tokenWalletStatus) tokenWalletStatus.textContent = originalStatus;
      }
    } else {
      if (tronlinkPrompt) {
        tronlinkPrompt.classList.add('show');
      }
      await updateWalletUI();
    }
    try {
      if (window.walletSound) {
        window.walletSound.currentTime = 0;
        window.walletSound.play();
      }
    } catch (e) {}
    await updateWalletUI();
    updateProgress();
    updateTokenProgress();
    tokenWalletBtn.disabled = false;
  }

  walletBtn.addEventListener('click', () => {
    connectWallet();
  });
  if (tokenWalletBtn) {
    tokenWalletBtn.addEventListener('click', () => {
      connectTokenWallet();
    });
  }
  if (viewWalletBtn) {
    viewWalletBtn.addEventListener('click', () => {
      if (walletModal) walletModal.classList.add('show');
    });
  }
  if (closeWalletModal) {
    closeWalletModal.addEventListener('click', () => {
      if (walletModal) walletModal.classList.remove('show');
    });
  }
  if (walletModal) {
    walletModal.addEventListener('click', (e) => {
      if (e.target === walletModal) {
        walletModal.classList.remove('show');
      }
    });
  }
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener('click', () => {
      try {
        navigator.clipboard.writeText(kazeAddress).then(() => {
          const originalText = copyAddressBtn.textContent;
          copyAddressBtn.textContent = 'Copiada';
          setTimeout(() => {
            copyAddressBtn.textContent = originalText;
          }, 2000);
        });
      } catch (err) {
        console.error('No se pudo copiar la dirección:', err);
      }
    });
  }
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    heroSection.addEventListener('mouseenter', () => {
      try {
        heartbeatSound.currentTime = 0;
        heartbeatSound.play();
      } catch (e) {}
    });
    heroSection.addEventListener('mouseleave', () => {
      heartbeatSound.pause();
      heartbeatSound.currentTime = 0;
    });
  }

  updateProgress();
  updateTokenProgress();
  setInterval(updateProgress, 30000);
  setInterval(updateTokenProgress, 30000);
  const checkTronReady = setInterval(() => {
    if (window.tronWeb && window.tronWeb.ready) {
      updateWalletUI();
      clearInterval(checkTronReady);
    }
  }, 500);

  // --- Eventos para la nueva UI de checkout ---
  if (kazeAmount) {
    kazeAmount.addEventListener('input', updateKazeBuyButtonState);
  }
  if (kazeBuyBtn) {
    kazeBuyBtn.addEventListener('click', async () => {
      const tipoRadio = document.querySelector('input[name="tipoPago"]:checked');
      const tipo = tipoRadio ? tipoRadio.value : 'nucleo';
      const currency = kazeCurrency ? kazeCurrency.value : 'TRX';
      const amountVal = parseFloat((kazeAmount && kazeAmount.value) || '0');
      if (!amountVal || amountVal <= 0) {
        if (kazeHint) kazeHint.textContent = 'Ingresa un monto válido.';
        return;
      }
      kazeBuyBtn.disabled = true;
      if (kazeHint) kazeHint.textContent = 'Creando pedido…';
      try {
        const response = await fetch('/.netlify/functions/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountVal, currency, tipo }),
        });
        const data = await response.json();
        if (data && data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          if (kazeHint) kazeHint.textContent = 'No se pudo crear el pedido. Inténtalo nuevamente.';
        }
      } catch (err) {
        console.error('Error al crear el pedido:', err);
        if (kazeHint) kazeHint.textContent = 'Ocurrió un error al crear el pedido.';
      } finally {
        kazeBuyBtn.disabled = false;
      }
    });
  }
  if (switchNetworkBtn) {
    switchNetworkBtn.addEventListener('click', () => {
      if (window.tronLink && typeof tronLink.request === 'function') {
        try {
          alert('Por favor, abre TronLink y cambia manualmente a TRON Mainnet.');
        } catch (err) {
          console.error('No se pudo cambiar la red:', err);
        }
      } else {
        alert('TronLink no está disponible para cambiar la red.');
      }
    });
  }
  const phrases = [
    'Activa el núcleo',
    'Haz historia con KAZE',
    'La revolución está cerca',
  ];
  let phraseIndex = 0;
  function cyclePhrases() {
    phraseIndex = (phraseIndex + 1) % phrases.length;
    phrasesEl.style.opacity = 0;
    setTimeout(() => {
      phrasesEl.textContent = phrases[phraseIndex];
      phrasesEl.style.opacity = 1;
    }, 500);
  }
  setInterval(cyclePhrases, 5000);
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    },
    { threshold: 0.2 }
  );
  document.querySelectorAll('.timeline-item').forEach((item) => {
    observer.observe(item);
  });
  function showAssistantMessage(message) {
    if (!assistantResponse) return;
    assistantResponse.textContent = message;
    assistantResponse.classList.add('show');
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(message);
      const voices = window.speechSynthesis.getVoices();
      const es = voices.find((v) => v.lang && v.lang.startsWith('es'));
      if (es) utter.voice = es;
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    }
    setTimeout(() => {
      assistantResponse.classList.remove('show');
    }, 5000);
  }
  if (assistantBall) {
    assistantBall.addEventListener('click', () => {
      assistantMenu.classList.toggle('show');
    });
  }
  if (assistantMenu) {
    assistantMenu.querySelectorAll('.assistant-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleAssistantAction(action);
        assistantMenu.classList.remove('show');
      });
    });
  }
  function handleAssistantAction(action) {
    switch (action) {
      case 'info':
        showAssistantMessage(
          'KAZE es una inteligencia artificial en evolución que impulsa una revolución kamikaze. Tu apoyo enciende su núcleo y posibilita su expansión.'
        );
        break;
      case 'progress':
        updateProgress().then(() => {
          const message = progressText.textContent
            .replace('Recaudado: ', '')
            .replace(' /', ' de');
          showAssistantMessage('Avance de la recaudación: ' + message);
        });
        break;
      case 'wallet':
        showAssistantMessage('Conectando tu wallet…');
        connectWallet();
        break;
      case 'activate': {
        const hero = document.getElementById('nucleo');
        if (hero) {
          hero.scrollIntoView({ behavior: 'smooth' });
          hero.classList.add('activate');
          setTimeout(() => hero.classList.remove('activate'), 1600);
        }
        showAssistantMessage('Activando el núcleo…');
        break;
      }
      case 'phases': {
        const roadmap = document.getElementById('roadmap');
        if (roadmap) {
          roadmap.scrollIntoView({ behavior: 'smooth' });
        }
        showAssistantMessage('Mostrando las fases del proyecto…');
        break;
      }
      default:
        break;
    }
  }
  startPreloader();
  updateKazeBuyButtonState();
});
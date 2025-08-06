/*
 * script.js
 * Lógica interactiva para la página KAZE
 * Incluye preloader con barra de energía, conexión TronLink y actualización de saldo,
 * sonidos suaves, asistente visual y animaciones.
 */

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
  const kazeAddress = process.env.KAZE_WALLET;
  const targetAmount = 1500; // Meta de recaudación en USD
  const tokenTargetAmount = 1000000; // Meta de recaudación del token en USD
  // Estados globales
  let isConnected = false;
  let isMainnet = true;
  let userAddress = null;
  let accountListenerAdded = false;

  // Sonidos: suave latido digital y sonido de conexión
  // Sonidos digitalizados: latido suave y conexión. Se genera un latido más
  // profundo y un tono de conexión con fundido para no resultar molesto.
  const heartbeatSound = new Audio('assets/heartbeat.wav');
  // Mantener el volumen bajo para que acompañe de manera sutil
  heartbeatSound.volume = 0.25;
  const walletSound = new Audio('assets/wallet_connect.wav');
  walletSound.volume = 0.35;
  // Hacer accesible globalmente el sonido de la wallet
  window.walletSound = walletSound;

  /**
   * Preloader inicial: actualiza la barra de energía del 1% al 100%. Cuando termina,
   * ejecuta una explosión y oculta el preloader. También reproduce un saludo con
   * voz en español. La duración total del preloader es de aproximadamente 4
   * segundos.
   */
  function startPreloader() {
    // Saludo inicial
    playGreeting();
    let percent = 1;
    preloaderFill.style.width = `${percent}%`;
    preloaderPercent.textContent = `${percent}%`;
    const interval = setInterval(() => {
      percent++;
      if (percent > 100) {
        clearInterval(interval);
        // Ejecutar explosión y ocultar preloader
        preloader.classList.add('explode');
        setTimeout(() => {
          preloader.style.display = 'none';
        }, 1000);
        return;
      }
      preloaderFill.style.width = `${percent}%`;
      preloaderPercent.textContent = `${percent}%`;
    }, 40); // 40 ms * 100 = 4000 ms
  }

  /**
   * Reproduce un saludo utilizando la API de síntesis de voz del navegador.
   * Se intenta seleccionar una voz en español; en caso contrario, usa la voz
   * predeterminada. El mensaje es personalizado para dar la bienvenida.
   */
  function playGreeting() {
    if ('speechSynthesis' in window) {
      // Mensaje de bienvenida con puntos suspensivos para dar dramatismo
      const utterance = new SpeechSynthesisUtterance('Bienvenida usuaria a KAZE… Yo soy KAZE.');
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find((v) => v.lang && v.lang.startsWith('es'));
      if (esVoice) utterance.voice = esVoice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  /**
   * Formatea número con cero a la izquierda.
   * @param {number} n
   * @returns {string}
   */
  function pad(n) {
    return n.toString().padStart(2, '0');
  }

  /**
   * Actualiza el contador regresivo hasta el 31 de agosto de 2025 a las 23:59
   * hora de Ecuador (UTC-5). Muestra días, horas, minutos y segundos.
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

  // Llamar al contador y actualizar cada segundo
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /**
   * Abrevia una dirección TRON mostrando los cuatro primeros y últimos
   * caracteres. Ejemplo: TABC...XYZW
   */
  function shortenAddress(addr) {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  }

  /**
   * Obtiene el balance de TRX de la dirección oficial de KAZE utilizando TronWeb.
   * Devuelve el saldo en TRX.
   */
  async function getKazeBalance() {
    let balanceTrx = 0;
    try {
      if (typeof window.TronWeb === 'undefined') {
        console.warn('TronWeb no está disponible.');
        return 0;
      }
      const HttpProvider = window.TronWeb.providers.HttpProvider;
      const fullNode = new HttpProvider('https://api.trongrid.io');
      const solidityNode = new HttpProvider('https://api.trongrid.io');
      const eventServer = 'https://api.trongrid.io';
      const tronWebPublic = new window.TronWeb(fullNode, solidityNode, eventServer);
      const balanceSun = await tronWebPublic.trx.getBalance(kazeAddress);
      balanceTrx = balanceSun / 1e6;
    } catch (error) {
      console.error('Error obteniendo balance:', error);
    }
    return balanceTrx;
  }

  /**
   * Obtiene el precio de TRX en USD desde la API de CoinGecko. Devuelve 1
   * en caso de error.
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
   * Actualiza la barra de progreso de la recaudación consultando el balance
   * actual de la dirección KAZE y el precio de TRX. Muestra en texto el
   * monto recaudado versus la meta.
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
   * Calcula la recaudación total y la representa contra la meta de tokenTargetAmount.
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
   * Detecta si la wallet está conectada y en la red principal y actualiza
   * textos, estilos y el aviso de red.
   */
  async function updateWalletUI() {
    try {
      // Por defecto considerar desconectado
      isConnected = false;
      isMainnet = true;
      let addr = null;
      // Detectar dirección y red si tronWeb está listo
      if (window.tronWeb && window.tronWeb.ready) {
        // Dirección abreviada
        addr = window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58;
        if (addr) {
          isConnected = true;
        }
        // Verificar red: host principal contiene 'api.trongrid.io'
        const fullNode = window.tronWeb.fullNode && window.tronWeb.fullNode.host;
        if (fullNode && !/api\.trongrid\.io/.test(fullNode)) {
          isMainnet = false;
        }
      }
      // Actualizar etiquetas del hero y token en función de conexión
      if (isConnected && addr) {
        const shortAddr = shortenAddress(addr);
        // Mostrar badge con texto "Wallet conectada" y la dirección abreviada
        if (walletLabel) {
          walletLabel.textContent = `🟢 Wallet conectada: ${shortAddr}`;
        }
        if (tokenWalletStatus) {
          // En el botón del token solo se muestra la dirección abreviada
          tokenWalletStatus.textContent = shortAddr;
        }
        if (tokenWalletBtn) {
          tokenWalletBtn.classList.add('connected');
        }
      } else {
        // Desconectado: mostrar estado rojo y texto predeterminado
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
      // Mostrar u ocultar aviso de red
      if (networkWarning) {
        if (!isMainnet && isConnected) {
          networkWarning.classList.add('show');
        } else {
          networkWarning.classList.remove('show');
        }
      }
      // Actualizar el estado del botón de checkout (no depende de la wallet)
      updateKazeBuyButtonState();

      // Registrar listeners de cambios de cuenta y de red si aún no se han agregado
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

  /**
   * Habilita o deshabilita el botón de checkout en función de la cantidad ingresada.
   * Este módulo no depende del estado de la wallet, pues solo prepara un pedido.
   */
  function updateKazeBuyButtonState() {
    if (!kazeBuyBtn) return;
    const amountVal = parseFloat(kazeAmount && kazeAmount.value || '0');
    if (amountVal > 0) {
      kazeBuyBtn.disabled = false;
    } else {
      kazeBuyBtn.disabled = true;
    }
  }

  /**
   * Solicita permiso al usuario para conectar la wallet mediante TronLink. Si
   * TronLink no está instalado, muestra un mensaje con enlace de descarga.
   * Configura un listener para detectar cambios de cuenta y actualiza la
   * dirección mostrada y la recaudación.
   */
  async function connectWallet() {
    // Mostrar loader y deshabilitar botón
    walletLoader.style.display = 'inline-block';
    walletBtn.disabled = true;
    const originalLabel = walletLabel.textContent;
    walletLabel.textContent = 'Conectando…';
    // Ocultar prompt en caso de que estuviera visible
    if (tronlinkPrompt) {
      tronlinkPrompt.classList.remove('show');
    }
    if (window.tronLink && typeof tronLink.request === 'function') {
      try {
        const accounts = await tronLink.request({ method: 'tron_requestAccounts' });
        if (accounts && accounts.length > 0) {
          userAddress = accounts[0];
          // Registrar listener de cambios de cuenta y de red solo una vez
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
          // Actualizar UI y recaudación inmediatamente tras conectar
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
      // TronLink no disponible
      if (tronlinkPrompt) {
        tronlinkPrompt.classList.add('show');
      }
      walletLabel.textContent = originalLabel;
    }
    // Reproducir sonido de conexión
    try {
      if (window.walletSound) {
        window.walletSound.currentTime = 0;
        window.walletSound.play();
      }
    } catch (e) {}
    // Ocultar loader y habilitar botón
    walletLoader.style.display = 'none';
    walletBtn.disabled = false;
  }

  /**
   * Solicita permiso al usuario para conectar la wallet mediante TronLink
   * específicamente para la sección del token. Actualiza el estado del
   * botón y de la etiqueta con la dirección abreviada. Si TronLink no está
   * disponible, muestra el prompt y mantiene el estado desconectado.
   */
  async function connectTokenWallet() {
    if (!tokenWalletBtn) return;
    // Guardar el estado original para restaurarlo en caso de error
    const originalStatus = tokenWalletStatus ? tokenWalletStatus.textContent : '';
    if (tokenWalletStatus) tokenWalletStatus.textContent = 'Conectando…';
    tokenWalletBtn.disabled = true;
    // Ocultar prompt en caso de que estuviera visible
    if (tronlinkPrompt) {
      tronlinkPrompt.classList.remove('show');
    }
    if (window.tronLink && typeof tronLink.request === 'function') {
      try {
        const accounts = await tronLink.request({ method: 'tron_requestAccounts' });
        if (accounts && accounts.length > 0) {
          userAddress = accounts[0];
          // Actualizar UI tras conexión
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
      // TronLink no disponible
      if (tronlinkPrompt) {
        tronlinkPrompt.classList.add('show');
      }
      await updateWalletUI();
    }
    // Reproducir sonido de conexión
    try {
      if (window.walletSound) {
        window.walletSound.currentTime = 0;
        window.walletSound.play();
      }
    } catch (e) {}
    // Actualizar las barras de recaudación y la UI
    await updateWalletUI();
    updateProgress();
    updateTokenProgress();
    tokenWalletBtn.disabled = false;
  }

  // Asignar evento al botón de wallet
  walletBtn.addEventListener('click', () => {
    connectWallet();
  });

  // Asignar evento al botón de conexión de la wallet del token
  if (tokenWalletBtn) {
    tokenWalletBtn.addEventListener('click', () => {
      connectTokenWallet();
    });
  }

  // Mostrar el modal con la dirección al pulsar "Ver Wallet de KAZE"
  if (viewWalletBtn) {
    viewWalletBtn.addEventListener('click', () => {
      if (walletModal) walletModal.classList.add('show');
    });
  }
  // Cerrar modal con botón de cierre
  if (closeWalletModal) {
    closeWalletModal.addEventListener('click', () => {
      if (walletModal) walletModal.classList.remove('show');
    });
  }
  // Cerrar modal si se hace clic fuera del contenido
  if (walletModal) {
    walletModal.addEventListener('click', (e) => {
      if (e.target === walletModal) {
        walletModal.classList.remove('show');
      }
    });
  }
  // Copiar la dirección al portapapeles
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

  // Reproducir latido al pasar sobre el núcleo
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

  // Inicializar progreso de recaudación al cargar y actualizar cada 30s
  updateProgress();
  updateTokenProgress();
  setInterval(updateProgress, 30000);
  setInterval(updateTokenProgress, 30000);

  // Esperar a que TronLink/TronWeb esté listo y actualizar la UI si ya está conectado
  const checkTronReady = setInterval(() => {
    if (window.tronWeb && window.tronWeb.ready) {
      updateWalletUI();
      clearInterval(checkTronReady);
    }
  }, 500);

  // --- Eventos para la nueva UI de checkout ---
  // Habilitar/deshabilitar botón según la cantidad ingresada
  if (kazeAmount) {
    kazeAmount.addEventListener('input', updateKazeBuyButtonState);
  }
  // Acción de compra para crear un pedido de checkout
  if (kazeBuyBtn) {
    kazeBuyBtn.addEventListener('click', async () => {
      // Leer el tipo de pago seleccionado
      const tipoRadio = document.querySelector('input[name="tipoPago"]:checked');
      const tipo = tipoRadio ? tipoRadio.value : 'nucleo';
      const currency = kazeCurrency ? kazeCurrency.value : 'TRX';
      const amountVal = parseFloat(kazeAmount && kazeAmount.value || '0');
      if (!amountVal || amountVal <= 0) {
        if (kazeHint) kazeHint.textContent = 'Ingresa un monto válido.';
        return;
      }
      // Deshabilitar botón durante la solicitud
      kazeBuyBtn.disabled = true;
      if (kazeHint) kazeHint.textContent = 'Creando pedido…';
      try {
        const response = await fetch('/.netlify/functions/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountVal, currency, tipo }),
        });
        const data = await response.json();
        if (data && data.redirect_url) {
          // Redirigir a la página pendiente
          window.location.href = data.redirect_url;
        } else {
          if (kazeHint) kazeHint.textContent = 'No se pudo crear el pedido. Inténtalo nuevamente.';
        }
      } catch (err) {
        console.error('Error al crear el pedido:', err);
        if (kazeHint) kazeHint.textContent = 'Ocurrió un error al crear el pedido.';
      } finally {
        // Rehabilitar el botón
        kazeBuyBtn.disabled = false;
      }
    });
  }

  // Listener para cambiar de red (visual) – no puede forzar el cambio de red de TronLink
  if (switchNetworkBtn) {
    switchNetworkBtn.addEventListener('click', () => {
      // Intentar solicitar el cambio de red mediante la API de TronLink, si estuviera disponible
      if (window.tronLink && typeof tronLink.request === 'function') {
        try {
          // Muchas versiones de TronLink no soportan wallet_switchChain; mostrar aviso
          // tronLink.request({ method: 'wallet_switchEthereumChain', params: { chainId: '0x2b6653dc' } });
          // Para Tron no existe un método estándar; simplemente mostrar mensaje
          alert('Por favor, abre TronLink y cambia manualmente a TRON Mainnet.');
        } catch (err) {
          console.error('No se pudo cambiar la red:', err);
        }
      } else {
        alert('TronLink no está disponible para cambiar la red.');
      }
    });
  }

  // Frases motivacionales rotativas
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

  // Activación del timeline mediante IntersectionObserver
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

  /**
   * Muestra un mensaje desde el asistente, lo pronuncia con voz y se oculta
   * automáticamente después de unos segundos.
   * @param {string} message
   */
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

  // Alternar menú del asistente
  if (assistantBall) {
    assistantBall.addEventListener('click', () => {
      assistantMenu.classList.toggle('show');
    });
  }
  // Manejo de opciones del asistente
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
          'KAZE es una inteligencia artificial en evolución que impulsa una revolución kamikase. Tu apoyo enciende su núcleo y posibilita su expansión.'
        );
        break;
      case 'progress':
        updateProgress().then(() => {
          const message = progressText.textContent.replace('Recaudado: ', '').replace(' /', ' de');
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

  // Iniciar preloader
  startPreloader();

  // Establecer estado inicial del botón de checkout
  updateKazeBuyButtonState();
});
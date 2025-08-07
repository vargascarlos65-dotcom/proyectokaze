
// script.js final versión segura

const WALLET_KAZE = "TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK";

// ⚡ Preloader que carga sí o sí
let progress = 0;
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

function simulateLoading() {
  const interval = setInterval(() => {
    if (progress < 100) {
      progress++;
      progressBar.style.width = progress + "%";
      progressText.innerText = progress + "%";
    } else {
      clearInterval(interval);
      document.getElementById("preloader").style.display = "none";
      document.getElementById("main-content").style.display = "block";
    }
  }, 25); // Velocidad de carga
}

// ⚙️ Conexión a Tron y balance
async function connectWallet() {
  const walletStatus = document.getElementById("wallet-status");
  try {
    if (!window.tronWeb || !window.tronWeb.ready) {
      walletStatus.innerText = "Wallet no conectada";
      return;
    }

    const address = window.tronWeb.defaultAddress.base58;
    walletStatus.innerText = "Wallet conectada: " + address;

    const balanceSun = await window.tronWeb.trx.getBalance(WALLET_KAZE);
    const balance = balanceSun / 1e6;
    document.getElementById("kaze-balance").innerText = balance.toFixed(2) + " $KAZE";
  } catch (error) {
    console.error("Error al conectar con Tron:", error);
    walletStatus.innerText = "Error al conectar wallet";
  }
}

// 🟢 Iniciar al cargar
window.addEventListener("load", () => {
  simulateLoading();
  setTimeout(connectWallet, 4000); // Intenta conexión después de la carga inicial
});

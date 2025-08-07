document.addEventListener("DOMContentLoaded", async function () {
  // 🌀 OCULTAR PRELOADER AL CARGAR
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.style.display = "none";
  }

  // 🧠 CONFIGURACIÓN WALLET TRON
  const walletBtn = document.getElementById("wallet-btn");
  const walletStatus = document.getElementById("wallet-status");
  const tronWebGlobal = window.tronWeb;
  const KAZE_WALLET = "TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK";

  async function connectWallet() {
    if (window.tronLink) {
      try {
        const res = await window.tronLink.request({ method: "tron_requestAccounts" });
        const address = window.tronWeb.defaultAddress.base58;
        walletStatus.innerText = "Wallet conectada";
        walletStatus.style.color = "#00ffcc";
        walletBtn.style.display = "none";
        console.log("Wallet conectada:", address);
      } catch (err) {
        console.error("Error al conectar wallet:", err);
      }
    } else {
      alert("TronLink no está disponible.");
    }
  }

  if (walletBtn) {
    walletBtn.addEventListener("click", connectWallet);
  }

  // 💰 BOTÓN DE COMPRA (simulado o real)
  const buyBtn = document.getElementById("buy-btn");
  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      alert("Compra simulada activada. ¡Pronto versión real! 🔥");
      // Aquí irá lógica real con create-payment.js si activas NowPayments u otro sistema.
    });
  }

  // 🧪 DEBUG: Confirmar que todo cargó
  console.log("✅ script_preloader_fix.js cargado correctamente.");
});
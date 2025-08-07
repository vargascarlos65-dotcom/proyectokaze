
document.addEventListener("DOMContentLoaded", () => {
  const connectWalletBtn = document.getElementById("connectWallet");
  const walletLabel = document.getElementById("walletLabel");
  const walletLoader = document.getElementById("walletLoader");
  const tronlinkPrompt = document.getElementById("tronlinkPrompt");
  const buyBtn = document.getElementById("kazeBuyBtn");
  const currencySelect = document.getElementById("kazeCurrency");
  const amountInput = document.getElementById("kazeAmount");
  const kazeHint = document.getElementById("kazeHint");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const tokenWalletStatus = document.getElementById("tokenWalletStatus");

  const KAZE_WALLET = "TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK";
  let connected = false;
  let userAddress = "";

  // Preloader
  let load = 1;
  const fill = document.getElementById("preloaderFill");
  const percent = document.getElementById("preloaderPercent");
  const interval = setInterval(() => {
    if (load >= 100) {
      clearInterval(interval);
      document.getElementById("preloader").style.display = "none";
    } else {
      load++;
      fill.style.width = load + "%";
      percent.innerText = load + "%";
    }
  }, 15);

  // Wallet connection
  async function connectWallet() {
    if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
      connected = true;
      userAddress = window.tronWeb.defaultAddress.base58;
      walletLabel.innerText = "Conectado";
      walletLoader.style.display = "none";
      document.getElementById("walletLabel").style.background = "#0f0";
      tokenWalletStatus.innerText = "Conectada";
      document.getElementById("connectTokenWallet").style.background = "#0f0";
    } else {
      tronlinkPrompt.style.display = "block";
    }
  }

  connectWalletBtn.addEventListener("click", async () => {
    walletLoader.style.display = "inline-block";
    await connectWallet();
  });

  // Ver Wallet
  document.getElementById("viewWalletBtn").addEventListener("click", () => {
    document.getElementById("walletModal").style.display = "block";
  });

  document.getElementById("closeWalletModal").addEventListener("click", () => {
    document.getElementById("walletModal").style.display = "none";
  });

  document.getElementById("copyAddressBtn").addEventListener("click", () => {
    const address = document.getElementById("walletAddress").innerText;
    navigator.clipboard.writeText(address);
    alert("Dirección copiada: " + address);
  });

  // Compra o Aporte
  buyBtn.addEventListener("click", async () => {
    if (!connected || !userAddress) {
      kazeHint.innerText = "🔴 Wallet no conectada";
      return;
    }

    const amount = parseFloat(amountInput.value);
    if (!amount || amount <= 0) {
      kazeHint.innerText = "⚠️ Ingresa un monto válido";
      return;
    }

    const currency = currencySelect.value;
    const tipo = document.querySelector('input[name="tipoPago"]:checked').value;

    try {
      kazeHint.innerText = "Procesando transacción...";

      const res = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          tipo,
          orderId: "KAZE-" + Date.now()
        })
      });

      const data = await res.json();
      if (data.invoice_url) {
        window.open(data.invoice_url, "_blank");
        kazeHint.innerText = "✅ Redirigiendo al pago...";
      } else {
        throw new Error("No se recibió URL de pago");
      }
    } catch (err) {
      console.error(err);
      kazeHint.innerText = "❌ Error al procesar el pago";
    }
  });
});

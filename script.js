
const walletStatus = document.getElementById("wallet-status");
const kazeBalance = document.getElementById("kaze-balance");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

let progress = 0;
let progressInterval;

function startPreloader() {
  progressInterval = setInterval(() => {
    if (progress < 100) {
      progress++;
      progressBar.style.width = progress + "%";
      progressText.innerText = progress + "%";
    } else {
      clearInterval(progressInterval);
      document.getElementById("preloader").style.display = "none";
      document.getElementById("main-content").style.display = "block";
    }
  }, 30);
}

async function connectWallet() {
  try {
    if (!window.tronWeb || !window.tronWeb.ready) {
      walletStatus.innerText = "Wallet no conectada";
      return;
    }

    const address = window.tronWeb.defaultAddress.base58;
    walletStatus.innerText = "Wallet conectada: " + address;

    const balanceSun = await window.tronWeb.trx.getBalance("TFYaGdZwUSkHaLgNsG77Li1BcaBU3NE6fK");
    const balance = balanceSun / 1e6;
    kazeBalance.innerText = balance.toFixed(2) + " $KAZE";
  } catch (error) {
    console.error("Error al conectar con Tron:", error);
    walletStatus.innerText = "Error al conectar wallet";
  }
}

async function hacerCompra() {
  const amountInput = document.getElementById("amount");
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount) || amount <= 0) {
    alert("Por favor, ingresa un monto válido.");
    return;
  }

  const response = await fetch("/.netlify/functions/create-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: amount.toFixed(2),
      currency: "TRX",
      tipo: "compra",
      orderId: "orden-" + Date.now()
    })
  });

  const data = await response.json();

  if (data.invoice_url) {
    window.location.href = data.invoice_url;
  } else {
    alert("Error al procesar la compra.");
    console.error(data);
  }
}

window.addEventListener("load", () => {
  startPreloader();
  setTimeout(connectWallet, 4000);
});

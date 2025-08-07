
document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.querySelector(".preloader");
  const walletStatus = document.getElementById("walletStatus");
  const walletAddress = document.getElementById("walletAddress");
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  const buyBtn = document.getElementById("kazeBuyBtn");

  // Ocultar preloader cuando cargue la página
  window.addEventListener("load", () => {
    preloader?.classList.add("hide-preloader");
  });

  // Detectar conexión con TronLink
  const updateWalletStatus = async () => {
    try {
      if (!window.tronWeb || !window.tronWeb.defaultAddress.base58) {
        walletStatus.textContent = "NO CONECTADA";
        walletAddress.textContent = "";
        return;
      }

      const address = window.tronWeb.defaultAddress.base58;
      walletStatus.textContent = "CONECTADA";
      walletAddress.textContent = address;
    } catch (err) {
      console.error("Error al verificar wallet:", err);
    }
  };

  // Conectar Wallet manual
  connectWalletBtn?.addEventListener("click", async () => {
    if (window.tronLink) {
      try {
        await window.tronLink.request({ method: "tron_requestAccounts" });
        updateWalletStatus();
      } catch (e) {
        alert("No se pudo conectar a TronLink.");
      }
    } else {
      alert("TronLink no está instalado.");
    }
  });

  // Revisar conexión al cargar
  setTimeout(updateWalletStatus, 1000);

  // Lógica de botón COMPRAR
  buyBtn?.addEventListener("click", async () => {
    const amount = parseFloat(document.getElementById("kazeAmount")?.value);
    const currency = document.getElementById("kazeCurrency")?.value;
    const tipo = document.querySelector('input[name="tipoPago"]:checked')?.value || "compra";

    if (!amount || amount <= 0) {
      alert("Ingresa un monto válido.");
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, tipo })
      });

      const data = await response.json();
      console.log("Respuesta del servidor:", data);

      if (data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        alert("No se recibió un link de pago válido.");
      }
    } catch (error) {
      console.error("Error al generar pago:", error);
      alert("Hubo un problema al generar el pago.");
    }
  });
});

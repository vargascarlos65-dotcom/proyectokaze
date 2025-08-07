document.addEventListener("DOMContentLoaded", async () => {
  // 💠 Animación inicial (preloader falso si no hay conexión)
  const preloader = document.querySelector(".preloader");
  if (preloader) {
    setTimeout(() => {
      preloader.style.opacity = 0;
      setTimeout(() => preloader.remove(), 500);
    }, 1000);
  }

  // 💠 Detectar wallet y actualizar estado
  const tronButton = document.getElementById("tronLinkBtn");
  const statusBtn = document.getElementById("walletStatus");
  let userAddress = null;

  const updateWalletStatus = async () => {
    if (window.tronWeb && window.tronWeb.ready) {
      userAddress = window.tronWeb.defaultAddress.base58;
      statusBtn.textContent = "CONECTADA";
      statusBtn.classList.remove("desconectada");
      statusBtn.classList.add("conectada");
    } else {
      userAddress = null;
      statusBtn.textContent = "NO CONECTADA";
      statusBtn.classList.remove("conectada");
      statusBtn.classList.add("desconectada");
    }
  };

  if (tronButton) {
    tronButton.addEventListener("click", async () => {
      try {
        if (window.tronLink) {
          await window.tronLink.request({ method: "tron_requestAccounts" });
        }
        await updateWalletStatus();
      } catch (error) {
        console.error("Error al conectar wallet:", error);
        alert("No se pudo conectar la wallet.");
      }
    });
  }

  // Esperar que cargue bien tronWeb
  let retries = 10;
  while ((!window.tronWeb || !window.tronWeb.defaultAddress.base58) && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    retries--;
  }
  await updateWalletStatus();

  // 💠 Lógica del botón "COMPRAR $KAZE"
  const buyBtn = document.getElementById("kazeBuyBtn");

  if (buyBtn) {
    buyBtn.addEventListener("click", async () => {
      const amount = parseFloat(document.getElementById("kazeAmount").value);
      const currency = document.getElementById("kazeCurrency").value;
      const tipo = document.querySelector('input[name="tipoPago"]:checked')?.value || 'compra';

      if (!amount || amount <= 0) {
        alert("Ingresa un monto válido");
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
  }
});

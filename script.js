
document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.getElementById("main-content");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  let progress = 0;
  const interval = setInterval(() => {
    if (progress < 100) {
      progress++;
      if (progressBar) progressBar.style.width = progress + "%";
      if (progressText) progressText.innerText = progress + "%";
    } else {
      clearInterval(interval);
      if (preloader) preloader.style.display = "none";
      if (mainContent) mainContent.style.display = "block";
    }
  }, 25);

  const buyBtn = document.getElementById("kazeBuyBtn");
  if (!buyBtn) return;

  buyBtn.addEventListener("click", async () => {
    const amount = parseFloat(document.getElementById("kazeAmount")?.value);
    const currency = document.getElementById("kazeCurrency")?.value;
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
});

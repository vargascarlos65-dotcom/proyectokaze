
document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.getElementById("preloader");
  const mainContent = document.getElementById("main-content");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  let progress = 0;
  const interval = setInterval(() => {
    if (progress < 100) {
      progress++;
      progressBar.style.width = progress + "%";
      progressText.innerText = progress + "%";
    } else {
      clearInterval(interval);
      if (preloader) preloader.style.display = "none";
      if (mainContent) mainContent.style.display = "block";
    }
  }, 25);
});

async function hacerCompra() {
  const amountInput = document.getElementById("amount");
  const amount = parseFloat(amountInput.value);
  const tipo = document.getElementById("tipo").value || "compra";

  if (isNaN(amount) || amount <= 0) {
    alert("Por favor ingresa un monto válido.");
    return;
  }

  try {
    const response = await fetch("/.netlify/functions/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount.toFixed(2),
        currency: "TRX",
        tipo,
        orderId: "orden-" + Date.now(),
      }),
    });

    const data = await response.json();
    if (data.invoice_url) {
      window.location.href = data.invoice_url;
    } else {
      alert("No se pudo generar la compra.");
      console.error(data);
    }
  } catch (error) {
    alert("Ocurrió un error al procesar la compra.");
    console.error("Error:", error);
  }
}

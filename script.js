document.addEventListener("DOMContentLoaded", () => {
  const buyBtn = document.getElementById("kazeBuyBtn");

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
        window.location.href = data.invoice_url; // Redirige al link de pago
      } else {
        alert("No se recibió un link de pago válido.");
      }
    } catch (error) {
      console.error("Error al generar pago:", error);
      alert("Hubo un problema al generar el pago.");
    }
  });
});
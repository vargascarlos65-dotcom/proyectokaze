/*
 * create-payment.js
 * Función serverless para Netlify que crea una factura en NOWPayments.
 *
 * Esta función espera una solicitud POST con JSON en el cuerpo:
 * {
 *   "amount": <número>,            // Monto que se desea pagar
 *   "currency": "TRX" | "USDTTRC20", // Moneda en que se pagará (TRX por defecto)
 *   "tipo": "compra" | "nucleo"    // Descripción opcional del tipo de compra
 * }
 *
 * Devuelve un JSON con la propiedad `redirect_url` que contiene la URL a la
 * factura generada por NOWPayments. Si ocurre un error, devuelve un JSON
 * con información del error y un statusCode apropiado.
 */

// Importar dinámicamente node-fetch para evitar errores de require en Netlify
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async (event) => {
  // Sólo aceptar solicitudes POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { amount, currency = 'TRX', tipo = 'compra', orderId } = JSON.parse(event.body || '{}');

    // Validar monto
    const value = Number(amount);
    if (!value || isNaN(value) || value <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid amount' }),
      };
    }

    // Asegurar mayúsculas y valores soportados
    const supported = ['TRX', 'USDTTRC20'];
    const payCurrency = supported.includes(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : 'TRX';

    // Construir URLs de retorno basadas en el host de la solicitud
    const host = event.headers['x-forwarded-host'] || event.headers.host;
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    const successUrl = `${baseUrl}/thanks`;
    const cancelUrl = `${baseUrl}/thanks`;

    // Llamar a NOWPayments para crear la factura
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: value,
        price_currency: payCurrency,
        pay_currency: payCurrency,
        order_description: `Compra tipo ${tipo}`,
        payout_address: process.env.KZWL_ADDR,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    const result = await response.json();

    // Si NOWPayments devuelve una URL de factura, enviarla al frontend
    if (result && result.invoice_url) {
      return {
        statusCode: 200,
        body: JSON.stringify({ redirect_url: result.invoice_url }),
      };
    }

    // Manejar errores de la API
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NOWPayments error', details: result }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  }
};
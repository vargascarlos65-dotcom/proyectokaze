// netlify/functions/create-payment.js
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async (event) => {
  // Solo permitimos POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { amount, currency = 'TRX', tipo = 'compra', orderId } = JSON.parse(event.body || '{}');
    const value = Number(amount);
    if (!value || isNaN(value) || value <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    // Monedas válidas
    const supported = ['TRX', 'USDTTRC20'];
    const payCurrency = supported.includes(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : 'TRX';

    // Construimos URLs de retorno basadas en tu dominio
    const host = event.headers['x-forwarded-host'] || event.headers.host;
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    const successUrl = `${baseUrl}/thanks`;
    const cancelUrl = `${baseUrl}/thanks`;

    // Llamada a NOWPayments
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

    // Devolver el URL de pago si todo va bien
    if (result.invoice_url) {
      return { statusCode: 200, body: JSON.stringify({ redirect_url: result.invoice_url }) };
    }

    // La API devolvió un error
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NOWPayments error', details: result }),
    };
  } catch (err) {
    // Falla inesperada
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: err.message }),
    };
  }
};

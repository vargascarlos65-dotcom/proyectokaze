// netlify/functions/create-payment.js
// Crea una factura REAL en NOWPayments y devuelve la invoice_url para redirigir al usuario.

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { amount, currency = 'TRX', tipo = 'compra', orderId } = JSON.parse(event.body || '{}');

    // Validaciones básicas
    const value = Number(amount);
    if (!value || isNaN(value) || value <= 0) {
      return { statusCode: 400, body: 'Invalid amount' };
    }

    const supported = ['TRX', 'USDTTRC20'];
    const payCurrency = supported.includes(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : 'TRX';

    // Dominios/URLs
    const host = event.headers['x-forwarded-host'] || event.headers.host || 'proyectokaze.com';
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${proto}://${host}`;
    const ipnUrl = `${baseUrl}/.netlify/functions/ipn`;

    // Identificación del pedido
    const order_id = orderId || `${tipo}_${Date.now()}`;
    const order_description = tipo === 'nucleo' ? 'Aporte al Núcleo KAZE' : 'Compra de token $KAZE';

    // Llamada a NOWPayments (usa tu API KEY desde variables de entorno: NOW_API_KEY)
    const res = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.NOW_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Mismo par precio/moneda que eligió el usuario (TRX o USDTTRC20)
        price_amount: value,
        price_currency: payCurrency,
        pay_currency: payCurrency,

        // Identificación del pedido (así sabrás si fue Aporte o Compra)
        order_id,
        order_description,

        // Webhook de confirmación
        ipn_callback_url: ipnUrl,

        // El usuario paga la comisión
        is_fee_paid_by_user: true,

        // (Opcional) URLs de retorno
        success_url: `${baseUrl}/checkout/pending?ref=${encodeURIComponent(order_id)}&ok=1`,
        cancel_url: `${baseUrl}/checkout/pending?ref=${encodeURIComponent(order_id)}&cancel=1`
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.invoice_url) {
      console.error('NOWPayments error:', data);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'NOWPayments error', details: data })
      };
    }

    // Devuelve URL real de la factura
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_url: data.invoice_url,
        redirect_url: data.invoice_url, // por compatibilidad con tu frontend
        order_id
      })
    };
  } catch (e) {
    console.error('create-payment failed:', e);
    return { statusCode: 500, body: 'Server error' };
  }
};
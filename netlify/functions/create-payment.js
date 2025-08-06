// netlify/functions/create-payment.js

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed',
    };
  }

  try {
    const { amount, currency = 'TRX', tipo = 'compra', orderId } = JSON.parse(event.body || '{}');

    // Validación
    const value = Number(amount);
    if (!value || isNaN(value) || value <= 0) {
      console.error('Monto inválido:', amount);
      return { statusCode: 400, body: 'Monto inválido' };
    }

    const supported = ['TRX', 'USDTTRC20'];
    const payCurrency = supported.includes(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : 'TRX';

    // Datos del entorno
    const apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error('API KEY no configurada');
      return { statusCode: 500, body: 'API KEY no configurada en el entorno' };
    }

    // Payload para NOWPayments
    const body = {
      price_amount: value,
      price_currency: payCurrency,
      pay_currency: payCurrency,
      ipn_callback_url: 'https://proyectokaze.com/api/ipn',
      order_id: orderId || `order-${Date.now()}`,
      order_description: tipo === 'aporte' ? 'Aporte al Núcleo KAZE' : 'Compra de token $KAZE'
    };

    console.log('Enviando solicitud a NOWPayments con payload:', body);

    // Enviar solicitud
    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    console.log('Respuesta de NOWPayments:', data);

    if (!response.ok) {
      console.error('Error en NOWPayments:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ invoice_url: data.invoice_url })
    };

  } catch (err) {
    console.error('Error general en create-payment:', err);
    return {
      statusCode: 500,
      body: 'Error interno del servidor'
    };
  }
};
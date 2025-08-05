/**
 * Netlify Function: ipn
 *
 * Este endpoint actúa como receptor de notificaciones (IPN) para
 * eventos de pago. En esta versión, simplemente valida que la solicitud
 * sea un POST con JSON válido, imprime el payload y devuelve un
 * código de estado 200.
 *
 * Si en el futuro se integra con un proveedor de pagos, aquí podría
 * verificarse la firma, actualizar bases de datos, enviar correos, etc.
 */

exports.handler = async (event) => {
  // Solo aceptar solicitudes POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  try {
    // Analizar el cuerpo de la solicitud como JSON
    const payload = event.body ? JSON.parse(event.body) : {};
    // Registrar el payload para depuración
    console.log('[IPN]', payload);
    // Responder OK sin lógica adicional
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Error in IPN function:', err);
    // Responder error 400 si el cuerpo no es JSON válido
    return { statusCode: 400, body: 'Invalid JSON' };
  }
};
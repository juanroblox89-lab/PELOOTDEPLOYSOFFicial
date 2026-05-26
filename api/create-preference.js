// api/create-preference.js
// Vercel Serverless Function to securely generate Mercado Pago checkout links using the official SDK
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderId, fullName, email, items, currency, discountPercent } = req.body;

    if (!orderId || !items || !items.length) {
      return res.status(400).json({ error: 'Missing orderId or items' });
    }

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      console.error('MP_ACCESS_TOKEN is not configured on Vercel environment variables');
      return res.status(500).json({ error: 'Mercado Pago Token not configured on server' });
    }

    // Inicializar el SDK Oficial de Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: token });
    const mpPreference = new Preference(client);

    // Mapear items al formato requerido por el SDK oficial
    const mpItems = items.map(item => {
      let unitPrice = Math.max(0, Math.round(Number(item.price)));
      if (discountPercent && Number(discountPercent) > 0) {
        unitPrice = Math.round(unitPrice * (1 - Number(discountPercent) / 100));
      }
      const quantity = Math.max(1, Math.round(Number(item.qty)));
      return {
        id: item.id || '',
        title: item.name ? `${item.name} (Envío Gratis)` : 'Peluche PeLoot (Envío Gratis)',
        quantity: quantity,
        unit_price: unitPrice,
        currency_id: 'COP' // Obligatorio COP para el Mercado Pago de Colombia
      };
    });

    // Crear la preferencia usando la clase del SDK oficial
    const response = await mpPreference.create({
      body: {
        items: mpItems,
        back_urls: {
          success: `https://peloot.shop/success?order_id=${orderId}`,
          failure: `https://peloot.shop/cart`,
          pending: `https://peloot.shop/success?order_id=${orderId}`
        },
        auto_return: 'approved',
        external_reference: orderId,
        payer: {
          name: fullName || '',
          email: email || 'cliente@peloot.com'
        }
      }
    });

    console.log(`[Mercado Pago SDK] Preferencia creada con éxito: ${response.id}`);

    return res.status(200).json({
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point
    });

  } catch (e) {
    console.error('Preference creation error:', e);
    return res.status(500).json({ error: e.message });
  }
}

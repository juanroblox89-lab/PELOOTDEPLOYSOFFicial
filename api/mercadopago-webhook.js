// api/mercadopago-webhook.js
// Vercel Serverless Function to automatically confirm orders on successful Mercado Pago payments

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db;

try {
  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Fallback a inicialización por defecto (útil en entornos locales configurados)
      initializeApp();
    }
  }
  db = getFirestore();
} catch (e) {
  console.error('[Webhook Error] Fallo al inicializar Firebase Admin:', e);
}

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
    const { query } = req;
    
    // Mercado Pago manda el ID del pago en req.body o en la query params
    const type = query.type || req.body.type;
    const dataId = query['data.id'] || (req.body.data && req.body.data.id);

    console.log('[Webhook] Notificación de Mercado Pago:', { type, dataId });

    if (type === 'payment' && dataId) {
      const token = process.env.MP_ACCESS_TOKEN;
      if (!token) {
        console.error('[Webhook Error] MP_ACCESS_TOKEN no está configurado en Vercel');
        return res.status(500).json({ error: 'MP Access Token not configured' });
      }

      // 1. Consultar el estado del pago directamente en la API de Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('[Webhook Error] Fallo al consultar pago en MP:', await response.text());
        return res.status(400).json({ error: 'Failed to fetch payment details from MP' });
      }

      const payment = await response.json();
      const orderId = payment.external_reference; // ID del pedido en Firestore
      const status = payment.status; // 'approved', 'pending', etc.

      console.log(`[Webhook] Pago #${dataId} - Pedido: ${orderId} - Estado: ${status}`);

      // 2. Si el pago es aprobado, actualizar la base de datos
      if (status === 'approved' && orderId) {
        if (!db) {
          console.error('[Webhook Error] Firestore Admin no disponible');
          return res.status(500).json({ error: 'Firestore Admin not initialized' });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          await orderRef.update({
            status: 'confirmed',
            paymentId: dataId,
            updatedAt: new Date()
          });
          console.log(`[Webhook Success] ✅ Pedido #${orderId} confirmado automáticamente.`);
        } else {
          console.warn(`[Webhook Warning] Pedido #${orderId} no existe en la base de datos.`);
        }
      }
    }

    // Mercado Pago requiere un status 200 OK para confirmar recepción del webhook
    return res.status(200).send('OK');

  } catch (e) {
    console.error('[Webhook Exception] Error:', e);
    return res.status(500).json({ error: e.message });
  }
}

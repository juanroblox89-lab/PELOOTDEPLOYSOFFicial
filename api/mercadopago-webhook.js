// api/mercadopago-webhook.js
// Vercel Serverless Function to automatically confirm orders on successful Mercado Pago payments and email seller
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

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
      initializeApp();
    }
  }
  db = getFirestore();
} catch (e) {
  console.error('[Webhook Error] Fallo al inicializar Firebase Admin:', e);
}

// --- Función Auxiliar para enviar la Alerta de Venta por Email ---
async function sendSaleNotificationEmail(orderId, orderData, paymentId) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  
  if (!emailUser || !emailPass) {
    console.warn('[Webhook Warning] EMAIL_USER o EMAIL_PASS no están configurados en las variables de entorno de Vercel. Se omite el correo de notificación.');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const activeCurrency = orderData.currency || 'COP';
    const totalFormatted = `$${Number(orderData.total || 0).toLocaleString('es-CO')} ${activeCurrency}`;
    
    // Generar tabla de productos para el correo HTML
    let itemsHtml = '';
    const items = orderData.items || [];
    items.forEach(item => {
      const subtotalFormatted = `$${(Number(item.price || 0) * Number(item.qty || 1)).toLocaleString('es-CO')} ${activeCurrency}`;
      itemsHtml += `
        <tr style="border-bottom: 1px solid #E8EAEF;">
          <td style="padding: 12px; display: flex; align-items: center; gap: 8px;">
            ${item.image ? `<img src="${item.image}" width="40" height="40" style="border-radius: 8px; object-fit: contain; background: #F5F7FA; border: 1px solid #E8EAEF; flex-shrink: 0;" />` : ''}
            <span style="font-weight: 700; color: #2D2D2D; font-size: 0.9rem;">${item.name}</span>
          </td>
          <td style="padding: 12px; text-align: center; color: #555; font-size: 0.9rem; font-weight: 600;">x${item.qty}</td>
          <td style="padding: 12px; text-align: right; color: #2D2D2D; font-size: 0.9rem; font-weight: 800;">${subtotalFormatted}</td>
        </tr>
      `;
    });

    const recipient = process.env.EMAIL_TO || emailUser;
    
    // Limpieza de caracteres no numéricos del teléfono para link de WhatsApp directo
    let cleanPhone = String(orderData.phone || '').replace(/[^\d]/g, '');
    // Soporte de compatibilidad legacy: si es un número de 10 dígitos (Colombia sin indicativo), añadir '57'
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('57')) {
      cleanPhone = '57' + cleanPhone;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Poppins', 'Inter', -apple-system, sans-serif;
            background: linear-gradient(135deg, #FFF8FB 0%, #F7FBFF 100%);
            color: #555555;
            padding: 30px 15px;
            margin: 0;
          }
          .email-card {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #E8EAEF;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
            overflow: hidden;
          }
          .header-banner {
            background: #2EA8FF;
            padding: 30px 20px;
            text-align: center;
            color: white;
          }
          .title {
            margin: 0;
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .subtitle {
            margin: 8px 0 0 0;
            font-size: 0.9rem;
            font-weight: 600;
            opacity: 0.9;
          }
          .content-section {
            padding: 24px;
          }
          .section-title {
            font-size: 1rem;
            font-weight: 800;
            color: #2D2D2D;
            border-bottom: 2px dashed #E8EAEF;
            padding-bottom: 8px;
            margin-top: 0;
            margin-bottom: 16px;
          }
          .total-box {
            background: #EAF5FF;
            border: 1px solid #2EA8FF;
            border-radius: 12px;
            padding: 18px;
            text-align: center;
            font-size: 1.4rem;
            font-weight: 900;
            color: #2EA8FF;
            margin-bottom: 24px;
          }
          .table-products {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .footer-note {
            text-align: center;
            font-size: 0.75rem;
            color: #9CA3AF;
            margin-top: 30px;
            font-weight: 600;
          }
          .btn-orders {
            display: inline-block;
            background: #FFD633;
            color: #000000 !important;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 700;
            text-decoration: none;
            margin: 15px auto;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="header-banner">
            <h1 class="title">🧸 ¡NUEVA VENTA PeLoot!</h1>
            <p class="subtitle">¡Estamos listos para preparar un nuevo paquete con amor!</p>
          </div>
          
          <div class="content-section">
            <div class="total-box">
              Total Recibido: ${totalFormatted}
            </div>

            <h3 class="section-title">📦 Datos del Destinatario</h3>
            <div style="background: #FFF8FB; border: 1px dashed rgba(46, 168, 255, 0.25); border-radius: 12px; padding: 18px; margin-bottom: 24px; font-size: 0.9rem; line-height: 1.5; color: #2D2D2D;">
              <p style="margin: 0 0 8px 0;"><strong>Comprador:</strong> ${orderData.fullName}</p>
              <p style="margin: 0 0 8px 0;">
                <strong>WhatsApp / Celular:</strong> 
                <a href="https://wa.me/${cleanPhone}" target="_blank" style="color: #2EA8FF; font-weight: 700; text-decoration: none;">
                  +${cleanPhone} 💬 (Chatear)
                </a>
              </p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${orderData.email}</p>
              <p style="margin: 0 0 8px 0;"><strong>Cédula:</strong> ${orderData.cedula}</p>
              <p style="margin: 0 0 8px 0;"><strong>Dirección:</strong> ${orderData.address}</p>
              <p style="margin: 0 0 8px 0;"><strong>Barrio:</strong> ${orderData.neighborhood}</p>
              <p style="margin: 0 0 8px 0;"><strong>Ciudad:</strong> ${orderData.city}</p>
              <p style="margin: 0 0 8px 0;"><strong>Departamento:</strong> ${orderData.department}</p>
              <p style="margin: 0 0 8px 0;"><strong>País:</strong> ${orderData.country}</p>
              ${orderData.zip ? `<p style="margin: 0 0 8px 0;"><strong>Código Postal:</strong> ${orderData.zip}</p>` : ''}
              ${orderData.notes ? `<p style="margin: 12px 0 0 0; font-size: 0.85rem; color: #555; background: #F5F7FA; padding: 12px; border-radius: 8px; border-left: 4px solid #FFD633;"><strong>Indicaciones:</strong> "${orderData.notes}"</p>` : ''}
            </div>

            <h3 class="section-title">🧸 Productos Incluidos</h3>
            <table class="table-products">
              <thead>
                <tr style="border-bottom: 2px solid #E8EAEF; text-align: left;">
                  <th style="padding: 12px 6px; color: #2D2D2D; font-size: 0.82rem; font-weight: 700; text-transform: uppercase;">Producto</th>
                  <th style="padding: 12px 6px; color: #2D2D2D; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; text-align: center;">Cant.</th>
                  <th style="padding: 12px 6px; color: #2D2D2D; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #F5F7FA; border-radius: 12px; padding: 14px; margin-bottom: 24px; font-size: 0.8rem; line-height: 1.4; color: #555;">
              <strong>ID de Pedido:</strong> <span style="font-family: monospace;">${orderId}</span><br>
              <strong>ID de Transacción MP:</strong> <span style="font-family: monospace;">${paymentId}</span><br>
              <strong>Modo de Compra:</strong> ${orderData.isGuest ? 'Invitado (Sin Registro) 👤' : 'Usuario Autenticado 🔑'}
            </div>

            <div style="text-align: center; margin-top: 10px;">
              <a href="https://www.peloot.shop/orders" class="btn-orders" style="color: black !important;">Ver Pedidos en Consola 🖥️</a>
            </div>
          </div>
        </div>
        
        <p class="footer-note">
          © 2026 PeLoot. Este correo es una notificación automática por compra aprobada en Mercado Pago.
        </p>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"PeLoot Ventas 🧸" <${emailUser}>`,
      to: recipient,
      subject: `🎉 ¡VENTA PeLoot! Pedido #${orderId} (${orderData.fullName})`,
      html: htmlContent
    });

    console.log(`[Webhook Success] 📧 Alerta de venta por email enviada exitosamente a ${recipient}.`);
  } catch (error) {
    console.error('[Webhook Error] Error enviando correo de venta:', error);
  }
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
    // Soportamos tanto Webhooks (type/data.id) como IPNs (topic/id)
    const type = query.type || req.body.type || query.topic || req.body.topic;
    const dataId = query['data.id'] || (req.body.data && req.body.data.id) || query.id || req.body.id;

    console.log('[Webhook] Notificación de Mercado Pago:', { type, dataId });

    if ((type === 'payment' || type === 'chargeback') && dataId) {
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
        console.warn('[Webhook Warning] Pago no encontrado o error en MP (puede ser un ID de prueba):', await response.text());
        // Retornamos 200 OK para que la prueba de Mercado Pago pase exitosamente
        return res.status(200).json({ status: 'ignored', reason: 'Payment details could not be verified (test ID)' });
      }

      const payment = await response.json();
      const orderId = payment.external_reference; // ID del pedido en Firestore
      const status = payment.status; // 'approved', 'pending', etc.

      console.log(`[Webhook] Pago #${dataId} - Pedido: ${orderId} - Estado: ${status}`);

      // 2. Si el pago es aprobado, actualizar la base de datos y enviar email
      if (status === 'approved' && orderId) {
        if (!db) {
          console.error('[Webhook Error] Firestore Admin no disponible');
          return res.status(500).json({ error: 'Firestore Admin not initialized' });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          
          // Solo actualizar y notificar si el pedido no estaba ya confirmado
          if (orderData.status !== 'confirmed') {
            await orderRef.update({
              status: 'confirmed',
              paymentId: dataId,
              paymentStatus: 'approved',
              paymentStatusDetail: 'accredited',
              paymentMethodId: payment.payment_method_id || '',
              updatedAt: new Date()
            });
            console.log(`[Webhook Success] ✅ Pedido #${orderId} confirmado automáticamente.`);
            
            // Disparar la alerta de correo por Gmail (async para no demorar la respuesta de MP)
            sendSaleNotificationEmail(orderId, { ...orderData, status: 'confirmed' }, dataId);
          } else {
            console.log(`[Webhook Info] El pedido #${orderId} ya estaba confirmado anteriormente.`);
          }
        } else {
          console.warn(`[Webhook Warning] Pedido #${orderId} no existe en la base de datos.`);
        }
      } else if (orderId) {
        // Registrar detalles de pagos rechazados, en proceso o cancelados
        if (!db) {
          console.error('[Webhook Error] Firestore Admin no disponible');
          return res.status(500).json({ error: 'Firestore Admin not initialized' });
        }

        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (orderSnap.exists) {
          const orderData = orderSnap.data();
          
          // Solo actualizar si el pedido no está ya confirmado
          if (orderData.status !== 'confirmed') {
            await orderRef.update({
              paymentId: dataId,
              paymentStatus: status, // rejected, in_process, etc.
              paymentStatusDetail: payment.status_detail || '',
              paymentMethodId: payment.payment_method_id || '',
              updatedAt: new Date()
            });
            console.log(`[Webhook Update] ℹ️ Pedido #${orderId} actualizado con estado de pago: ${status} (${payment.status_detail}).`);
          }
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

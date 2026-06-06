// api/cancel-expired-orders.js
// Vercel Serverless Function to automatically cancel unpaid orders after 6 hours
// Configured to run hourly via Vercel Crons

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
      initializeApp();
    }
  }
  db = getFirestore();
} catch (e) {
  console.error('[Cron Error] Failed to initialize Firebase Admin:', e);
}

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET or POST requests for execution
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  const host = req.headers.host || '';
  const isLocal = !cronSecret || host.includes('localhost') || host.includes('127.0.0.1');

  // Verify Vercel Cron authorization header in production
  if (!isLocal && req.headers.authorization !== `Bearer ${cronSecret}`) {
    console.warn('[Cron Auth] Unauthorized cron trigger attempt from host:', host);
    return res.status(401).json({ success: false, error: 'Unauthorized. Invalid CRON_SECRET token.' });
  }

  if (!db) {
    return res.status(500).json({ success: false, error: 'Firestore Admin not initialized.' });
  }

  console.log('[Cron Job] ⏳ Starting scan for expired pending orders (unpaid for > 6 hours)...');
  const trace = [];
  const canceledOrders = [];

  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    trace.push(`Checking for orders created before: ${sixHoursAgo.toISOString()}`);

    // Query pending or pending_payment orders
    const ordersSnap = await db.collection('orders')
      .where('status', 'in', ['pending', 'pending_payment'])
      .get();

    trace.push(`Total pending orders scanned: ${ordersSnap.size}`);

    const batch = db.batch();
    let expiredCount = 0;

    for (const doc of ordersSnap.docs) {
      const orderData = doc.data();
      let createdAtDate = null;

      // Safe parse of createdAt timestamp
      if (orderData.createdAt) {
        if (typeof orderData.createdAt.toDate === 'function') {
          createdAtDate = orderData.createdAt.toDate();
        } else {
          createdAtDate = new Date(orderData.createdAt);
        }
      }

      if (!createdAtDate || isNaN(createdAtDate.getTime())) {
        console.warn(`[Cron Warning] Order #${doc.id} has invalid or missing createdAt timestamp.`);
        continue;
      }

      // Check if the order is older than 6 hours
      if (createdAtDate.getTime() < sixHoursAgo.getTime()) {
        const docRef = db.collection('orders').doc(doc.id);
        
        batch.update(docRef, {
          status: 'cancelled',
          cancelReason: 'payment_timeout_6h',
          cancelledAt: new Date(),
          updatedAt: new Date()
        });

        expiredCount++;
        canceledOrders.push({
          id: doc.id,
          customer: orderData.fullName || 'Guest',
          createdAt: createdAtDate.toISOString()
        });

        console.log(`[Cron Job] ❌ Order #${doc.id} expired. Scheduled for cancellation. Age: ${((Date.now() - createdAtDate.getTime()) / (60 * 60 * 1000)).toFixed(1)} hours.`);
      }
    }

    if (expiredCount > 0) {
      await batch.commit();
      trace.push(`Successfully cancelled ${expiredCount} expired orders.`);
      console.log(`[Cron Job] ✅ Batch execution succeeded. Cancelled ${expiredCount} orders.`);
    } else {
      trace.push('No expired orders found.');
      console.log('[Cron Job] ✅ Scan complete. 0 expired orders found.');
    }

    return res.status(200).json({
      success: true,
      executionMode: isLocal ? 'development/local' : 'production/cron',
      scannedCount: ordersSnap.size,
      cancelledCount: expiredCount,
      cancelledOrders: cancelledOrders,
      trace: trace
    });

  } catch (error) {
    console.error('[Cron Job Exception] Error executing auto-cancellation:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      trace: trace
    });
  }
}

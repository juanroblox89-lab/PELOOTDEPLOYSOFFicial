// scratch/test-cancellation.js
// 🧸 PeLoot Sandbox — Unpaid Order Cancellation Verification Script
//
// How to run:
// 1. Start your local development server (e.g., using vercel dev, server.ps1, or equivalent).
//    Make sure the server is listening on http://localhost:3000.
// 2. Set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable or make sure you have direct
//    Firebase auth access (just like you did for webhook testing).
// 3. Open a terminal inside the project root directory.
// 4. Run: node ./scratch/test-cancellation.js

const http = require('http');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Target port for local dev server
const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

let db;

// 1. Initialize Firebase Admin
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
  console.error('\x1b[31m❌ Error de inicialización de Firebase Admin:\x1b[0m', e.message);
  console.log('\n\x1b[33m⚠️ ATENCIÓN: No se pudo conectar a Firebase.');
  console.log('Para ejecutar esta prueba localmente, debes configurar la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON con las credenciales de tu base de datos.');
  console.log('Ejemplo (PowerShell):');
  console.log('  $env:FIREBASE_SERVICE_ACCOUNT_JSON = \'(contenido de tu archivo json)\'');
  console.log('  node ./scratch/test-cancellation.js\x1b[0m\n');
  process.exit(1);
}

async function runTest() {
  console.log('\x1b[36m🧸 Iniciando prueba de cancelación automática de pedidos (Límite 24 Horas)...\x1b[0m');

  const testOrderId = `test_cron_cancel_${Date.now()}`;
  const recentOrderId = `test_cron_recent_${Date.now()}`;
  
  let orderRef;
  let recentRef;

  try {
    orderRef = db.collection('orders').doc(testOrderId);
    recentRef = db.collection('orders').doc(recentOrderId);
  } catch (dbErr) {
    console.error('\x1b[31m❌ Error al conectar con la colección de Firestore:\x1b[0m', dbErr.message);
    process.exit(1);
  }

  // Set timestamps for testing (24-hour limit)
  const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000); // Expired (25h old)
  const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);          // Recent (1h old)

  console.log(`\n\x1b[35m[1/4] Creando pedidos mock en Firestore...\x1b[0m`);

  try {
    // A. Create expired mock order (25 hours old)
    await orderRef.set({
      userId: 'test_guest_cron',
      fullName: 'Cliente de Prueba Expirado',
      email: 'expirado@test.com',
      phone: '573136374267',
      cedula: '12345678',
      address: 'Calle del Olvido 123',
      neighborhood: 'El Limbo',
      city: 'Bogota',
      department: 'Bogota D.C.',
      country: 'Colombia',
      items: [
        { id: 'fnaf-freddy', name: 'Peluche Freddy', price: 69900, qty: 1 }
      ],
      total: 69900,
      currency: 'COP',
      status: 'pending',
      createdAt: twentyFiveHoursAgo,
      updatedAt: twentyFiveHoursAgo
    });
    console.log(`  ✅ Creado pedido expirado (Status: 'pending', Creado hace: 25 horas): \x1b[1m${testOrderId}\x1b[0m`);

    // B. Create recent mock order (1 hour old)
    await recentRef.set({
      userId: 'test_guest_cron',
      fullName: 'Cliente de Prueba Reciente',
      email: 'reciente@test.com',
      phone: '573136374267',
      cedula: '12345678',
      address: 'Calle Nueva 456',
      neighborhood: 'El Centro',
      city: 'Bogota',
      department: 'Bogota D.C.',
      country: 'Colombia',
      items: [
        { id: 'fnaf-freddy', name: 'Peluche Freddy', price: 69900, qty: 1 }
      ],
      total: 69900,
      currency: 'COP',
      status: 'pending',
      createdAt: oneHourAgo,
      updatedAt: oneHourAgo
    });
    console.log(`  ✅ Creado pedido reciente (Status: 'pending', Creado hace: 1 hora): \x1b[1m${recentOrderId}\x1b[0m`);

    // 2. Call handler directly (bypass local server port dependency)
    console.log(`\n\x1b[35m[2/4] Ejecutando invocación DIRECTA al handler de cancelación...\x1b[0m`);
    
    const { default: handler } = await import('../api/cancel-expired-orders.js');

    const req = {
      method: 'POST',
      headers: {
        host: 'localhost'
      }
    };

    let responseStatus = 200;
    let responseData = null;

    const res = {
      setHeader: (name, value) => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
          },
          end: () => {}
        };
      }
    };

    try {
      await handler(req, res);
      
      if (responseStatus !== 200) {
        console.error(`  \x1b[31m❌ Error en la ejecución del handler (Status ${responseStatus}):\x1b[0m`, responseData?.error || responseData);
        await cleanup(testOrderId, recentOrderId);
        process.exit(1);
      }

      console.log('  ✅ Respuesta exitosa del handler recibida:', responseData);

      // 3. Verify final states in Firestore
      console.log(`\n\x1b[35m[3/4] Validando estados finales en la base de datos...\x1b[0m`);

      const expiredSnapAfter = await orderRef.get();
      const recentSnapAfter = await recentRef.get();

      const expiredData = expiredSnapAfter.data();
      const recentData = recentSnapAfter.data();

      let testPassed = true;

      // Assertion A: Expired order must be 'cancelled'
      if (expiredData.status === 'cancelled' && expiredData.cancelReason === 'payment_timeout_24h') {
        console.log(`  \x1b[32m✔ EXITO:\x1b[0m Pedido expirado #${testOrderId} fue cancelado correctamente.`);
        console.log(`    Motivo guardado: '${expiredData.cancelReason}'`);
        console.log(`    Fecha de cancelación: ${expiredData.cancelledAt?.toDate().toISOString()}`);
      } else {
        console.error(`  \x1b[31m✘ FALLO:\x1b[0m Pedido expirado #${testOrderId} no fue cancelado o motivo incorrecto. Status actual: '${expiredData.status}', cancelReason: '${expiredData.cancelReason}'`);
        testPassed = false;
      }

      // Assertion B: Recent order must still be 'pending'
      if (recentData.status === 'pending') {
        console.log(`  \x1b[32m✔ EXITO:\x1b[0m Pedido reciente #${recentOrderId} permanece con estado '${recentData.status}' (no fue afectado).`);
      } else {
        console.error(`  \x1b[31m✘ FALLO:\x1b[0m Pedido reciente #${recentOrderId} fue cancelado incorrectamente. Status actual: '${recentData.status}'`);
        testPassed = false;
      }

      // 4. Cleanup
      console.log(`\n\x1b[35m[4/4] Limpiando base de datos de pruebas...\x1b[0m`);
      await cleanup(testOrderId, recentOrderId);

      if (testPassed) {
        console.log('\n\x1b[32;1m🎉 ¡PRUEBA DE CANCELACIÓN COMPLETADA CON ÉXITO! 🎉\x1b[0m');
        console.log('\x1b[36mLa automatización del Cron de 24 horas se ejecuta y discrimina correctamente.\x1b[0m\n');
        process.exit(0);
      } else {
        console.log('\n\x1b[31;1m🚨 LA PRUEBA FALLÓ. Revisa la lógica del backend.\x1b[0m\n');
        process.exit(1);
      }

    } catch (e) {
      console.error('  \x1b[31m❌ Error ejecutando el handler:\x1b[0m', e.message);
      await cleanup(testOrderId, recentOrderId);
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Excepción durante la prueba:', err);
    cleanup(testOrderId, recentOrderId);
  }
}

async function cleanup(idA, idB) {
  try {
    await db.collection('orders').doc(idA).delete();
    await db.collection('orders').doc(idB).delete();
    console.log('  🧹 Pedidos de prueba eliminados de Firestore.');
  } catch (e) {
    console.warn('  ⚠️ Error al eliminar pedidos de prueba:', e.message);
  }
}

runTest();

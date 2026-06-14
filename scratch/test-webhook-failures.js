// scratch/test-webhook-failures.js
// 🧸 PeLoot Sandbox — Webhook Payment Failure Processing Verification Script
//
// How to run:
// 1. Set the FIREBASE_SERVICE_ACCOUNT_JSON environment variable or make sure you have direct
//    Firebase auth access.
// 2. Run: node ./scratch/test-webhook-failures.js

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

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
  console.log('  node ./scratch/test-webhook-failures.js\x1b[0m\n');
  process.exit(1);
}

async function runTest() {
  console.log('\x1b[36m🧸 Iniciando prueba de procesamiento de fallos de pago en Webhook...\x1b[0m');

  const testOrderId = `test_webhook_fail_${Date.now()}`;
  const orderRef = db.collection('orders').doc(testOrderId);

  console.log(`\n\x1b[35m[1/4] Creando pedido mock con estado 'pending' en Firestore...\x1b[0m`);

  try {
    await orderRef.set({
      userId: 'test_user_fail',
      fullName: 'Cliente de Prueba Fallo',
      email: 'fallo@test.com',
      phone: '573136374267',
      cedula: '12345678',
      address: 'Calle del Rechazo 789',
      items: [
        { id: 'fnaf-freddy', name: 'Peluche Freddy', price: 69900, qty: 1 }
      ],
      total: 69900,
      currency: 'COP',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`  ✅ Creado pedido mock: \x1b[1m${testOrderId}\x1b[0m`);

    // 2. Mock Global Fetch to intercept MP API call
    console.log(`\n\x1b[35m[2/4] Mockeando fetch global para interceptar la consulta de pago en Mercado Pago...\x1b[0m`);
    
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      if (url.includes('/payments/')) {
        console.log(`  🔍 Interceptado fetch a Mercado Pago: ${url}`);
        return {
          ok: true,
          text: async () => JSON.stringify({}),
          json: async () => ({
            id: 987654321,
            external_reference: testOrderId,
            status: 'rejected',
            status_detail: 'cc_rejected_insufficient_amount',
            payment_method_id: 'master'
          })
        };
      }
      return originalFetch(url, options);
    };

    // 3. Call Webhook handler directly
    console.log(`\n\x1b[35m[3/4] Invocando al handler de webhook con un pago rechazado...\x1b[0m`);

    const { default: webhookHandler } = await import('../api/mercadopago-webhook.js');

    const req = {
      method: 'POST',
      query: {
        type: 'payment',
        'data.id': '987654321'
      },
      body: {}
    };

    let responseStatus = 200;
    let responseData = null;

    const res = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseData = data; },
          send: (data) => { responseData = data; },
          end: () => {}
        };
      },
      send: (data) => {
        responseData = data;
      }
    };

    // Set MP_ACCESS_TOKEN env variable for the test run if not present
    if (!process.env.MP_ACCESS_TOKEN) {
      process.env.MP_ACCESS_TOKEN = 'test_token_placeholder';
    }

    try {
      await webhookHandler(req, res);
      
      // Restore original fetch
      global.fetch = originalFetch;

      console.log(`  ✅ Webhook ejecutado. Response Status: ${responseStatus}, Response:`, responseData);

      // 4. Verify Firestore state
      console.log(`\n\x1b[35m[4/4] Validando registro del fallo de pago en Firestore...\x1b[0m`);

      const orderSnapAfter = await orderRef.get();
      const orderData = orderSnapAfter.data();

      let testPassed = true;

      // Assertion A: Primary status must still be 'pending' so customer can retry
      if (orderData.status === 'pending') {
        console.log(`  \x1b[32m✔ EXITO:\x1b[0m El estado principal de la orden permanece 'pending'.`);
      } else {
        console.error(`  \x1b[31m✘ FALLO:\x1b[0m El estado de la orden cambió a '${orderData.status}' (debía seguir siendo 'pending').`);
        testPassed = false;
      }

      // Assertion B: Payment metadata must match the webhook payload
      if (
        orderData.paymentStatus === 'rejected' &&
        orderData.paymentStatusDetail === 'cc_rejected_insufficient_amount' &&
        orderData.paymentMethodId === 'master' &&
        orderData.paymentId === '987654321'
      ) {
        console.log(`  \x1b[32m✔ EXITO:\x1b[0m Los campos de fallo del pago se guardaron correctamente en la base de datos:`);
        console.log(`    paymentStatus: '${orderData.paymentStatus}'`);
        console.log(`    paymentStatusDetail: '${orderData.paymentStatusDetail}'`);
        console.log(`    paymentMethodId: '${orderData.paymentMethodId}'`);
        console.log(`    paymentId: '${orderData.paymentId}'`);
      } else {
        console.error(`  \x1b[31m✘ FALLO:\x1b[0m Los metadatos de pago guardados son incorrectos:`, {
          paymentStatus: orderData.paymentStatus,
          paymentStatusDetail: orderData.paymentStatusDetail,
          paymentMethodId: orderData.paymentMethodId,
          paymentId: orderData.paymentId
        });
        testPassed = false;
      }

      // Cleanup
      await cleanup(testOrderId);

      if (testPassed) {
        console.log('\n\x1b[32;1m🎉 ¡PRUEBA DE WEBHOOK COMPLETADA CON ÉXITO! 🎉\x1b[0m\n');
        process.exit(0);
      } else {
        console.log('\n\x1b[31;1m🚨 LA PRUEBA FALLÓ. Revisa la lógica del webhook.\x1b[0m\n');
        process.exit(1);
      }

    } catch (e) {
      global.fetch = originalFetch;
      console.error('  \x1b[31m❌ Error ejecutando el handler:\x1b[0m', e.message);
      await cleanup(testOrderId);
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Excepción durante la prueba:', err);
    await cleanup(testOrderId);
    process.exit(1);
  }
}

async function cleanup(id) {
  try {
    await db.collection('orders').doc(id).delete();
    console.log('  🧹 Pedido de prueba eliminado de Firestore.');
  } catch (e) {
    console.warn('  ⚠️ Error al eliminar pedido de prueba:', e.message);
  }
}

runTest();

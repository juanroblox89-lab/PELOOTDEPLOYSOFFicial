const fs = require('fs');

function fixHtml(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  
  // / replacements
  c = c.split('Explorar \uFFFD  ').join('Explorar ✨');
  c = c.split('\uFFFDx S Próximamente').join('⏳ Próximamente');
  c = c.split('\uFFFDx} Próximos Lanzamientos').join('🚀 Próximos Lanzamientos');
  c = c.split('\uFFFDS Hecho con amor').join('💖 Hecho con amor');
  c = c.split('\uFFFDx} Blox Fruits').join('🍎 Blox Fruits');
  c = c.split('\uFFFDa ️ Clash Royale').join('⚔️ Clash Royale');
  c = c.split('\uFFFDxR Plants vs Zombies').join('🌻 Plants vs Zombies');
  c = c.split('\uFFFDx FNAF').join('🐻 FNAF');
  c = c.split('\uFFFDx  Envíos').join('📦 Envíos');
  c = c.split('\uFFFD ️ Devoluciones').join('🛡️ Devoluciones');
  c = c.split('\uFFFDx   Privacidad').join('🔒 Privacidad');
  c = c.split('\uFFFDx!\uFFFD\uFFFDx!\uFFFD Colombia').join('🇨🇴 Colombia');
  c = c.split('derechos reservados \uFFFDx "').join('derechos reservados ✨');
  
  // Legal replacements
  c = c.split('PeLoot \uFFFD  Todos').join('PeLoot ✨ Todos');
  
  fs.writeFileSync(file, c, 'utf8');
}

['/', 'legal/privacy.html', 'legal/refunds.html', 'legal/shipping.html'].forEach(fixHtml);

let m = fs.readFileSync('migrador.html', 'utf8');
m = m.split('\uFFFDxa\uFFFD').join('🚀');
m = m.split('\uFFFDx \uFFFD Procesando:').join('📦 Procesando:');
m = m.split('\uFFFDx \uFFFD Descargando').join('⬇️ Descargando');
m = m.split('\uFFFDa\uFFFD️ Advertencia').join('⚠️ Advertencia');
m = m.split('\uFFFD\u0701️ Subiendo').join('☁️ Subiendo');
m = m.split('\uFFFDx   URL').join('🔗 URL');
m = m.split('\uFFFDx \uFFFD Guardando').join('💾 Guardando');
m = m.split('\uFFFDS& Completado').join('✅ Completado');
m = m.split('\uFFFDx}0 ¡MIGRACI\uFFFD N').join('🎉 ¡MIGRACIÓN');
m = m.split('\uFFFDR ERROR FATAL').join('❌ ERROR FATAL');
fs.writeFileSync('migrador.html', m, 'utf8');

console.log('Fixed all broken characters using UFFFD');

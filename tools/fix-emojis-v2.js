const fs = require('fs');

function replaceLinePart(file, matchText, replacement) {
  let c = fs.readFileSync(file, 'utf8');
  let lines = c.split('\n');
  let modified = false;
  for(let i=0; i<lines.length; i++) {
    if (lines[i].includes(matchText)) {
      lines[i] = replacement;
      modified = true;
    }
  }
  if (modified) {
    fs.writeFileSync(file, lines.join('\n'), 'utf8');
  }
}

// /
replaceLinePart('/', 'btn-explore', '          <a href="#" class="btn-explore">Explorar ✨</a>');
// I need to use regex or replace to avoid messing up the hrefs
let html = fs.readFileSync('/', 'utf8');
html = html.replace(/<a href="products\.html\?cat=bloxfruits" class="btn-explore">.*/g, '<a href="products?cat=bloxfruits" class="btn-explore">Explorar ✨</a>');
html = html.replace(/<a href="products\.html\?cat=clashroyale" class="btn-explore">.*/g, '<a href="products?cat=clashroyale" class="btn-explore">Explorar ✨</a>');
html = html.replace(/<a href="products\.html\?cat=pvz" class="btn-explore">.*/g, '<a href="products?cat=pvz" class="btn-explore">Explorar ✨</a>');
html = html.replace(/<a href="products\.html\?cat=fnaf" class="btn-explore">.*/g, '<a href="products?cat=fnaf" class="btn-explore">Explorar ✨</a>');
html = html.replace(/<span class="product-count">.*Próximamente<\/span>/g, '<span class="product-count">⏳ Próximamente</span>');
html = html.replace(/<h3>.*Próximos Lanzamientos<\/h3>/g, '<h3>🚀 Próximos Lanzamientos</h3>');
html = html.replace(/<p class="footer-tagline">.*Hecho con amor.*/g, '<p class="footer-tagline">💖 Hecho con amor por gamers para gamers</p>');
html = html.replace(/<a href="products\.html\?cat=bloxfruits">.*Blox Fruits<\/a>/g, '<a href="products?cat=bloxfruits">🍎 Blox Fruits</a>');
html = html.replace(/<a href="products\.html\?cat=clashroyale">.*Clash Royale<\/a>/g, '<a href="products?cat=clashroyale">⚔️ Clash Royale</a>');
html = html.replace(/<a href="products\.html\?cat=pvz">.*Plants vs Zombies<\/a>/g, '<a href="products?cat=pvz">🌻 Plants vs Zombies</a>');
html = html.replace(/<a href="products\.html\?cat=fnaf">.*FNAF<\/a>/g, '<a href="products?cat=fnaf">🐻 FNAF</a>');
html = html.replace(/<a href="legal\/shipping\">.*Envíos<\/a>/g, '<a href="legal/shipping">📦 Envíos</a>');
html = html.replace(/<a href="legal\/refunds\">.*Devoluciones<\/a>/g, '<a href="legal/refunds">🛡️ Devoluciones</a>');
html = html.replace(/<a href="legal\/privacy\">.*Privacidad<\/a>/g, '<a href="legal/privacy">🔒 Privacidad</a>');
html = html.replace(/<p>&copy; 2026 PeLoot - Todos los derechos reservados.*/g, '<p>&copy; 2026 PeLoot - Todos los derechos reservados ✨</p>');
fs.writeFileSync('/', html, 'utf8');

// Legal
['legal/privacy.html', 'legal/refunds.html', 'legal/shipping.html'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/<p>© 2026 PeLoot .* Todos los derechos reservados<\/p>/g, '<p>© 2026 PeLoot ✨ Todos los derechos reservados</p>');
  fs.writeFileSync(f, c, 'utf8');
});

// Migrador
let m = fs.readFileSync('migrador.html', 'utf8');
m = m.replace(/<h1>.* Migrador de Datos a Firebase<\/h1>/g, '<h1>🚀 Migrador de Datos a Firebase</h1>');
m = m.replace(/log\(`.* Procesando: \$\{p\.name\} \[\$\{p\.id\}\]`\);/g, 'log(`📦 Procesando: ${p.name} [${p.id}]`);');
m = m.replace(/log\(`  .* Descargando imagen local: \$\{p\.image\}`\);/g, 'log(`  ⬇️ Descargando imagen local: ${p.image}`);');
m = m.replace(/log\(`  .* Subiendo a Storage: \$\{storagePath\}`\);/g, 'log(`  ☁️ Subiendo a Storage: ${storagePath}`);');
m = m.replace(/log\(`  .* URL obtenida: \$\{downloadUrl.substring\(0, 40\)\}\.\.\.`\);/g, 'log(`  🔗 URL obtenida: ${downloadUrl.substring(0, 40)}...`);');
m = m.replace(/log\(`  .* Guardando en Firestore\.\.\.`\);/g, 'log(`  💾 Guardando en Firestore...`);');
m = m.replace(/log\(`  .* Completado!\\n`\);/g, 'log(`  ✅ Completado!\\n`);');
m = m.replace(/log\(`.* ¡MIGRACI.* N COMPLETADA! \(\$\{successCount\}\/\$\{products\.length\}\)`\);/g, 'log(`🎉 ¡MIGRACIÓN COMPLETADA! (${successCount}/${products.length})`);');
m = m.replace(/log\(`\\n.* ERROR FATAL: \$\{err\.message\}`\);/g, 'log(`\\n❌ ERROR FATAL: ${err.message}`);');
fs.writeFileSync('migrador.html', m, 'utf8');

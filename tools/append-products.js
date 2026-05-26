const fs = require('fs');

const data = [
  { cat: 'minecraft', list: [
    { name: 'Creeper', desc: 'El bicho verde que te arruinaba la casa justo cuando terminabas de construirla.' },
    { name: 'Enderman', desc: 'Ese tipo alto que te robaba bloques y te daba un susto si lo mirabas a los ojos.' },
    { name: 'Steve', desc: 'El sobreviviente que empezó todo con una espada de madera y un sueño.' },
    { name: 'Cerdo (Pig)', desc: 'El compañero rosa que siempre terminaba en un barranco por accidente.' },
    { name: 'Abeja (Bee)', desc: 'Una bola de píxeles regordeta demasiado adorable para ser real.' },
    { name: 'Piglin', desc: 'El negociante del Nether que te perdona la vida solo si llevas oro puesto.' },
    { name: 'Axolote', desc: 'La criatura más tierna de las cuevas y el favorito de todos.' },
    { name: 'Warden', desc: 'El gigante ciego que te enseñó a caminar de puntitas y no hacer ruido.' }
  ]},
  { cat: 'fnaf', list: [
    { name: 'Freddy', desc: 'El clásico oso que te perseguía por los pasillos cuando se acababa la batería.' },
    { name: 'Foxy', desc: 'El pirata que te obligaba a revisar la cámara cada segundo para que no corriera hacia ti.' },
    { name: 'Bonnie', desc: 'El conejo morado que siempre era el primero en aparecer en tu puerta izquierda.' },
    { name: 'Chica', desc: 'La que nunca venía sola, siempre con su cupcake y mucha hambre de atraparte.' },
    { name: 'Puppet', desc: 'El que te obligaba a darle cuerda a la caja musical para no llevarte un susto.' },
    { name: 'Golden Freddy', desc: 'El easter egg que aparecía de la nada para recordarte que no estás a salvo.' },
    { name: 'Springtrap', desc: 'El conejo desgastado que guarda los secretos más oscuros de la pizzería.' },
    { name: 'Mangle', desc: 'El rompecabezas de piezas que te vigilaba desde el techo de la ventilación.' }
  ]},
  { cat: 'geometrydash', list: [
    { name: 'Cubo (Icono 01)', desc: 'El cuadrado que saltó un millón de veces contra el mismo pico.' },
    { name: 'Nave (Ship)', desc: 'La que te hacía sudar las manos intentando no chocar en un nivel Demon.' },
    { name: 'UFO (Ovni)', desc: 'El que te hacía dar clics frenéticos para mantener la altura perfecta.' },
    { name: 'Wave (Ola)', desc: 'El triángulo que te hacía sentir un dios cuando pasabas el zigzag a 3x.' },
    { name: 'Swing', desc: 'El nuevo modo que cambió las reglas y te hizo aprender a saltar otra vez.' },
    { name: 'Ball (Bola)', desc: 'La que te hacía cambiar la gravedad entre techo y suelo a toda velocidad.' },
    { name: 'Spider (Araña)', desc: 'La que se teletransportaba tan rápido que tus reflejos apenas la seguían.' },
    { name: 'Robot', desc: 'El de los saltos largos y pesados donde cada milímetro contaba.' }
  ]},
  { cat: 'poppyplaytime', list: [
    { name: 'Huggy Wuggy', desc: 'El peluche azul de brazos largos que te dio la persecución más intensa.' },
    { name: 'CatNap', desc: 'El gato morado que te vigilaba desde las sombras con su humo rojo.' },
    { name: 'Kissy Missy', desc: 'La versión rosa que nos dejó la duda de si realmente quería ayudarnos.' },
    { name: 'DogDay', desc: 'El líder de los Smiling Critters que aguantó hasta el final en la fábrica.' },
    { name: 'Miss Delight', desc: 'La profesora que te recordaba que las clases nunca terminan.' },
    { name: 'Bunzo Bunny', desc: 'El conejo de los platillos que ponía a prueba tu memoria y tu ritmo.' },
    { name: 'Bobby Bearhug', desc: 'La osita roja que solo quería repartir amor (en teoría).' },
    { name: 'CraftyCorn', desc: 'El unicornio creativo que le pone color y miedo a la colección.' }
  ]}
];

function generateSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

let newData = '';
for (const catGroup of data) {
  for (const item of catGroup.list) {
    const slug = generateSlug(item.name);
    newData += `
{
  id: "${catGroup.cat}-${slug}",
  name: "Peluche ${item.name}",
  price: 69900,
  category: "${catGroup.cat}",
  image: "assets/images/${catGroup.cat}/${slug}.png",
  description: "${item.desc.replace(/"/g, '\\"')}"
},`;
  }
}

// remove the trailing comma
newData = newData.replace(/,$/, '');

const dataJsPath = 'c:/Users/Dayana/Desktop/PELOOTDEPLOYSOFFicial-main/PELOOTDEPLOYSOFFicial-main/js/data.js';
let content = fs.readFileSync(dataJsPath, 'utf8');

// Eliminar los 4 placeholders que agregué antes
content = content.replace(/\{[^}]*id:\s*['"]mc-creeper['"][^}]*\},?/g, '');
content = content.replace(/\{[^}]*id:\s*['"]fnaf-freddy['"][^}]*\},?/g, '');
content = content.replace(/\{[^}]*id:\s*['"]gd-cube['"][^}]*\},?/g, '');
content = content.replace(/\{[^}]*id:\s*['"]poppy-huggy['"][^}]*\}\s*,?/g, '');

// Remover el ]; final y agregar los nuevos datos
content = content.replace(/\];\s*$/, ',\n' + newData + '\n];\n');

fs.writeFileSync(dataJsPath, content, 'utf8');
console.log('Done appending products to data.js');

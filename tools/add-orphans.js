const fs = require('fs');

let content = fs.readFileSync('js/data.js', 'utf8');

const orphans = [
  { file: 'assets/images/bloxfruits/luz.png', category: 'bloxfruits', name: 'Luz', price: 65000 },
  { file: 'assets/images/bloxfruits/portal.jpg', category: 'bloxfruits', name: 'Portal (Variante)', price: 65000 },
  { file: 'assets/images/fnaf/bonnie-withered.png', category: 'fnaf', name: 'Withered Bonnie', price: 69900 },
  { file: 'assets/images/fnaf/circus-baby.png', category: 'fnaf', name: 'Circus Baby', price: 69900 },
  { file: 'assets/images/fnaf/funtime-freddy.png', category: 'fnaf', name: 'Funtime Freddy', price: 69900 },
  { file: 'assets/images/fnaf/lefty.png', category: 'fnaf', name: 'Lefty', price: 69900 },
  { file: 'assets/images/fnaf/lolbit.png', category: 'fnaf', name: 'Lolbit', price: 69900 },
  { file: 'assets/images/fnaf/moon.png', category: 'fnaf', name: 'Moon', price: 69900 },
  { file: 'assets/images/fnaf/nightmare-foxy.png', category: 'fnaf', name: 'Nightmare Foxy', price: 69900 },
  { file: 'assets/images/fnaf/nightmare-freddy.png', category: 'fnaf', name: 'Nightmare Freddy', price: 69900 },
  { file: 'assets/images/fnaf/sun.png', category: 'fnaf', name: 'Sun', price: 69900 },
  { file: 'assets/images/fnaf/toy-bonnie.png', category: 'fnaf', name: 'Toy Bonnie', price: 69900 },
  { file: 'assets/images/fnaf/vanny.png', category: 'fnaf', name: 'Vanny', price: 69900 },
  { file: 'assets/images/pvz/cactus.png', category: 'pvz', name: 'Cactus', price: 55000 },
  { file: 'assets/images/pvz/cherry-bomb.png', category: 'pvz', name: 'Cherry Bomb', price: 55000 },
  { file: 'assets/images/pvz/fume-shroom.png', category: 'pvz', name: 'Fume Shroom', price: 55000 },
  { file: 'assets/images/pvz/hypno-shroom.PNG', category: 'pvz', name: 'Hypno Shroom', price: 55000 },
  { file: 'assets/images/pvz/jalapeno.png', category: 'pvz', name: 'Jalapeno', price: 55000 },
  { file: 'assets/images/pvz/melon-pult.png', category: 'pvz', name: 'Melon Pult', price: 55000 },
  { file: 'assets/images/pvz/pool-zombie.png', category: 'pvz', name: 'Pool Zombie', price: 55000 },
  { file: 'assets/images/pvz/potatomine.png', category: 'pvz', name: 'Potato Mine', price: 55000 },
  { file: 'assets/images/pvz/repeater.png', category: 'pvz', name: 'Repeater', price: 55000 },
  { file: 'assets/images/pvz/squash.png', category: 'pvz', name: 'Squash', price: 55000 },
  { file: 'assets/images/pvz/wallnut.png', category: 'pvz', name: 'Wallnut', price: 55000 },
  { file: 'assets/images/pvz/winter-melon.png', category: 'pvz', name: 'Winter Melon', price: 55000 },
  { file: 'assets/images/pvz/yeti-zombie.PNG', category: 'pvz', name: 'Yeti Zombie', price: 55000 }
];

let addedCount = 0;
let newProductsStr = '';

orphans.forEach(o => {
  const id = o.category + '-' + o.name.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
  if (!content.includes(o.file)) {
    newProductsStr += `
{
  id: "${id}",
  name: "Peluche ${o.name}",
  price: ${o.price},
  category: "${o.category}",
  image: "${o.file}",
  description: "Un peluche genial de ${o.name}."
},`;
    addedCount++;
  }
});

if (addedCount > 0) {
  content = content.replace(/\];\s*$/, newProductsStr + '\n];\n');
  fs.writeFileSync('js/data.js', content, 'utf8');
}
console.log('Added ' + addedCount + ' new products from orphan images');

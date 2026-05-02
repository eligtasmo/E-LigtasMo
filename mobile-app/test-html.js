const fs = require('fs');
const content = fs.readFileSync('src/screens/RoutePlannerScreen.js', 'utf8');
const match = content.match(/const createMapHTML = \(token\) => \`([\s\S]*?)\`;/);
if (match) {
  const html = match[1].replace('${token}', 'dummy-token');
  fs.writeFileSync('test.html', html);
  console.log('test.html written');
}

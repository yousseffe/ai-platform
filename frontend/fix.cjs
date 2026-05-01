const fs = require('fs');
const files = [
  'src/pages/Dashboard.tsx',
  'src/pages/ModelsRegistry.tsx',
  'src/pages/ModelDetails.tsx',
  'src/pages/UploadModel.tsx',
  'src/pages/TestPrediction.tsx',
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(f, content);
  console.log(`Fixed ${f}`);
});

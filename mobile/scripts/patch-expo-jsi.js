const fs = require('fs');
const path = require('path');

const pkgSwiftPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Package.swift',
);

if (!fs.existsSync(pkgSwiftPath)) {
  process.exit(0);
}

let content = fs.readFileSync(pkgSwiftPath, 'utf8');
const original = content;

// Compatibilidad con Xcode 16.x (Swift 6.0.x):
// 1. Bajar swift-tools-version de 6.2 a 6.0
content = content.replace(
  /^\/\/ swift-tools-version:\s*6\.2/m,
  '// swift-tools-version: 6.0',
);

// 2. Quitar comas finales en listas de argumentos (sintaxis Swift 6.1+)
content = content
  .replace('targets: ["ExpoModulesJSI"],\n    )', 'targets: ["ExpoModulesJSI"]\n    )')
  .replace(
    '          "-Xlinker", "-undefined", "-Xlinker", "dynamic_lookup",\n        ])\n      ],\n    ),',
    '          "-Xlinker", "-undefined", "-Xlinker", "dynamic_lookup",\n        ])\n      ]\n    ),',
  )
  .replace(
    '        .unsafeFlags(cxxIncludeFlags),\n      ],\n    ),',
    '        .unsafeFlags(cxxIncludeFlags),\n      ]\n    ),',
  )
  .replace(
    'dependencies: testFrameworks.dependencies,\n    ),',
    'dependencies: testFrameworks.dependencies\n    ),',
  );

if (content !== original) {
  fs.writeFileSync(pkgSwiftPath, content, 'utf8');
  console.log('[patch-expo-jsi] Package.swift adaptado a swift-tools-version 6.0');
}

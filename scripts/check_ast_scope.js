const fs = require('fs');
const path = require('path');
const parser = require('next/dist/compiled/babel/parser');
const traverse = require('next/dist/compiled/babel/traverse').default || require('next/dist/compiled/babel/traverse');

const BROWSER_GLOBALS = new Set([
  'window', 'document', 'navigator', 'location', 'history', 'screen', 'event',
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'alert', 'prompt', 'confirm', 'localStorage', 'sessionStorage', 'indexedDB',
  'Audio', 'Image', 'Blob', 'File', 'FileReader', 'FormData', 'URL', 'URLSearchParams', 'Headers', 'Request', 'Response',
  'Math', 'Date', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'RegExp', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Error', 'TypeError', 'RangeError', 'SyntaxError',
  'Uint8Array', 'Int32Array', 'Float32Array', 'Uint8ClampedArray', 'ArrayBuffer', 'DataView',
  'crypto', 'performance', 'btoa', 'atob', 'CustomEvent', 'Event', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver',
  'process', 'globalThis', 'self', 'undefined', 'Infinity', 'NaN', 'eval', 'escape', 'unescape'
]);

function checkFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });
  } catch (err) {
    console.error(`Syntax error in ${filePath}:`, err.message);
    return;
  }

  const undeclared = new Set();

  traverse(ast, {
    ReferencedIdentifier(identPath) {
      const name = identPath.node.name;
      if (BROWSER_GLOBALS.has(name)) return;
      if (identPath.scope.hasBinding(name)) return;
      // Also check globals registered in scope
      if (identPath.scope.hasGlobal(name)) return;
      undeclared.add(name);
    }
  });

  console.log(`\n=== ${filePath} ===`);
  if (undeclared.size === 0) {
    console.log('✅ ALL IDENTIFIERS RESOLVED! Zero undeclared variables.');
  } else {
    console.log('❌ Undeclared variables found:', Array.from(undeclared));
  }
}

const filesToCheck = [
  'app/components/PortalHomeView.js',
  'app/components/AkunProfileView.js',
  'app/components/TeacherRosterCard.js',
  'app/components/StudentRosterCard.js',
  'app/components/ManualAbsensiModal.js',
  'app/components/InvalModals.js',
  'app/components/FloatingAiChatWidget.js',
  'app/page.js'
];

for (const f of filesToCheck) {
  checkFile(f);
}

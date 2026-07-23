const path = require('path');

process.chdir(__dirname);
process.argv = ['node', 'prisma', 'migrate', 'dev', '--name', 'add_user_profile_and_settings'];

try {
  require('prisma/build/index.js');
} catch (e) {
  console.error('Failed to run prisma via build/index.js:', e);
}

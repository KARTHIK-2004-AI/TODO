const { execSync } = require('child_process');
try {
  console.log('Running prisma migrate dev...');
  const output = execSync('npx prisma migrate dev --name add_user_profile_and_settings', {
    cwd: __dirname,
    shell: 'C:\\Windows\\System32\\cmd.exe',
    encoding: 'utf-8'
  });
  console.log(output);
} catch (err) {
  console.error('Error stdout:', err.stdout);
  console.error('Error stderr:', err.stderr);
  process.exit(1);
}

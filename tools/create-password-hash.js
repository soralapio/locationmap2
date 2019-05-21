const crypto = require('crypto');

function main() {
  if (process.argv.length !== 3) {
    console.log('Usage: node create-password-hash.js p4ssw0rd');
    return;
  }

  const password = process.argv[2];
  const hash = crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');

  console.log(
    'Copy the following line and paste it into the .env file in the project root. (Replacing the old PASSWORD_HASH)',
  );
  console.log(`PASSWORD_HASH='${hash}'`);
}
main();

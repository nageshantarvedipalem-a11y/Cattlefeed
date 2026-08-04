import bcrypt from 'bcrypt';

const password = process.argv[2] || 'Admin@123';
const saltRounds = 12;

bcrypt.hash(password, saltRounds).then((hash) => {
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
});

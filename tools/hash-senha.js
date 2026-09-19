// Gera o par salt/hash usado em src/utils.js para cadastrar ou trocar a senha
// de um usuario do painel. A senha nunca fica guardada, so o hash.
//
// Uso: node tools/hash-senha.js '<senha>'

const { scryptSync, randomBytes } = require('crypto');

const KEY_LENGTH = 64;
const senha = process.argv[2];

if (!senha) {
	console.error("Uso: node tools/hash-senha.js '<senha>'");
	process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(senha, salt, KEY_LENGTH).toString('hex');

console.log('Cole em src/utils.js, na lista de users:');
console.log('');
console.log(`    salt: '${salt}',`);
console.log(`    hash: '${hash}'`);

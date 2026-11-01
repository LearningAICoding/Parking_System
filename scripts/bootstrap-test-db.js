const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function main() {
  const database = 'parking_test_db';
  const connection = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user,
    password: env.db.password, database, multipleStatements: true
  });
  try {
    const [[row]] = await connection.query('SELECT DATABASE() AS name');
    if (row.name !== database) throw new Error('Refusing to seed a non-test database');
    for (const file of ['schema.sql', 'seed.sql']) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'database', file), 'utf8');
      const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
      for (let index = 0; index < statements.length; index += 1) {
        try {
          await connection.query(statements[index]);
        } catch (error) {
          const [warnings] = await connection.query('SHOW WARNINGS');
          error.message = `${file} statement ${index + 1} (${statements[index].slice(0, 80).replace(/\s+/g, ' ')}): ${error.message}`;
          if (warnings.length) error.message += ` | ${warnings.map((warning) => warning.Message).join(' | ')}`;
          throw error;
        }
      }
    }
    process.stdout.write('parking_test_db schema and seed ready\n');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

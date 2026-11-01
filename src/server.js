const app = require('./app');
const env = require('./config/env');
const http = require('http');

const PORT = env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

module.exports = server;

app.listen(env.port, () => {
  process.stdout.write(`Parking system listening on port ${env.port}\n`);
});

const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  process.stdout.write(`Parking system listening on port ${env.port}\n`);
});

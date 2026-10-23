const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const root = path.resolve(__dirname, '../..');
const contractsDir = path.join(root, 'docs', 'contracts');
const spec = YAML.parse(fs.readFileSync(path.join(contractsDir, 'openapi.yaml'), 'utf8'));

const requiredOperations = {
  '/login': ['get', 'post'],
  '/forgot-password': ['get', 'post'],
  '/reset-password/{token}': ['get', 'post'],
  '/api/vehicles': ['post'],
  '/api/my-vehicles': ['get'],
  '/api/vehicles/search': ['get'],
  '/api/parking/scan-plate': ['post'],
  '/api/parking/check-in': ['post'],
  '/api/parking/check-out': ['post'],
  '/api/slots': ['get'],
  '/api/slots/{id}/vehicle': ['get'],
  '/api/slots/{id}/register': ['post'],
  '/stats/report': ['get'],
  '/files/plates/{filename}': ['get'],
  '/': ['get'],
  '/news': ['get'],
  '/employees': ['get'],
  '/employees/create': ['post'],
  '/employees/{id}/edit': ['post'],
  '/employees/{id}': ['delete'],
  '/customers': ['get'],
  '/customers/create': ['post'],
  '/customers/{id}/vehicles': ['get'],
  '/customers/{id}/edit': ['post'],
  '/customers/{id}': ['delete'],
  '/my-vehicles': ['get'],
  '/profile': ['get', 'post'],
  '/parking/checkin-checkout': ['get'],
  '/parking/map': ['get'],
  '/tickets': ['get'],
  '/tickets/{id}/edit': ['get', 'post'],
  '/tickets/{id}': ['delete'],
  '/stats': ['get'],
  '/slots': ['get'],
  '/slots/create': ['post'],
  '/slots/{id}': ['get', 'delete'],
  '/slots/{id}/edit': ['post']
};

const mutationPaths = new Set([
  '/api/vehicles', '/api/parking/scan-plate', '/api/parking/check-in', '/api/parking/check-out',
  '/api/slots/{id}/register', '/employees/create', '/employees/{id}/edit', '/employees/{id}',
  '/customers/create', '/customers/{id}/edit', '/customers/{id}', '/profile', '/tickets/{id}/edit',
  '/tickets/{id}', '/slots/create', '/slots/{id}', '/slots/{id}/edit'
]);

function externalRef(ref) {
  return ref && ref.startsWith('./schemas/') ? path.join(contractsDir, ref.slice(2)) : null;
}

function responseSchemaRef(response) {
  const resolved = response?.$ref?.startsWith('#/components/responses/')
    ? spec.components.responses[response.$ref.split('/').pop()]
    : response;
  return resolved?.content?.['application/json']?.schema?.$ref;
}

describe('Sprint 1 OpenAPI acceptance contract', () => {
  test('covers every AGENTS.md route and method', () => {
    for (const [route, methods] of Object.entries(requiredOperations)) {
      expect(spec.paths[route]).toBeDefined();
      for (const method of methods) {
        expect(spec.paths[route][method]).toBeDefined();
        expect(spec.paths[route][method].operationId).toBeTruthy();
        expect(spec.paths[route][method].summary).toBeTruthy();
      }
    }
  });

  test('requires session and CSRF metadata on every mutation', () => {
    for (const route of mutationPaths) {
      for (const [method, operation] of Object.entries(spec.paths[route])) {
        if (!['post', 'put', 'patch', 'delete'].includes(method)) continue;
        expect(operation.security).toEqual([{sessionCookie: [], csrfHeader: []}]);
      }
    }
  });

  test('defines field-specific JSON Schema for every core JSON success response', () => {
    const jsonResponses = [
      ['/api/vehicles', 'post', '201'], ['/api/my-vehicles', 'get', '200'],
      ['/api/vehicles/search', 'get', '200'], ['/api/parking/scan-plate', 'post', '200'],
      ['/api/parking/check-in', 'post', '201'], ['/api/parking/check-out', 'post', '200'],
      ['/api/slots', 'get', '200'], ['/api/slots/{id}/vehicle', 'get', '200'],
      ['/api/slots/{id}/register', 'post', '201'], ['/stats/report', 'get', '200'],
      ['/employees/{id}', 'delete', '200'], ['/customers/{id}', 'delete', '200'],
      ['/tickets/{id}', 'delete', '200'], ['/slots/{id}', 'delete', '200']
    ];
    const ajv = new Ajv2020({allErrors: true});
    addFormats(ajv);
    const errorSchema = JSON.parse(fs.readFileSync(path.join(contractsDir, 'schemas', 'error.schema.json'), 'utf8'));
    ajv.addSchema(errorSchema, './error.schema.json');
    for (const [route, method, status] of jsonResponses) {
      const response = spec.paths[route][method].responses[status];
      const ref = responseSchemaRef(response);
      expect(ref).toMatch(/^\.\/schemas\/.*\.response\.json$/);
      const schemaPath = externalRef(ref);
      expect(fs.existsSync(schemaPath)).toBe(true);
      expect(() => ajv.compile(JSON.parse(fs.readFileSync(schemaPath, 'utf8')))).not.toThrow();
    }
  });

  test('does not expose sensitive storage fields in response schemas', () => {
    const forbidden = new Set(['password', 'passwordHash', 'resetTokenHash', 'deletedAt', 'tokenHash', 'sessionIdHash']);
    const schemaFiles = fs.readdirSync(path.join(contractsDir, 'schemas')).filter((file) => file.endsWith('.response.json'));
    for (const file of schemaFiles) {
      const schema = JSON.parse(fs.readFileSync(path.join(contractsDir, 'schemas', file), 'utf8'));
      const serialized = JSON.stringify(schema);
      for (const field of forbidden) expect(serialized).not.toContain(`"${field}"`);
    }
  });

  test('pins token, concurrency, timezone and delete-blocker decisions', () => {
    const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('parking_scan_tokens');
    expect(agents).toContain('READ COMMITTED');
    expect(agents).toContain('ER_LOCK_DEADLOCK');
    expect(agents).toContain('Asia/Ho_Chi_Minh');
    expect(agents).toContain('MANAGER cuối cùng');
    expect(fs.readFileSync(path.join(root, 'database', 'schema.sql'), 'utf8')).toContain('uq_parking_sessions_open_vehicle');
  });
});

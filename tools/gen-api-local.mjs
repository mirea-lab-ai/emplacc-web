// Regenerate src/types/openapi.d.ts from the LOCAL backend Swagger doc.
//
// swaggo/swag emits Swagger 2.0 with fully-qualified definition names
// (emplacc-api_internal_dto_request.*). openapi-typescript only accepts
// OpenAPI 3.x, and the existing feature code references the short
// `request.*` / `response.*` schema names, so we:
//   1. normalize the dto prefixes to the short form the app already uses,
//   2. convert Swagger 2.0 -> OpenAPI 3.0 (swagger2openapi),
//   3. generate the TypeScript types (openapi-typescript).
//
// Usage: npm run gen:api:local
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SWAGGER = '../emplacc-main-api/docs/swagger.json';
const OUT = 'src/types/openapi.d.ts';

const normalized = readFileSync(SWAGGER, 'utf8')
  .replaceAll('emplacc-api_internal_dto_request.', 'request.')
  .replaceAll('emplacc-api_internal_dto_response.', 'response.');

const work = mkdtempSync(join(tmpdir(), 'emplacc-api-'));
const swagger2 = join(work, 'swagger.json');
const openapi3 = join(work, 'openapi3.json');
writeFileSync(swagger2, normalized);

execFileSync('npx', ['-y', 'swagger2openapi', swagger2, '-o', openapi3], { stdio: 'inherit' });
execFileSync('npx', ['openapi-typescript', openapi3, '-o', OUT], { stdio: 'inherit' });
console.log(`Wrote ${OUT} from ${SWAGGER}`);

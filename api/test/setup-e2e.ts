import * as fs from 'fs';
import * as path from 'path';

// Cargar .env.test si existe y validar que nunca apunte a Supabase / produccion
const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  const lines = fs.readFileSync(envTestPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawVal = trimmed.slice(eqIndex + 1).trim();
    const val = rawVal.replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

const dbUrl = process.env.DATABASE_URL || '';
if (!dbUrl.includes('localhost:5433/finova_test')) {
  throw new Error(
    `[ABORTADO] setup-e2e.ts detectó una DATABASE_URL que no apunta a localhost:5433/finova_test (${dbUrl}). Nunca corras e2e contra desarrollo o producción.`,
  );
}

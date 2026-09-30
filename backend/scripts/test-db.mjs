#!/usr/bin/env node
/**
 * Prepares the throwaway test database: starts a PostGIS container if one isn't running
 * (skipped when TEST_DATABASE_URL points somewhere else, as in CI), then rebuilds the
 * schema from supabase/migrations on top of a stand-in for Supabase's auth schema.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const DEFAULT_URL = 'postgres://postgres@localhost:54329/postgres';
const url = process.env.TEST_DATABASE_URL || DEFAULT_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureContainer() {
  if (process.env.TEST_DATABASE_URL) return;
  const running = execFileSync('docker', ['ps', '-q', '-f', 'name=^bondhukoi-testdb$'], { encoding: 'utf8' }).trim();
  if (running) return;
  const exists = execFileSync('docker', ['ps', '-aq', '-f', 'name=^bondhukoi-testdb$'], { encoding: 'utf8' }).trim();
  if (exists) {
    execFileSync('docker', ['start', 'bondhukoi-testdb'], { stdio: 'ignore' });
  } else {
    execFileSync(
      'docker',
      ['run', '-d', '--name', 'bondhukoi-testdb', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-p', '54329:5432', 'postgis/postgis:16-3.4-alpine'],
      { stdio: 'ignore' },
    );
  }
}

async function connect() {
  for (let i = 0; i < 60; i++) {
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      return client;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`Could not reach the test database at ${url}`);
}

ensureContainer();
const client = await connect();
await client.query(`
  drop schema if exists public cascade;
  drop schema if exists auth cascade;
  create schema public;
  create extension if not exists postgis with schema public;
`);
await client.query(fs.readFileSync(path.join(here, '../test/support/supabase-stub.sql'), 'utf8'));
const dir = path.join(root, 'supabase/migrations');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
}
await client.end();
console.log('test database ready');

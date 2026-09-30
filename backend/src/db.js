import pg from 'pg';

// Postgres returns bigint counts as strings; they are always small here.
pg.types.setTypeParser(20, (value) => Number(value));

/**
 * A small wrapper around a pg Pool: `one`, `many`, `exec` and `tx`.
 * Queries always use parameters; nothing user-supplied is ever pasted into SQL.
 */
export function createDb({ connectionString, ssl = false, max = 5 }) {
  const pool = new pg.Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    options: '-c search_path=public,extensions',
  });

  const wrap = (client) => ({
    async many(text, params = []) {
      return (await client.query(text, params)).rows;
    },
    async one(text, params = []) {
      return (await client.query(text, params)).rows[0] || null;
    },
    async exec(text, params = []) {
      return (await client.query(text, params)).rowCount;
    },
  });

  const db = wrap(pool);

  /** Runs `fn` in a transaction; rolls back if it throws. */
  db.tx = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      const result = await fn(wrap(client));
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  };

  db.close = () => pool.end();
  db.pool = pool;
  return db;
}

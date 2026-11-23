import pg from 'pg';

export function createDb(connectionString) {
  const pool = new pg.Pool({ connectionString, max: 10 });
  const query = (text, params) => pool.query(text, params);
  async function tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* abaikan */
      }
      throw err;
    } finally {
      client.release();
    }
  }
  return { pool, query, tx, close: () => pool.end() };
}

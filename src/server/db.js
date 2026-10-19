import { neon } from '@neondatabase/serverless';

let client;
export const sql = (...args) => (client ??= neon(process.env.DATABASE_URL))(...args);

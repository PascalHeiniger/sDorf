import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL || 'file:sdorf.db',
});

export const db = drizzle(client, { schema });
export * as schema from './schema';

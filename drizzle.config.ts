import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/server/database/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: { url: 'file:../../data/molos.db' },
	verbose: true,
	strict: true
});

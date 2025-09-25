/**
 * Migration Helper Commands
 * 
 * Utility commands for database migrations management
 * Run these commands from the backend directory
 */

export const MIGRATION_COMMANDS = {
  // Basic migration commands
  run: 'npm run migration:run',
  show: 'npm run typeorm -- migration:show -d src/infrastructure/database/cli-data-source.ts',
  revert: 'npm run migration:revert',
  
  // Generation commands (use when entities change)
  generate: (name: string) => 
    `npm run typeorm -- migration:generate src/infrastructure/database/migrations/${Date.now()}-${name} -d src/infrastructure/database/cli-data-source.ts`,
  
  create: (name: string) => 
    `npm run typeorm -- migration:create src/infrastructure/database/migrations/${Date.now()}-${name}`,
  
  // Database commands
  dropSchema: 'npm run typeorm -- schema:drop -d src/infrastructure/database/cli-data-source.ts',
  syncSchema: 'npm run typeorm -- schema:sync -d src/infrastructure/database/cli-data-source.ts',
  
  // Query commands for debugging
  query: (sql: string) => 
    `npm run typeorm -- query "${sql}" -d src/infrastructure/database/cli-data-source.ts`,
};

export const USEFUL_QUERIES = {
  // Check migration status
  checkMigrations: "SELECT * FROM migrations ORDER BY timestamp DESC",
  
  // View current schema
  viewTables: `
    SELECT table_name, table_type 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `,
  
  // Check indexes
  viewIndexes: `
    SELECT schemaname, tablename, indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    ORDER BY tablename, indexname
  `,
  
  // Check constraints
  viewConstraints: `
    SELECT 
      tc.table_name, 
      tc.constraint_name, 
      tc.constraint_type,
      cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.check_constraints cc 
      ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type
  `,
};

export default MIGRATION_COMMANDS;

-- Run this SQL in Railway Query tab to resolve the failed migration
-- Then redeploy and the fixed migration will apply

DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250110_add_board_domain_fkey';


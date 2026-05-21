import { Command } from 'commander';
import { createAdmin } from './commands/createAdmin';
import { loadConfig } from './config/app';

const program = new Command();

program
  .name('spanel-cli')
  .description('SPanel-bun CLI Operations Tool')
  .version('1.0.0');

program
  .command('seed')
  .description('Seed database with default configuration parameters')
  .action(async () => {
    try {
      await import('./db/seed');
    } catch (err: any) {
      console.error('❌ Failed to run seed command:', err.message);
      process.exit(1);
    }
  });

program
  .command('createAdmin')
  .description('Create a new superadministrator user')
  .requiredOption('-e, --email <email>', 'Admin email address')
  .requiredOption('-p, --password <password>', 'Admin password')
  .action(async (options) => {
    try {
      await loadConfig();
      await createAdmin(options.email, options.password);
      process.exit(0);
    } catch (err: any) {
      console.error('❌ Failed to create admin:', err.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

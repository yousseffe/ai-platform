import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { UserStatus } from '../shared/enums/user-status.enum';

const email = process.env.ADMIN_EMAIL ?? 'ahmed-admin@test.com';
const password = process.env.ADMIN_PASSWORD ?? 'Ahmed@123';
const fullName = process.env.ADMIN_FULL_NAME ?? 'Ahmed Admin';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'aidb',
  entities: [User],
  synchronize: false,
});

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    console.log('Querying all tables in the database...');
    const tables: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);

    console.log(`Found ${tables.length} tables. Clearing data...`);

    // Truncate all tables with CASCADE to handle foreign key dependencies
    for (const table of tables) {
      const tableName = table.table_name;
      // Skip migrations table if any exists, to preserve schema state
      if (tableName.includes('migration') || tableName === 'typeorm_metadata') {
        continue;
      }
      console.log(`Truncating table: "${tableName}"`);
      await dataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
    }

    console.log('Database cleared. Re-creating the admin account...');
    const usersRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = usersRepository.create({
      email,
      fullName,
      passwordHash,
      isAdmin: true,
      providerMode: false,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await usersRepository.save(user);
    console.log(`Admin account successfully re-created: ${savedUser.email} (${savedUser.id})`);
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('Failed to clean database:', error.stack || error);
  } else {
    console.error('Failed to clean database:', error);
  }
  process.exit(1);
});

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
    const usersRepository = dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash(password, 12);

    const existingUser = await usersRepository.findOneBy({ email });

    if (existingUser) {
      existingUser.fullName = fullName;
      existingUser.passwordHash = passwordHash;
      existingUser.isAdmin = true;
      existingUser.status = UserStatus.ACTIVE;

      await usersRepository.save(existingUser);

      console.log(
        `Updated admin account: ${existingUser.email} (${existingUser.id})`,
      );
      return;
    }

    const user = usersRepository.create({
      email,
      fullName,
      passwordHash,
      isAdmin: true,
      providerMode: false,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await usersRepository.save(user);
    console.log(`Created admin account: ${savedUser.email} (${savedUser.id})`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('Failed to create admin account:', error.stack || error);
  } else {
    console.error('Failed to create admin account:', error);
  }
  process.exit(1);
});

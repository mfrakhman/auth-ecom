import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/users.entity';

const isProd = process.argv.includes('--prod');
dotenv.config({ path: isProd ? '.env.production' : '.env' });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'microserv_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User],
  synchronize: false,
});

async function main() {
  await ds.initialize();
  const repo = ds.getRepository(User);

  // Upsert admin account
  const adminEmail = 'admin@gmail.com';
  let admin = await repo.findOneBy({ email: adminEmail });
  const hashed = await bcrypt.hash('testadmin', 10);

  if (admin) {
    await repo.update(admin.id, { password: hashed, role: 'ADMIN', isEmailVerified: true });
    console.log(`Updated existing admin: ${adminEmail}`);
  } else {
    await repo.save(repo.create({
      email: adminEmail,
      username: 'admin',
      password: hashed,
      role: 'ADMIN',
      isEmailVerified: true,
    }));
    console.log(`Created admin: ${adminEmail}`);
  }

  // List all users so you can identify which test account to delete
  const users = await repo.find({ select: ['id', 'email', 'username', 'role', 'isEmailVerified', 'createdAt'] });
  console.log('\nAll users:');
  users.forEach(u => console.log(`  [${u.role.padEnd(5)}] ${u.email} (${u.username}) verified=${u.isEmailVerified}`));

  await ds.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });

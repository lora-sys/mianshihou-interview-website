import 'dotenv/config';
import { db } from '../index';
import { users, sessions, accounts, verifications } from '../db/schema';
import { eq } from 'drizzle-orm';

async function initTestDatabase() {
  console.log('=== Initializing Test Database ===');

  try {
    // 检查数据库连接
    console.log('1. Checking database connection...');
    const result = await db.execute(`SELECT NOW()`);
    console.log('✅ Database connected:', result.rows[0]);

    // 检查表是否存在
    console.log('\n2. Checking existing tables...');
    const tablesResult = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map((r: any) => r.table_name);
    console.log('Existing tables:', existingTables);

    const requiredTables = ['user', 'session', 'account', 'verification'];
    const missingTables = requiredTables.filter((table) => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables);
      console.log('Please run: bun run db:push');
      process.exit(1);
    } else {
      console.log('\n✅ All required tables exist');
    }

    // 清理测试数据
    console.log('\n3. Cleaning test data...');
    await db.delete(verifications).where(eq(verifications.id, ''));
    await db.delete(sessions).where(eq(sessions.id, ''));
    await db.delete(accounts).where(eq(accounts.id, ''));
    await db.delete(users).where(eq(users.id, ''));
    console.log('✅ Test data cleaned');

    console.log('\n=== Test Database Ready ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to initialize test database:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

initTestDatabase();

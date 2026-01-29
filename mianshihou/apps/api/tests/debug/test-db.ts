import 'dotenv/config';
import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL || 'postgres://mianshihou:123456@localhost:5432/mianshihou';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', connectionString);

    const client = postgres(connectionString);

    // 测试连接
    await client`SELECT NOW()`;

    console.log('✅ Database connection successful!');

    // 查看数据库
    const databases = await client`SELECT datname FROM pg_database WHERE datistemplate = false`;
    console.log(
      'Databases:',
      databases.map((d: any) => d.datname)
    );

    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();

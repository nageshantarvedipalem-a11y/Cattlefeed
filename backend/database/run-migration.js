import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getConnection = async () =>
  mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cattle_feed_erp',
    multipleStatements: true,
  });

const isRemoteDatabase = () => {
  const host = process.env.DB_HOST || 'localhost';
  return host !== 'localhost' && host !== '127.0.0.1';
};

const prepareSqlForEnvironment = (sql) => {
  if (!isRemoteDatabase()) {
    return sql;
  }

  return sql.replace(/USE\s+\w+\s*;/gi, '');
};

const run = async () => {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node database/run-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const filePath = path.join(__dirname, 'migrations', filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Migration not found: ${filePath}`);
    process.exit(1);
  }

  const connection = await getConnection();

  try {
    const sql = prepareSqlForEnvironment(fs.readFileSync(filePath, 'utf8'));
    await connection.query(sql);
    console.log(`✓ Applied migration ${filename}`);
    process.exit(0);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`✓ Migration already applied (${filename})`);
      process.exit(0);
    }

    console.error('Migration failed:', error.message || error);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

run();

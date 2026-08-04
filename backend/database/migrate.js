import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname);

const getConnection = async (includeDatabase = false) => {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  if (includeDatabase) {
    config.database = process.env.DB_NAME || 'cattle_feed_erp';
  }

  return mysql.createConnection(config);
};

const isRemoteDatabase = () => {
  const host = process.env.DB_HOST || 'localhost';
  return host !== 'localhost' && host !== '127.0.0.1';
};

const prepareSqlForEnvironment = (sql) => {
  if (!isRemoteDatabase()) {
    return sql;
  }

  return sql
    .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?;/i, '')
    .replace(/USE\s+\w+\s*;/gi, '');
};

const executeSqlFile = async (connection, filename) => {
  const filePath = path.join(dbDir, filename);
  const sql = prepareSqlForEnvironment(fs.readFileSync(filePath, 'utf8'));
  await connection.query(sql);
  console.log(`✓ Executed ${filename}`);
};

const runMigration = async (type) => {
  try {
    if (type === 'schema' || type === 'all') {
      const connection = await getConnection(isRemoteDatabase());
      await executeSqlFile(connection, 'schema.sql');
      await connection.end();
    }

    if (type === 'seed' || type === 'all') {
      const connection = await getConnection(true);
      await executeSqlFile(connection, 'seed.sql');
      await connection.end();
    }

    console.log('\nDatabase migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error.message || error);

    if (error.code === 'ECONNREFUSED') {
      console.error('\nCannot connect to MySQL. Check your backend/.env settings:');
      console.error('  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nWrong MySQL username or password.');
      console.error('Update DB_USER and DB_PASSWORD in backend/.env\n');
    }

    process.exit(1);
  }
};

const type = process.argv[2] || 'all';
runMigration(type);

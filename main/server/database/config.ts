import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const databaseConfig = {
  host: required('DB_HOST', 'mysql'),
  port: Number(required('DB_PORT', '3306')),
  name: required('DB_NAME', 'gta_rebar'),
  user: required('DB_USER', 'gta'),
  password: required('DB_PASSWORD', 'gta_password'),
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
};

export const authConfig = {
  jwtSecret: required('JWT_SECRET', 'development-secret'),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
};

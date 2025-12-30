import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.PASSWORD,
  entities: [__dirname + '/**/*.entity.{ts,js}'], 
  migrations: [__dirname + '/database/migrations/*.{ts,js}'],
  synchronize: false,
  migrationsRun: false, 
  logging: true,
});

export default AppDataSource;

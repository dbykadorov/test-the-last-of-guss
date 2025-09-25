import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import databaseConfig from '../config/database.config';

loadEnv();

const opts = databaseConfig();

const dataSource = new DataSource({
  ...(opts as any),
});

export default dataSource;



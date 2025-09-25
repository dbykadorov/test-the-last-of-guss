import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  roundDuration: number; // in seconds
  cooldownDuration: number; // in seconds
}

export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    roundDuration: parseInt(process.env.ROUND_DURATION || '60', 10),
    cooldownDuration: parseInt(process.env.COOLDOWN_DURATION || '30', 10),
  }),
);

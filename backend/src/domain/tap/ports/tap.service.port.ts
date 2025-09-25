import { TapResult } from '../tap-result.value-object';

export interface TapServicePort {
  executeTap(userId: string, roundId: string): Promise<TapResult>;
}

export const TapServicePort = Symbol('TapServicePort');

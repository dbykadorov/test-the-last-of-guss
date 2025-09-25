export class TapResult {
  constructor(
    public readonly myScore: number,
    public readonly tapsCount: number,
    public readonly bonusEarned: boolean,
    public readonly scoreEarned: number,
  ) {}

  static create(myScore: number, tapsCount: number, bonusEarned: boolean, scoreEarned: number): TapResult {
    return new TapResult(myScore, tapsCount, bonusEarned, scoreEarned);
  }
}

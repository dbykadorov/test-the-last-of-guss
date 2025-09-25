import { ApiProperty } from '@nestjs/swagger';

export class TapResponseDto {
  @ApiProperty({
    description: 'Current score of the player in this round',
    example: 123,
  })
  myScore!: number;

  @ApiProperty({
    description: 'Total number of taps made by the player',
    example: 115,
  })
  tapsCount!: number;

  @ApiProperty({
    description: 'Whether this tap was a bonus tap (11th tap)',
    example: false,
  })
  bonusEarned!: boolean;

  @ApiProperty({
    description: 'Points earned from this specific tap',
    example: 1,
  })
  scoreEarned!: number;
}

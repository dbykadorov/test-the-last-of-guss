import { ApiProperty } from '@nestjs/swagger';
import { RoundStatus } from '@domain/round/round-status.enum';
import { UserRole } from '@domain/user/user-role.enum';

export class UserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;
}

export class RoundParticipantDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  tapsCount!: number;

  @ApiProperty({ type: UserDto })
  user!: UserDto;
}

export class RoundDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty({ enum: RoundStatus })
  status!: RoundStatus;

  @ApiProperty()
  totalScore!: number;

  @ApiProperty()
  createdAt!: string;
}

export class RoundDetailsDto extends RoundDto {
  @ApiProperty({ type: [RoundParticipantDto] })
  participants!: RoundParticipantDto[];

  @ApiProperty({ type: RoundParticipantDto, required: false })
  myParticipation?: RoundParticipantDto;

  @ApiProperty({ type: RoundParticipantDto, required: false })
  winner?: RoundParticipantDto;
}

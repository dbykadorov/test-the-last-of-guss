import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiForbiddenResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { RoundsService } from '@application/rounds/rounds.service';
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@application/auth/guards/roles.guard';
import { Roles } from '@application/auth/decorators/roles.decorator';
import { CurrentUser } from '@application/auth/decorators/current-user.decorator';
import { User } from '@domain/user/user.entity';
import { UserRole } from '@domain/user/user-role.enum';
import { RoundDto, RoundDetailsDto } from '@application/rounds/dto/round-response.dto';
import { TapResponseDto } from '@application/rounds/dto/tap-response.dto';

@ApiTags('Rounds')
@Controller('rounds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoundsController {
  private readonly logger = new Logger(RoundsController.name);
  constructor(private readonly roundsService: RoundsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Create new round',
    description: 'Create a new round with configured duration and cooldown. Only admins can create rounds.',
  })
  @ApiResponse({
    status: 201,
    description: 'Round created successfully',
    type: RoundDto,
  })
  @ApiForbiddenResponse({
    description: 'Only admins can create rounds',
  })
  async createRound(@CurrentUser() user: User): Promise<{ data: RoundDto }> {
    const result = await this.roundsService.createRound(user);
    return { data: result };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all rounds',
    description: 'Get list of all rounds with their current status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of rounds',
    type: [RoundDto],
  })
  async getAllRounds(): Promise<{ data: RoundDto[] }> {
    const result = await this.roundsService.getAllRounds();
    return { data: result };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get round details',
    description: 'Get detailed information about a specific round including participants and winner',
  })
  @ApiResponse({
    status: 200,
    description: 'Round details',
    type: RoundDetailsDto,
  })
  @ApiBadRequestResponse({
    description: 'Round not found',
  })
  async getRoundDetails(
    @Param('id') roundId: string,
    @CurrentUser() user: User,
  ): Promise<{ data: RoundDetailsDto }> {
    const result = await this.roundsService.getRoundDetails(roundId, user.id);
    return { data: result };
  }

  @Post(':id/tap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Tap the goose',
    description: 'Execute a tap on the goose for the specified round. Each tap gives 1 point, every 11th tap gives 10 points.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tap executed successfully',
    type: TapResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Round not active or user cannot tap',
  })
  async tapGoose(
    @Param('id') roundId: string,
    @CurrentUser() user: User,
  ): Promise<{ data: TapResponseDto }> {
    this.logger.debug(`HTTP tap request (userId=${user.id}, roundId=${roundId})`);
    const result = await this.roundsService.executeTap(roundId, user);
    this.logger.debug(`HTTP tap success (userId=${user.id}, roundId=${roundId}, myScore=${result.myScore})`);
    return { data: result };
  }
}

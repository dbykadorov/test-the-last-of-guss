import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AuthService } from '@application/auth/auth.service';
import { LoginDto } from '@application/auth/dto/login.dto';
import { AuthResponseDto } from '@application/auth/dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login or register user',
    description: 'Authenticate user. If user doesn\'t exist, creates new one with auto-assigned role based on username.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid credentials or validation error',
  })
  async login(@Body() loginDto: LoginDto): Promise<{ data: AuthResponseDto }> {
    const result = await this.authService.login(loginDto);
    return { data: result };
  }
}

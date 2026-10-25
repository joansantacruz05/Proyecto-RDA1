import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './services/idempotency.service';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { IdempotencyKeyGuard } from './guards/idempotency-key.guard';
import { ScopesGuard } from './guards/scopes.guard';
import { ProblemDetailsFilter } from './filters/problem-details.filter';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    JwtModule.register({}),
  ],
  providers: [
    IdempotencyService,
    IdempotencyInterceptor,
    IdempotencyKeyGuard,
    ScopesGuard,
    ProblemDetailsFilter,
  ],
  exports: [
    IdempotencyService,
    IdempotencyInterceptor,
    IdempotencyKeyGuard,
    ScopesGuard,
    ProblemDetailsFilter,
    JwtModule,
  ],
})
export class CommonModule {}

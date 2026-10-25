import { Injectable, CanActivate, ExecutionContext, HttpStatus, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import { ProblemDetailsException } from '../exceptions/problem-details.exception';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Scopes decorator is present, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // Fallback: If passport hasn't populated request.user yet, attempt to decode Bearer token
    if (!user && request.headers.authorization && this.jwtService) {
      try {
        const token = request.headers.authorization.replace(/^Bearer\s+/i, '');
        user = this.jwtService.decode(token);
        request.user = user;
      } catch {
        // Ignored, will be caught below
      }
    }

    if (!user) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/unauthorized',
          title: 'Unauthorized: Authentication required',
          status: HttpStatus.UNAUTHORIZED,
          code: 'VALIDATION_FAILED',
          detail: 'You must provide a valid Bearer token with appropriate OAuth2 scopes.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Extract scopes from claim: can be "alojamientos:read alojamientos:book" or array
    const rawScope = user.scope || user.scopes || '';
    const grantedScopes: string[] = Array.isArray(rawScope)
      ? rawScope
      : typeof rawScope === 'string'
      ? rawScope.split(/\s+/).filter(Boolean)
      : [];

    const hasAllScopes = requiredScopes.every((scope) => grantedScopes.includes(scope));

    if (!hasAllScopes) {
      throw new ProblemDetailsException(
        {
          type: 'https://api.booking-hub.com/errors/forbidden',
          title: 'Forbidden: Insufficient Scope',
          status: HttpStatus.FORBIDDEN,
          code: 'VALIDATION_FAILED',
          detail: `Operation requires OAuth2 scope(s): ${requiredScopes.join(', ')}. Granted scopes: ${grantedScopes.join(', ') || 'none'}`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}

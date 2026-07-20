import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { tryTokenLoginInitializer } from './try-token-login';

describe('tryTokenLoginInitializer', () => {
  it('returns a factory that invokes AuthService.tryTokenLogin and resolves on success', async () => {
    const authService = {
      tryTokenLogin: jasmine.createSpy('tryTokenLogin').and.returnValue(of(true)),
    } as unknown as AuthService;

    const factory = tryTokenLoginInitializer(authService);
    await expectAsync(factory()).toBeResolvedTo(undefined);
    expect(authService.tryTokenLogin).toHaveBeenCalledTimes(1);
  });

  it('resolves (never rejects) even when tryTokenLogin errors — bootstrap must not be blocked', async () => {
    const authService = {
      tryTokenLogin: jasmine
        .createSpy('tryTokenLogin')
        .and.returnValue(throwError(() => new Error('network blip'))),
    } as unknown as AuthService;

    const factory = tryTokenLoginInitializer(authService);
    await expectAsync(factory()).toBeResolvedTo(undefined);
  });
});

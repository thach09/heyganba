import { beforeEach, expect, test, vi } from 'vitest';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
const success = (data: unknown) => json({ success: true, data });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => { resolve = r; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_AUTH_COOKIE', 'false');
  localStorage.setItem('heyganba_access_token', 'old-access');
  localStorage.setItem('heyganba_refresh_token', 'old-refresh');
  localStorage.setItem('heyganba_user', '{"userId":1}');
});

test('normal success includes the access credential', async () => {
  const fetcher = vi.fn().mockResolvedValue(success({ value: 3 }));
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../../src/services/api');
  expect((await api.apiRequest('/example')).data).toEqual({ value: 3 });
  expect(new Headers(fetcher.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer old-access');
});
test('network failure produces a safe message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private host connection details')));
  const api = await import('../../src/services/api');
  const result = await api.apiRequest('/example');
  expect(result.success).toBe(false);
  expect(result.message).not.toContain('private host');
});
test('401 refreshes and retries once', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(success(tokens)).mockResolvedValueOnce(success({ value: 2 }));
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../../src/services/api');
  expect((await api.apiRequest('/example')).data).toEqual({ value: 2 });
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(new Headers(fetcher.mock.calls[2][1].headers).get('Authorization')).toBe('Bearer new-access');
});
test('simultaneous unauthorized requests share one token rotation', async () => {
  const gate = deferred<Response>();
  let refreshes = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return gate.promise; }
    return Promise.resolve(new Headers(options.headers).get('Authorization') === 'Bearer new-access'
      ? success({ value: 1 }) : json({}, 401));
  }));
  const api = await import('../../src/services/api');
  const requests = [api.apiRequest('/first'), api.apiRequest('/second')];
  await vi.waitFor(() => expect(refreshes).toBe(1));
  gate.resolve(success(tokens));
  expect((await Promise.all(requests)).every(r => r.success)).toBe(true);
  expect(refreshes).toBe(1);
});
test('invalid refresh clears the saved session', async () => {
  const expired = vi.fn();
  window.addEventListener('heyganba:session-expired', expired, { once: true });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, 400)));
  const api = await import('../../src/services/api');
  await api.apiRequest('/example');
  expect(api.getAccessToken()).toBeNull();
  expect(localStorage.getItem('heyganba_user')).toBeNull();
  expect(expired).toHaveBeenCalledOnce();
});
test('transient refresh network failure retains a valid session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 401)).mockRejectedValueOnce(new TypeError('offline')));
  const api = await import('../../src/services/api');
  await api.apiRequest('/example');
  expect(api.getAccessToken()).toBe('old-access');
  expect(api.getRefreshToken()).toBe('old-refresh');
});
test('a pending refresh cannot restore a cleared session', async () => {
  const gate = deferred<Response>();
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => gate.promise);
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../../src/services/api');
  const request = api.apiRequest('/example');
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  api.clearTokens();
  gate.resolve(success(tokens));
  expect((await request).success).not.toBe(true);
  expect(api.getAccessToken()).toBeNull();
  expect(api.getRefreshToken()).toBeNull();
});
test('logout waits for rotation and revokes the latest token', async () => {
  const gate = deferred<Response>();
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => gate.promise)
    .mockResolvedValue(success(null));
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../../src/services/api');
  const request = api.apiRequest('/example');
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const logout = api.logoutApi();
  gate.resolve(success(tokens));
  expect(await logout).toBe(true);
  api.clearTokens();
  await request;
  const call = fetcher.mock.calls.find(([url]) => url.endsWith('/auth/logout'))!;
  expect(new Headers(call[1].headers).get('Authorization')).toBe('Bearer new-access');
  expect(api.getAccessToken()).toBeNull();
});
test('login rejection does not trigger refresh', async () => {
  const fetcher = vi.fn().mockResolvedValue(json({}, 401));
  vi.stubGlobal('fetch', fetcher);
  const api = await import('../../src/services/api');
  await api.apiRequest('/auth/login');
  expect(fetcher).toHaveBeenCalledOnce();
});
test('cookie mode migrates legacy refresh without persisting new JWTs', async () => {
  vi.stubEnv('VITE_AUTH_COOKIE', 'true');
  const api = await import('../../src/services/api');
  expect(api.getRefreshToken()).toBe('old-refresh');
  expect(localStorage.getItem('heyganba_refresh_token')).toBeNull();
  api.saveTokens('new-access', null);
  expect(api.getAccessToken()).toBe('new-access');
  expect(api.getRefreshToken()).toBeNull();
  expect(localStorage.getItem('heyganba_access_token')).toBeNull();
});

import { beforeEach, expect, test, vi } from 'vitest';

async function loadApi() {
  return { ...await import('../../src/lib/api/client'), ...await import('../../src/lib/api/session') };
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});
const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh', userId: 1, role: 'ROLE_USER', fullName: 'Learner A' };
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
  localStorage.setItem('heyganba_user', '{"userId":1,"role":"ROLE_USER","fullName":"Learner A"}');
});

test('normal success includes the access credential', async () => {
  const fetcher = vi.fn().mockResolvedValue(success({ value: 3 }));
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
  expect((await api.apiRequest('/example')).data).toEqual({ value: 3 });
  expect(new Headers(fetcher.mock.calls[0][1].headers).get('Authorization')).toBe('Bearer old-access');
});
test('network failure produces a safe message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private host connection details')));
  const api = await loadApi();
  const result = await api.apiRequest('/example');
  expect(result.success).toBe(false);
  expect(result.message).not.toContain('private host');
});
test('401 refreshes and retries once', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(success(tokens)).mockResolvedValueOnce(success({ value: 2 }));
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
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
  const api = await loadApi();
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
  const api = await loadApi();
  await expect(api.apiRequest('/example')).rejects.toMatchObject({ name: 'AbortError' });
  expect(api.getAccessToken()).toBeNull();
  expect(localStorage.getItem('heyganba_user')).toBeNull();
  expect(expired).toHaveBeenCalledOnce();
});
test('transient refresh network failure retains a valid session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({}, 401)).mockRejectedValueOnce(new TypeError('offline')));
  const api = await loadApi();
  await api.apiRequest('/example');
  expect(api.getAccessToken()).toBe('old-access');
  expect(api.getRefreshToken()).toBe('old-refresh');
});
test('a pending refresh cannot restore a cleared session', async () => {
  const gate = deferred<Response>();
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => gate.promise);
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
  const request = api.apiRequest('/example');
  const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  api.clearTokens();
  gate.resolve(success(tokens));
  await rejection;
  expect(api.getAccessToken()).toBeNull();
  expect(api.getRefreshToken()).toBeNull();
});
test('logout waits for rotation and revokes the latest token', async () => {
  const gate = deferred<Response>();
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => gate.promise)
    .mockResolvedValue(success(null));
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
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
  const api = await loadApi();
  await api.apiRequest('/auth/login');
  expect(fetcher).toHaveBeenCalledOnce();
});
test('cookie mode migrates legacy refresh without persisting new JWTs', async () => {
  vi.stubEnv('VITE_AUTH_COOKIE', 'true');
  const api = await loadApi();
  expect(api.getRefreshToken()).toBe('old-refresh');
  expect(localStorage.getItem('heyganba_refresh_token')).toBeNull();
  api.saveTokens('new-access', null);
  expect(api.getAccessToken()).toBe('new-access');
  expect(api.getRefreshToken()).toBeNull();
  expect(localStorage.getItem('heyganba_access_token')).toBeNull();
});

test('an aborted request rejects silently before fetching', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
  const controller = new AbortController();
  controller.abort();
  await expect(api.apiRequest('/example', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetcher).not.toHaveBeenCalled();
});

test('cancelling one refresh consumer leaves the other request working', async () => {
  const gate = deferred<Response>();
  let refreshes = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return gate.promise; }
    return Promise.resolve(new Headers(options.headers).get('Authorization') === 'Bearer new-access'
      ? success({ value: 1 }) : json({}, 401));
  }));
  const api = await loadApi();
  const controller = new AbortController();
  const cancelled = api.apiRequest('/first', { signal: controller.signal });
  const rejection = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
  const remaining = api.apiRequest('/second');
  await vi.waitFor(() => expect(refreshes).toBe(1));
  controller.abort();
  await rejection;
  gate.resolve(success(tokens));
  expect((await remaining).success).toBe(true);
  expect(refreshes).toBe(1);
});

test('a delayed old-token 401 reuses the completed rotation', async () => {
  const late = deferred<Response>();
  let refreshes = 0;
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
    if (url.endsWith('/auth/refresh')) { refreshes++; return Promise.resolve(success(tokens)); }
    if (new Headers(options.headers).get('Authorization') === 'Bearer new-access') return Promise.resolve(success(null));
    return url.endsWith('/late') ? late.promise : Promise.resolve(json({}, 401));
  }));
  const api = await loadApi();
  const delayed = api.apiRequest('/late');
  expect((await api.apiRequest('/fast')).success).toBe(true);
  late.resolve(json({}, 401));
  expect((await delayed).success).toBe(true);
  expect(refreshes).toBe(1);
});

test('QA-007: refresh reconciles the profile but never replays A progress as B', async () => {
  const changed = vi.fn();
  window.addEventListener('heyganba:session-changed', changed, { once: true });
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401))
    .mockResolvedValueOnce(success({ ...tokens, userId: 2, fullName: 'Learner B' }));
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
  await expect(api.apiRequest('/flashcard/review', { method: 'POST', body: '{}' }))
    .rejects.toMatchObject({ name: 'AbortError' });
  expect(api.getSavedUser()?.userId).toBe(2);
  expect(changed).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

test('QA-007: cross-tab invalidation blocks a pending refresh from restoring A', async () => {
  vi.stubEnv('VITE_AUTH_COOKIE', 'true');
  const gate = deferred<Response>();
  const fetcher = vi.fn().mockResolvedValueOnce(json({}, 401)).mockImplementationOnce(() => gate.promise);
  vi.stubGlobal('fetch', fetcher);
  const api = await loadApi();
  api.saveTokens('a-access', null);
  const request = api.apiRequest('/example');
  const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  localStorage.setItem('heyganba_user', JSON.stringify({ ...tokens, userId: 2 }));
  api.invalidateTabSession();
  gate.resolve(success(tokens));
  await rejection;
  expect(api.getAccessToken()).toBeNull();
  expect(api.getSavedUser()?.userId).toBe(2);
});

test.each([[400, 'validation'], [403, 'authentication'], [503, 'server']] as const)(
  'HTTP %s has a typed failure and server details stay private', async (status, kind) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ success: false, message: 'private database details' }, status)));
    const api = await loadApi();
    const result = await api.apiRequest('/example');
    expect(result.error).toMatchObject({ kind, status });
    if (status >= 500) expect(result.message).not.toContain('private database');
  },
);

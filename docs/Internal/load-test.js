import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '20s', target: 50 },
    { duration: '15s', target: 100 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'], // error rate < 10% on free tier
    http_req_duration: ['p(95)<3000'], // 95% under 3s
  },
};

const BASE_URL = 'https://heyganba-backend-staging.onrender.com/api/v1';
const TOKEN = __ENV.TOKEN || 'eyJhbGciOiJIUzM4NCJ9.eyJqdGkiOiJhODhhOTUxOS0yZjZkLTQwM2ItYThlOC1hMjMyODQ0NjJkNWUiLCJzdWIiOiJ0ZXN0LnVzZXIuMTc5MDkxMjk0Mzk4MkBoZXlnYW5iYS52biIsInJvbGUiOiJST0xFX1VTRVIiLCJmdWxsTmFtZSI6IlN0YWdpbmcgVGVzdCBTdHVkZW50IiwidG9rZW5fdHlwZSI6ImFjY2VzcyIsInVzZXJJZCI6MTAsImlhdCI6MTc5MDkxNDY1MSwiZXhwIjoxNzkwOTE2NDUxfQ.qUrCnECuGt12g7p_PARF6kunjJNvuolh8myLcIcOBUsL688LV-bCtk3MgIT_9_VN';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  // 1. Health check (liveness / routing)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // 2. Kana list (DB query)
  const kanaRes = http.get(`${BASE_URL}/kana`, params);
  check(kanaRes, {
    'kana status is 200': (r) => r.status === 200,
  });

  // 3. Grammar rules (DB query with joins)
  const grammarRes = http.get(`${BASE_URL}/grammar/rules`, params);
  check(grammarRes, {
    'grammar status is 200': (r) => r.status === 200,
  });

  // 4. Leaderboard (aggregation query)
  const lbRes = http.get(`${BASE_URL}/leaderboard`, params);
  check(lbRes, {
    'leaderboard status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

/**
 * Load test HeyGanba (staging) — k6.
 *
 * Lần đo trước (02/10/2026) chỉ có NHÓM ĐỌC: health + /kana + /grammar/rules + /leaderboard.
 * Đợt này bổ sung 3 KỊCH BẢN GHI (đúng các luồng học sinh thật tạo tải ghi):
 *   1. `POST /grammar/exercises/{id}/check` — chấm bài tập ngữ pháp (ghi study_activity + streak).
 *   2. `POST /flashcard/review`             — chấm 1 lượt ôn SRS (ghi srs_reviews + study_activity).
 *   3. Luồng cập nhật streak               — 3 × `POST /kana/quiz/check` (ghi nhận câu quiz) rồi đọc `/streak`.
 *
 * Metric tách theo nhóm để so sánh được nhóm ĐỌC vs nhóm GHI: `read_*` giữ nguyên thứ tự và số lượt như lần
 * trước, `write_*` cho 2 kịch bản ghi, `streak_*` cho quiz check. Request cũng gắn tag `flow` để lọc lại sau.
 *
 * HẠN MỨC: mỗi VU dùng token riêng (setup đăng ký `USERS` tài khoản test) nên rate limit theo TÀI KHOẢN
 * (120 request/phút cho quiz/SRS) không bóp méo kết quả đo.
 *
 * Chạy: k6 run docs/Internal/load-test.js   (đổi số user: k6 run -e USERS=20 docs/Internal/load-test.js)
 */

const readDuration = new Trend('read_req_duration', true);
const writeDuration = new Trend('write_req_duration', true);
const streakDuration = new Trend('streak_req_duration', true);
const readFailed = new Rate('read_req_failed');
const writeFailed = new Rate('write_req_failed');
const streakFailed = new Rate('streak_req_failed');
const rateLimited = new Rate('write_rate_limited');
const readCount = new Counter('read_req_count');
const writeCount = new Counter('write_req_count');
const streakCount = new Counter('streak_req_count');

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '20s', target: 50 },
    { duration: '15s', target: 100 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // Free tier 0.1 CPU: ngưỡng nới rộng, số liệu thật ghi trong deployment-plan.md.
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<15000'],
    read_req_failed: ['rate<0.10'],
    write_req_failed: ['rate<0.30'],
    streak_req_failed: ['rate<0.30'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://heyganba-backend-staging.onrender.com/api/v1';
const USERS = Number(__ENV.USERS || 20);
const PASSWORD = 'LoadTest123!';
/** Id thật truyền từ ngoài (xem setup) — rỗng thì script tự dò qua API.
 *  Hỗ trợ 2 cách: `-e IDS_FILE=<đường dẫn>` (khuyến nghị, tránh lỗi quote của shell) hoặc `-e IDS_JSON='...'`. */
const IDS_JSON = __ENV.IDS_FILE ? open(__ENV.IDS_FILE) : (__ENV.IDS_JSON || '');
/**
 * Think time giữa các vòng lặp (mặc định 1s như lần đo trước để so sánh được).
 * Tăng lên (ví dụ `-e SLEEP=3`) khi muốn đo THÔNG LƯỢNG GHI mà không bị chặn bởi rate limit 120 request/phút/tài
 * khoản — nếu để 1s trên máy local, mỗi tài khoản vượt >120 request/phút và phần lớn request ghi trả 429
 * (đúng thiết kế của rate limiter, nhưng không đo được độ trễ thật của đường ghi).
 */
const SLEEP_SECONDS = Number(__ENV.SLEEP || 1);
/** Bật `-e ONLY_WRITE=true` hoặc `-e SKIP_READ=true` khi muốn chạy riêng nhóm GHI (bỏ qua nhóm đọc). */
const ONLY_WRITE = __ENV.ONLY_WRITE === 'true' || __ENV.SKIP_READ === 'true';

function jsonHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export function setup() {
  const runId = Date.now();
  const tokens = [];

  for (let i = 0; i < USERS; i++) {
    const res = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        email: `loadtest.${runId}.${i}@heyganba.test`,
        password: PASSWORD,
        fullName: `Load Test ${i}`,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.status === 201) {
      tokens.push(res.json('data.accessToken'));
    }
  }
  if (tokens.length === 0) {
    throw new Error('Không đăng ký được tài khoản test nào — kiểm tra staging đã thức chưa (GET /health).');
  }

  // Staging hiện CHƯA áp V15 (nội dung core vẫn PENDING_REVIEW) nên user thường đọc được danh sách RỖNG ⇒ không
  // lấy được id từ API. Vì vậy cho phép truyền id thật qua `-e IDS_JSON='{"kanaPairs":[{"id":1,"romaji":"a"}],...}'`
  // (lấy trực tiếp từ DB staging). Không truyền thì script tự dò qua API (đúng cho môi trường prod/local đã duyệt).
  if (IDS_JSON) {
    const ids = JSON.parse(IDS_JSON);
    return {
      tokens,
      kanaPairs: ids.kanaPairs || [],
      vocabularyIds: ids.vocabularyIds || [],
      exerciseIds: ids.exerciseIds || [],
    };
  }

  const auth = jsonHeaders(tokens[0]);

  // Kana: dùng romaji chuẩn làm đáp án đúng để quiz ghi được study activity.
  const kanaPairs = [];
  const kanaRes = http.get(`${BASE_URL}/kana`, auth);
  if (kanaRes.status === 200) {
    for (const item of kanaRes.json('data') || []) {
      if (item.id && item.romaji && /^[a-z]+$/.test(item.romaji)) {
        kanaPairs.push({ id: item.id, romaji: item.romaji });
      }
      if (kanaPairs.length >= 10) {
        break;
      }
    }
  }

  // Từ vựng cho phiên SRS (đường dẫn thật là `/flashcard` — SỐ ÍT).
  const dueRes = http.get(`${BASE_URL}/flashcard/due-today?newLimit=20`, auth);
  const vocabularyIds = dueRes.status === 200
    ? (dueRes.json('data') || []).map((item) => item.vocabularyId).filter((id) => id)
    : [];

  // Bài tập ngữ pháp: dò vài rule đầu cho tới khi gom đủ câu (một số rule có thể chưa có bài tập).
  const rulesRes = http.get(`${BASE_URL}/grammar/rules`, auth);
  const rules = rulesRes.status === 200 ? rulesRes.json('data') || [] : [];
  const exerciseIds = [];
  for (const rule of rules) {
    const exRes = http.get(`${BASE_URL}/grammar/exercises?ruleId=${rule.id}`, auth);
    if (exRes.status === 200) {
      for (const item of exRes.json('data') || []) {
        if (item.id) {
          exerciseIds.push(item.id);
        }
      }
    }
    if (exerciseIds.length >= 10) {
      break;
    }
  }

  return { tokens, kanaPairs, vocabularyIds, exerciseIds };
}
export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const params = jsonHeaders(token);

  // ---------------- NHÓM ĐỌC (giữ nguyên như lần đo trước) ----------------
  if (!ONLY_WRITE) {
    group('read', () => {
      const health = http.get(`${BASE_URL}/health`);
      readDuration.add(health.timings.duration);
      readFailed.add(health.status !== 200);
      check(health, { 'health 200': (r) => r.status === 200 });

      const kana = http.get(`${BASE_URL}/kana`, params);
      readDuration.add(kana.timings.duration);
      readFailed.add(kana.status !== 200);
      check(kana, { 'kana 200': (r) => r.status === 200 });

      const rules = http.get(`${BASE_URL}/grammar/rules`, params);
      readDuration.add(rules.timings.duration);
      readFailed.add(rules.status !== 200);
      check(rules, { 'grammar rules 200': (r) => r.status === 200 });

      const leaderboard = http.get(`${BASE_URL}/leaderboard`, params);
      readDuration.add(leaderboard.timings.duration);
      readFailed.add(leaderboard.status !== 200);
      check(leaderboard, { 'leaderboard 200': (r) => r.status === 200 });
      readCount.add(4);
    });
  }

  // ---------------- NHÓM GHI 1+2: chấm quiz ngữ pháp + ôn SRS ----------------
  group('write', () => {
    if (data.exerciseIds.length > 0) {
      const exerciseId = data.exerciseIds[__ITER % data.exerciseIds.length];
      const res = http.post(
        `${BASE_URL}/grammar/exercises/${exerciseId}/check`,
        JSON.stringify({ userAnswer: 'は' }),
        params,
      );
      writeDuration.add(res.timings.duration);
      writeFailed.add(res.status >= 400);
      rateLimited.add(res.status === 429);
      check(res, { 'grammar check không lỗi 5xx': (r) => r.status < 500 });
      writeCount.add(1);
    }

    if (data.vocabularyIds.length > 0) {
      const vocabularyId = data.vocabularyIds[__ITER % data.vocabularyIds.length];
      const res = http.post(
        `${BASE_URL}/flashcard/review`,
        JSON.stringify({ vocabularyId, rating: 'GOOD' }),
        params,
      );
      writeDuration.add(res.timings.duration);
      writeFailed.add(res.status >= 400);
      rateLimited.add(res.status === 429);
      check(res, { 'flashcard review không lỗi 5xx': (r) => r.status < 500 });
      writeCount.add(1);
    }
  });

  // ---------------- NHÓM GHI 3: luồng cập nhật streak ----------------
  group('streak', () => {
    for (let i = 0; i < 3 && data.kanaPairs.length > 0; i++) {
      const pair = data.kanaPairs[(__ITER + i) % data.kanaPairs.length];
      const quiz = http.post(
        `${BASE_URL}/kana/quiz/check`,
        JSON.stringify({ kanaId: pair.id, userAnswer: pair.romaji }),
        params,
      );
      streakDuration.add(quiz.timings.duration);
      streakFailed.add(quiz.status >= 400);
      rateLimited.add(quiz.status === 429);
      check(quiz, { 'kana quiz check không lỗi 5xx': (r) => r.status < 500 });
    }

    const streak = http.get(`${BASE_URL}/streak`, params);
    streakDuration.add(streak.timings.duration);
    streakFailed.add(streak.status !== 200);
    check(streak, { 'streak 200 (streak tự cập nhật sau khi ghi activity)': (r) => r.status === 200 });
    streakCount.add(4);
  });

  sleep(SLEEP_SECONDS);
}


/** In bảng so sánh nhóm ĐỌC vs GHI ngay cuối log để chép vào deployment-plan.md. */
export function handleSummary(summary) {
  const value = (name, percentile) => {
    const metric = summary.metrics[name];
    return metric && metric.values && metric.values[percentile] !== undefined
      ? Math.round(metric.values[percentile])
      : 'n/a';
  };
  const rate = (name) => {
    const metric = summary.metrics[name];
    return metric && metric.values && metric.values.rate !== undefined
      ? (metric.values.rate * 100).toFixed(2) + '%'
      : 'n/a';
  };
  const count = (name) => {
    const metric = summary.metrics[name];
    return metric && metric.values && metric.values.count !== undefined
      ? metric.values.count
      : 'n/a';
  };

  const row = (label, metricName, failedMetric) => label
    + ' p50=' + value(metricName, 'med')
    + '  p90=' + value(metricName, 'p(90)')
    + '  p95=' + value(metricName, 'p(95)')
    + '  max=' + value(metricName, 'max')
    + '  loi=' + rate(failedMetric);

  const lines = [
    '===== SO SANH NHOM DOC vs NHOM GHI (ms) =====',
    row('read  ', 'read_req_duration', 'read_req_failed'),
    row('write ', 'write_req_duration', 'write_req_failed'),
    row('streak', 'streak_req_duration', 'streak_req_failed'),
    'so request: read=' + count('read_req_count')
      + '  write=' + count('write_req_count')
      + '  streak=' + count('streak_req_count')
      + '  tong=' + count('http_reqs'),
    'iterations=' + count('iterations')
      + '  http_req_failed=' + rate('http_req_failed')
      + '  http_req_duration p50=' + value('http_req_duration', 'med')
      + '  p95=' + value('http_req_duration', 'p(95)')
      + '  max=' + value('http_req_duration', 'max')
      + '  bi chan 429=' + rate('write_rate_limited'),
    '=============================================',
  ].join('\n');

  return { stdout: lines + '\n' };
}


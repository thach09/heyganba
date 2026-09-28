import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { KANA_GROUP_META, KANA_GROUP_ORDER, acceptedRomaji, getKanaQuizPool } from './kanaData';
import type { KanaEntry, KanaGroupKey, KanaScript } from './kanaData';

type QuizGroup = Exclude<KanaGroupKey, 'DOUBLE_KATAKANA'>;

interface KanaQuizProps {
  script: KanaScript;
}

const STORAGE_KEY = 'heyganba_kana_typing';
const MAX_BOX = 5;
const LINE_LENGTH = 10;
/** Missing a character queues one retry copy at the end; the queue is capped so the line stays bounded. */
const MAX_RETRY_QUEUE = 5;

interface LineChar {
  key: string;
  entry: KanaEntry;
  accepted: string[];
  status: 'pending' | 'done' | 'error';
}

/**
 * typekana.com-style mechanism: 5 Leitner boxes — the lower the box (missed more often), the more
 * often the character shows up. Box 1 weighs 16x box 5; a correct answer promotes one box,
 * a miss sends the character back to box 1.
 */
function boxWeight(box: number): number {
  const clamped = Math.min(Math.max(box, 1), MAX_BOX);
  return Math.max(1, 16 >> (clamped - 1));
}

function loadBoxes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Pick a character by Leitner weight, avoiding an immediate repeat. */
function pickWeighted(pool: KanaEntry[], boxes: Record<string, number>, avoid: string | null): KanaEntry | null {
  if (pool.length === 0) return null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const total = pool.reduce((sum, entry) => sum + boxWeight(boxes[entry.character] ?? 1), 0);
    let ticket = Math.random() * total;
    for (const entry of pool) {
      ticket -= boxWeight(boxes[entry.character] ?? 1);
      if (ticket <= 0) {
        if (entry.character !== avoid || pool.length === 1) return entry;
        break;
      }
    }
  }

  return pool.find((entry) => entry.character !== avoid) ?? pool[0];
}

/** One session line: weighted picks, no adjacent repeats, chained from the previous line. */
function buildLine(pool: KanaEntry[], boxes: Record<string, number>, avoid: string | null, keyBase: number): LineChar[] {
  const chars: LineChar[] = [];
  let previous = avoid;

  for (let index = 0; index < LINE_LENGTH; index += 1) {
    const entry = pickWeighted(pool, boxes, previous);
    if (!entry) break;
    chars.push({
      key: `${keyBase + index}-${entry.character}`,
      entry,
      accepted: acceptedRomaji(entry),
      status: 'pending',
    });
    previous = entry.character;
  }

  return chars;
}

/** First-session default: the whole basic (GOJUON) group of the current script. */
function defaultSelection(script: KanaScript): string[] {
  return getKanaQuizPool(script)
    .filter((entry) => entry.group === 'GOJUON')
    .map((entry) => entry.character);
}

/**
 * Kana typing drill, typekana.com style: a setup screen picks characters (group / row / single
 * character) → the session types through one line of kana. Romaji is typed straight from the
 * keyboard (no visible input; touch devices tap the line to open the keyboard); the romaji typed
 * so far shows under the line. A missed key turns the character red with the correct reading
 * above it, queues the character again at the end of the line, and the turn moves on.
 * No replay / reset / correct-wrong counters — only `Kết thúc` returns to the setup screen.
 */
export const KanaQuiz: React.FC<KanaQuizProps> = ({ script }) => {
  const [phase, setPhase] = useState<'SETUP' | 'SESSION'>('SETUP');
  const [selectedByScript, setSelectedByScript] = useState<Record<KanaScript, string[]>>(() => ({
    HIRAGANA: defaultSelection('HIRAGANA'),
    KATAKANA: defaultSelection('KATAKANA'),
  }));
  const [line, setLine] = useState<LineChar[]>([]);
  const [index, setIndex] = useState(0);
  const [hasTyped, setHasTyped] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [slide, setSlide] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  const boxesRef = useRef<Record<string, number> | null>(null);
  if (boxesRef.current === null) {
    boxesRef.current = loadBoxes();
  }
  const bufferRef = useRef('');
  const lineKeyRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const charRefs = useRef(new Map<string, HTMLElement>());

  const isTouch = useMemo(() => window.matchMedia?.('(hover: none)').matches ?? false, []);

  const selectedSet = useMemo(() => new Set(selectedByScript[script]), [selectedByScript, script]);

  const pool = useMemo(
    () => getKanaQuizPool(script).filter((entry) => selectedSet.has(entry.character)),
    [script, selectedSet]
  );

  /** Group → rows → characters, in data order, for the setup screen. */
  const sections = useMemo(() => {
    const entries = getKanaQuizPool(script);
    return KANA_GROUP_ORDER[script]
      .filter((group): group is QuizGroup => group !== 'DOUBLE_KATAKANA')
      .map((group) => {
        const rows: { label: string; chars: string[] }[] = [];
        for (const entry of entries.filter((item) => item.group === group)) {
          const last = rows[rows.length - 1];
          if (last && last.label === entry.row) last.chars.push(entry.character);
          else rows.push({ label: entry.row, chars: [entry.character] });
        }
        return { group, rows };
      })
      .filter((section) => section.rows.length > 0);
  }, [script]);

  const persist = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boxesRef.current ?? {}));
    } catch {
      // localStorage can be blocked (private mode) — losing drill progress is acceptable.
    }
  }, []);

  const updateSelection = useCallback(
    (mutate: (set: Set<string>) => void) => {
      setSelectedByScript((previous) => {
        const next = new Set(previous[script]);
        mutate(next);
        return { ...previous, [script]: [...next] };
      });
    },
    [script]
  );

  const toggleChar = useCallback(
    (char: string) => updateSelection((set) => (set.has(char) ? set.delete(char) : set.add(char))),
    [updateSelection]
  );

  const toggleChars = useCallback(
    (chars: string[]) =>
      updateSelection((set) => {
        const allSelected = chars.every((char) => set.has(char));
        for (const char of chars) {
          if (allSelected) set.delete(char);
          else set.add(char);
        }
      }),
    [updateSelection]
  );

  const startSession = useCallback(() => {
    if (pool.length === 0) return;
    bufferRef.current = '';
    setBuffer('');
    lineKeyRef.current += LINE_LENGTH;
    setLine(buildLine(pool, boxesRef.current ?? {}, null, lineKeyRef.current));
    setIndex(0);
    setHasTyped(false);
    setPhase('SESSION');
  }, [pool]);

  const endSession = useCallback(() => {
    bufferRef.current = '';
    setBuffer('');
    setPhase('SETUP');
  }, []);

  useEffect(() => {
    if (phase === 'SESSION') {
      inputRef.current?.focus();
    }
  }, [phase]);

  // The session listens on window: letters fill the buffer, Enter confirms the reading.
  useEffect(() => {
    if (phase !== 'SESSION') return undefined;

    const completeCurrent = (current: LineChar, boxes: Record<string, number>) => {
      const nextIndex = index + 1;
      if (nextIndex >= line.length) {
        lineKeyRef.current += LINE_LENGTH;
        setLine(buildLine(pool, boxes, current.entry.character, lineKeyRef.current));
        setIndex(0);
      } else {
        setLine((previous) =>
          previous.map((item, position) =>
            position === index ? { ...item, status: item.status === 'error' ? 'error' : 'done' } : item
          )
        );
        setIndex(nextIndex);
      }
    };

    const missCurrent = (current: LineChar) => {
      const boxes = boxesRef.current ?? {};
      boxes[current.entry.character] = 1;
      persist();

      const nextIndex = index + 1;
      if (line.length < LINE_LENGTH + MAX_RETRY_QUEUE) {
        // Queue a retry copy at the end of the line (no animation — the line is a slider).
        lineKeyRef.current += 1;
        const retry: LineChar = {
          key: `retry-${lineKeyRef.current}`,
          entry: current.entry,
          accepted: current.accepted,
          status: 'pending',
        };
        setLine((previous) => [
          ...previous.map((item, position) => (position === index ? { ...item, status: 'error' as const } : item)),
          retry,
        ]);
        setIndex(nextIndex);
        return;
      }

      // Retry queue full: mark the miss, then finish or advance without queueing another copy.
      if (nextIndex >= line.length) {
        lineKeyRef.current += LINE_LENGTH;
        setLine(buildLine(pool, boxes, current.entry.character, lineKeyRef.current));
        setIndex(0);
      } else {
        setLine((previous) =>
          previous.map((item, position) => (position === index ? { ...item, status: 'error' as const } : item))
        );
        setIndex(nextIndex);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const isOurInput = target === inputRef.current;
      if (!isOurInput && target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        bufferRef.current = bufferRef.current.slice(0, -1);
        setBuffer(bufferRef.current);
        return;
      }

      if (event.key === 'Enter') {
        // Confirm on Enter only: a matching reading advances, anything else counts as a miss.
        event.preventDefault();
        const current = line[index];
        const typed = bufferRef.current.trim().toLowerCase();
        bufferRef.current = '';
        setBuffer('');
        if (!current || !typed) return;

        if (current.accepted.includes(typed)) {
          const boxes = boxesRef.current ?? {};
          if (current.status !== 'error') {
            const previousBox = boxes[current.entry.character] ?? 1;
            const nextBox = Math.min(MAX_BOX, previousBox + 1);
            boxes[current.entry.character] = nextBox;
            if (previousBox < 3 && nextBox >= 3) {
              confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
            }
          }
          persist();
          completeCurrent(current, boxes);
          return;
        }

        missCurrent(current);
        return;
      }

      if (!/^[a-zA-Z]$/.test(event.key)) return;
      event.preventDefault();
      bufferRef.current += event.key.toLowerCase();
      setBuffer(bufferRef.current);
      setHasTyped(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, line, index, pool, persist]);

  // Slider: the current character stays pinned at the centre of the stage, the line slides sideways.
  const stageRef = useRef<HTMLDivElement | null>(null);

  const computeSlide = useCallback(() => {
    const current = line[index];
    const node = current ? charRefs.current.get(current.key) : null;
    const stage = stageRef.current;
    if (!node || !stage) return 0;
    const styles = getComputedStyle(stage);
    const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const contentWidth = stage.clientWidth - padding;
    // Pixels to shift the strip so the current character's centre lands on the stage centre.
    return contentWidth / 2 - (node.offsetLeft + node.offsetWidth / 2);
  }, [line, index]);

  useLayoutEffect(() => {
    setSlide(computeSlide());
  }, [computeSlide]);

  useEffect(() => {
    const recompute = () => setSlide(computeSlide());
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [computeSlide]);

  const cellClass = (selected: boolean) =>
    `flex h-[42px] min-w-[42px] cursor-pointer items-center justify-center border px-2 font-serif text-[19px] leading-none transition-colors ${
      selected
        ? 'border-fg bg-fg text-bg'
        : 'border-rule-strong bg-transparent text-fg-60 hover:border-fg hover:text-fg'
    }`;

  if (phase === 'SETUP') {
    return (
      <div className="flex w-full flex-col">
        <div>
          {sections.map((section) => {
            const groupChars = section.rows.flatMap((row) => row.chars);
            const allSelected = groupChars.every((char) => selectedSet.has(char));
            const someSelected = groupChars.some((char) => selectedSet.has(char));
            return (
              <div key={section.group} className="mt-8 first:mt-0">
                <button
                  type="button"
                  data-group-select={section.group}
                  title={allSelected ? 'Bỏ chọn cả nhóm' : 'Chọn cả nhóm'}
                  onClick={() => toggleChars(groupChars)}
                  className={`cursor-pointer border-0 bg-transparent p-0 text-[10.5px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-fg ${
                    allSelected ? 'text-fg' : someSelected ? 'text-fg-60' : 'text-fg-38'
                  }`}
                >
                  {KANA_GROUP_META[section.group].shortLabel}
                </button>

                <div className="mt-3 space-y-2">
                  {section.rows.map((row) => {
                    const rowAll = row.chars.every((char) => selectedSet.has(char));
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <button
                          type="button"
                          data-row-select={row.label}
                          title={rowAll ? 'Bỏ chọn cả hàng' : 'Chọn cả hàng'}
                          onClick={() => toggleChars(row.chars)}
                          className={`w-[96px] shrink-0 cursor-pointer border-0 bg-transparent p-0 text-left text-[11.5px] transition-colors hover:text-fg ${
                            rowAll ? 'text-fg' : 'text-fg-60'
                          }`}
                        >
                          {row.label}
                        </button>
                        <div className="flex flex-wrap gap-1.5">
                          {row.chars.map((char) => (
                            <button
                              key={char}
                              type="button"
                              data-char-select={char}
                              title={`Chọn / bỏ chọn ${char}`}
                              onClick={() => toggleChar(char)}
                              className={cellClass(selectedSet.has(char))}
                            >
                              {char}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 z-10 mt-10 flex items-center justify-between gap-6 bg-bg py-4">
          <p className="text-[11.5px] text-fg-38">{pool.length} ký tự · ký tự hay gõ sai sẽ lặp lại nhiều hơn</p>
          <button
            type="button"
            onClick={startSession}
            disabled={pool.length === 0}
            className="shrink-0 cursor-pointer border-0 bg-fg px-6 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Bắt đầu
          </button>
        </div>
      </div>
    );
  }

  const hint = isTouch && !inputFocused ? 'Chạm vào đây để mở bàn phím' : !hasTyped ? 'Gõ cách đọc rồi nhấn Enter' : '';

  return (
    <div className="flex w-full cursor-text flex-col items-center" onClick={() => inputRef.current?.focus()}>
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={endSession}
          className="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-fg-38 underline-offset-2 hover:text-fg hover:underline"
        >
          Kết thúc
        </button>
      </div>

      <div
        ref={stageRef}
        data-kana-stage
        className="mt-10 w-full max-w-[880px] overflow-hidden border border-rule px-6 py-10"
      >
        <div
          className="relative flex flex-nowrap items-start gap-x-[0.35em] font-serif text-[clamp(32px,7.5vw,50px)] font-light leading-none transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${slide}px)` }}
        >
          {line.map((item, position) => {
            const isCurrent = position === index;
            const color =
              item.status === 'done'
                ? 'text-fg-38'
                : item.status === 'error'
                  ? 'text-red'
                  : isCurrent
                    ? 'text-fg'
                    : 'text-fg-60';
            const underline = isCurrent
              ? item.status === 'error'
                ? ' border-b-2 border-red'
                : ' border-b-2 border-fg'
              : '';
            return (
              <span
                key={item.key}
                ref={(node) => {
                  if (node) charRefs.current.set(item.key, node);
                  else charRefs.current.delete(item.key);
                }}
                className="inline-flex flex-col items-center"
              >
                <span className="h-4 font-sans text-[11px] leading-none text-red">
                  {item.status === 'error' ? item.accepted[0] : ''}
                </span>
                <span
                  data-kana-char={item.entry.character}
                  data-status={item.status}
                  data-current={isCurrent ? 'true' : undefined}
                  className={`inline-block pb-1 ${color}${underline}`}
                >
                  {item.entry.character}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div data-kana-buffer className="mt-6 flex h-11 w-[240px] items-center justify-center bg-card">
        <span className="max-w-[210px] overflow-hidden whitespace-nowrap text-[16px] font-semibold tracking-[0.08em] text-fg">{buffer}</span>
        <span aria-hidden="true" className="ml-[3px] h-[18px] w-[2px] animate-caret bg-fg" />
      </div>

      <p className="mt-4 h-4 text-[11.5px] text-fg-38">{hint}</p>

      <input
        ref={inputRef}
        value=""
        onChange={() => undefined}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
        tabIndex={-1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Ô nhập ẩn — chạm vào dãy để mở bàn phím khi dùng thiết bị cảm ứng"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
};

let loading: Promise<void> | undefined;

/** Download the self-hosted writer only when its station is used. */
export function loadHanziWriter(): Promise<void> {
  if ((window as Window & { HanziWriter?: unknown }).HanziWriter) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/vendor/hanzi-writer-3.5.0.min.js';
    script.async = true;
    const fail = () => { clearTimeout(timer); loading = undefined; script.remove(); reject(new Error('Writer unavailable')); };
    const timer = setTimeout(fail, 15_000);
    script.onload = () => {
      clearTimeout(timer);
      if ((window as Window & { HanziWriter?: unknown }).HanziWriter) resolve(); else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}

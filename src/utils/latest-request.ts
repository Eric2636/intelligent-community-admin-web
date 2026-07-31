export type LatestRequestOptions<T> = {
  key: string;
  deduplicate?: boolean;
  request: () => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
  onLoading: (loading: boolean) => void;
};

export function createLatestRequestRunner() {
  let alive = true;
  let sequence = 0;
  let activeKey: string | undefined;
  let activePromise: Promise<void> | undefined;

  function run<T>(options: LatestRequestOptions<T>): Promise<void> {
    if (!alive) return Promise.resolve();
    if (options.deduplicate && activePromise && activeKey === options.key) return activePromise;

    const currentSequence = ++sequence;
    activeKey = options.key;
    options.onLoading(true);

    const promise = (async () => {
      try {
        const value = await options.request();
        if (alive && currentSequence === sequence) options.onSuccess(value);
      } catch (error) {
        if (alive && currentSequence === sequence) options.onError(error);
      } finally {
        if (alive && currentSequence === sequence) {
          activeKey = undefined;
          activePromise = undefined;
          options.onLoading(false);
        }
      }
    })();
    activePromise = promise;
    return promise;
  }

  function dispose() {
    alive = false;
    sequence += 1;
    activeKey = undefined;
    activePromise = undefined;
  }

  return { dispose, run };
}

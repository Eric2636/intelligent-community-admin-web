export function createRegistrationEntriesLoader(fetchEntries, update) {
  let alive = true;
  let sequence = 0;
  let currentPostId = '';

  async function load(postId) {
    currentPostId = String(postId || '');
    const current = ++sequence;
    update({ entries: [], error: '' });
    update({ loading: true });
    try {
      const data = await fetchEntries(currentPostId);
      if (alive && current === sequence) update({ entries: data?.list || [], error: '' });
    } catch (error) {
      if (alive && current === sequence) update({ entries: [], error: String(error?.message || error || '加载失败') });
    } finally {
      if (alive && current === sequence) update({ loading: false });
    }
  }

  function retry() { return currentPostId ? load(currentPostId) : Promise.resolve(); }
  function dispose() { alive = false; sequence += 1; }
  return { load, retry, dispose };
}

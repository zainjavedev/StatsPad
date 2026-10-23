import { useEffect, useState } from 'react';

/* The last result of each loader, so coming back to a page shows what it had at once. */
const seen = new Map();

/* Runs a promise factory once per factory identity; the result is null while
   loading and an empty list if the request fails. A loader that has run before
   returns its last result straight away and refreshes it in the background. */
export function useFeed(load) {
  const [items, setItems] = useState(() => seen.get(load) ?? null);
  useEffect(() => {
    let active = true;
    load().then(result => { seen.set(load, result); if (active) setItems(result); }).catch(() => active && setItems(current => current ?? []));
    return () => { active = false; };
  }, [load]);
  return items;
}

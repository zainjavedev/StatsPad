import { useEffect, useState } from 'react';

/* Runs a promise factory once per factory identity; the result is null while
   loading and an empty list if the request fails. */
export function useFeed(load) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let active = true;
    load().then(result => active && setItems(result)).catch(() => active && setItems([]));
    return () => { active = false; };
  }, [load]);
  return items;
}

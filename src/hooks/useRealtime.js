import { useEffect, useRef, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';

function serializeDoc(snap) {
  return { id: snap.id, ...snap.data() };
}

function friendlyError(err) {
  if (!err) return 'Failed to load data.';
  if (err.code === 'permission-denied') {
    return 'You do not have permission to view this data.';
  }
  if (err.code === 'unavailable') {
    return 'Connection issue. Retrying automatically...';
  }
  return err.message || 'Failed to load data.';
}

/**
 * Live-updating Firestore collection query.
 * `buildQuery` is a function returning a Query (or null to disable).
 * `deps` controls when the listener is rebuilt.
 * Returns { data, loading, error } where data is an array of
 * `{ id, ...fields }` objects that updates whenever the query result changes.
 */
export function useRealtimeQuery(buildQuery, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildRef = useRef(buildQuery);
  buildRef.current = buildQuery;

  const depsKey = deps.join('|');

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    setError(null);

    let q;
    try {
      q = buildRef.current();
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
      return () => {};
    }

    if (!q) {
      setData([]);
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!active) return;
          setData(snapshot.docs.map(serializeDoc));
          setLoading(false);
        },
        (err) => {
          if (!active) return;
          setError(friendlyError(err));
          setLoading(false);
        }
      );
    } catch (err) {
      if (!active) return;
      setError(friendlyError(err));
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, buildRef]);

  return { data, loading, error };
}
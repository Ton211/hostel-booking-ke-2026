import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, query, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebase';

/**
 * Real-time subscription to a single Firestore document
 * @param {string} collection - Collection name
 * @param {string|null} docId - Document ID (null to disable)
 * @returns {{ data: Object|null, loading: boolean, error: string|null }}
 */
export function useFirestoreDoc(collection, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!docId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(firestore, collection, docId);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...snapshot.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collection}/${docId}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collection, docId]);

  return { data, loading, error };
}

/**
 * Execute a Firestore query and return results
 * @param {Function} queryFn - Function that returns a Firestore query
 * @param {Array} deps - Dependencies for re-fetching
 * @returns {{ data: Array, loading: boolean, error: string|null }}
 */
export function useFirestoreQuery(queryFn, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const q = queryFnRef.current();
        const snapshot = await getDocs(q);
        const results = [];

        snapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (!cancelled) {
          setData(results);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching query:', err);
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, loading, error };
}

/**
 * Real-time subscription to a Firestore query
 * @param {Function} queryFn - Function that returns a Firestore query
 * @param {Array} deps - Dependencies for re-subscribing
 * @returns {{ data: Array, loading: boolean, error: string|null }}
 */
export function useFirestoreRealtimeQuery(queryFn, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = queryFnRef.current();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = [];
        snapshot.forEach((docSnap) => {
          results.push({ id: docSnap.id, ...docSnap.data() });
        });
        setData(results);
        setLoading(false);
      },
      (err) => {
        console.error('Error in realtime query:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, deps);

  return { data, loading, error };
}

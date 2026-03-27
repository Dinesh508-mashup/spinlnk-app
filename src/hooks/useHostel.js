import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHostel } from '../lib/supabase';

export default function useHostel() {
  const [searchParams] = useSearchParams();
  const hostelParam = searchParams.get('hostel');
  const [hostelId, setHostelId] = useState(hostelParam || localStorage.getItem('spinlnk_hostel') || null);
  const [hostelName, setHostelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hostelParam) {
      localStorage.setItem('spinlnk_hostel', hostelParam);
      setHostelId(hostelParam);
    }
  }, [hostelParam]);

  useEffect(() => {
    if (!hostelId) {
      setLoading(false);
      setError('No hostel linked. Scan a valid QR code.');
      return;
    }
    (async () => {
      try {
        const hostel = await getHostel(hostelId);
        if (hostel) {
          setHostelName(hostel.name);
        } else {
          setError('Hostel not found.');
        }
      } catch (e) {
        setError('Failed to connect.');
      } finally {
        setLoading(false);
      }
    })();
  }, [hostelId]);

  return { hostelId, hostelName, loading, error };
}

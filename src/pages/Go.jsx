import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Go() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hostel = searchParams.get('hostel') || '';
  const type = searchParams.get('type') || 'machine';

  useEffect(() => {
    // Route directly to the correct web page with hostel param
    const target = type === 'room' ? 'queue' : 'home';
    navigate(`/${target}?hostel=${encodeURIComponent(hostel)}&type=${encodeURIComponent(type)}`, { replace: true });
  }, [hostel, type, navigate]);

  return null;
}

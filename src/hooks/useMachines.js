import { useState, useEffect, useCallback } from 'react';
import { getMachines, updateMachine, clearQueue, addWashHistory } from '../lib/supabase';

export default function useMachines(hostelId) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!hostelId) return;
    try {
      const data = await getMachines(hostelId);
      // Auto-free expired machines
      const now = Date.now();
      for (const m of data) {
        if (m.status === 'in-use' && m.end_time && now >= m.end_time) {
          await updateMachine(hostelId, m.machine_key, {
            status: 'free', user_name: null, room: null, cycle: null, end_time: null,
          });
          await clearQueue(hostelId, m.machine_key);
          m.status = 'free';
          m.user_name = null;
          m.room = null;
          m.cycle = null;
          m.end_time = null;
          m.queue_members = [];
        }
      }
      setMachines(data);
    } catch (e) {
      console.error('Fetch machines error:', e);
    } finally {
      setLoading(false);
    }
  }, [hostelId]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [fetch]);

  const startWash = async (machineKey, userName, room, cycleName, minutes) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    await updateMachine(hostelId, machineKey, {
      status: 'in-use',
      user_name: userName,
      room,
      cycle: cycleName,
      end_time: endTime,
    });
    await addWashHistory(hostelId, {
      machine_key: machineKey,
      machine_name: `Machine ${machineKey}`,
      user_name: userName,
      room,
      cycle: cycleName,
      duration: minutes,
      started_at: new Date().toISOString(),
    });
    await fetch();
  };

  const freeMachine = async (machineKey) => {
    await updateMachine(hostelId, machineKey, {
      status: 'free', user_name: null, room: null, cycle: null, end_time: null,
    });
    await clearQueue(hostelId, machineKey);
    await fetch();
  };

  return { machines, loading, refresh: fetch, startWash, freeMachine };
}

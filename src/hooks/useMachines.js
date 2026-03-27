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

  const startWash = async (machineKey, userName, room, cycleName, minutes, accessCode) => {
    const endTime = Date.now() + minutes * 60 * 1000;
    await updateMachine(hostelId, machineKey, {
      status: 'in-use',
      user_name: userName,
      room,
      cycle: cycleName,
      end_time: endTime,
      snooze_count: 0,
      access_code: accessCode || null,
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
      status: 'free', user_name: null, room: null, cycle: null, end_time: null, snooze_count: 0, access_code: null,
    });
    await clearQueue(hostelId, machineKey);
    await fetch();
  };

  const verifyAccessCode = (machineKey, code) => {
    const machine = machines.find(m => m.machine_key === machineKey);
    if (!machine || !machine.access_code) return true;
    return machine.access_code === code;
  };

  const extendTime = async (machineKey) => {
    const machine = machines.find(m => m.machine_key === machineKey);
    if (!machine || !machine.end_time) return false;
    const used = machine.snooze_count || 0;
    if (used >= 3) return false;
    const newEndTime = machine.end_time + 5 * 60 * 1000;
    await updateMachine(hostelId, machineKey, { end_time: newEndTime, snooze_count: used + 1 });
    await fetch();
    return true;
  };

  return { machines, loading, refresh: fetch, startWash, freeMachine, extendTime, verifyAccessCode };
}

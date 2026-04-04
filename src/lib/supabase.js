import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ===== Hostel =====
export async function getHostel(hostelId) {
  const { data, error } = await supabase.from('hostels').select('*').eq('id', hostelId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getHostelByAdminId(adminId) {
  const { data, error } = await supabase.from('hostels').select('*').eq('admin_id', adminId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getHostelByLoginId(loginId) {
  const { data, error } = await supabase.from('hostels').select('*').eq('login_id', loginId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createHostel(id, hostelName, loginId, adminId, contactNumber, password) {
  const { data, error } = await supabase.from('hostels').insert({
    id,
    hostel_name: hostelName,
    login_id: loginId,
    admin_id: adminId,
    contact_number: contactNumber,
    password,
  }).select();
  if (error) throw error;
  return data;
}

export async function updateHostelQR(hostelId, machineQrUrl, roomQrUrl) {
  const { error } = await supabase.from('hostels').update({ machine_qr_url: machineQrUrl, room_qr_url: roomQrUrl }).eq('id', hostelId);
  if (error) throw error;
}

// ===== Machines =====
export async function getMachines(hostelId) {
  const { data, error } = await supabase.from('machines').select('*').eq('hostel_id', hostelId).order('machine_key', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addMachine(hostelId, machineKey, name, type = 'washer') {
  const { data, error } = await supabase.from('machines').insert({ hostel_id: hostelId, machine_key: machineKey, name, type }).select();
  if (error) throw error;
  return data;
}

export async function deleteMachine(hostelId, machineKey) {
  const { error } = await supabase.from('machines').delete().eq('hostel_id', hostelId).eq('machine_key', machineKey);
  if (error) throw error;
}

export async function updateMachine(hostelId, machineKey, updates) {
  const { error } = await supabase.from('machines').update(updates).eq('hostel_id', hostelId).eq('machine_key', machineKey);
  if (error) throw error;
}

// ===== Queue (atomic PostgreSQL functions) =====
export async function joinQueue(hostelId, machineKey, userName, room = '') {
  const { data, error } = await supabase.rpc('join_queue', {
    p_hostel_id: hostelId,
    p_machine_key: machineKey,
    p_user_name: userName,
    p_room: room,
  });
  if (error) throw error;
  return data;
}

export async function leaveQueue(hostelId, machineKey, userName) {
  const { data, error } = await supabase.rpc('leave_queue', {
    p_hostel_id: hostelId,
    p_machine_key: machineKey,
    p_user_name: userName,
  });
  if (error) throw error;
  return data;
}

export async function clearQueue(hostelId, machineKey) {
  return updateMachine(hostelId, machineKey, { queue_members: [] });
}

// ===== Wash History =====
export async function getWashHistory(hostelId) {
  // Auto-delete records older than 12 hours
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  await supabase.from('wash_history').delete().eq('hostel_id', hostelId).lt('started_at', cutoff);

  const { data, error } = await supabase.from('wash_history').select('*').eq('hostel_id', hostelId).order('started_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data || [];
}

export async function addWashHistory(hostelId, entry) {
  const { error } = await supabase.from('wash_history').insert({ hostel_id: hostelId, ...entry });
  if (error) throw error;
}

// ===== Timer Alerts (server-side push notifications) =====
export async function insertTimerAlert(hostelId, machineKey, machineName, userName, alertType, alertAt) {
  // alertAt should be a Date object or ISO string representing when the alert should fire
  const alertAtISO = alertAt instanceof Date ? alertAt.toISOString() : new Date(alertAt).toISOString();

  // Upsert: avoid duplicate alerts for same user + machine + type
  // First delete any existing alert for this combo, then insert fresh
  await supabase
    .from('timer_alerts')
    .delete()
    .eq('hostel_id', hostelId)
    .eq('machine_key', machineKey)
    .eq('user_name', userName)
    .eq('alert_type', alertType);

  const { error } = await supabase.from('timer_alerts').insert({
    hostel_id: hostelId,
    machine_key: machineKey,
    machine_name: machineName,
    user_name: userName,
    alert_type: alertType,
    alert_at: alertAtISO,
  });
  if (error) console.error('Failed to insert timer alert:', error);
}

export async function deleteTimerAlert(hostelId, machineKey, userName) {
  const { error } = await supabase
    .from('timer_alerts')
    .delete()
    .eq('hostel_id', hostelId)
    .eq('machine_key', machineKey)
    .eq('user_name', userName);
  if (error) console.error('Failed to delete timer alert:', error);
}

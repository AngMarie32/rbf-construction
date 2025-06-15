
import { supabase } from '@/integrations/supabase/client';
import type { Equipment, EquipmentReservation, EquipmentUsageLog, EquipmentAlert } from '@/types/equipment';

export class EquipmentService {
  static async fetchEquipment(): Promise<Equipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        *,
        projects:project_assignment_id(name)
      `)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async fetchEquipmentWithAnalytics(equipmentId: string) {
    const [equipment, usageLogs, maintenanceLogs, alerts] = await Promise.all([
      supabase.from('equipment').select('*').eq('id', equipmentId).single(),
      supabase.from('equipment_usage_logs').select('*').eq('equipment_id', equipmentId),
      supabase.from('maintenance_logs').select('*').eq('equipment_id', equipmentId),
      supabase.from('equipment_alerts').select('*').eq('equipment_id', equipmentId).eq('is_acknowledged', false)
    ]);

    return {
      equipment: equipment.data,
      usageLogs: usageLogs.data || [],
      maintenanceLogs: maintenanceLogs.data || [],
      alerts: alerts.data || []
    };
  }

  static async updateEquipment(id: string, updates: Partial<Equipment>) {
    const { data, error } = await supabase
      .from('equipment')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteEquipment(id: string) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async bulkUpdateStatus(equipmentIds: string[], status: Equipment['status']) {
    const { data, error } = await supabase
      .from('equipment')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', equipmentIds)
      .select();

    if (error) throw error;
    return data;
  }

  static async createReservation(reservation: Omit<EquipmentReservation, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('equipment_reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async logUsage(usage: Omit<EquipmentUsageLog, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('equipment_usage_logs')
      .insert(usage)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async generateQRCode(equipmentId: string): Promise<string> {
    // Simple QR code data - in a real app, you'd use a QR code library
    const qrData = `EQUIPMENT:${equipmentId}`;
    
    const { data, error } = await supabase
      .from('equipment')
      .update({ qr_code: qrData })
      .eq('id', equipmentId)
      .select('qr_code')
      .single();

    if (error) throw error;
    return data.qr_code;
  }

  static async fetchAlerts(): Promise<EquipmentAlert[]> {
    const { data, error } = await supabase
      .from('equipment_alerts')
      .select(`
        *,
        equipment:equipment_id(name)
      `)
      .eq('is_acknowledged', false)
      .order('severity', { ascending: false })
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async acknowledgeAlert(alertId: string) {
    const { error } = await supabase
      .from('equipment_alerts')
      .update({ 
        is_acknowledged: true, 
        acknowledged_at: new Date().toISOString() 
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  static calculateDepreciation(equipment: Equipment): number {
    if (!equipment.purchase_date || !equipment.value || !equipment.depreciation_rate) {
      return equipment.value || 0;
    }

    const purchaseDate = new Date(equipment.purchase_date);
    const yearsOwned = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const depreciation = equipment.value * (equipment.depreciation_rate / 100) * yearsOwned;
    
    return Math.max(0, equipment.value - depreciation);
  }

  static calculateUtilization(equipment: Equipment, usageLogs: EquipmentUsageLog[]): number {
    const totalHours = usageLogs.reduce((sum, log) => sum + (log.hours_used || 0), 0);
    const daysSincePurchase = equipment.purchase_date 
      ? Math.max(1, (Date.now() - new Date(equipment.purchase_date).getTime()) / (1000 * 60 * 60 * 24))
      : 365;
    
    const potentialHours = daysSincePurchase * 8; // 8 hours per day potential
    return totalHours / potentialHours * 100;
  }
}

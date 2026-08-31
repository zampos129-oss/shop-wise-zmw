import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryNoteItem {
  id?: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DeliveryNote {
  id: string;
  deliveryNoteNumber: string;
  businessId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerTpin: string | null;
  deliveryAddress: string | null;
  referenceNumber: string | null;
  driverName: string | null;
  vehicleRegistration: string | null;
  receivedBy: string | null;
  showPrices: boolean;
  notes: string | null;
  deliveryDate: string | null;
  status: 'draft' | 'sent' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  items?: DeliveryNoteItem[];
}

const mapRow = (row: any): DeliveryNote => ({
  id: row.id,
  deliveryNoteNumber: row.delivery_note_number,
  businessId: row.business_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerEmail: row.customer_email,
  customerTpin: row.customer_tpin ?? null,
  deliveryAddress: row.delivery_address ?? null,
  referenceNumber: row.reference_number ?? null,
  driverName: row.driver_name ?? null,
  vehicleRegistration: row.vehicle_registration ?? null,
  receivedBy: row.received_by ?? null,
  showPrices: row.show_prices ?? true,
  notes: row.notes,
  deliveryDate: row.delivery_date,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedAt: row.deleted_at,
});

const mapItemRow = (row: any): DeliveryNoteItem => ({
  id: row.id,
  productId: row.product_id,
  productName: row.product_name,
  quantity: row.quantity,
  unitPrice: Number(row.unit_price),
  lineTotal: Number(row.line_total),
});

export function useDeliveryNotes(businessId: string | undefined) {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDeliveryNotes = useCallback(async () => {
    if (!businessId) { setDeliveryNotes([]); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('delivery_notes')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setDeliveryNotes((data ?? []).map(mapRow));
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast]);

  useEffect(() => { fetchDeliveryNotes(); }, [fetchDeliveryNotes]);

  const getDeliveryNoteWithItems = async (id: string): Promise<DeliveryNote | null> => {
    const { data: dData, error: dErr } = await supabase
      .from('delivery_notes')
      .select('*')
      .eq('id', id)
      .single();
    if (dErr || !dData) return null;

    const { data: items } = await supabase
      .from('delivery_note_items')
      .select('*')
      .eq('delivery_note_id', id)
      .order('created_at', { ascending: true });

    const d = mapRow(dData);
    d.items = (items ?? []).map(mapItemRow);
    return d;
  };

  const createDeliveryNote = async (
    d: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber' | 'businessId' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    items: DeliveryNoteItem[]
  ) => {
    if (!businessId) return null;

    const { data: newId, error } = await (supabase.rpc as any)('create_delivery_note_with_items', {
      p_business_id: businessId,
      p_header: {
        customer_name: d.customerName,
        customer_phone: d.customerPhone,
        customer_email: d.customerEmail,
        customer_tpin: d.customerTpin,
        delivery_address: d.deliveryAddress,
        reference_number: d.referenceNumber,
        driver_name: d.driverName,
        vehicle_registration: d.vehicleRegistration,
        received_by: d.receivedBy,
        show_prices: d.showPrices ?? true,
        notes: d.notes,
        delivery_date: d.deliveryDate,
        status: d.status || 'draft',
      },
      p_items: items.map(i => ({
        product_id: i.productId,
        product_name: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        line_total: i.lineTotal,
      })),
    });
    if (error) throw error;

    await fetchDeliveryNotes();
    return { id: newId } as any;
  };

  const updateDeliveryNote = async (
    id: string,
    d: Partial<DeliveryNote>,
    items?: DeliveryNoteItem[]
  ) => {
    const updateData: any = {};
    if (d.customerName !== undefined) updateData.customer_name = d.customerName;
    if (d.customerPhone !== undefined) updateData.customer_phone = d.customerPhone;
    if (d.customerEmail !== undefined) updateData.customer_email = d.customerEmail;
    if (d.customerTpin !== undefined) updateData.customer_tpin = d.customerTpin;
    if (d.deliveryAddress !== undefined) updateData.delivery_address = d.deliveryAddress;
    if (d.referenceNumber !== undefined) updateData.reference_number = d.referenceNumber;
    if (d.driverName !== undefined) updateData.driver_name = d.driverName;
    if (d.vehicleRegistration !== undefined) updateData.vehicle_registration = d.vehicleRegistration;
    if (d.receivedBy !== undefined) updateData.received_by = d.receivedBy;
    if (d.showPrices !== undefined) updateData.show_prices = d.showPrices;
    if (d.notes !== undefined) updateData.notes = d.notes;
    if (d.deliveryDate !== undefined) updateData.delivery_date = d.deliveryDate;
    if (d.status !== undefined) updateData.status = d.status;

    const { error } = await supabase.from('delivery_notes').update(updateData).eq('id', id);
    if (error) throw error;

    if (items) {
      await supabase.from('delivery_note_items').delete().eq('delivery_note_id', id);
      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from('delivery_note_items').insert(
          items.map(i => ({
            delivery_note_id: id,
            product_id: i.productId,
            product_name: i.productName,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            line_total: i.lineTotal,
          }))
        );
        if (itemsErr) throw itemsErr;
      }
    }

    await fetchDeliveryNotes();
  };

  const softDeleteDeliveryNote = async (id: string) => {
    const { error } = await supabase.from('delivery_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await fetchDeliveryNotes();
  };

  return {
    deliveryNotes,
    isLoading,
    fetchDeliveryNotes,
    getDeliveryNoteWithItems,
    createDeliveryNote,
    updateDeliveryNote,
    softDeleteDeliveryNote,
  };
}

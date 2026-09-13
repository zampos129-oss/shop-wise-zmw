import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDeliveryNotes, DeliveryNote, DeliveryNoteItem } from "@/hooks/useDeliveryNotes";
import { Product } from "@/hooks/useProducts";
import { DocumentBusinessDetails } from "./QuotationView";
import DeliveryNoteList from "./DeliveryNoteList";
import DeliveryNoteForm, { DeliveryNotePrefill } from "./DeliveryNoteForm";
import DeliveryNoteView from "./DeliveryNoteView";

type View = 'list' | 'new' | 'edit' | 'view';

interface DeliveryNoteTabProps {
  businessId: string;
  businessName: string;
  businessDetails: DocumentBusinessDetails;
  products: Product[];
  prefill?: DeliveryNotePrefill | null;
  onPrefillConsumed?: () => void;
}

const DeliveryNoteTab = ({ businessId, businessName, businessDetails, products, prefill, onPrefillConsumed }: DeliveryNoteTabProps) => {
  const { toast } = useToast();
  const { deliveryNotes, isLoading, createDeliveryNote, updateDeliveryNote, softDeleteDeliveryNote, getDeliveryNoteWithItems } = useDeliveryNotes(businessId);
  const [view, setView] = useState<View>('list');
  const [activeDeliveryNote, setActiveDeliveryNote] = useState<DeliveryNote | null>(null);

  useEffect(() => {
    if (prefill) { setActiveDeliveryNote(null); setView('new'); }
  }, [prefill]);

  const handleNew = () => { setActiveDeliveryNote(null); setView('new'); };

  const handleView = async (id: string) => {
    const d = await getDeliveryNoteWithItems(id);
    if (d) { setActiveDeliveryNote(d); setView('view'); }
  };

  const handleEdit = async (id: string) => {
    const d = await getDeliveryNoteWithItems(id);
    if (d) { setActiveDeliveryNote(d); setView('edit'); }
  };

  const handlePrint = async (id: string) => {
    const d = await getDeliveryNoteWithItems(id);
    if (d) { setActiveDeliveryNote(d); setView('view'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await softDeleteDeliveryNote(id);
      toast({ title: 'Delivery note deleted', description: 'No stock or records affected.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSaveNew = async (
    d: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber' | 'businessId' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    items: DeliveryNoteItem[]
  ) => {
    await createDeliveryNote(d, items);
    setView('list');
  };

  const handleSaveEdit = async (
    d: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber' | 'businessId' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    items: DeliveryNoteItem[]
  ) => {
    if (!activeDeliveryNote) return;
    await updateDeliveryNote(activeDeliveryNote.id, d, items);
    setView('list');
  };

  return (
    <>
      {view === 'list' && (
        <DeliveryNoteList
          deliveryNotes={deliveryNotes}
          isLoading={isLoading}
          onNew={handleNew}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPrint={handlePrint}
        />
      )}

      {view === 'new' && (
        <DeliveryNoteForm
          key={prefill ? 'prefilled' : 'blank'}
          products={products}
          prefill={prefill ?? null}
          onSave={handleSaveNew}
          onCancel={() => { onPrefillConsumed?.(); setView('list'); }}
        />
      )}

      {view === 'edit' && activeDeliveryNote && (
        <DeliveryNoteForm
          products={products}
          existingDeliveryNote={activeDeliveryNote}
          onSave={handleSaveEdit}
          onCancel={() => setView('list')}
        />
      )}

      {view === 'view' && activeDeliveryNote && (
        <DeliveryNoteView
          deliveryNote={activeDeliveryNote}
          businessName={businessName}
          businessDetails={businessDetails}
          onBack={() => setView('list')}
          onEdit={() => setView('edit')}
        />
      )}
    </>
  );
};

export default DeliveryNoteTab;

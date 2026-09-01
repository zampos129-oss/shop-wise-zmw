import { useState, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/hooks/useProducts";
import { DeliveryNote, DeliveryNoteItem } from "@/hooks/useDeliveryNotes";

export interface DeliveryNotePrefill {
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerTpin?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  items?: DeliveryNoteItem[];
}

interface DeliveryNoteFormProps {
  products: Product[];
  existingDeliveryNote?: DeliveryNote | null;
  prefill?: DeliveryNotePrefill | null;
  onSave: (
    d: Omit<DeliveryNote, 'id' | 'deliveryNoteNumber' | 'businessId' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
    items: DeliveryNoteItem[]
  ) => Promise<void>;
  onCancel: () => void;
}

const DeliveryNoteForm = ({ products, existingDeliveryNote, prefill, onSave, onCancel }: DeliveryNoteFormProps) => {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(existingDeliveryNote?.customerName || prefill?.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(existingDeliveryNote?.customerPhone || prefill?.customerPhone || "");
  const [customerEmail, setCustomerEmail] = useState(existingDeliveryNote?.customerEmail || prefill?.customerEmail || "");
  const [customerTpin, setCustomerTpin] = useState(existingDeliveryNote?.customerTpin || prefill?.customerTpin || "");
  const [deliveryAddress, setDeliveryAddress] = useState(existingDeliveryNote?.deliveryAddress || "");
  const [referenceNumber, setReferenceNumber] = useState(existingDeliveryNote?.referenceNumber || prefill?.referenceNumber || "");
  const [driverName, setDriverName] = useState(existingDeliveryNote?.driverName || "");
  const [vehicleRegistration, setVehicleRegistration] = useState(existingDeliveryNote?.vehicleRegistration || "");
  const [receivedBy, setReceivedBy] = useState(existingDeliveryNote?.receivedBy || "");
  const [showPrices, setShowPrices] = useState(existingDeliveryNote?.showPrices ?? true);
  const [notes, setNotes] = useState(existingDeliveryNote?.notes || prefill?.notes || "");
  const [deliveryDate, setDeliveryDate] = useState(existingDeliveryNote?.deliveryDate || "");
  const [status, setStatus] = useState<DeliveryNote['status']>(existingDeliveryNote?.status || 'draft');
  const [items, setItems] = useState<DeliveryNoteItem[]>(existingDeliveryNote?.items || prefill?.items || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q)));
  }, [products, searchQuery]);

  const addItem = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id
        ? { ...i, quantity: i.quantity + 1, lineTotal: (i.quantity + 1) * i.unitPrice }
        : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        lineTotal: product.price,
      }]);
    }
  };

  const updateItem = (idx: number, updates: Partial<DeliveryNoteItem>) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, ...updates };
      updated.lineTotal = updated.quantity * updated.unitPrice;
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'No items', description: 'Add at least one item.' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        customerTpin: customerTpin || null,
        deliveryAddress: deliveryAddress || null,
        referenceNumber: referenceNumber || null,
        driverName: driverName || null,
        vehicleRegistration: vehicleRegistration || null,
        receivedBy: receivedBy || null,
        showPrices,
        notes: notes || null,
        deliveryDate: deliveryDate || null,
        status,
      }, items);
      toast({ title: 'Delivery note saved' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="font-display font-bold text-lg">
          {existingDeliveryNote ? 'Edit Delivery Note' : 'New Delivery Note'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add Products</CardTitle>
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="max-h-[40vh] overflow-y-auto space-y-1">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addItem(p)} className="w-full text-left bg-secondary rounded-lg p-3 hover:opacity-90 transition">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">ZMW {p.price.toFixed(2)}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: Delivery note details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Customer Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="Customer name (optional)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                <Input placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>
              <Input
                placeholder="Customer TPIN (10 digits, optional)"
                inputMode="numeric"
                maxLength={10}
                value={customerTpin}
                onChange={e => setCustomerTpin(e.target.value.replace(/\D/g, ''))}
              />
              <div>
                <Label className="text-xs">Delivery Address</Label>
                <Textarea
                  placeholder="Street, area, town / site where goods are delivered"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  className="h-16"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Delivery Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Delivery Date</Label>
                  <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as DeliveryNote['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Order / Reference No.</Label>
                  <Input placeholder="e.g. PO-1234" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Vehicle Reg.</Label>
                  <Input placeholder="e.g. BAH 1234" value={vehicleRegistration} onChange={e => setVehicleRegistration(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Driver / Delivered By</Label>
                  <Input placeholder="Driver name" value={driverName} onChange={e => setDriverName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Received By</Label>
                  <Input placeholder="Leave blank to sign on paper" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <Checkbox checked={showPrices} onCheckedChange={(v) => setShowPrices(v === true)} />
                <span className="text-xs text-muted-foreground">Show prices and totals on the delivery note</span>
              </label>
              <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="h-16" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Items ({items.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-[35vh] overflow-y-auto">
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items added yet.</p>}
              {items.map((item, idx) => (
                <div key={idx} className="bg-secondary rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })} className="h-8 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <p className="h-8 flex items-center text-xs font-medium">ZMW {item.lineTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <Button variant="pos" className="w-full" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving…' : existingDeliveryNote ? 'Update Delivery Note' : 'Save Delivery Note'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DeliveryNoteForm;

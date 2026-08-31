import { ArrowLeft, Download, Printer, Edit, Calendar, User, Hash, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DeliveryNote, DeliveryNoteItem } from "@/hooks/useDeliveryNotes";
import { DocumentBusinessDetails } from "@/components/QuotationView";
import jsPDF from "jspdf";
import { printBlobUrl } from "@/lib/printPdf";

interface DeliveryNoteViewProps {
  deliveryNote: DeliveryNote;
  businessName: string;
  businessDetails: DocumentBusinessDetails;
  onBack: () => void;
  onEdit: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const DeliveryNoteView = ({ deliveryNote, businessName, businessDetails, onBack, onEdit }: DeliveryNoteViewProps) => {
  const items = deliveryNote.items || [];
  const status = statusConfig[deliveryNote.status] || statusConfig.draft;

  const loadImageAsBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const footerMargin = 20;
    let y = 15;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - footerMargin) {
        doc.addPage();
        y = 15;
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, w, 4, 'F');
      }
    };

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, w, 4, 'F');

    if (businessDetails.logoUrl) {
      const base64 = await loadImageAsBase64(businessDetails.logoUrl);
      if (base64) {
        try { doc.addImage(base64, 'PNG', 14, y, 28, 28); } catch { /* ignore */ }
      }
    }

    const textX = businessDetails.logoUrl ? 48 : 14;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(businessName, textX, y + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    let detailY = y + 14;
    if (businessDetails.address) { doc.text(businessDetails.address, textX, detailY); detailY += 4; }
    if (businessDetails.phone) { doc.text(businessDetails.phone, textX, detailY); detailY += 4; }
    if (businessDetails.email) { doc.text(businessDetails.email, textX, detailY); detailY += 4; }
    if (businessDetails.tpin) { doc.text(`TPIN: ${businessDetails.tpin}`, textX, detailY); detailY += 4; }

    y = Math.max(detailY, y + 32) + 4;

    doc.setFillColor(243, 244, 246);
    doc.roundedRect(14, y, w - 28, 14, 2, 2, 'F');
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235);
    doc.text("DELIVERY NOTE", 20, y + 9);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text(deliveryNote.deliveryNoteNumber, w - 20, y + 9, { align: "right" });
    y += 20;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("DATE", 14, y);
    doc.text("DELIVERY DATE", 70, y);
    doc.text("STATUS", 126, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.text(new Date(deliveryNote.createdAt).toLocaleDateString(), 14, y);
    doc.text(deliveryNote.deliveryDate ? new Date(deliveryNote.deliveryDate).toLocaleDateString() : 'N/A', 70, y);
    doc.text(deliveryNote.status.charAt(0).toUpperCase() + deliveryNote.status.slice(1), 126, y);
    y += 10;

    if (deliveryNote.customerName) {
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(14, y, w - 28, 22, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("DELIVER TO", 20, y + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(deliveryNote.customerName, 20, y + 11);
      let cy = y + 15;
      if (deliveryNote.customerPhone) { doc.setFontSize(8); doc.setTextColor(100); doc.text(deliveryNote.customerPhone, 20, cy); cy += 4; }
      if (deliveryNote.customerEmail) { doc.setFontSize(8); doc.setTextColor(100); doc.text(deliveryNote.customerEmail, 20, cy); cy += 4; }
      if (deliveryNote.customerTpin) { doc.setFontSize(8); doc.setTextColor(100); doc.text(`TPIN: ${deliveryNote.customerTpin}`, 20, cy); cy += 4; }
      y = cy + 4;
    }

    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, y, w - 28, 9, 1, 1, 'F');
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("ITEM", 18, y + 6);
    doc.text("QTY", 105, y + 6);
    doc.text("PRICE", 122, y + 6);
    doc.text("TOTAL", w - 18, y + 6, { align: "right" });
    y += 12;

    doc.setTextColor(30, 30, 30);
    items.forEach((item) => {
      ensureSpace(8);
      doc.setFillColor(249, 250, 251);
      doc.rect(14, y - 4, w - 28, 8, 'F');
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);
      doc.text(item.productName.substring(0, 40), 18, y);
      doc.text(item.quantity.toString(), 108, y);
      doc.text(`K${item.unitPrice.toFixed(2)}`, 122, y);
      doc.setFont("helvetica", "bold");
      doc.text(`K${item.lineTotal.toFixed(2)}`, w - 18, y, { align: "right" });
      y += 8;
    });

    y += 4;

    ensureSpace(30);
    doc.setDrawColor(230, 230, 230);
    doc.line(110, y, w - 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("Subtotal", 120, y);
    const sub = items.reduce((s, i) => s + i.lineTotal, 0);
    doc.text(`K${sub.toFixed(2)}`, w - 18, y, { align: "right" });
    y += 6;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(110, y - 1, w - 124, 12, 2, 2, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL", 116, y + 7);
    doc.text(`K${sub.toFixed(2)}`, w - 18, y + 7, { align: "right" });
    y += 18;

    const paymentLines: string[] = [];
    if (businessDetails.showBankOnDocuments !== false) {
      if (businessDetails.bankName || businessDetails.bankAccountName || businessDetails.bankAccountNumber) {
        paymentLines.push("BANK PAYMENT");
        const bankParts: string[] = [];
        if (businessDetails.bankName) bankParts.push(businessDetails.bankName);
        if (businessDetails.bankBranch) bankParts.push(businessDetails.bankBranch);
        if (bankParts.length) paymentLines.push(bankParts.join(" - "));
        if (businessDetails.bankAccountName) paymentLines.push(`Account Name: ${businessDetails.bankAccountName}`);
        if (businessDetails.bankAccountNumber) paymentLines.push(`Account Number: ${businessDetails.bankAccountNumber}`);
        if (businessDetails.bankSwift) paymentLines.push(`SWIFT: ${businessDetails.bankSwift}`);
      }
      if (businessDetails.mobileMoneyNumber) {
        paymentLines.push(paymentLines.length > 0 ? "" : "MOBILE MONEY");
        if (businessDetails.mobileMoneyName) paymentLines.push(`Name: ${businessDetails.mobileMoneyName}`);
        paymentLines.push(`Number: ${businessDetails.mobileMoneyNumber}`);
      }
    }
    if (paymentLines.length > 0) {
      ensureSpace(8 + paymentLines.length * 5);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("PAYMENT DETAILS", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(paymentLines, 14, y);
      y += paymentLines.length * 5 + 4;
    }

    if (deliveryNote.notes) {
      const lines = doc.splitTextToSize(deliveryNote.notes, w - 28);
      const noteBlockHeight = 5 + (lines.length * 4) + 4;
      ensureSpace(8 + noteBlockHeight);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text("NOTES", 14, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(lines, 14, y);
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text("Generated by ZamPOS", w / 2, pageH - 8, { align: "center" });
    }

    return doc;
  };

  const handleDownload = async () => {
    const doc = await generatePDF();
    doc.save(`${deliveryNote.deliveryNoteNumber}.pdf`);
  };

  const handlePrint = async () => {
    const doc = await generatePDF();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    printBlobUrl(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="font-display font-bold text-lg">{deliveryNote.deliveryNoteNumber}</h2>
          <Badge className={status.className}>{status.label}</Badge>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Button variant="outline" size="sm" onClick={onEdit}><Edit className="h-4 w-4 mr-1" /> Edit</Button>
          <Button variant="outline" size="sm" onClick={handleDownload}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-1" /> Print</Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="h-1.5 bg-primary" />

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            {businessDetails.logoUrl && (
              <img src={businessDetails.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-border" />
            )}
            <div className="flex-1">
              <h3 className="font-bold text-lg">{businessName}</h3>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {businessDetails.address && <p>{businessDetails.address}</p>}
                <div className="flex gap-3 flex-wrap">
                  {businessDetails.phone && <span>{businessDetails.phone}</span>}
                  {businessDetails.email && <span>{businessDetails.email}</span>}
                </div>
                {businessDetails.tpin && <p>TPIN: {businessDetails.tpin}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary tracking-tight flex items-center justify-end gap-2"><Truck className="h-6 w-6" />DELIVERY NOTE</span>
              <p className="text-sm text-muted-foreground font-mono mt-1">{deliveryNote.deliveryNoteNumber}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" /> Date</p>
              <p className="font-medium">{new Date(deliveryNote.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" /> Delivery Date</p>
              <p className="font-medium">{deliveryNote.deliveryDate ? new Date(deliveryNote.deliveryDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Hash className="h-3 w-3" /> Status</p>
              <Badge className={`${status.className} text-xs mt-0.5`}>{status.label}</Badge>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" /> Updated</p>
              <p className="font-medium">{new Date(deliveryNote.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {deliveryNote.customerName && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Deliver To</p>
              <p className="font-semibold">{deliveryNote.customerName}</p>
              <div className="text-xs text-muted-foreground flex gap-3 mt-0.5 flex-wrap">
                {deliveryNote.customerPhone && <span>{deliveryNote.customerPhone}</span>}
                {deliveryNote.customerEmail && <span>{deliveryNote.customerEmail}</span>}
                {deliveryNote.customerTpin && <span>TPIN: {deliveryNote.customerTpin}</span>}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Item</th>
                  <th className="text-center py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Qty</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Price</th>
                  <th className="text-right py-2.5 px-3 font-semibold text-xs uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="py-2.5 px-3 font-medium">{item.productName}</td>
                    <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right">K{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold">K{item.lineTotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>K{items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center bg-primary text-primary-foreground rounded-lg px-4 py-2.5">
                <span className="font-bold text-base">TOTAL</span>
                <span className="font-bold text-lg">K{items.reduce((s, i) => s + i.lineTotal, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {businessDetails.showBankOnDocuments !== false && (
            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payment Details</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {(businessDetails.bankName || businessDetails.bankAccountName || businessDetails.bankAccountNumber) && (
                  <>
                    {(businessDetails.bankName || businessDetails.bankBranch) && (
                      <p className="font-medium text-foreground">
                        [Bank Payment] {[businessDetails.bankName, businessDetails.bankBranch].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    {businessDetails.bankAccountName && <p>Account Name: {businessDetails.bankAccountName}</p>}
                    {businessDetails.bankAccountNumber && <p>Account Number: {businessDetails.bankAccountNumber}</p>}
                    {businessDetails.bankSwift && <p>SWIFT: {businessDetails.bankSwift}</p>}
                  </>
                )}
                {businessDetails.mobileMoneyNumber && (
                  <>
                    {(businessDetails.bankName || businessDetails.bankAccountName || businessDetails.bankAccountNumber) && <div className="h-1" />}
                    <p className="font-medium text-foreground">[Mobile Money] {businessDetails.mobileMoneyName ?? ''}</p>
                    <p>Number: {businessDetails.mobileMoneyNumber}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {deliveryNote.notes && (
            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{deliveryNote.notes}</p>
            </div>
          )}
        </div>

        <div className="text-center text-[10px] text-muted-foreground py-2 border-t border-border bg-muted/30">
          Generated by ZamPOS
        </div>
      </div>
    </div>
  );
};

export default DeliveryNoteView;

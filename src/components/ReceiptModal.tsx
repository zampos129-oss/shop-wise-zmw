import { useRef } from "react";
import { Download, Printer, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  discountType?: string;
  discountValue?: number;
  notes?: string;
}

interface BusinessDetails {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tpin?: string | null;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  businessName: string;
  businessDetails?: BusinessDetails;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  date: string;
  receiptId: string;
  discountAmount?: number;
  isService?: boolean;
  taxAmount?: number;
  taxLabel?: string;
  customerName?: string | null;
  customerTpin?: string | null;
}

// HTML escape function to prevent XSS/injection attacks
const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (match) => {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match] || match;
  });
};

const ReceiptModal = ({
  open,
  onClose,
  businessName,
  businessDetails,
  items,
  subtotal,
  total,
  paymentMethod,
  date,
  receiptId,
  discountAmount = 0,
  isService = false,
  taxAmount = 0,
  taxLabel = 'VAT',
  customerName,
  customerTpin,
}: ReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const itemLabel = isService ? 'Service' : 'Item';
  const qtyPrefix = isService ? '' : 'x';
  const netSubtotal = Math.max(0, total - taxAmount);

  const getReceiptHTML = () => {
    // Escape all user-controlled data to prevent HTML injection
    const safeBusinessName = escapeHtml(businessName);
    const safePhone = escapeHtml(businessDetails?.phone);
    const safeEmail = escapeHtml(businessDetails?.email);
    const safeAddress = escapeHtml(businessDetails?.address);
    const safeTpin = escapeHtml(businessDetails?.tpin);
    const safeReceiptId = escapeHtml(receiptId);
    const safeCustomerName = escapeHtml(customerName);
    const safeCustomerTpin = escapeHtml(customerTpin);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${safeReceiptId}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; background: white; color: black; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 18px; margin: 0; }
            .header p { margin: 5px 0; font-size: 12px; color: #666; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 60px; text-align: right; }
            .totals { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
            .total-row.grand { font-size: 16px; font-weight: bold; }
            .customer { font-size: 11px; margin: 4px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
            @media print {
              html, body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { padding: 4mm; }
              @page { margin: 0; size: 80mm auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${safeBusinessName}</h1>
            ${safeTpin ? `<p>TPIN: ${safeTpin}</p>` : ''}
            ${safePhone ? `<p>Tel: ${safePhone}</p>` : ''}
            ${safeEmail ? `<p>${safeEmail}</p>` : ''}
            ${safeAddress ? `<p>${safeAddress}</p>` : ''}
            <p>${escapeHtml(new Date(date).toLocaleString())}</p>
            <p>Receipt #: ${safeReceiptId.slice(-8).toUpperCase()}</p>
          </div>
          ${safeCustomerName || safeCustomerTpin ? `
          <div class="divider"></div>
          <div>
            ${safeCustomerName ? `<div class="customer"><strong>Customer:</strong> ${safeCustomerName}</div>` : ''}
            ${safeCustomerTpin ? `<div class="customer"><strong>Customer TPIN:</strong> ${safeCustomerTpin}</div>` : ''}
          </div>` : ''}
          <div class="divider"></div>
          <div class="items">
            ${items.map(item => `
              <div class="item">
                <span class="item-name">${escapeHtml(item.name)}${item.notes ? ` <span style="color:#666;font-size:10px">(${escapeHtml(item.notes)})</span>` : ''}</span>
                <span class="item-qty">${qtyPrefix}${item.quantity}</span>
                <span class="item-price">ZMW ${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="divider"></div>
          <div class="totals">
            ${taxAmount > 0 ? `
            <div class="total-row"><span>Subtotal (excl.)</span><span>ZMW ${netSubtotal.toFixed(2)}</span></div>
            <div class="total-row"><span>${escapeHtml(taxLabel)}</span><span>ZMW ${taxAmount.toFixed(2)}</span></div>` : `
            <div class="total-row"><span>Subtotal</span><span>ZMW ${subtotal.toFixed(2)}</span></div>`}
            ${discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>-ZMW ${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="total-row grand"><span>TOTAL</span><span>ZMW ${total.toFixed(2)}</span></div>
            <div class="total-row"><span>Payment</span><span>${paymentMethod === "cash" ? "Cash" : paymentMethod === "mobile_money" ? "Mobile Money" : escapeHtml(paymentMethod)}</span></div>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <p>Thank you for your ${isService ? 'business' : 'purchase'}!</p>
            <p>Powered by ZamPOS</p>
          </div>
        </body>
      </html>
    `;
  };

  // Print using a hidden iframe — works on mobile, no popup blockers,
  // and never freezes the receipt page. Iframe is removed after print
  // dialog closes (or after a 30s safety timeout).
  const handlePrint = () => {
    const html = getReceiptHTML();
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    };

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { cleanup(); return; }
    doc.open();
    doc.write(html);
    doc.close();

    const trigger = () => {
      try {
        const w = iframe.contentWindow;
        if (!w) { cleanup(); return; }
        w.focus();
        w.print();
        // afterprint fires on most modern browsers including mobile Chrome
        const onAfter = () => { w.removeEventListener('afterprint', onAfter); setTimeout(cleanup, 500); };
        w.addEventListener('afterprint', onAfter);
        // Safety net for browsers that don't fire afterprint
        setTimeout(cleanup, 30000);
      } catch {
        cleanup();
      }
    };

    if (iframe.contentWindow?.document.readyState === 'complete') {
      trigger();
    } else {
      iframe.onload = trigger;
    }
  };

  const handleDownload = () => {
    const blob = new Blob([getReceiptHTML()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${receiptId.slice(-8).toUpperCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="bg-white text-black p-4 rounded-lg font-mono text-sm">
          <div className="header text-center mb-4">
            <h1 className="text-lg font-bold">{businessName}</h1>
            {businessDetails?.tpin && (
              <p className="text-xs text-gray-600">TPIN: {businessDetails.tpin}</p>
            )}
            {businessDetails?.phone && (
              <p className="text-xs text-gray-600">Tel: {businessDetails.phone}</p>
            )}
            {businessDetails?.email && (
              <p className="text-xs text-gray-600">{businessDetails.email}</p>
            )}
            {businessDetails?.address && (
              <p className="text-xs text-gray-600">{businessDetails.address}</p>
            )}
            <p className="text-xs text-gray-600 mt-2">{new Date(date).toLocaleString()}</p>
            <p className="text-xs text-gray-600">Receipt #: {receiptId.slice(-8).toUpperCase()}</p>
          </div>

          {(customerName || customerTpin) && (
            <>
              <div className="divider border-t border-dashed border-gray-400 my-2" />
              <div className="text-xs space-y-0.5">
                {customerName && <p><strong>Customer:</strong> {customerName}</p>}
                {customerTpin && <p><strong>Customer TPIN:</strong> {customerTpin}</p>}
              </div>
            </>
          )}

          <div className="divider border-t border-dashed border-gray-400 my-2" />

          <div className="items space-y-1">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="flex-1">
                  {item.name}
                  {item.notes && <span className="text-muted-foreground text-[10px] ml-1">({item.notes})</span>}
                </span>
                <span className="w-8 text-center">{qtyPrefix}{item.quantity}</span>
                <span className="w-16 text-right">ZMW {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-2" />

          <div className="totals space-y-1">
            {taxAmount > 0 ? (
              <>
                <div className="flex justify-between text-xs">
                  <span>Subtotal (excl.)</span>
                  <span>ZMW {netSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>{taxLabel}</span>
                  <span>ZMW {taxAmount.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-xs">
                <span>Subtotal</span>
                <span>ZMW {subtotal.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span>
                <span>-ZMW {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span>
              <span>ZMW {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Payment</span>
              <span>{paymentMethod === "cash" ? "Cash" : "Mobile Money"}</span>
            </div>
          </div>

          <div className="divider border-t border-dashed border-gray-400 my-2" />

          <div className="footer text-center text-xs text-gray-500 mt-4">
            <p>Thank you for your {isService ? 'business' : 'purchase'}!</p>
            <p>Powered by ZamPOS</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const text = `Receipt from ${businessName}\nTotal: ZMW ${total.toFixed(2)}\nDate: ${new Date(date).toLocaleString()}\nReceipt #: ${receiptId.slice(-8).toUpperCase()}\n\nItems:\n${items.map(i => `${i.name} x${i.quantity} - ZMW ${(i.price * i.quantity).toFixed(2)}`).join('\n')}\n\nThank you!`;
            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
          }}>
            <Share2 className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          <Button variant="pos" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
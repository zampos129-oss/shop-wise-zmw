import { useState, useEffect, useCallback } from 'react';

export type BusinessType = 'retail' | 'service';

interface BusinessTypeLabels {
  // Navigation & Headers
  productsTitle: string;
  productsDescription: string;
  addButtonLabel: string;
  
  // Product/Service fields
  itemName: string;
  itemNamePlaceholder: string;
  priceLabel: string;
  quantityLabel: string;
  stockLabel: string;
  minStockLabel: string;
  categoryLabel: string;
  
  // POS
  posItemsTitle: string;
  posItemsDescription: string;
  stockDisplay: (stock: number) => string;
  
  // Receipt
  receiptItemLabel: string;
  receiptQuantityPrefix: string;
  
  // Service-specific optional fields
  showStock: boolean;
  showDuration: boolean;
  showNotes: boolean;
  
  // Misc
  lowStockWarning: string;
  noItemsMessage: string;
}

const RETAIL_LABELS: BusinessTypeLabels = {
  productsTitle: 'Products',
  productsDescription: 'Search, edit and manage stock.',
  addButtonLabel: 'Add',
  itemName: 'Name',
  itemNamePlaceholder: 'Sugar 1kg',
  priceLabel: 'Selling Price (ZMW)',
  quantityLabel: 'Qty',
  stockLabel: 'Stock',
  minStockLabel: 'Min Stock (alerts)',
  categoryLabel: 'Category (optional)',
  posItemsTitle: 'Products',
  posItemsDescription: 'Tap to add to cart',
  stockDisplay: (stock: number) => `Stock: ${stock}`,
  receiptItemLabel: 'Item',
  receiptQuantityPrefix: 'x',
  showStock: true,
  showDuration: false,
  showNotes: false,
  lowStockWarning: 'LOW',
  noItemsMessage: 'No products yet.',
};

const SERVICE_LABELS: BusinessTypeLabels = {
  productsTitle: 'Services',
  productsDescription: 'Search, edit and manage services.',
  addButtonLabel: 'Add',
  itemName: 'Service Name',
  itemNamePlaceholder: 'Haircut',
  priceLabel: 'Service Fee (ZMW)',
  quantityLabel: 'Sessions',
  stockLabel: 'Available Slots',
  minStockLabel: 'Min Slots (alerts)',
  categoryLabel: 'Category (optional)',
  posItemsTitle: 'Services',
  posItemsDescription: 'Tap to add to invoice',
  stockDisplay: (stock: number) => `Slots: ${stock}`,
  receiptItemLabel: 'Service',
  receiptQuantityPrefix: '',
  showStock: false,
  showDuration: true,
  showNotes: true,
  lowStockWarning: 'LIMITED',
  noItemsMessage: 'No services yet.',
};

const STORAGE_KEY = 'zampos_business_type';

export function useBusinessType(businessId?: string) {
  const storageKey = businessId ? `${STORAGE_KEY}_${businessId}` : STORAGE_KEY;
  
  const [businessType, setBusinessTypeState] = useState<BusinessType>(() => {
    if (typeof window === 'undefined') return 'retail';
    const stored = localStorage.getItem(storageKey);
    return (stored === 'service' ? 'service' : 'retail') as BusinessType;
  });

  // Sync with localStorage when businessId changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(storageKey);
    setBusinessTypeState((stored === 'service' ? 'service' : 'retail') as BusinessType);
  }, [storageKey]);

  const setBusinessType = useCallback((type: BusinessType) => {
    setBusinessTypeState(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, type);
    }
  }, [storageKey]);

  const labels: BusinessTypeLabels = businessType === 'service' ? SERVICE_LABELS : RETAIL_LABELS;

  const isRetail = businessType === 'retail';
  const isService = businessType === 'service';

  return {
    businessType,
    setBusinessType,
    labels,
    isRetail,
    isService,
  };
}

export const PAYMENT_DETAILS = {
  whatsappNumberE164: "260976621936",
  whatsappDisplay: "+260 976 621 936",
  momo: {
    mtn: {
      network: "MTN",
      number: "0763165781",
      name: "Clement Mwila",
    },
    airtel: {
      network: "Airtel",
      number: "0572540590",
      name: "Clement Mwila",
    },
  },
  pricePerMonthZmw: 100, // base tier (1 cashier) — kept for legacy callers
  trialDays: 3,
} as const;

export type PricingTier = {
  /** Inclusive lower bound on active cashier count */
  minCashiers: number;
  /** Inclusive upper bound; null means "and above" */
  maxCashiers: number | null;
  /** Monthly price in ZMW */
  priceZmw: number;
  /** Short label for UI */
  label: string;
};

export const PRICING_TIERS: PricingTier[] = [
  { minCashiers: 0, maxCashiers: 1, priceZmw: 100, label: "1 cashier" },
  { minCashiers: 2, maxCashiers: 3, priceZmw: 200, label: "2 – 3 cashiers" },
  { minCashiers: 4, maxCashiers: 6, priceZmw: 350, label: "4 – 6 cashiers" },
  { minCashiers: 7, maxCashiers: null, priceZmw: 500, label: "7+ cashiers" },
];

export const getPricingTier = (activeCashiers: number): PricingTier => {
  const n = Math.max(0, Math.floor(activeCashiers || 0));
  return (
    PRICING_TIERS.find(
      (t) => n >= t.minCashiers && (t.maxCashiers === null || n <= t.maxCashiers),
    ) ?? PRICING_TIERS[0]
  );
};

export const getMonthlyPriceForCashiers = (activeCashiers: number): number =>
  getPricingTier(activeCashiers).priceZmw;

export const buildWhatsAppPaymentLink = (args: {
  paymentCode: string;
  amountZmw: number;
  userEmail?: string;
}) => {
  const { paymentCode, amountZmw, userEmail } = args;

  const message = [
    "Hello, I want to renew my ZamPOS subscription.",
    "",
    `Reference / Payment Code: ${paymentCode}`,
    userEmail ? `User: ${userEmail}` : undefined,
    "",
    `I have sent payment of ZMW ${amountZmw}.`,
    "Please find the screenshot attached.",
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${PAYMENT_DETAILS.whatsappNumberE164}?text=${encoded}`;
};

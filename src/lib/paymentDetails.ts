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
  pricePerMonthZmw: 100,
  trialDays: 3,
} as const;

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

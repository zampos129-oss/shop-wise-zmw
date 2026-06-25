import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, CreditCard, MessageCircle, Phone, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ConnectionStatus from "@/components/ConnectionStatus";
import LockScreen from "@/components/LockScreen";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_DETAILS } from "@/lib/paymentDetails";

const MONTH_OPTIONS = [1, 3, 6, 12];

const buildWhatsAppRenewalLink = (paymentCode: string, months: number) => {
  const message = [
    "Hello ZamPOS Team,",
    "",
    `I want to renew my subscription for ${months} month${months > 1 ? "s" : ""} (ZMW ${months * PAYMENT_DETAILS.pricePerMonthZmw}).`,
    `My Payment Code is: ${paymentCode}`,
    "",
    "Please send me mobile money payment details.",
  ].join("\n");
  return `https://wa.me/${PAYMENT_DETAILS.whatsappNumberE164}?text=${encodeURIComponent(message)}`;
};

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuthContext();
  const { isOnline } = useOnlineStatus();
  const { business, isLoading: bizLoading, refetch, checkSubscriptionStatus } = useBusiness(user?.id);
  const { isLocked, daysRemaining } = checkSubscriptionStatus();
  const [months, setMonths] = useState(1);

  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }
  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!business) return null;

  if (isLocked) {
    return (
      <>
        <ConnectionStatus />
        <LockScreen paymentCode={business.paymentCode} businessId={business.id} onRetrySync={refetch} />
      </>
    );
  }

  const amountZmw = months * PAYMENT_DETAILS.pricePerMonthZmw;

  const handleWhatsApp = () => {
    window.open(buildWhatsAppRenewalLink(business.paymentCode, months), "_blank");
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(PAYMENT_DETAILS.whatsappDisplay);
    toast({ title: "Copied", description: PAYMENT_DETAILS.whatsappDisplay });
  };

  return (
    <>
      <ConnectionStatus />
      <div className="min-h-screen bg-background safe-area-inset">
        <header className="bg-card border-b border-border px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-display font-bold text-lg">Manage Subscription</h1>
                <p className="text-xs text-muted-foreground">Reference: {business.paymentCode}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>Refresh</Button>
          </div>
        </header>

        <main className="p-4 max-w-4xl mx-auto space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining days</p>
                <p className="text-2xl font-display font-bold">{daysRemaining}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">ZMW {PAYMENT_DETAILS.pricePerMonthZmw} / 30 days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Renew Subscription</CardTitle>
              <CardDescription>Choose how many months and contact us on WhatsApp to pay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Months</p>
                <div className="grid grid-cols-4 gap-2">
                  {MONTH_OPTIONS.map((m) => (
                    <Button
                      key={m}
                      variant={months === m ? "default" : "outline"}
                      onClick={() => setMonths(m)}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-display font-bold text-primary">ZMW {amountZmw}</p>
              </div>

              <Button
                variant="pos"
                className="w-full text-lg py-6"
                onClick={handleWhatsApp}
                disabled={!isOnline}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Renew via WhatsApp
              </Button>

              <div className="bg-secondary rounded-lg p-3 space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  If WhatsApp does not open, contact us directly:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <a
                    href={`tel:${PAYMENT_DETAILS.whatsappNumberE164}`}
                    className="inline-flex items-center gap-2 font-mono text-base font-semibold text-primary"
                  >
                    <Phone className="w-4 h-4" />
                    {PAYMENT_DETAILS.whatsappDisplay}
                  </a>
                  <Button variant="ghost" size="sm" onClick={copyNumber} aria-label="Copy">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default Subscription;

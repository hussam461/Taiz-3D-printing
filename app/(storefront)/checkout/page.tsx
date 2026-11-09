import { CheckoutForm } from "@/components/checkout/checkout-form";
import {
  getCheckoutConfig,
  getDeliveryAreas,
  getPaymentAccounts,
} from "@/lib/queries/storefront";

export default async function CheckoutPage() {
  const [areas, accounts, config] = await Promise.all([
    getDeliveryAreas(),
    getPaymentAccounts(),
    getCheckoutConfig(),
  ]);

  if (!config || areas.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface p-8">
        إتمام الطلب غير جاهز بعد. يلزم إعداد قاعدة البيانات ومناطق التوصيل وحسابات الدفع.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <CheckoutForm
        areas={areas.map((row) => ({
          id: row.id,
          governorate: row.governorate,
          city_area: row.city_area,
          fee_old_yer: Number(row.fee_old_yer),
          is_default: row.is_default,
        }))}
        accounts={accounts.map((row) => ({
          id: row.id,
          name: row.name,
          account_number: row.account_number,
          currency_code: row.currency_code,
          instructions: row.instructions,
        }))}
        depositPercent={config.depositPercent}
        freeDeliveryEnabled={Boolean(config.freeDelivery.is_enabled)}
        freeDeliveryMin={Number(config.freeDelivery.min_order_value_old_yer)}
        newRialPerOldRial={Number(config.exchange.new_rial_per_old_rial)}
      />
    </div>
  );
}

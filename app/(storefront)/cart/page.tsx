import { CartView } from "@/components/storefront/cart-view";
import { getColors, getMaterials, getCheckoutConfig } from "@/lib/queries/storefront";

export default async function CartPage() {
  const [colors, materials, config] = await Promise.all([getColors(), getMaterials(), getCheckoutConfig()]);
  return (
    <div>
      <CartView colors={colors.map(({ id, name, hex_code }) => ({ id, name, hex_code }))} materials={materials.map(({ id, name }) => ({ id, name }))} freeDeliveryEnabled={Boolean(config?.freeDelivery.is_enabled)} freeDeliveryMin={Number(config?.freeDelivery.min_order_value_old_yer ?? 0)} />
    </div>
  );
}

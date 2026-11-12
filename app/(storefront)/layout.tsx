import { CartProvider } from "@/components/storefront/cart-provider";
import { CartLink } from "@/components/storefront/cart-link";
import { StoreFooter, StoreHeader } from "@/components/storefront/chrome";
import { getStorefrontContext } from "@/lib/queries/storefront";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { StoreBreadcrumbs } from "@/components/storefront/store-breadcrumbs";
import { NavigationScroll } from "@/components/storefront/navigation-scroll";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store, contact } = await getStorefrontContext();
  return (
    <CartProvider>
      <div className="storefront-shell flex min-h-full flex-1 flex-col">
        <NavigationScroll />
        <StoreHeader storeName={store.store_name} logoUrl={publicMediaUrl(store.logo_path, "store-assets")} cartSlot={<CartLink />} announcement={{ enabled: store.announcement_enabled, text: store.announcement_text, buttonLabel: store.announcement_button_label, href: store.announcement_href, scope: store.announcement_scope === "home" ? "home" : "all", buttonEnabled: store.announcement_button_enabled !== false }} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <StoreBreadcrumbs />
          {children}
        </main>
        <StoreFooter
          storeName={store.store_name}
          description={store.description}
          phone={contact.phone}
          whatsapp={contact.whatsapp}
          instagram={contact.instagram}
          email={contact.email}
        />
      </div>
    </CartProvider>
  );
}

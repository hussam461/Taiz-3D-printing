type LoadingKind = "home" | "products" | "product" | "custom-order" | "cart" | "checkout" | "faq" | "content";

function Pulse({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

function ProductCards() {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="overflow-hidden rounded-xl border border-border bg-white p-2.5 shadow-sm sm:p-3"><Pulse className="aspect-[5/4]" /><Pulse className="mt-3 h-4 w-3/4" /><Pulse className="mt-2 h-4 w-1/2" /><Pulse className="mt-3 h-10" /></div>)}</div>;
}

function PageTitle() {
  return <div className="space-y-3"><Pulse className="h-4 w-24" /><Pulse className="h-8 w-2/3 max-w-sm" /></div>;
}

function HomeLoading() {
  return <div className="-mt-8 space-y-8 sm:space-y-12"><div className="aspect-[2.56/1] animate-pulse bg-slate-200" /><div className="flex gap-3 overflow-hidden px-2">{[1, 2, 3, 4].map((item) => <Pulse key={item} className="aspect-[5/4] w-1/3 shrink-0 rounded-xl sm:w-1/4" />)}</div>{[1, 2].map((item) => <section key={item} className="space-y-4"><Pulse className="h-7 w-40" /><ProductCards /></section>)}</div>;
}

function ProductLoading() {
  return <div className="space-y-6"><PageTitle /><div className="flex gap-3"><Pulse className="h-10 flex-1" /><Pulse className="h-10 w-28" /><Pulse className="h-10 w-32" /></div><ProductCards /></div>;
}

function ProductDetailLoading() {
  return <div className="space-y-6"><Pulse className="h-4 w-48" /><div className="grid gap-8 lg:grid-cols-2"><Pulse className="aspect-[5/4] rounded-2xl" /><div className="space-y-5 py-3"><Pulse className="h-8 w-3/4" /><Pulse className="h-6 w-1/3" /><Pulse className="h-20 w-full" /><Pulse className="h-12 w-full" /><Pulse className="h-12 w-full" /></div></div></div>;
}

function CustomOrderLoading() {
  return <div className="space-y-8"><section className="grid overflow-hidden rounded-3xl bg-navy lg:grid-cols-2"><div className="space-y-4 p-6 sm:p-10"><Pulse className="h-5 w-28" /><Pulse className="h-10 w-4/5" /><Pulse className="h-20 w-full" /><Pulse className="h-12 w-44" /></div><Pulse className="min-h-56 rounded-none lg:min-h-80" /></section><div className="space-y-4"><Pulse className="h-8 w-48" /><div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((item) => <Pulse key={item} className="h-40 rounded-2xl" />)}</div></div></div>;
}

function CartLoading() {
  return <div className="space-y-6"><PageTitle /><div className="grid gap-6 lg:grid-cols-[2fr_1fr]"><div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="flex gap-4 rounded-2xl border border-border bg-white p-4"><Pulse className="h-24 w-24 shrink-0" /><div className="flex-1 space-y-3"><Pulse className="h-5 w-2/3" /><Pulse className="h-4 w-1/2" /></div></div>)}</div><Pulse className="h-64 rounded-2xl" /></div></div>;
}

function CheckoutLoading() {
  return <div className="mx-auto max-w-3xl space-y-6"><PageTitle /><section className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-8">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="space-y-2"><Pulse className="h-4 w-28" /><Pulse className="h-11 w-full" /></div>)}<Pulse className="h-28 w-full" /><Pulse className="h-12 w-full" /></section></div>;
}

function FaqLoading() {
  return <div className="mx-auto max-w-4xl space-y-6"><PageTitle /><div className="space-y-3">{[1, 2, 3, 4, 5].map((item) => <Pulse key={item} className="h-16 rounded-xl" />)}</div></div>;
}

function ContentLoading() {
  return <div className="mx-auto max-w-4xl space-y-6"><PageTitle /><section className="space-y-4 rounded-2xl border border-border bg-white p-5 sm:p-8"><Pulse className="h-5 w-1/2" /><Pulse className="h-4 w-full" /><Pulse className="h-4 w-11/12" /><Pulse className="h-4 w-4/5" /><Pulse className="mt-6 h-5 w-2/5" /><Pulse className="h-4 w-full" /><Pulse className="h-4 w-10/12" /></section></div>;
}

export function StorefrontPageLoading({ kind = "content" }: { kind?: LoadingKind }) {
  const content = { home: <HomeLoading />, products: <ProductLoading />, product: <ProductDetailLoading />, "custom-order": <CustomOrderLoading />, cart: <CartLoading />, checkout: <CheckoutLoading />, faq: <FaqLoading />, content: <ContentLoading /> }[kind];
  return <div aria-label="جارٍ تحميل الصفحة" aria-busy="true" className="mx-auto w-full max-w-7xl space-y-6">{content}</div>;
}

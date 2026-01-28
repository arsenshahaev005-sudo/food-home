import CartPageClient from "@/components/CartPageClient";

// Disable caching for this page to always show fresh cart
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
  return <CartPageClient />;
}

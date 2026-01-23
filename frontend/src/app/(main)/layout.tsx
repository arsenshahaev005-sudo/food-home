import Header from "@/components/Header";
import MobileNavigation from "@/components/layout/MobileNavigation";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <MobileNavigation />
      <Footer />
    </div>
  );
}

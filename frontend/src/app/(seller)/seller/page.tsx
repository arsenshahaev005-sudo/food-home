"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfile, Profile } from "@/lib/api";
import SellerProfile from "@/components/SellerProfile";
import SellerOverview from "@/components/SellerOverview";
import SellerOrders from "@/components/SellerOrders";
import SellerProducts from "@/components/SellerProducts";
import SellerStatistics from "@/components/SellerStatistics";
import SellerFinance from "@/components/SellerFinance";
import SellerReviews from "@/components/SellerReviews";
import SellerProgress from "@/components/SellerProgress";
import SellerChat from "@/components/SellerChat";

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

function SellerPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const currentView = searchParams.get("view") || "OVERVIEW";

  useEffect(() => {
    const token = getCookie("accessToken");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    getProfile(token)
      .then((p) => {
        if (p.role !== 'SELLER') {
            router.push("/profile");
            return;
        }
        setProfile(p);
      })
      .catch(() => {
        router.push("/auth/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !profile) {
    return (
        <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  // Render based on view
  if (currentView === 'OVERVIEW') {
      return <SellerOverview profile={profile} />;
  }

  if (currentView === 'PROFILE') {
      return <SellerProfile profile={profile} onProfileUpdated={setProfile} />;
  }

  if (currentView === 'ORDERS') {
      const token = getCookie("accessToken");
      return <SellerOrders token={token || ""} />;
  }

  if (currentView === 'PRODUCTS') {
      const token = getCookie("accessToken");
      return <SellerProducts token={token || ""} profile={profile} />;
  }

  if (currentView === 'STATISTICS') {
      return <SellerStatistics />;
  }

  if (currentView === 'FINANCE') {
      const token = getCookie("accessToken");
      return <SellerFinance profile={profile} token={token || ""} />;
  }

  if (currentView === 'REVIEWS') {
      return <SellerReviews profile={profile} />;
  }

  if (currentView === 'PROGRESS') {
      return <SellerProgress profile={profile} />;
  }

  if (currentView === 'CHAT') {
      return <SellerChat />;
  }

  // Placeholder for other views
  return (
    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-[#e5e7eb] min-h-[50vh] flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-[#4b2f23] mb-4">
        {getViewLabel(currentView)}
      </h2>
        <p className="text-gray-500 mb-8">
            Этот раздел находится в разработке. Скоро здесь появится функционал.
        </p>
        <div className="h-2 w-64 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#c9825b] w-1/3 animate-pulse"></div>
        </div>
    </div>
  );
}

export default function SellerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#c9825b] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SellerPageInner />
    </Suspense>
  );
}

function getViewLabel(view: string) {
    const labels: Record<string, string> = {
        'ORDERS': 'Заказы',
        'PRODUCTS': 'Товары',
        'PROGRESS': 'Прогресс',
        'STATISTICS': 'Статистика',
        'FINANCE': 'Финансы',
        'CHAT': 'Чат',
        'REVIEWS': 'Отзывы'
    };
    return labels[view] || view;
}

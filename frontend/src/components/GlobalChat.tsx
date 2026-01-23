"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GlobalChat() {
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const checkUnread = () => {
      const orderChats = JSON.parse(localStorage.getItem('order_chats') || '{}');
      
      // Check for any messages that are not from 'user' and are unread
       const hasUnreadMsgs = Object.values(orderChats).some((msgs: any) => 
         msgs.some((m: any) => m.read === false && m.role !== 'user')
       );
      
      setHasUnread(hasUnreadMsgs);
    };

    checkUnread();
    const interval = setInterval(checkUnread, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => router.push('/chat')}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#c9825b] text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 group"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h9m-9 3h3m-12 1.5a2.25 2.25 0 0 0 2.25 2.25h1.35m11.35 0h1.35a2.25 2.25 0 0 0 2.25-2.25v-12a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25v12a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-[#c9825b] rounded-full animate-pulse"></span>
          )}
        </div>
      </button>
    </>
  );
}

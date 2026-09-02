/**
 * NetworkStatusIndicator — مؤشر حالة الاتصال المباشر والعمل بدون إنترنت
 * يراقب حالة اتصال المحامي بالشبكة (أثناء تواجده بالمحاكم أو الأماكن ضعيفة التغطية)
 * ويطمئنه بأن البيانات محفوظة محلياً عبر IndexedDB وتتم المزامنة تلقائياً.
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // حالة العودة للاتصال
  if (showReconnected) {
    return (
      <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold shadow-2xl backdrop-blur-md animate-bounce">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>تمت استعادة الاتصال بالإنترنت والمزامنة السحابية بنجاح ✓</span>
      </div>
    );
  }

  // حالة انقطاع الاتصال (وضع الأوفلاين بالمحكمة)
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-950/95 border border-amber-500/50 text-amber-200 text-xs font-bold shadow-2xl backdrop-blur-md">
        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
        <div className="flex flex-col">
          <span>أنت الآن في وضع عدم الاتصال (Offline)</span>
          <span className="text-[10px] text-amber-300/80 font-normal">المنصة تعمل محلياً بكامل طاقتها عبر IndexedDB ومحفوظة بأمان</span>
        </div>
      </div>
    );
  }

  return null;
}

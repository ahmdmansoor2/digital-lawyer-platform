/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AdSenseBanner — مكون إعلاني متوافق مع Google AdSense
 * يستجيب تلقائياً لأحجام الشاشات ويدعم الإعلانات المتجاوبة (Responsive Ads)
 */

import React, { useEffect, useRef } from 'react';

interface AdSenseBannerProps {
  client?: string;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layout?: string;
  responsive?: boolean;
  className?: string;
}

export default function AdSenseBanner({
  client = 'ca-pub-7725405859334364',
  slot,
  format = 'auto',
  layout,
  responsive = true,
  className = '',
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // حاول تحميل الإعلان مرة واحدة فقط لتجنب أخطاء تكرار الإعلانات في React
    if (isLoaded.current) return;

    try {
      if (typeof window !== 'undefined' && slot && client !== 'ca-pub-XXXXXXXXXXXXXXXX') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (e) {
      console.warn('AdSense push error:', e);
    }
  }, [client, slot]);

  const isPlaceholder = !slot || client === 'ca-pub-XXXXXXXXXXXXXXXX';

  return (
    <div className={`my-4 overflow-hidden text-center ${className}`} dir="rtl">
      {isPlaceholder ? (
        /* مربع معاينة أنيق ومموه يظهر أثناء مرحلة المراجعة أو التطوير */
        <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-dashed border-indigo-200 text-slate-500 text-xs flex flex-col items-center justify-center gap-1 min-h-[90px] shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold text-indigo-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>مساحة إعلانية مجهزة لـ Google AdSense</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-sm text-center leading-relaxed">
            بمجرد إضافة <strong className="text-indigo-700">Slot ID</strong> من حسابك في AdSense
            (<a href="https://www.google.com/adsense" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-bold">adsense.google.com</a>)
            ستظهر الإعلانات المستهدفة هنا تلقائياً.
          </p>
          <code className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
            &lt;AdSenseBanner slot="YOUR_SLOT_ID_HERE" /&gt;
          </code>
        </div>
      ) : (
        /* كود AdSense الرسمي الفعلي */
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: layout === 'in-article' ? 'center' : undefined }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-ad-layout={layout}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PrintPageFallback — Standalone same-origin print window.
 *
 * يُستخدم هذا المكون عندما يفتح التطبيق نافذة طباعة مستقلة (مثلاً عبر
 * `window.open` أو `<a target="_blank">`) لتحميل محتوى HTML للطباعة.
 *
 * يحاول أولاً جلب المحتوى من خلال endpoint الـ API الداخلي
 * (`/api/print/get/:jobId`) — هذا المسار آمن لأن النافذة الجديدة على نفس
 * الأصل (same-origin) فلا تُطبَّق قيود iframe sandbox.
 *
 * في حالة الفشل أو عدم وجود jobId، يلجأ إلى `localStorage` كحل بديل.
 *
 * بعد تحميل المحتوى، يطلق `window.print()` تلقائياً.
 */

import React, { useState, useEffect } from 'react';
import { sanitizeHtml } from '../utils/sanitizer';

export default function PrintPageFallback() {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [title, setTitle] = useState<string>('مستند قانوني');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('jobId');

    if (jobId) {
      setLoading(true);
      fetch(`/api/print/get/${jobId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error('عفواً، انتهت صلاحية جلسة الطباعة هذه أو لم تكن موجودة. يرجى إعادة محاولة الطباعة.');
          }
          return res.json();
        })
        .then((data) => {
          setHtmlContent(data.html);
          setTitle(data.title);
          document.title = data.title;
          setLoading(false);

          // Auto-trigger printing when DOM is fully settled
          setTimeout(() => {
            window.focus();
            window.print();
          }, 800);
        })
        .catch((err) => {
          setErrorMsg(err.message || 'فشل جلب بيانات المستند للطباعة');
          setLoading(false);
        });
    } else {
      // Fallback to localStorage if accessed outside API route context
      const savedHtml = localStorage.getItem('print_preview_html');
      const savedTitle = localStorage.getItem('print_preview_title');
      if (savedHtml) {
        setHtmlContent(savedHtml);
      }
      if (savedTitle) {
        setTitle(savedTitle);
        document.title = savedTitle;
      }
      setLoading(false);

      if (savedHtml) {
        const timer = setTimeout(() => {
          window.focus();
          window.print();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-300">جاري تجهيز المستند ومعاينة الطباعة الآمنة...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !htmlContent) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 text-center" dir="rtl">
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 max-w-md shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto mb-4 text-red-400 font-bold">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-white mb-2">تنبيه: لم يتم العثور على محتوى للطباعة</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            {errorMsg || 'يرجى تشغيل أمر الطباعة من داخل لوحة تحكم نظام المحاماة أولاً ليتم نقل البيانات إلى هذه الصفحة التلقائية.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* Top action bar, hidden during printing */}
      <div className="no-print bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-3 flex items-center justify-between gap-4 text-xs font-sans select-none" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-bold text-slate-100">وضع معالجة وطباعة المستندات المستقل</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-medium">{title}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1.5 rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5"
          >
            <span>إعادة تشغيل الطباعة 🖨️</span>
          </button>
          <button
            onClick={() => window.close()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>

      {/* Actual printable document container */}
      <div
        className="bg-white text-black min-h-screen p-4 md:p-8"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
      />
    </>
  );
}

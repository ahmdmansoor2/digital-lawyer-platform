/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PrivacyPolicyModal — نافذة سياسة الخصوصية وشروط الاستخدام
 * مطابقة 100% لمتطلبات Google AdSense وحماية البيانات
 */

import React from 'react';
import { ShieldCheck, X, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden font-sans border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-800 via-indigo-700 to-indigo-900 p-6 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">سياسة الخصوصية وشروط الاستخدام</h2>
              <p className="text-xs text-indigo-200 mt-0.5">منصة المحامي الرقمية — الإفصاح وحماية بيانات المستخدمين</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-sm leading-relaxed">
          {/* Intro notice */}
          <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-normal font-semibold">
              تلتزم منصة المحامي الرقمية بأعلى معايير الخصوصية والأمان وفقاً لسياسات الشفافية المعمول بها دولياً ومقاييس Google AdSense لحماية ملفات المستخدمين وتجربة التصفح.
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              <span>١. تخزين البيانات المحلية (IndexedDB & LocalStorage)</span>
            </h3>
            <p className="text-slate-600 text-xs">
              تعمل المنصة بتقنية التخزين المحلي الآمن داخل متصفح المستخدم (Client-Side Storage). جميع بيانات القضايا، الموكلين، المستندات والحسابات تُحفظ محلياً على جهازك فقط ولا يتم رفعها أو مشاركتها على خوادم خارجية بدون إذنك.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>٢. الإعلانات وملفات تعريف الارتباط (Google AdSense & Cookies)</span>
            </h3>
            <p className="text-slate-600 text-xs">
              تستخدم منصة المحامي الرقمية ميزات إعلانات Google AdSense لتقديم إعلانات مستهدفة ومناسبة لاهتماماتك:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 me-2">
              <li>يستخدم موردو الأطراف الخارجية، بمن فيهم Google، ملفات تعريف الارتباط (Cookies) لعرض الإعلانات بناءً على زيارات المستخدم السابقة لموقعنا أو لمواقع أخرى على شبكة الإنترنت.</li>
              <li>تتيح ملفات تعريف الارتباط للإعلانات لعرض إعلانات للمستخدمين استناداً إلى زياراتهم لموقعنا والمواقع الأخرى.</li>
              <li>يمكن للمستخدمين تعطيل استخدام الإعلانات المخصصة عن طريق زيارة <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">إعدادات الإعلانات من Google</a>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>٣. إخلاء المسؤولية القانونية</span>
            </h3>
            <p className="text-slate-600 text-xs">
              الآلات الحاسبة للرسوم والمواريث والنماذج الاسترشادية المتوفرة على المنصة هي أدوات مساعدة قانونية وتقنية، ويُنصح دائماً بمرجعة أصل النصوص التشريعية واللوائح التنفيذية الرسمية.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>٤. التواصل والاتصال</span>
            </h3>
            <p className="text-slate-600 text-xs">
              لأي استفسارات حول سياسة الخصوصية أو حقوق استخدام التطبيق، يمكنك التواصل مع إدارة التطبيق عبر الدعم الفني المباشر بالمنصة.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] text-slate-400 font-medium">آخر تحديث: يوليو ٢٠٢٦</span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-200"
          >
            موافق وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

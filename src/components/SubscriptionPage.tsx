/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SubscriptionPage — صفحة الاشتراك
 * طرق الدفع: فودافون كاش + إنستا باي
 * رقم الاستقبال: 01000787780
 */

import React, { useState } from 'react';
import {
  Crown, CheckCircle2, Star, Shield, Clock,
  HeadphonesIcon, Copy, Check, MessageCircle, ChevronLeft
} from 'lucide-react';

interface SubscriptionPageProps {
  userEmail?: string;
  userName?: string;
  onLogout: () => void;
}

const AMOUNT = 50;
const RECEIVER_NUMBER = '01000787780';
const WHATSAPP_NUMBER = '201000787780';

const PAYMENT_METHODS = [
  {
    id: 'vodafone',
    icon: '📱',
    label: 'فودافون كاش',
    color: 'from-red-600 to-red-700',
    border: 'border-red-500/50',
    bg: 'bg-red-950/20',
    selectedBg: 'bg-red-600/20',
    steps: [
      'افتح تطبيق My Vodafone أو اتصل بـ *9#',
      'اختر "فودافون كاش" ثم "تحويل"',
      `أدخل الرقم: ${RECEIVER_NUMBER}`,
      `أدخل المبلغ: ${AMOUNT} جنيه`,
      'أرسل لنا صورة الإيصال على واتساب',
    ],
  },
  {
    id: 'instapay',
    icon: '🏦',
    label: 'إنستا باي',
    color: 'from-blue-600 to-indigo-700',
    border: 'border-blue-500/50',
    bg: 'bg-blue-950/20',
    selectedBg: 'bg-blue-600/20',
    steps: [
      'افتح تطبيق البنك الخاص بك أو تطبيق إنستا باي',
      'اختر "تحويل فوري" أو "إنستا باي"',
      `ابحث بالموبايل: ${RECEIVER_NUMBER}`,
      `أدخل المبلغ: ${AMOUNT} جنيه`,
      'أرسل لنا صورة الإيصال على واتساب',
    ],
  },
];

const FEATURES = [
  'إدارة غير محدودة للقضايا والموكلين',
  'تقويم الجلسات والمواعيد النهائية',
  'نظام التنفيذات والأحكام',
  'حاسبات المواريث والرسوم القضائية',
  'توليد العقود والمذكرات القانونية',
  'نسخ احتياطي سحابي آمن',
  'الوصول من أي جهاز أو متصفح',
  'دعم فني مباشر على واتساب',
];

export default function SubscriptionPage({ userEmail, onLogout }: SubscriptionPageProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyNumber = () => {
    navigator.clipboard.writeText(RECEIVER_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedMethod = PAYMENT_METHODS.find(m => m.id === selected);

  const openWhatsApp = () => {
    const msg = encodeURIComponent(
      `مرحباً، قمت بالدفع للاشتراك في منصة المحامي الرقمية\n` +
      `الطريقة: ${selectedMethod?.label || 'غير محددة'}\n` +
      `المبلغ: ${AMOUNT} جنيه\n` +
      `الإيميل: ${userEmail || 'غير محدد'}\n\n` +
      `برجاء تفعيل اشتراكي. 🙏`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-4xl w-full space-y-5">

        {/* ── Header ── */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold">
            <Crown className="w-3.5 h-3.5" />
            انتهت التجربة المجانية
          </div>
          <h1 className="text-2xl font-black text-white">فعّل اشتراكك واستمر في العمل</h1>
          <p className="text-slate-400 text-sm">
            اشتراك شهري بـ{' '}
            <span className="text-emerald-400 font-black text-xl">50 جنيه</span>
            {' '}فقط — أقل من كوب قهوة يومياً ☕
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── المميزات ── */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-700/50 rounded-3xl p-5 space-y-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-black text-white text-sm">المنصة كاملة بدون حدود</p>
                <p className="text-indigo-400 text-xs">50 جنيه / شهر</p>
              </div>
            </div>

            <div className="space-y-2">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { icon: Shield, label: 'بيانات آمنة' },
                { icon: Clock, label: 'متاح 24/7' },
                { icon: HeadphonesIcon, label: 'دعم واتساب' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-2 bg-slate-800/50 rounded-xl text-center">
                  <Icon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── طرق الدفع ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* اختيار الطريقة */}
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelected(method.id)}
                  className={`p-4 rounded-2xl border-2 text-right transition-all duration-200 cursor-pointer ${
                    selected === method.id
                      ? `${method.border} ${method.selectedBg} shadow-lg`
                      : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                  }`}
                >
                  <div className="text-3xl mb-2">{method.icon}</div>
                  <div className="font-black text-white text-sm">{method.label}</div>
                  <div className="text-[11px] text-slate-400 mt-1">ادفع بسهولة وأمان</div>
                </button>
              ))}
            </div>

            {/* تفاصيل الدفع */}
            {selectedMethod ? (
              <div className={`${selectedMethod.bg} border ${selectedMethod.border} rounded-3xl p-5 space-y-4 backdrop-blur`}>
                {/* الرقم المستقبل */}
                <div className="bg-slate-900/70 rounded-2xl p-4 space-y-3">
                  <p className="text-xs text-slate-400 font-bold">📲 حوّل إلى هذا الرقم عبر {selectedMethod.label}:</p>
                  <div className="flex items-center gap-3 justify-between">
                    <span className="text-2xl font-black text-white tracking-widest font-mono">
                      {RECEIVER_NUMBER}
                    </span>
                    <button
                      onClick={copyNumber}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'تم النسخ!' : 'نسخ'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2">
                    <span className="text-slate-400 text-xs">المبلغ المطلوب</span>
                    <span className="text-emerald-400 font-black text-lg">{AMOUNT} جنيه</span>
                  </div>
                </div>

                {/* خطوات الدفع */}
                <div className="space-y-2">
                  <p className="text-xs font-black text-white">📋 خطوات الدفع:</p>
                  {selectedMethod.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${selectedMethod.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <span className="text-white text-[10px] font-black">{i + 1}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>

                {/* زر واتساب */}
                <button
                  onClick={openWhatsApp}
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  أرسل الإيصال على واتساب لتفعيل اشتراكك
                </button>

                <p className="text-center text-slate-500 text-[11px]">
                  ⚡ يتم التفعيل خلال دقائق بعد إرسال الإيصال
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-700/30 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
                <ChevronLeft className="w-8 h-8 text-slate-600 rotate-90" />
                <p className="text-slate-500 text-sm font-bold">اختر طريقة الدفع من فوق</p>
                <p className="text-slate-600 text-xs">فودافون كاش أو إنستا باي</p>
              </div>
            )}
          </div>
        </div>

        {/* تسجيل الخروج */}
        <div className="text-center">
          <button
            onClick={onLogout}
            className="text-slate-600 hover:text-slate-400 text-xs transition cursor-pointer"
          >
            تسجيل الخروج — {userEmail}
          </button>
        </div>
      </div>
    </div>
  );
}

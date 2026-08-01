/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  FileCheck, 
  Printer, 
  Settings, 
  ShieldCheck, 
  AlertCircle, 
  TrendingUp,
  Info
} from 'lucide-react';
import { showPrintJob } from '../utils/printHelper';

interface SuitTypeOption {
  key: string;
  label: string;
  baseFee: number;
  proportionalRate: number; // percentage of claim value (0 to 1)
  maxProportionalFee?: number;
  minProportionalFee?: number;
  isLaborExempt: boolean;
  fixedStamps: number;
}

const SUIT_TYPES: SuitTypeOption[] = [
  { key: 'civil', label: 'دعوى مدنية (مطالبة بمستحقات / تعويض)', baseFee: 150, proportionalRate: 0.04, minProportionalFee: 100, maxProportionalFee: 10000, isLaborExempt: false, fixedStamps: 35 },
  { key: 'commercial', label: 'دعوى تجارية واستثمارية (مطالبة مالية)', baseFee: 300, proportionalRate: 0.05, minProportionalFee: 250, maxProportionalFee: 25000, isLaborExempt: false, fixedStamps: 75 },
  { key: 'family_marriage', label: 'دعاوى الأسرة والأحوال الشخصية (طلاق/نفقة)', baseFee: 75, proportionalRate: 0, isLaborExempt: false, fixedStamps: 15 },
  { key: 'labor', label: 'دعوى عمالية (مستحقات عمال أو فصل تعسفي)', baseFee: 0, proportionalRate: 0, isLaborExempt: true, fixedStamps: 0 },
  { key: 'urgent', label: 'دعوى مستعجلة (طرد مستعجل / إثبات حالة)', baseFee: 120, proportionalRate: 0, isLaborExempt: false, fixedStamps: 25 },
  { key: 'appeal', label: 'طعن بالاستئناف العالي', baseFee: 250, proportionalRate: 0.02, minProportionalFee: 150, maxProportionalFee: 5000, isLaborExempt: false, fixedStamps: 50 },
  { key: 'cassation', label: 'طعن بالنقض / التمييز', baseFee: 500, proportionalRate: 0, isLaborExempt: false, fixedStamps: 150 }
];

const CourtFeesCalculator = React.memo(function CourtFeesCalculator() {
  const [selectedSuitKey, setSelectedSuitKey] = useState<string>('civil');
  const [claimValue, setClaimValue] = useState<number>(100000);
  
  // Extra costs checklist
  const [includeExpertsDeposit, setIncludeExpertsDeposit] = useState<boolean>(true);
  const [expertsDepositAmount, setExpertsDepositAmount] = useState<number>(3000); // أمانة الخبراء
  
  const [includeNotification, setIncludeNotification] = useState<boolean>(true);
  const [notificationCount, setNotificationCount] = useState<number>(2); // إعلانات المحضرين

  const [includeTranslator, setIncludeTranslator] = useState<boolean>(false);
  const [translatorPages, setTranslatorPages] = useState<number>(5);

  const [includePoaRegister, setIncludePoaRegister] = useState<boolean>(true); // قيد الوكالة بالملف

  const selectedOption = SUIT_TYPES.find(s => s.key === selectedSuitKey) || SUIT_TYPES[0];

  const calculateFees = () => {
    let baseFee = selectedOption.baseFee;
    let proportionalFee = 0;
    
    // Check if labor suit which is fully exempted form fees
    if (selectedOption.isLaborExempt) {
      return {
        baseFee: 0,
        proportionalFee: 0,
        stampsFee: 0,
        poaFee: 0,
        expertsDeposit: 0,
        notificationCost: 0,
        translatorCost: 0,
        grandTotal: 0,
        isLaborExempt: true
      };
    }

    // Calculate prop fee if rate exists
    if (selectedOption.proportionalRate > 0 && claimValue > 0) {
      proportionalFee = claimValue * selectedOption.proportionalRate;
      if (selectedOption.minProportionalFee) {
        proportionalFee = Math.max(selectedOption.minProportionalFee, proportionalFee);
      }
      if (selectedOption.maxProportionalFee) {
        proportionalFee = Math.min(selectedOption.maxProportionalFee, proportionalFee);
      }
    }

    // Extra variables
    const stampsFee = selectedOption.fixedStamps;
    const poaFee = includePoaRegister ? 45 : 0;
    const expertsDeposit = includeExpertsDeposit ? expertsDepositAmount : 0;
    const notificationCost = includeNotification ? (notificationCount * 60) : 0;
    const translatorCost = includeTranslator ? (translatorPages * 80) : 0;

    const grandTotal = baseFee + proportionalFee + stampsFee + poaFee + expertsDeposit + notificationCost + translatorCost;

    return {
      baseFee,
      proportionalFee,
      stampsFee,
      poaFee,
      expertsDeposit,
      notificationCost,
      translatorCost,
      grandTotal,
      isLaborExempt: false
    };
  };

  const results = calculateFees();

  const handlePrintFeesReport = () => {
    const htmlReport = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقدير رسوم ومصاريف المحاكمة</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
            color: #1e293b;
            direction: rtl;
            line-height: 1.8;
            font-size: 13px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .header h2 {
            color: #4f46e5;
            margin: 0;
            font-size: 19px;
            font-weight: 900;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .stat-card {
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            background-color: #f8fafc;
          }
          .stat-card h4 {
            margin: 0 0 5px 0;
            color: #64748b;
            font-size: 11px;
          }
          .stat-card p {
            margin: 0;
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
          }
          .fees-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .fees-table th, .fees-table td {
            padding: 12px;
            border-bottom: 1px solid #cbd5e1;
            text-align: right;
          }
          .fees-table th {
            background-color: #f1f5f9;
            color: #334155;
            font-weight: bold;
          }
          .total-row {
            background-color: #e0e7ff;
            color: #3730a3;
            font-weight: bold;
            font-size: 14px;
          }
          .exemption-box {
            margin-top: 30px;
            padding: 15px;
            border-right: 4px solid #4f46e5;
            background-color: #eff6ff;
            font-size: 11px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>مكتب المحاماة - تقدير رسوم ومصاريف الدعوى</h2>
          <p style="font-size: 10px; color:#64748b; margin:4px 0 0 0;">كشف استرشادي لقيد ومطالبات الرسوم القضائية والمحضرين</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h4>نوع الدعوى والمسار القانوني</h4>
            <p>${selectedOption.label}</p>
          </div>
          <div class="stat-card">
            <h4>قيمة المطالبة الإجمالية بالعقد</h4>
            <p>${claimValue > 0 ? claimValue.toLocaleString('ar-EG') + ' وحدة نقدية' : 'غير محددة القيمة (دعوى عينية)'}</p>
          </div>
        </div>

        <h3 style="font-size:13px; color:#1e293b; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">توزيع رسوم ومصروفات قيد ملف القضية:</h3>

        <table class="fees-table">
          <thead>
            <tr>
              <th>عنصر الرسم والمصاريف الحكومية</th>
              <th style="text-align: center;">نسبة الاحتساب</th>
              <th style="text-align: left;">القيمة النقدية المقدرة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الرسم الثابت لقيد الملف بجدول المحكمة</td>
              <td style="text-align: center;">رسم قيد أساسي لجدول القضايا</td>
              <td style="text-align: left; font-weight:600;">${results.baseFee}</td>
            </tr>
            <tr>
              <td>الرسم النسبي الإضافي (الغرامات والمطالبات)</td>
              <td style="text-align: center;">${(selectedOption.proportionalRate * 100)}% من قيمة المحتوى المالي</td>
              <td style="text-align: left; font-weight:600;">${results.proportionalFee}</td>
            </tr>
            <tr>
              <td>رسوم الدمغاʡ الخدمات القضائيɡ وتنمية الموارد</td>
              <td style="text-align: center;">دمغات قضائية ونقابة المحامين</td>
              <td style="text-align: left; font-weight:600;">${results.stampsFee}</td>
            </tr>
            <tr>
              <td>رسم قيد سند الوكالة القانونية بالجلية</td>
              <td style="text-align: center;">دمغة محاماة وتوثيق التوكيل</td>
              <td style="text-align: left; font-weight:600;">${results.poaFee}</td>
            </tr>
            <tr>
              <td>أمانة الخبراء القضائيين (وزارة العدل)</td>
              <td style="text-align: center;">إيداع أمانة فنية لفحص النزاع</td>
              <td style="text-align: left; font-weight:600;">${results.expertsDeposit}</td>
            </tr>
            <tr>
              <td>مصاريف إعلانات المحضرين وتوصيل الإخطارات</td>
              <td style="text-align: center;">بمعدل ${notificationCount} إعلانات شامل الرد</td>
              <td style="text-align: left; font-weight:600;">${results.notificationCost}</td>
            </tr>
            <tr>
              <td>رسوم الترجمة الرسمية للمستندات والعرائض</td>
              <td style="text-align: center;">أتعاب ترجمة المرفقات الأجنبية</td>
              <td style="text-align: left; font-weight:600;">${results.translatorCost}</td>
            </tr>
            <tr class="total-row">
              <td>إجمالي مصاريف ورسوم الدعوى المتوقعة</td>
              <td style="text-align: center;">المجموع الكلي التقديري للبلدية</td>
              <td style="text-align: left; font-weight:900;">${results.grandTotal.toLocaleString('ar-EG')} وحدة نقدية</td>
            </tr>
          </tbody>
        </table>

        ${selectedOption.isLaborExempt ? `
          <div class="exemption-box" style="border-right-color: #10b981; background-color: #ecfdf5; color: #065f46;">
            <strong>حالة إعفاء شرعية وقانونية:</strong><br>
            المطالبات العمالية مرفوع عنها كافة الرسوم القضائية بقوة القانون لحماية العامل حتى لو تخطت المطالبات ملايين العملات.
          </div>
        ` : `
          <div class="exemption-box">
            <strong>ملاحظات تقدير الرسوم القضائية لقلم المحاسبة:</strong><br>
            يمثل هذا الكشف حسابه تقديرية أولية للمصاريف الإدارية ولا يمثل الفواتير القضائية النهائية الصادرة من قسم مراجعة الرسوم (قلم المطالبات بالمحكمة) بعد صدور الحكم، حيث يخضع رسم الحكم الإضافي لحسابات الصدور والتسوية.
          </div>
        `}

        <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8;">
           حرر إلكترونياً لغرض الفلترة والاسترشاد • مكتب المحامي الذكي لإدارة القضايا
        </div>
      </body>
      </html>
    `;
    showPrintJob('تقدير_رسوم_القضية', htmlReport);
  };

  return (
    <div className="space-y-6 text-end" dir="rtl" id="court-fees-calculator-panel">
      {/* Unified Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-end">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                تقدير الرسوم القضائية
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Calculator className="h-6 w-6 text-indigo-500" />
              تقدير رسوم ومصاريف الدعوى
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              احتساب تقديري دقيق لرسوم قيد العرائ֡ رسوم المحضرين والإعلاناʡ أمانة الخبراء، والدمغات والنقابة مع الرسم النسبي والخدمات التابعة.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mb-8 select-none">
        {/* Parameters Panel */}
        <div className="w-full xl:w-5/12 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5 text-end font-sans" dir="rtl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">حاسبة رسوم المحاكم والمصاريف</h3>
                <p className="text-[10.5px] text-slate-400 mt-0.5">احسب قيمة قيد العرائ֡ رسوم المحضرين، أمانة الخبراء، ونسب الرسم النسبي</p>
              </div>
            </div>
            <div className="h-px bg-slate-100 mt-4"></div>
          </div>

        {/* Inputs */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>مدخلات ومعايير احتساب قيد الملف</span>
          </p>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-slate-500">تصنيف الدعوى / نوع المسار القضائي</label>
            <select
              value={selectedSuitKey}
              onChange={(e) => setSelectedSuitKey(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold bg-slate-50 outline-none"
            >
              {SUIT_TYPES.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-slate-500">قيمة المطالبة المالية الإجمالية بالعرائض</label>
            <input
              type="number"
              value={claimValue}
              onChange={(e) => setClaimValue(parseInt(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none bg-slate-50 focus:bg-white transition"
              disabled={selectedOption.proportionalRate === 0}
              placeholder="مثال: ١٠٠٠٠٠"
            />
            {selectedOption.proportionalRate === 0 ? (
              <p className="text-[9.5px] text-slate-400 italic">* لا يتطلب هذا التصنيف رسماً نسبياً إضافياً على المطالبات.</p>
            ) : (
              <p className="text-[9.5px] text-slate-400 italic">
                * يُقدر الرسم بنسبة {(selectedOption.proportionalRate * 100).toFixed(1)}% من كشف المبلغ 
                {selectedOption.minProportionalFee && ` بحد أدنى ${selectedOption.minProportionalFee}`}
                {selectedOption.maxProportionalFee && ` وحد أقصى ${selectedOption.maxProportionalFee}`}.
              </p>
            )}
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Additional fees toggles */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-indigo-600 flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5" />
            <span>نفقات ومحلقات إدارية إضافية</span>
          </p>

          <div className="space-y-2 max-h-[250px] overflow-y-auto pe-1">
            {/* Experts deposit */}
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExpertsDeposit}
                  onChange={(e) => setIncludeExpertsDeposit(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                />
                <span className="text-xs font-bold text-slate-700">إيداع أمانة لجنة الخبراء (وزارة العدل)</span>
              </label>
              {includeExpertsDeposit && (
                <div className="flex items-center gap-2 pe-5">
                  <span className="text-[10px] text-slate-400 font-bold">مبلغ الأمانة:</span>
                  <input
                    type="number"
                    value={expertsDepositAmount}
                    onChange={(e) => setExpertsDepositAmount(parseInt(e.target.value) || 0)}
                    className="w-24 border border-slate-200 bg-white rounded text-xs select-none p-1 font-bold font-mono text-center"
                    min="0"
                  />
                </div>
              )}
            </div>

            {/* Notification service */}
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNotification}
                  onChange={(e) => setIncludeNotification(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                />
                <span className="text-xs font-bold text-slate-700">إعلانات وإخطارات قلم المحضرين</span>
              </label>
              {includeNotification && (
                <div className="flex items-center gap-2 pe-5">
                  <span className="text-[10px] text-slate-400 font-bold">عدد الإعلانات الكلية:</span>
                  <input
                    type="number"
                    value={notificationCount}
                    onChange={(e) => setNotificationCount(parseInt(e.target.value) || 0)}
                    className="w-16 border border-slate-200 bg-white rounded text-xs select-none p-1 font-bold text-center"
                    min="1"
                  />
                  <span className="text-[10px] text-slate-400">(٦٠ وحدة لكل إعلان شامل)</span>
                </div>
              )}
            </div>

            {/* Translation services */}
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTranslator}
                  onChange={(e) => setIncludeTranslator(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                />
                <span className="text-xs font-bold text-slate-700">ترجمة معتمدة للحجج والمرفقات</span>
              </label>
              {includeTranslator && (
                <div className="flex items-center gap-2 pe-5">
                  <span className="text-[10px] text-slate-400 font-bold">عدد الصفحات المترجمة:</span>
                  <input
                    type="number"
                    value={translatorPages}
                    onChange={(e) => setTranslatorPages(parseInt(e.target.value) || 0)}
                    className="w-16 border border-slate-200 bg-white rounded text-xs select-none p-1 font-bold text-center"
                    min="1"
                  />
                  <span className="text-[10px] text-slate-400">(٨٠ وحدة للصفحة رسمياً)</span>
                </div>
              )}
            </div>

            {/* POA entry fee */}
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePoaRegister}
                  onChange={(e) => setIncludePoaRegister(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
                />
                <span className="text-xs font-bold text-slate-700">رسم إلحاق التوكيل بملف الجلسة</span>
              </label>
              <span className="text-[10.5px] font-mono font-bold text-slate-400">(٤٥ رسم ثابت)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Styled results breakdown card */}
      <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between" id="fees-results-card">
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-3 text-end" dir="rtl">
          <div>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">كشف الحساب الاسترشادي</span>
            <h4 className="text-sm font-black text-slate-100 mt-1">توزيع وكشف الرسوم القضائية المقدرة</h4>
          </div>

          <button
            onClick={handlePrintFeesReport}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition shrink-0"
            id="print-court-fees-pdf-button"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة تقرير الرسوم الحكومية</span>
          </button>
        </div>

        {/* Breakdown spreadsheet table */}
        <div className="flex-1 overflow-x-auto text-end" dir="rtl">
          <div className="border border-slate-800 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-xs text-end border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-450 border-b border-slate-800">
                  <th className="p-3 text-end font-bold text-slate-400">العنصر المالي المقدر للدعوى</th>
                  <th className="p-3 text-center font-bold text-slate-400">آلية الاحتساب التقريبي</th>
                  <th className="p-3 text-start font-bold text-slate-400">القيمة المقدرة ومجموع المصاريف</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">رسم قيد الجدول وتدشين الملف</td>
                  <td className="p-3.5 text-center text-slate-400">رسم ثابت للتصنيف المحدد بمطالعة المشرع</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.baseFee}</td>
                </tr>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">الرسم النسبي الإضافي (claim surcharge)</td>
                  <td className="p-3.5 text-center text-slate-400">{(selectedOption.proportionalRate * 100).toFixed(1)}% من مجموع القيمة المالية</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.proportionalFee}</td>
                </tr>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">دمغات الخدماʡ الصناديق القضائيɡ والطبية</td>
                  <td className="p-3.5 text-center text-slate-400">طوابع محاماة وتنمية صندوق المحاكم</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.stampsFee}</td>
                </tr>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">قيد الوكالة الرسمية للمحامي بالملف</td>
                  <td className="p-3.5 text-center text-slate-400">طابع نقابة وتوثيق بملف الخبراء</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.poaFee}</td>
                </tr>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">وديعة أمانة هيئة الخبراء بوزارة العدل</td>
                  <td className="p-3.5 text-center text-slate-400">تودع كأمانة لحين ندب مهندس أو محاسب</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.expertsDeposit}</td>
                </tr>
                <tr className="border-b border-slate-850/60 text-slate-300">
                  <td className="p-3.5 font-bold">إعلانات وإخطارات قلم المحضرين</td>
                  <td className="p-3.5 text-center text-slate-400">بمعدل {notificationCount} إعلانات شامل الرد ومحاضر الاستلام</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.notificationCost}</td>
                </tr>
                <tr className="border-b border-slate-800 text-slate-300">
                  <td className="p-3.5 font-bold">رسوم الترجمة الرسمية وصور ملفات الجدول</td>
                  <td className="p-3.5 text-center text-slate-400">أتعاب ترجمة المرفقات الأجنبية</td>
                  <td className="p-3.5 text-start font-bold font-mono text-indigo-400">{results.translatorCost}</td>
                </tr>
                <tr className="bg-indigo-950/40 text-indigo-300 font-bold">
                  <td className="p-4 font-black">المجموع الكلي المقدر للمصاريف</td>
                  <td className="p-4 text-center">أقلام مراجعة الرسوم (تقدير أولي)</td>
                  <td className="p-4 text-start font-black font-mono text-indigo-400 text-sm">
                    {results.grandTotal.toLocaleString('ar-EG')} وحدة نقدية
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Legal Alerts / Court Guidelines */}
        <div className="bg-indigo-950/20 border border-indigo-900/45 p-4 rounded-xl mt-6 text-end" dir="rtl">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-[10px] space-y-1 text-indigo-200">
              <strong className="block text-indigo-400">عن رسوم الأحكام القضائية اللاحقة:</strong>
              <p>
                يرجى الإحاطة بأن هذه تقديرات قيد الدعاوى. وعند صدور حكم قطعي في الموضوع بالقبول أو الرف֡ يقوم قلم مراجعة الرسوم بالمحكمة بإصدار أمر تقدير للرسم النسبي وخدمات الحكم يقع سداده تضامناً على الطرف الخاسر للدعوى القضائية لتجنب الحجز الإداري.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
});

export default CourtFeesCalculator;

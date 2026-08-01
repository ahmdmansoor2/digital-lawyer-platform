/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  Trash2, 
  Clock, 
  Wallet,
  AlertCircle,
  Briefcase,
  X,
  CreditCard,
  FileText,
  Printer,
  Eye,
  RefreshCw
} from 'lucide-react';
import { Transaction, Case, Client, HourLog, Invoice, OfficeProfile } from '../types';
import { printSingleTransaction } from '../utils/printHelper';
import { findMatchSnippet } from '../utils/searchHelper';
import HourInvoicingManager from './HourInvoicingManager';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert, showConfirm } from '../utils/dialogs';
import { useCustomFields, CustomFieldsRenderer } from '../hooks/useCustomFields';

interface FinancialsProps {
  transactions: Transaction[];
  cases: Case[];
  clients: Client[];
  hourLogs: HourLog[];
  invoices: Invoice[];
  onAddTransaction: (newTx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onAddHourLog: (log: HourLog) => void;
  onDeleteHourLog: (id: string) => void;
  onAddInvoice: (inv: Invoice) => void;
  onUpdateInvoiceStatus: (id: string, status: 'غير مدفوعة' | 'مدفوعة بالكامل' | 'ملغاة') => void;
  onUpdateCase?: (updatedCase: Case) => void;
  onSyncCasePaidFees?: () => void;
  officeProfile?: OfficeProfile;
}

const Financials = React.memo(function Financials({
  transactions,
  cases,
  clients,
  hourLogs,
  invoices,
  onAddTransaction,
  onDeleteTransaction,
  onAddHourLog,
  onDeleteHourLog,
  onAddInvoice,
  onUpdateInvoiceStatus,
  onUpdateCase,
  onSyncCasePaidFees,
  officeProfile
}: FinancialsProps) {
  const confirm = useConfirm();
  const txCustomFields = useCustomFields('transaction');
  const [activeSegment, setActiveSegment] = useState<'treasury' | 'timesheet'>('treasury');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIoType, setSelectedIoType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingTx, setIsAddingTx] = useState(false);

  // New Transaction Form State
  const [txForm, setTxForm] = useState({
    caseId: '',
    clientName: '',
    type: 'أتعاب' as 'أتعاب' | 'مصروفات دعوى' | 'مصاريف مكتب تشغيلية' | 'متفرقات',
    ioType: 'وارد (income)' as 'وارد (income)' | 'صادر (expense)',
    amount: 0,
    paymentMethod: 'نقدي' as 'نقدي' | 'فودافون كاش / محفظة' | 'تحويل بنكي' | 'شيك',
    description: '',
    date: new Date().toISOString().split('T')[0],
    customFieldValues: {} as Record<string, any>
  });

  // Calculations
  const incomes = transactions.filter(t => t.ioType.includes('وارد'));
  const expenses = transactions.filter(t => t.ioType.includes('صادر'));

  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const netEarnings = totalIncome - totalExpense;

  // Filtered transactions list
  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      t.clientName.toLowerCase().includes(query) ||
      (t.caseNumber && t.caseNumber.toLowerCase().includes(query)) ||
      t.description.toLowerCase().includes(query);

    const matchesIo = 
      selectedIoType === 'all' || 
      (selectedIoType === 'income' && t.ioType.includes('وارد')) ||
      (selectedIoType === 'expense' && t.ioType.includes('صادر'));

    const matchesCategory = selectedCategory === 'all' || t.type === selectedCategory;

    return matchesSearch && matchesIo && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle adding custom transaction
  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || txForm.amount <= 0) {
      await showAlert('الرجاء إدخال قيمة مبلغ صحيحة أكبر من الصفر');
      return;
    }
    // v2.9.4: Warn if income transaction is not linked to a case
    if (txForm.ioType.includes('وارد') && !txForm.caseId) {
      const proceed = await showConfirm('⚠️ المعاملة وارد لكن غير مرتبطة بقضية.\n\nلن تظهر هذه المعاملة في ملف القضية.\n\nهل تريد المتابعة؟');
      if (!proceed) return;
    }

    let clientName = txForm.clientName;
    let caseNum: string | undefined = undefined;

    // Local override if linked to a case
    if (txForm.caseId) {
      const selectedCase = cases.find(c => c.id === txForm.caseId);
      if (selectedCase) {
        clientName = selectedCase.clientName;
        caseNum = selectedCase.caseNumber;
      }
    }

    if (!clientName) {
      clientName = 'مصاريف عامة للمكتب الإداري';
    }

    const newTx: Transaction = {
      id: 'tx_added_' + Date.now(),
      caseId: txForm.caseId || undefined,
      caseNumber: caseNum,
      clientName: clientName,
      type: txForm.type,
      ioType: txForm.ioType,
      amount: Number(txForm.amount),
      date: txForm.date,
      description: txForm.description || `${txForm.type} - دفع إقرار بالخزينة`,
      paymentMethod: txForm.paymentMethod,
      customFieldValues: Object.keys(txForm.customFieldValues).length > 0 ? txForm.customFieldValues : undefined
    };

    onAddTransaction(newTx);

    // Sync with case paid fees when adding fee income
    if (newTx.type === 'أتعاب' && newTx.ioType.includes('وارد') && newTx.caseId && onUpdateCase) {
      const targetCase = cases.find(c => c.id === newTx.caseId);
      if (targetCase) {
        onUpdateCase({
          ...targetCase,
          paidFees: targetCase.paidFees + newTx.amount,
          updatedAt: new Date().toISOString()
        });
      }
    }

    setIsAddingTx(false);

    // Reset txform
    setTxForm({
      caseId: '',
      clientName: '',
      type: 'أتعاب',
      ioType: 'وارد (income)',
      amount: 0,
      paymentMethod: 'نقدي',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Helper inside form to sync transaction config based on selected type
  const handleTypeSelectionSync = (newType: string) => {
    let io: 'وارد (income)' | 'صادر (expense)' = 'وارد (income)';
    if (newType === 'مصاريف مكتب تشغيلية' || newType === 'متفرقات') {
      io = 'صادر (expense)';
    }
    setTxForm({
      ...txForm,
      type: newType as any,
      ioType: io
    });
  };

  return (
    <div className="space-y-6 text-end pb-10" dir="rtl">
      
      {/* SEGMENT/SUBTABS SELECTOR */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit gap-1 no-print">
        <button
          onClick={() => setActiveSegment('treasury')}
          className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
            activeSegment === 'treasury' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          دفتر الخزينة والمعاملات اليومية
        </button>
        <button
          onClick={() => setActiveSegment('timesheet')}
          className={`px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
            activeSegment === 'timesheet' 
              ? 'bg-slate-900 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Clock className="w-4 h-4 text-indigo-600" />
          منظومة فواتير الساعات وسجل العمل
          <span className="bg-indigo-100 text-indigo-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full">إصدار أتعاب</span>
        </button>
      </div>

      {activeSegment === 'timesheet' ? (
        <HourInvoicingManager
          cases={cases}
          clients={clients}
          hourLogs={hourLogs}
          invoices={invoices}
          onAddHourLog={onAddHourLog}
          onDeleteHourLog={onDeleteHourLog}
          onAddInvoice={onAddInvoice}
          onUpdateInvoiceStatus={onUpdateInvoiceStatus}
          onUpdateCase={onUpdateCase}
          officeProfile={officeProfile}
        />
      ) : (
        <>
          {/* HEADER SECTION */}
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
                    الدفتر المالي المركزي
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-indigo-500" />
                  دفتر الخزينة والحسابات اليومية
                </h1>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  حصر الوارد المالي من أتعاب الموكلين ورصد المصروفات القضائية وتشغيل المكتب شهرياً بدقة فائقة.
                </p>
              </div>

              <div className="flex items-center gap-2 z-10 shrink-0">
                {onSyncCasePaidFees && (
                  <button
                    onClick={async () => { onSyncCasePaidFees(); await showAlert('تمت مزامنة حسابات القضايا مع دفتر الخزينة بنجاح'); }}
                    className="bg-emerald-700 text-white hover:bg-emerald-800 shadow-md rounded-2xl px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                    title="مزامنة أرصدة القضايا مع المعاملات المالية"
                  >
                    <RefreshCw className="h-4 w-4" />
                    مزامنة الحسابات
                  </button>
                )}
                <button
                  onClick={() => setIsAddingTx(true)}
                  className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md rounded-2xl px-5 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="btn-add-tx-trigger"
                >
                  <Plus className="h-4 w-4" />
                  تسجيل حركة إيراد / مصروف جديدة
                </button>
              </div>
            </div>
          </div>

      {/* FINANCE OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Revenues */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:border-emerald-500/20 transition group">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400">إجمالي المقبوضات (الوارد)</p>
            <h3 className="text-3xl font-black text-emerald-600">
              {totalIncome.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-400">ج.م</span>
            </h3>
            <p className="text-xs text-slate-400">مقدمات وأقساط أتعاب ورسوم معوضة</p>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex items-center justify-between hover:border-rose-500/20 transition group">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400">إجمالي المصروفات (الصادر)</p>
            <h3 className="text-3xl font-black text-rose-600">
              {totalExpense.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-400">ج.م</span>
            </h3>
            <p className="text-xs text-slate-400">رسوم المحاكم، الإتقالاʡ وتشغيل الصرح</p>
          </div>
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
        </div>

        {/* Net Profits */}
        <div className={`bg-white border p-6 rounded-2xl shadow-sm flex items-center justify-between hover:border-slate-400 transition group ${
          netEarnings >= 0 ? 'border-indigo-200 bg-indigo-50/5' : 'border-red-200 bg-red-50/5'
        }`}>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400">صافي الميزانية والأرباح</p>
            <h3 className={`text-3xl font-black ${netEarnings >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
              {netEarnings.toLocaleString('ar-EG')} <span className="text-xs font-bold text-slate-400">ج.م</span>
            </h3>
            <p className="text-xs text-slate-400">القوة المالية المؤقتة بخزينة المكتب</p>
          </div>
          <div className={`p-4 rounded-2xl group-hover:scale-105 transition-transform ${
            netEarnings >= 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-red-100 text-red-800'
          }`}>
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Query Search Ledger */}
          <div className="relative md:col-span-2">
            <input 
              type="text" 
              placeholder="ابحث بالاسم، برقم الدعوى القضائيɡ أو بتفاصيل البيان..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pe-10 ps-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-slate-50/50 transition font-medium"
              id="financials-search"
            />
            <Search className="absolute end-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute start-3 top-3.5 text-[10px] bg-slate-200 hover:bg-slate-300 p-0.5 px-1.5 rounded text-slate-600 font-bold"
              >
                مسح
              </button>
            )}
          </div>

          {/* Ledger Type Filter */}
          <div>
            <select
              value={selectedIoType}
              onChange={e => setSelectedIoType(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-emerald-600 cursor-pointer font-bold"
            >
              <option value="all">كافة الوارد والصادر بالميزانية</option>
              <option value="income">المستلمات فقط (وارد)</option>
              <option value="expense">المدفوعات والمصاريف (صادر)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="all">كافة البنود الحسابية</option>
              <option value="أتعاب">أتعاب القضايا فقط</option>
              <option value="مصروفات دعوى">مصاريف الخبراء والدعاوى بالمحكمة</option>
              <option value="مصاريف مكتب تشغيلية">مصاريف الصرح وتيسيرات المكتب</option>
            </select>
          </div>

        </div>
      </div>

      {/* LEDGER REPORT SHEET TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs md:text-sm font-extrabold text-slate-700">بيان التدفقات الرسمية والخزينة اليومية</h3>
          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold p-1 px-2 rounded-full font-mono">
            المعروض: {filteredTransactions.length} حركة بالدفتر
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-end text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[11px]">
                <th className="p-4 whitespace-nowrap">اتجاه التدفق</th>
                <th className="p-4 whitespace-nowrap">اسم الطرف / الموكل</th>
                <th className="p-4 whitespace-nowrap">بيان وتفاصيل المستند</th>
                <th className="p-4 whitespace-nowrap text-center">البند</th>
                <th className="p-4 whitespace-nowrap text-center">أداة الدفع</th>
                <th className="p-4 whitespace-nowrap text-start">المبلغ المالي</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-bold text-xs">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    لا توجد أي معاملات محاسبية تطابق محددات البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const match = searchQuery ? findMatchSnippet({
                    clientName: tx.clientName,
                    caseNumber: tx.caseNumber,
                    description: tx.description
                  }, searchQuery, {
                    clientName: 'اسم الموكل',
                    caseNumber: 'رقم القضية المتصلة',
                    description: 'بيان المعاملة المالية'
                  }) : null;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr 
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition"
                        id={`ledger-row-${tx.id}`}
                      >
                        {/* IoType Direction */}
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${
                            tx.ioType.includes('وارد') 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-800 border border-rose-100'
                          }`}>
                            {tx.ioType.includes('وارد') ? (
                              <>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                                <span>مقبوض (وارد)</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                                <span>مدفوع (صادر)</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Client name linked optionally to Case */}
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900 block">{tx.clientName}</span>
                            {tx.caseNumber && (
                              <span className="text-[10px] text-slate-400 font-mono">قضية رقم: {tx.caseNumber}</span>
                            )}
                          </div>
                        </td>

                        {/* Desc */}
                        <td className="p-4 font-medium text-slate-600 max-w-xs truncate" title={tx.description}>
                          {tx.description}
                          <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{tx.date}</span>
                        </td>

                        {/* Type Box */}
                        <td className="p-4 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-bold">
                            {tx.type}
                          </span>
                        </td>

                        {/* Payment Tool */}
                        <td className="p-4 text-center">
                          <span className="text-slate-600 font-semibold text-[11px] bg-slate-50 border border-slate-100 p-1 px-1.5 rounded-lg">
                            {tx.paymentMethod}
                          </span>
                        </td>

                        {/* Total Value */}
                        <td className="p-4 text-start font-mono font-bold font-semibold">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  const rc = cases.find(c => c.caseNumber === tx.caseNumber);
                                  printSingleTransaction(tx, rc, officeProfile || { officeName: 'مكتب المحاماة والخدمات القانونية', managingPartner: 'المستشار العام للمكتب', barId: 'غير مقيد', taxId: 'غير متوفر', phone: 'غير مسجل', email: 'غير مسجل', address: 'غير مسجل', courtJurisdiction: 'غير محدد' });
                                }}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded p-1 transition cursor-pointer"
                                title="عرض ومعاينة سند قيد حركة مالية"
                                id={`view-tx-btn-${tx.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  const rc = cases.find(c => c.caseNumber === tx.caseNumber);
                                  printSingleTransaction(tx, rc, officeProfile || { officeName: 'مكتب المحاماة والخدمات القانونية', managingPartner: 'المستشار العام للمكتب', barId: 'غير مقيد', taxId: 'غير متوفر', phone: 'غير مسجل', email: 'غير مسجل', address: 'غير مسجل', courtJurisdiction: 'غير محدد' });
                                }}
                                className="text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded p-1 transition cursor-pointer"
                                title="طباعة سند قيد حركة مالية"
                                id={`print-tx-btn-${tx.id}`}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              
                              <button
                                onClick={async () => {
                                  if (await confirm('هل ترغب في مسح هذا القيد المالي من الدفتر التراكمي؟')) {
                                    onDeleteTransaction(tx.id);
                                  }
                                }}
                                className="text-slate-300 hover:text-red-650 hover:text-red-600 transition p-1 rounded hover:bg-red-50 cursor-pointer"
                                id={`delete-tx-btn-${tx.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <span className={`text-sm shrink-0 ${
                              tx.ioType.includes('وارد') ? 'text-emerald-600 font-semibold' : 'text-rose-600'
                            }`}>
                              {tx.ioType.includes('وارد') ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج.م
                            </span>
                          </div>
                        </td>
                      </tr>
                      {match && (
                        <tr className="bg-indigo-50/20 border-b border-slate-100">
                           <td colSpan={6} className="p-2 text-[10px] text-slate-500 font-sans text-end">
                             <span className="text-indigo-800 font-extrabold pe-4">مطابقة في {match.fieldName}:</span>
                            <span>{match.before}</span>
                            <mark className="bg-indigo-100 text-indigo-900 font-bold px-0.5 rounded">{match.match}</mark>
                            <span>{match.after}</span>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD CUSTOM JOURNAL ENTRY (وارد وصادر عام) */}
        {isAddingTx && (
          <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-b-4 border-emerald-700 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto space-y-4 text-end animate-none"
              id="add-custom-tx-modal"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h2 className="text-xs md:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CreditCard className="h-5.5 w-5.5 text-emerald-600" />
                  تسجيل قيد حسابي بالدفتر العام
                </h2>
                <button 
                  onClick={() => setIsAddingTx(false)}
                  className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddTxSubmit} noValidate className="space-y-4 text-xs font-semibold">
                
                {/* 1. Category */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تصنيف البند المحاسبي *</label>
                  <select
                    value={txForm.type}
                    onChange={e => handleTypeSelectionSync(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                  >
                    <option value="أتعاب">أتعاب قضايا (قسط أو مقدمات من موكل)</option>
                    <option value="مصروفات دعوى">رسوم ومصروفات المحاكم (على ذمة موكل)</option>
                    <option value="مصاريف مكتب تشغيلية">مصروف تشغيلي (إيجار مكتب، إنترنت، كهرباء، إلخ)</option>
                    <option value="متفرقات">مصروفات متفرقات عامة</option>
                  </select>
                </div>

                {/* 1.5. Transaction Date */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">تاريخ المعاملة المالية *</label>
                  <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={e => setTxForm({...txForm, date: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono"
                  />
                </div>

                {/* 2. Link to Case */}
                {txForm.type !== 'مصاريف مكتب تشغيلية' && (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">ربط السند بملف قضية (إن وجد)</label>
                    <select
                      value={txForm.caseId}
                      onChange={e => setTxForm({...txForm, caseId: e.target.value})}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    >
                      <option value="">-- قيد عام غير مرتبط بقضية معينة --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.clientName} (قضية رقم: {c.caseNumber})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Client Name if independent */}
                {!txForm.caseId && txForm.type !== 'مصاريف مكتب تشغيلية' && (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1 font-semibold">اسم الموكل المعني *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد عبد الله اليماني"
                      value={txForm.clientName}
                      onChange={e => setTxForm({...txForm, clientName: e.target.value})}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                )}

                {/* 4. Direction & amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">الجهة المالية والتدفق *</label>
                    <select
                      value={txForm.ioType}
                      disabled={txForm.type === 'مصاريف مكتب تشغيلية'}
                      onChange={e => setTxForm({...txForm, ioType: e.target.value as any})}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white disabled:opacity-75"
                    >
                      <option value="وارد (income)">وارد (مقبوض للخزينة)</option>
                      <option value="صادر (expense)">صادر (مصروف مدفوع)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">قيمة المبلغ المالي (ج.م) *</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      value={txForm.amount || ''}
                      onChange={e => setTxForm({...txForm, amount: Number(e.target.value)})}
                      placeholder="المبلغ بالجنيه"
                       className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono text-start"
                      id="input-add-tx-amount"
                    />
                  </div>
                </div>

                {/* 5. Payment method */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">وسيلة التحصيل/الدفع المساندة *</label>
                  <select
                    value={txForm.paymentMethod}
                    onChange={e => setTxForm({...txForm, paymentMethod: e.target.value as any})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer"
                  >
                    <option value="نقدي">نقداً بالمكتب</option>
                    <option value="فودافون كاش / محفظة">فودافون كاش / المحافظ الكترونية</option>
                    <option value="تحويل بنكي">تحويل بنكي / بنك الأهلي / بنك مصر</option>
                    <option value="شيك">شيك تجاري أو مصرفي</option>
                  </select>
                </div>

                {/* 6. Description */}
                <div>
                  <label className="block text-slate-600 font-bold mb-1">البيان وسبب المعاملة القضائية بالتفصيل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تسديد القسط الأول للأتعاب..."
                    value={txForm.description}
                    onChange={e => setTxForm({...txForm, description: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white text-xs"
                    id="input-add-tx-desc"
                  />
                </div>

                {txCustomFields.fields.length > 0 && (
                  <fieldset className="space-y-3">
                    <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
                    <CustomFieldsRenderer
                      fields={txCustomFields.fields}
                      values={txForm.customFieldValues}
                      onChange={(fieldId, val) => setTxForm({ ...txForm, customFieldValues: txCustomFields.setFieldValue(fieldId, val, txForm.customFieldValues) })}
                    />
                  </fieldset>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsAddingTx(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition"
                  >
                    إلغاء الأمر
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-900 border border-emerald-750 text-white hover:bg-emerald-850 px-7 py-2.5 rounded-xl font-bold transition shadow-md"
                    id="submit-tx-btn"
                  >
                    تأكيد وتسجيل الحساب
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}
        </>
      )}

    </div>
  );
});

export default Financials;

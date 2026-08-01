/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CaseDrawer.tsx — ملف الدعوى التفصيلي (drawer) المعروض أسفل الـ list.
 *
 * مستخرج من CasesList.tsx v2.9.6 (الـ drawer كان 750+ سطر داخل الـ main).
 * يحتوي على: header + جلسات القضية + المعاملات المالية + المرفقات.
 */

import React, { useState } from 'react';
import {
  Briefcase, Eye, Printer, FileText, X, Clock, Gavel, StickyNote,
  Calendar, BarChart3, List, LayoutGrid, ArrowUpDown, Search, Plus, Coins,
} from 'lucide-react';
import { Case, Session, Transaction, OfficeProfile } from '../../types';
import { printSingleCase, printSingleSession, printBulkSessions } from '../../utils/printHelper';
import { exportCaseToWord } from '../../utils/wordExportHelper';
import { showAlert } from '../../utils/dialogs';
import AttachmentManager from '../AttachmentManager';

export interface CaseDrawerProps {
  selectedCase: Case;
  sessions: Session[];
  transactions: Transaction[];
  officeProfile: OfficeProfile;
  confirm: (msg: string) => Promise<boolean>;
  onUpdateCase: (c: Case) => void;
  onDeleteCase?: (id: string) => void;
  onAddSessionFromCase: (s: Session) => void;
  onUpdateSessionFromCase?: (s: Session) => void;
  onDeleteSessionFromCase?: (id: string) => void;
  onAddTransactionFromCase: (t: Transaction) => void;
  onClose: () => void;
  onEdit: (c: Case) => void;
}

export const CaseDrawer = React.forwardRef<HTMLDivElement, CaseDrawerProps>(function CaseDrawer(
  {
    selectedCase, sessions, transactions, officeProfile, confirm,
    onUpdateCase, onDeleteCase, onAddSessionFromCase, onUpdateSessionFromCase, onDeleteSessionFromCase,
    onAddTransactionFromCase, onClose, onEdit,
  },
  ref,
) {
  const [isAddingSessionInline, setIsAddingSessionInline] = useState(false);
  const [inlineSessionData, setInlineSessionData] = useState({
    date: new Date().toISOString().split('T')[0],
    objective: '',
    status: 'قادمة' as 'قادمة' | 'منتهية',
    decision: '',
    judgeName: '',
    notes: '',
  });

  const [sessionViewMode, setSessionViewMode] = useState<'cards' | 'table'>('cards');
  const [sessionSortKey, setSessionSortKey] = useState<'date' | 'court' | 'status' | 'judgeName'>('date');
  const [sessionSortDir, setSessionSortDir] = useState<'asc' | 'desc'>('desc');
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');

  const [isAddingTransactionInline, setIsAddingTransactionInline] = useState(false);
  const [inlineTransactionData, setInlineTransactionData] = useState({
    type: 'أتعاب' as 'أتعاب' | 'مصروفات دعوى',
    ioType: 'وارد (income)' as 'وارد (income)' | 'صادر (expense)',
    amount: 0,
    paymentMethod: 'نقدي' as 'نقدي' | 'فودافون كاش / محفظة' | 'تحويل بنكي' | 'شيك',
    description: '',
  });

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionData, setEditingSessionData] = useState({
    date: '',
    objective: '',
    status: 'قادمة' as 'قادمة' | 'منتهية',
    decision: '',
    judgeName: '',
    notes: '',
  });

  const handleAddInlineSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: Session = {
      id: 'session_' + Date.now(),
      caseId: selectedCase.id,
      caseNumber: selectedCase.caseNumber,
      clientName: selectedCase.clientName,
      date: inlineSessionData.date,
      court: selectedCase.court,
      circuit: selectedCase.circuit,
      objective: inlineSessionData.objective || 'حضور جلسة ومرافعة',
      decision: inlineSessionData.decision || '',
      status: inlineSessionData.status,
      judgeName: inlineSessionData.judgeName || undefined,
      notes: inlineSessionData.notes || undefined,
    };
    onAddSessionFromCase(newSession);
    setIsAddingSessionInline(false);
    setInlineSessionData({ date: new Date().toISOString().split('T')[0], objective: '', status: 'قادمة', decision: '', judgeName: '', notes: '' });
  };

  const handleAddInlineTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTransactionData.amount || inlineTransactionData.amount <= 0) {
      await showAlert('الرجاء إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!inlineTransactionData.description) {
      await showAlert('الرجاء إدخال بيان المعاملة المالية');
      return;
    }
    const newTransaction: Transaction = {
      id: 'tx_' + Date.now(),
      caseId: selectedCase.id,
      caseNumber: selectedCase.caseNumber,
      clientName: selectedCase.clientName,
      type: inlineTransactionData.type,
      ioType: inlineTransactionData.ioType,
      amount: Number(inlineTransactionData.amount),
      date: new Date().toISOString().split('T')[0],
      description: inlineTransactionData.description || `${inlineTransactionData.type} - قضية رقم ${selectedCase.caseNumber}`,
      paymentMethod: inlineTransactionData.paymentMethod,
    };
    onAddTransactionFromCase(newTransaction);
    if (newTransaction.type === 'أتعاب' && newTransaction.ioType.includes('وارد')) {
      onUpdateCase({ ...selectedCase, paidFees: selectedCase.paidFees + newTransaction.amount, updatedAt: new Date().toISOString() });
    }
    setIsAddingTransactionInline(false);
    setInlineTransactionData({ type: 'أتعاب', ioType: 'وارد (income)', amount: 0, paymentMethod: 'نقدي', description: '' });
  };

  const handleUpdateSessionSubmit = (e: React.FormEvent, s: Session) => {
    e.preventDefault();
    if (onUpdateSessionFromCase) {
      onUpdateSessionFromCase({
        ...s,
        date: editingSessionData.date,
        objective: editingSessionData.objective,
        status: editingSessionData.status,
        decision: editingSessionData.decision,
        judgeName: editingSessionData.judgeName || undefined,
        notes: editingSessionData.notes || undefined,
      });
    }
    setEditingSessionId(null);
  };

  const caseSessions = sessions.filter(s => s.caseId === selectedCase.id);
  const caseTransactions = transactions.filter(t => t.caseId === selectedCase.id);

  return (
    <div
      ref={ref}
      className="bg-white border-2 border-indigo-600/25 p-6 rounded-2xl shadow-xl space-y-6"
      id={`case-docket-drawer-${selectedCase.id}`}
      data-testid="case-drawer"
    >
      {/* Drawer Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-indigo-700 font-mono">قضية رقم: {selectedCase.caseNumber}</span>
              <span className="text-slate-400">|</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{selectedCase.type}</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-medium text-[10px]">{selectedCase.litigationLevel}</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">ملف الدعوى: {selectedCase.clientName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => printSingleCase(selectedCase, sessions, transactions, officeProfile)}
            className="p-2 border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
            id={`view-case-docket-btn-${selectedCase.id}`}
          >
            <Eye className="h-4 w-4" /><span>عرض التقرير</span>
          </button>
          <button
            onClick={() => printSingleCase(selectedCase, sessions, transactions, officeProfile)}
            className="p-2 border border-indigo-200 text-indigo-600 bg-indigo-50/30 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
            id={`print-case-docket-btn-${selectedCase.id}`}
          >
            <Printer className="h-4 w-4" /><span>طباعة</span>
          </button>
          <button
            onClick={() => exportCaseToWord(selectedCase, sessions, transactions, officeProfile)}
            className="p-2 border border-blue-200 text-blue-600 bg-blue-50/35 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
            id={`export-case-word-btn-${selectedCase.id}`}
          >
            <FileText className="h-4 w-4" /><span>وورد</span>
          </button>
          {onDeleteCase && (
            <button
              onClick={async () => {
                if (await confirm('هل أنت متأكد من حذف ملف القضية بالكامل وسجلاته؟')) {
                  onDeleteCase(selectedCase.id);
                  onClose();
                }
              }}
              className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
              title="حذف القضية نهائياً"
              id={`delete-case-docket-btn-${selectedCase.id}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
            id="close-docket-btn"
          >
            إغلاق ✕
          </button>
        </div>
      </div>

      {/* Body grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Box 1: case legal metadata */}
        <div className="space-y-4 lg:col-span-1 bg-slate-50/50 p-5 rounded-xl border border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-600" />
            بيانات الخصومة والمحكمة
          </h3>
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">المحكمة المختصة:</span>
              <strong className="text-slate-900 text-start">{selectedCase.court}</strong>
            </div>
            {selectedCase.fileNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">رقم الملف الورقي:</span>
                <strong className="text-indigo-700 font-mono font-bold">#{selectedCase.fileNumber}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">الدائرة ونوعها:</span>
              <strong className="text-slate-900">{selectedCase.circuit}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">صفة موكلنا:</span>
              <strong className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-medium">{selectedCase.clientRole}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">اسم الخصم المقابل:</span>
              <strong className="text-red-700">{selectedCase.opponentName}</strong>
            </div>
            {selectedCase.opponentLawyer && (
              <div className="flex justify-between">
                <span className="text-slate-500">محامي الخصم:</span>
                <strong className="text-slate-700">{selectedCase.opponentLawyer}</strong>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">حالة القضية:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedCase.status === 'متداولة' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                selectedCase.status === 'محجوزة للحكم' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                'bg-slate-100 text-slate-600'
              }`}>{selectedCase.status}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 mb-1">موضوع الدعوى:</h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
              {selectedCase.claimSubject || 'لم يتم كتابة موضوع الدعوى بالتفصيل مسبقاً.'}
            </p>
          </div>
          {selectedCase.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-1">تعليمات وتوصيات المكتب:</h4>
              <p className="text-xs text-slate-500 italic bg-indigo-50/40 p-3 rounded-lg border border-indigo-100/50">
                {selectedCase.notes}
              </p>
            </div>
          )}
        </div>

        {/* Box 2: Sessions list */}
        <div className="space-y-4 lg:col-span-1">
          {caseSessions.length > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-slate-50 p-2.5 rounded-xl border border-indigo-200/30">
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 font-bold text-slate-700">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  {caseSessions.length} جلسة
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-indigo-700 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                  {caseSessions.filter(s => s.status === 'قادمة').length} قادمة
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-slate-500 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                  {caseSessions.filter(s => s.status === 'منتهية').length} منتهية
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => printBulkSessions(caseSessions, officeProfile)}
                  className="text-[9px] bg-white border border-slate-200 hover:bg-slate-50 px-1.5 py-0.5 rounded font-bold text-slate-600 flex items-center gap-0.5 cursor-pointer"
                  title="طباعة كشف الجلسات"
                >
                  <Printer className="w-2.5 h-2.5" /> طباعة
                </button>
                <button
                  onClick={() => setSessionViewMode(sessionViewMode === 'cards' ? 'table' : 'cards')}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 cursor-pointer border ${
                    sessionViewMode === 'table' ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title={sessionViewMode === 'cards' ? 'عرض جدولي' : 'عرض بطاقات'}
                >
                  {sessionViewMode === 'cards' ? <List className="w-2.5 h-2.5" /> : <LayoutGrid className="w-2.5 h-2.5" />}
                  {sessionViewMode === 'cards' ? 'جدول' : 'بطاقات'}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-600" />
              جلسات ومحاضر القضية
            </h3>
            {!isAddingSessionInline && (
              <button
                onClick={() => setIsAddingSessionInline(true)}
                className="text-xs text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                id="btn-add-inline-session"
              >
                <Plus className="h-3 w-3" />
                إدراج جلسة
              </button>
            )}
          </div>

          {isAddingSessionInline && (
            <form onSubmit={handleAddInlineSession} noValidate className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200/50 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900">إدراج تاريخ جلسة جديد للقضية</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">تاريخ الجلسة</label>
                  <input type="date" value={inlineSessionData.date} onChange={e => setInlineSessionData({...inlineSessionData, date: e.target.value})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">الحالة</label>
                  <select value={inlineSessionData.status} onChange={e => setInlineSessionData({...inlineSessionData, status: e.target.value as 'قادمة' | 'منتهية'})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                    <option value="قادمة">قادمة</option>
                    <option value="منتهية">منتهية</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">الهدف والمطلوب</label>
                <textarea placeholder="المرافعة وإبداء الدفاع..." value={inlineSessionData.objective} onChange={e => setInlineSessionData({...inlineSessionData, objective: e.target.value})} className="w-full text-xs p-2 rounded border border-slate-200 bg-white h-12" />
              </div>
              {inlineSessionData.status === 'منتهية' && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">قرار المحكمة</label>
                  <input type="text" value={inlineSessionData.decision} onChange={e => setInlineSessionData({...inlineSessionData, decision: e.target.value})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">اسم القاضي</label>
                  <input type="text" value={inlineSessionData.judgeName} onChange={e => setInlineSessionData({...inlineSessionData, judgeName: e.target.value})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">ملاحظات</label>
                  <input type="text" value={inlineSessionData.notes} onChange={e => setInlineSessionData({...inlineSessionData, notes: e.target.value})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" />
                </div>
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button type="button" onClick={() => setIsAddingSessionInline(false)} className="px-2.5 py-1 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-600">إلغاء</button>
                <button type="submit" className="px-2.5 py-1 text-[10px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold">تأكيد ورصد</button>
              </div>
            </form>
          )}

          {caseSessions.length >= 2 && (
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute end-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input type="text" value={sessionSearchQuery} onChange={e => setSessionSearchQuery(e.target.value)} placeholder="بحث في جلسات هذه القضية..." className="w-full text-[10px] p-1 pe-7 rounded border border-slate-200 bg-white" />
              </div>
              <div className="flex items-center gap-0.5">
                {(['date', 'court', 'status', 'judgeName'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => {
                      if (sessionSortKey === key) setSessionSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setSessionSortKey(key); setSessionSortDir('desc'); }
                    }}
                    className={`text-[9px] px-1 py-0.5 rounded font-bold flex items-center gap-0.5 border cursor-pointer ${
                      sessionSortKey === key ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpDown className="w-2.5 h-2.5" />
                    {key === 'date' ? 'تاريخ' : key === 'court' ? 'محكمة' : key === 'status' ? 'حالة' : 'قاضي'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {caseSessions.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-white border border-dashed rounded-xl">لم يتم تبويب أي جلسات لهذه القضية بعد.</div>
          ) : (
            <div className="space-y-2">
              {caseSessions
                .filter(s => {
                  if (!sessionSearchQuery) return true;
                  const q = sessionSearchQuery.toLowerCase();
                  return s.date.includes(q) || s.court.toLowerCase().includes(q) || s.objective.toLowerCase().includes(q) || (s.judgeName || '').toLowerCase().includes(q);
                })
                .sort((a, b) => {
                  let cmp = 0;
                  if (sessionSortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
                  else if (sessionSortKey === 'court') cmp = a.court.localeCompare(b.court);
                  else if (sessionSortKey === 'status') cmp = a.status.localeCompare(b.status);
                  else cmp = (a.judgeName || '').localeCompare(b.judgeName || '');
                  return sessionSortDir === 'desc' ? -cmp : cmp;
                })
                .map(session => (
                  <div
                    key={session.id}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 transition ${
                      session.status === 'قادمة' ? 'bg-indigo-50/10 border-indigo-300/40 shadow-sm' : 'bg-white border-slate-100'
                    }`}
                    id={`inline-session-card-${session.id}`}
                  >
                    <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                      session.status === 'قادمة' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="space-y-1 flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold underline font-mono">{session.date}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-1.5 rounded ${
                            session.status === 'قادمة' ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-200 text-slate-700'
                          }`}>{session.status}</span>
                          <button onClick={() => printSingleSession(session, selectedCase, officeProfile)} className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer" title="طباعة الجلسة">
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          {onDeleteSessionFromCase && (
                            <button onClick={async () => { if (await confirm('هل أنت متأكد من حذف هذه الجلسة؟')) onDeleteSessionFromCase(session.id); }} className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer" title="حذف">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold"><span className="text-indigo-800 font-bold">الهدف:</span> {session.objective}</p>
                      {session.judgeName && (
                        <p className="flex items-center gap-1 mt-1"><Gavel className="w-3 h-3 text-slate-400" /><span className="font-semibold text-slate-600">القاضي: {session.judgeName}</span></p>
                      )}
                      {session.notes && (
                        <p className="flex items-center gap-1 mt-0.5"><StickyNote className="w-3 h-3 text-slate-400" /><span className="text-slate-500">ملاحظة: {session.notes}</span></p>
                      )}
                      {session.decision && (
                        <p className="bg-slate-50 p-1.5 rounded text-[11px] border border-slate-100 italic text-slate-700 mt-1.5">
                          <strong className="text-slate-800">القرار: </strong>{session.decision}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Box 3: Financials */}
        <div className="space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-emerald-600" />
              التقرير المالي
            </h3>
            {!isAddingTransactionInline && (
              <button onClick={() => setIsAddingTransactionInline(true)} className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5" id="btn-add-inline-tx">
                <Plus className="h-3 w-3" />
                تسجيل حركة
              </button>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">حالة سداد أتعاب القضية:</span>
              <strong className="text-slate-900 font-mono">
                {selectedCase.paidFees.toLocaleString('ar-EG')} / {selectedCase.totalFees.toLocaleString('ar-EG')} ج.م
              </strong>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${selectedCase.totalFees > 0 ? Math.min(100, (selectedCase.paidFees / selectedCase.totalFees) * 100) : 0}%` }}></div>
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-rose-600 font-mono">المتبقي: {(selectedCase.totalFees - selectedCase.paidFees).toLocaleString('ar-EG')} ج.م</span>
              <span className="text-emerald-600 font-mono">النسبة: {selectedCase.totalFees > 0 ? Math.round((selectedCase.paidFees / selectedCase.totalFees) * 100) : 0}%</span>
            </div>
          </div>

          {isAddingTransactionInline && (
            <form onSubmit={handleAddInlineTransaction} noValidate className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/50 space-y-3">
              <h4 className="text-xs font-bold text-emerald-950">تسجيل دفعة</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">التصنيف</label>
                  <select value={inlineTransactionData.type} onChange={e => setInlineTransactionData({...inlineTransactionData, type: e.target.value as any})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                    <option value="أتعاب">أتعاب</option>
                    <option value="مصروفات دعوى">مصروفات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">النوع</label>
                  <select value={inlineTransactionData.ioType} onChange={e => setInlineTransactionData({...inlineTransactionData, ioType: e.target.value as any})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                    <option value="وارد (income)">وارد</option>
                    <option value="صادر (expense)">صادر</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">المبلغ (ج.م)</label>
                  <input type="number" min="1" value={inlineTransactionData.amount || ''} onChange={e => setInlineTransactionData({...inlineTransactionData, amount: Number(e.target.value)})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">طريقة الدفع</label>
                  <select value={inlineTransactionData.paymentMethod} onChange={e => setInlineTransactionData({...inlineTransactionData, paymentMethod: e.target.value as any})} className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white">
                    <option value="نقدي">نقدي</option>
                    <option value="فودافون كاش / محفظة">محفظة</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="شيك">شيك</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">البيان</label>
                <input type="text" value={inlineTransactionData.description} onChange={e => setInlineTransactionData({...inlineTransactionData, description: e.target.value})} className="w-full text-xs p-2 rounded border border-slate-200 bg-white" />
              </div>
              <div className="flex justify-end gap-1.5 pt-1">
                <button type="button" onClick={() => setIsAddingTransactionInline(false)} className="px-2.5 py-1 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-600">إلغاء</button>
                <button type="submit" className="px-2.5 py-1 text-[10px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold">رصد السند</button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {caseTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-white border border-dashed rounded-xl">لا يوجد مستندات مالية مضافة لهذا الملف حتى الآن.</div>
            ) : (
              caseTransactions.map(tx => (
                <div key={tx.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/45 flex items-center justify-between text-xs transition hover:bg-slate-50" id={`inline-tx-item-${tx.id}`}>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block">{tx.description}</span>
                    <span className="text-[10px] text-slate-400">{tx.date} - {tx.paymentMethod}</span>
                  </div>
                  <div className="text-start">
                    <span className={`font-mono font-bold ${tx.ioType.includes('وارد') ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.ioType.includes('وارد') ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج.م
                    </span>
                    <p className="text-[9px] text-slate-400">{tx.type}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Attachments */}
      <div className="pt-6 border-t border-slate-100">
        <AttachmentManager
          attachments={selectedCase.attachments || []}
          onAddAttachment={(newAttachments) => {
            onUpdateCase({ ...selectedCase, attachments: [...(selectedCase.attachments || []), ...newAttachments] });
          }}
          onRemoveAttachment={(id) => {
            onUpdateCase({ ...selectedCase, attachments: (selectedCase.attachments || []).filter(a => a.id !== id) });
          }}
          title="صور المستندات ومحاضر جلسات القضية"
        />
      </div>
    </div>
  );
});

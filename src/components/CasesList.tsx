/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CasesList.tsx — السجل الموحد للقضايا (v2.9.7).
 *
 * Refactored في يوليو 2026: تقسيم لـ sub-components في `./cases/`.
 * الـ main الآن يحتوي على: state + handlers + orchestration فقط.
 * الـ sub-components المسؤولة عن الـ rendering:
 *   - CaseStats        : banner إحصائيات سريع
 *   - CaseFilters      : search/type/status/litigation/view-mode
 *   - CaseCardGrid     : grid view (بطاقات)
 *   - CaseTable        : list/table view
 *   - CaseIconGrid     : icon views (3 أحجام)
 *   - CaseRowActions   : شريط الأزرار في البطاقة
 *   - CaseDrawer       : ملف الدعوى التفصيلي (الـ drawer الكبير)
 *   - ActionBtn        : زر الإجراء الموحد
 *
 * السلوك مطابق 100% للنسخة v2.9.6 (2211 سطر → 514 سطر في الـ main).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Scale, FileText, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Case, CaseType, ClientRole, Client, Session, Transaction, OfficeProfile, Opponent } from '../types';
import { getLitigationLevels } from '../utils/courtHelper';
import { printSingleCase, printCaseFileQR } from '../utils/printHelper';
import { exportCaseToWord } from '../utils/wordExportHelper';
import CaseDetailModal from './CaseDetailModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { CaseStats } from './cases/CaseStats';
import { CaseFilters, CaseViewMode } from './cases/CaseFilters';
import { CaseCardGrid, CaseCardCallbacks } from './cases/CaseCardGrid';
import { CaseTable } from './cases/CaseTable';
import { CaseIconGrid } from './cases/CaseIconGrid';
import { CaseDrawer } from './cases/CaseDrawer';
import { useCustomFields, CustomFieldsRenderer } from '../hooks/useCustomFields';

interface CasesListProps {
  cases: Case[];
  clients: Client[];
  opponents: Opponent[];
  sessions: Session[];
  transactions: Transaction[];
  onAddCase: (newCase: Case) => void;
  onUpdateCase: (updatedCase: Case) => void;
  onDeleteCase: (id: string) => void;
  onAddSessionFromCase: (session: Session) => void;
  onUpdateSessionFromCase?: (session: Session) => void;
  onDeleteSessionFromCase?: (id: string) => void;
  onAddTransactionFromCase: (transaction: Transaction) => void;
  selectedCaseIdFromDashboard: string | null;
  clearDashboardCaseSelection: () => void;
  onArchiveCase?: (id: string) => void;
  officeProfile: OfficeProfile;
}

const CasesList = React.memo(function CasesList({
  cases, clients, opponents, sessions, transactions,
  onAddCase, onUpdateCase, onDeleteCase, onAddSessionFromCase,
  onUpdateSessionFromCase, onDeleteSessionFromCase, onAddTransactionFromCase,
  selectedCaseIdFromDashboard, clearDashboardCaseSelection, onArchiveCase,
  officeProfile,
}: CasesListProps) {
  const confirm = useConfirm();
  const drawerRef = useRef<HTMLDivElement>(null);
  const caseCustomFields = useCustomFields('case');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedLitigation, setSelectedLitigation] = useState<string>('all');
  const [litigationLevels, setLitigationLevels] = useState<string[]>(() => getLitigationLevels());
  const [viewMode, setViewMode] = useState<CaseViewMode>('grid');

  // Drawer + modal state
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(selectedCaseIdFromDashboard);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null);
  const [isEditingCase, setIsEditingCase] = useState<Case | null>(null);

  // Add form state
  const [formData, setFormData] = useState({
    caseNumber: '',
    year: '',
    court: '',
    circuit: '',
    type: CaseType.CIVIL,
    litigationLevel: getLitigationLevels()[0] || 'ابتدائي (جزئي/كلي)',
    clientId: '',
    clientRole: ClientRole.PLAINTIFF,
    opponentName: '',
    opponentId: '',
    opponentLawyer: '',
    claimSubject: '',
    totalFees: 0,
    paidFees: 0,
    notes: '',
    createdAt: new Date().toISOString().split('T')[0],
    fileNumber: '',
  });
  const [opponentIsFreeText, setOpponentIsFreeText] = useState(false);
  const [editOpponentIsFreeText, setEditOpponentIsFreeText] = useState(false);

  // Sync litigation levels event
  useEffect(() => {
    const handleLevelsChanged = () => setLitigationLevels(getLitigationLevels());
    window.addEventListener('litigation-levels-changed', handleLevelsChanged);
    return () => window.removeEventListener('litigation-levels-changed', handleLevelsChanged);
  }, []);

  // Sync selected case from dashboard
  React.useEffect(() => {
    if (selectedCaseIdFromDashboard) {
      setSelectedCaseId(selectedCaseIdFromDashboard);
      clearDashboardCaseSelection();
      requestAnimationFrame(() => drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [selectedCaseIdFromDashboard]);

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  useEffect(() => {
    if (selectedCase) {
      requestAnimationFrame(() => drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [selectedCase]);

  useEffect(() => {
    if (isEditingCase) {
      setEditOpponentIsFreeText(!isEditingCase.opponentId);
    }
  }, [isEditingCase]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return cases.filter(c => {
      if (c.isArchived === true) return false;
      const matchesSearch = !searchQuery || (
        c.clientName.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q) ||
        c.court.toLowerCase().includes(q) ||
        c.opponentName.toLowerCase().includes(q) ||
        (c.claimSubject && c.claimSubject.toLowerCase().includes(q)) ||
        (c.fileNumber && c.fileNumber.includes(searchQuery))
      );
      const matchesType = selectedType === 'all' || c.type === selectedType;
      const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
      const matchesLitigation = selectedLitigation === 'all' || c.litigationLevel === selectedLitigation;
      return matchesSearch && matchesType && matchesStatus && matchesLitigation;
    });
  }, [cases, searchQuery, selectedType, selectedStatus, selectedLitigation]);

  // QR printing
  const handlePrintQR = useCallback(async (c: Case) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <QRCodeSVG value={c.qrData || JSON.stringify({ id: c.id, num: c.caseNumber, file: c.fileNumber })} size={200} level="M" />
    );
    await new Promise(r => setTimeout(r, 30));
    const svg = container.querySelector('svg')?.outerHTML || '';
    root.unmount();
    document.body.removeChild(container);
    printCaseFileQR(c, officeProfile, svg);
  }, [officeProfile]);

  // Card callbacks (memoized for stable identity)
  const cardCallbacks: CaseCardCallbacks = useMemo(() => ({
    onOpen: (c) => setSelectedCaseId(c.id),
    onViewFull: (c) => { setDetailCaseId(c.id); setIsDetailModalOpen(true); },
    onPrint: (c) => printSingleCase(c, sessions, transactions, officeProfile),
    onPrintQR: (c) => handlePrintQR(c),
    onEdit: (c) => setIsEditingCase(c),
    onExportWord: (c) => exportCaseToWord(c, sessions, transactions, officeProfile),
    onDelete: async (c, e) => {
      e.stopPropagation();
      if (await confirm(`حذف القضية [${c.caseNumber}]؟`)) {
        onDeleteCase(c.id);
        if (selectedCaseId === c.id) setSelectedCaseId(null);
      }
    },
    onArchive: onArchiveCase ? async (c, e) => {
      e.stopPropagation();
      if (await confirm(`أرشفة القضية [${c.caseNumber}]؟`)) onArchiveCase(c.id);
    } : undefined,
  }), [sessions, transactions, officeProfile, selectedCaseId, confirm, handlePrintQR, onDeleteCase, onArchiveCase]);

  // Add form reset + submit
  const resetForm = () => {
    setFormData({
      caseNumber: '', year: '', court: '', circuit: '',
      type: CaseType.CIVIL,
      litigationLevel: litigationLevels[0] || 'ابتدائي (جزئي/كلي)',
      clientId: clients[0]?.id || '',
      clientRole: ClientRole.PLAINTIFF,
      opponentName: '', opponentId: '', opponentLawyer: '',
      claimSubject: '', totalFees: 0, paidFees: 0, notes: '',
      createdAt: new Date().toISOString().split('T')[0],
      fileNumber: '',
    });
    setOpponentIsFreeText(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseNumber || !formData.clientId || !formData.court) {
      await showAlert('الرجاء تعبئة الحقول الأساسية: رقم القضية، الموكل، والمحكمة');
      return;
    }
    const selectedClient = clients.find(cl => cl.id === formData.clientId);
    const newCase: Case = {
      id: 'case_' + Date.now(),
      caseNumber: formData.caseNumber,
      year: formData.year || '٢٠٢٦',
      court: formData.court,
      circuit: formData.circuit || 'غير محددة',
      type: formData.type,
      litigationLevel: formData.litigationLevel,
      clientId: formData.clientId,
      clientName: selectedClient ? selectedClient.name : 'عميل غير مسجل',
      clientRole: formData.clientRole,
      opponentName: formData.opponentName || 'غير مسجل',
      opponentId: formData.opponentId || undefined,
      opponentLawyer: formData.opponentLawyer,
      status: 'متداولة' as any,
      claimSubject: formData.claimSubject,
      totalFees: Number(formData.totalFees),
      paidFees: Number(formData.paidFees),
      notes: formData.notes,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileNumber: formData.fileNumber || undefined,
    };
    onAddCase(newCase);
    setIsAddingCase(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingCase) return;
    const form = e.target as HTMLFormElement;
    const totalFeesInput = form.elements.namedItem('totalFees') as HTMLInputElement;
    const paidFeesInput = form.elements.namedItem('paidFees') as HTMLInputElement;
    const selectedClient = clients.find(cl => cl.id === isEditingCase.clientId);
    const updated: Case = {
      ...isEditingCase,
      totalFees: totalFeesInput ? Number(totalFeesInput.value) || 0 : isEditingCase.totalFees,
      paidFees: paidFeesInput ? Number(paidFeesInput.value) || 0 : isEditingCase.paidFees,
      clientName: selectedClient ? selectedClient.name : isEditingCase.clientName,
      updatedAt: new Date().toISOString(),
    };
    onUpdateCase(updated);
    if (selectedCaseId === updated.id) setSelectedCaseId(updated.id);
    setIsEditingCase(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">مكتب المحامي الرقمي المحترف</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />سجل القضايا العام
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Scale className="h-6 w-6 text-indigo-500 font-normal" />السجل الموحد للملفات والقضايا
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              إدارة تفصيلية لدعاوى المحاكم وعقائد الترافع وتتبع مستحقات الأتعاب والدرجات ومتابعة سير الدعاوى خطوة بخطوة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto z-10">
            <button
              onClick={() => { resetForm(); setIsAddingCase(true); }}
              className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md rounded-2xl px-4 py-3 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
              id="btn-add-case-panel"
            >
              <Plus className="h-4 w-4" />تسجيل ملف دعوى جديدة
            </button>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <CaseStats cases={cases} />

      {/* FILTERS */}
      <CaseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedLitigation={selectedLitigation}
        onLitigationChange={setSelectedLitigation}
        litigationLevels={litigationLevels}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filteredCount={filteredCases.length}
      />

      {/* DISPLAY */}
      {viewMode === 'grid' && (
        <CaseCardGrid
          cases={filteredCases}
          selectedCaseId={selectedCaseId}
          searchQuery={searchQuery}
          callbacks={cardCallbacks}
        />
      )}
      {viewMode === 'list' && (
        <CaseTable
          cases={filteredCases}
          searchQuery={searchQuery}
          callbacks={cardCallbacks}
        />
      )}
      {(viewMode === 'large-icon' || viewMode === 'medium-icon' || viewMode === 'small-icon') && (
        <CaseIconGrid
          cases={filteredCases}
          viewMode={viewMode}
          selectedCaseId={selectedCaseId}
          onSelect={(c) => setSelectedCaseId(c.id)}
        />
      )}

      {/* DETAILED DRAWER (case file) */}
      {selectedCase && (
        <CaseDrawer
          ref={drawerRef}
          selectedCase={selectedCase}
          sessions={sessions}
          transactions={transactions}
          officeProfile={officeProfile}
          confirm={confirm}
          onUpdateCase={onUpdateCase}
          onDeleteCase={onDeleteCase}
          onAddSessionFromCase={onAddSessionFromCase}
          onUpdateSessionFromCase={onUpdateSessionFromCase}
          onDeleteSessionFromCase={onDeleteSessionFromCase}
          onAddTransactionFromCase={onAddTransactionFromCase}
          onClose={() => setSelectedCaseId(null)}
          onEdit={setIsEditingCase}
        />
      )}

      {/* MODAL: ADD CASE */}
      {isAddingCase && (
        <CaseAddModal
          formData={formData}
          setFormData={setFormData}
          clients={clients}
          opponents={opponents}
          litigationLevels={litigationLevels}
          opponentIsFreeText={opponentIsFreeText}
          setOpponentIsFreeText={setOpponentIsFreeText}
          onClose={() => setIsAddingCase(false)}
          onSubmit={handleAddSubmit}
          customFields={caseCustomFields}
        />
      )}

      {/* MODAL: EDIT CASE */}
      {isEditingCase && (
        <CaseEditModal
          editingCase={isEditingCase}
          setEditingCase={setIsEditingCase}
          clients={clients}
          opponents={opponents}
          litigationLevels={litigationLevels}
          editOpponentIsFreeText={editOpponentIsFreeText}
          setEditOpponentIsFreeText={setEditOpponentIsFreeText}
          onClose={() => setIsEditingCase(null)}
          onSubmit={handleEditSubmit}
          customFields={caseCustomFields}
        />
      )}

      {/* MODAL: CASE DETAIL (full-screen professional) */}
      <CaseDetailModal
        open={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setDetailCaseId(null); }}
        caseData={cases.find(c => c.id === detailCaseId) || null}
        client={detailCaseId ? clients.find(cl => cl.id === cases.find(c => c.id === detailCaseId)?.clientId) || null : null}
        sessions={sessions}
        transactions={transactions}
        officeProfile={officeProfile}
        onEdit={() => {
          const c = cases.find(c => c.id === detailCaseId);
          if (c) { setIsDetailModalOpen(false); setIsEditingCase(c); }
        }}
        onPrint={() => {
          const c = cases.find(c => c.id === detailCaseId);
          if (c) printSingleCase(c, sessions, transactions, officeProfile);
        }}
      />
    </div>
  );
});

/* ────────────────────────────────────────────────────────────────────────── */
/*  Internal modals: simplified to keep the main file focused                */
/* ────────────────────────────────────────────────────────────────────────── */

interface CaseAddModalProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  clients: Client[];
  opponents: Opponent[];
  litigationLevels: string[];
  opponentIsFreeText: boolean;
  setOpponentIsFreeText: (b: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  customFields: ReturnType<typeof useCustomFields>;
}

const CaseAddModal = React.memo(function CaseAddModal({
  formData, setFormData, clients, opponents, litigationLevels, opponentIsFreeText, setOpponentIsFreeText, onClose, onSubmit, customFields,
}: CaseAddModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border-b-4 border-indigo-600 rounded-2xl p-8 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-5" id="add-case-modal">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <Scale className="h-5 w-5 text-indigo-600" />
            تسجيل ملف دعوى جديدة
          </h2>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition">
            <FileText className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-5 text-xs md:text-sm">
          {/* ── قسم 1: بيانات القضية الأساسية ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">بيانات القضية</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم القضية *</label>
                <input type="text" required placeholder="مثال: ١٤٢٥ لسنة ٢٠٢٤" value={formData.caseNumber} onChange={e => setFormData({ ...formData, caseNumber: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" id="input-add-case-number" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">السنة القضائية</label>
                <input type="text" placeholder="مثال: ٢٠٢٦" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">المحكمة *</label>
                <input type="text" required placeholder="مثال: محكمة جنوب القاهرة الكلية" value={formData.court} onChange={e => setFormData({ ...formData, court: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" id="input-add-case-court" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الدائرة القضائية</label>
                <input type="text" placeholder="مثال: الدائرة الأولى مدنية" value={formData.circuit} onChange={e => setFormData({ ...formData, circuit: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الملف الورقي</label>
                <input type="text" placeholder="مثال: ف/1234" value={formData.fileNumber} onChange={e => setFormData({ ...formData, fileNumber: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">نوع المحاكمة</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  <option value={CaseType.CIVIL}>مدني</option>
                  <option value={CaseType.CRIMINAL}>جنائي</option>
                  <option value={CaseType.PERSONAL_STATUS}>أسرة</option>
                  <option value={CaseType.ADMINISTRATIVE}>إداري</option>
                  <option value={CaseType.COMMERCIAL}>تجاري</option>
                  <option value={CaseType.LABOR}>عمالي</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">درجة التقاضي</label>
                <select value={formData.litigationLevel} onChange={e => setFormData({ ...formData, litigationLevel: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-bold text-slate-800">
                  {litigationLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── قسم 2: طرفان القضية ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">الطرفان</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">الموكل *</label>
                <select required value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  <option value="">-- اختر من دليل العملاء --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">صفة الموكل</label>
                <select value={formData.clientRole} onChange={e => setFormData({ ...formData, clientRole: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  <option value={ClientRole.PLAINTIFF}>مدعي / طالب</option>
                  <option value={ClientRole.DEFENDANT}>مدعى عليه / مطلوب</option>
                  <option value={ClientRole.ACCUSED}>متهم</option>
                  <option value={ClientRole.VICTIM}>مجني عليه</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الخصم</label>
                {opponentIsFreeText ? (
                  <div className="flex gap-2">
                    <input type="text" placeholder="اسم الخصم" value={formData.opponentName} onChange={e => setFormData({ ...formData, opponentName: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
                    <button type="button" onClick={() => setOpponentIsFreeText(false)} className="text-xs text-indigo-600 whitespace-nowrap px-2">من القائمة</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={formData.opponentId} onChange={e => { const op = opponents.find(o => o.id === e.target.value); setFormData({ ...formData, opponentId: e.target.value, opponentName: op ? op.fullName : '' }); }} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                      <option value="">-- اختر الخصم --</option>
                      {opponents.filter(o => !o.isArchived).map(o => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                    </select>
                    <button type="button" onClick={() => setOpponentIsFreeText(true)} className="text-xs text-indigo-600 whitespace-nowrap px-2">حرفي</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">محامي الخصم</label>
                <input type="text" placeholder="اسم محامي الخصم" value={formData.opponentLawyer} onChange={e => setFormData({ ...formData, opponentLawyer: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
            </div>
          </fieldset>

          {/* ── قسم 3: موضوع الدعوى والأتعاب ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">موضوع الدعوى والأتعاب</legend>
            <div>
              <label className="block text-slate-600 font-bold mb-1">موضوع الدعوى</label>
              <textarea value={formData.claimSubject} onChange={e => setFormData({ ...formData, claimSubject: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white h-20" placeholder="وصف مختصر لموضوع الدعوى..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">إجمالي الأتعاب (ج.م)</label>
                <input type="number" min="0" value={formData.totalFees} onChange={e => setFormData({ ...formData, totalFees: Number(e.target.value) })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المسدد حالياً (ج.م)</label>
                <input type="number" min="0" value={formData.paidFees} onChange={e => setFormData({ ...formData, paidFees: Number(e.target.value) })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono" />
              </div>
            </div>
          </fieldset>

          {/* ── قسم 4: ملاحظات ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">ملاحظات</legend>
            <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white h-16" placeholder="ملاحظات داخلية على القضية (اختياري)..." />
          </fieldset>

          {customFields.fields.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
              <CustomFieldsRenderer
                fields={customFields.fields}
                values={formData.customFieldValues || {}}
                onChange={(fieldId, val) => setFormData(prev => ({ ...prev, customFieldValues: customFields.setFieldValue(fieldId, val, prev.customFieldValues || {}) }))}
              />
            </fieldset>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition">إلغاء</button>
            <button type="submit" className="bg-slate-900 border border-indigo-500/25 text-indigo-400 hover:bg-slate-800 px-7 py-2.5 rounded-xl font-bold transition shadow-md" id="submit-new-case-btn">رسم الدعوى</button>
          </div>
        </form>
      </div>
    </div>
  );
});

interface CaseEditModalProps {
  editingCase: Case;
  setEditingCase: (c: Case | null) => void;
  clients: Client[];
  opponents: Opponent[];
  litigationLevels: string[];
  editOpponentIsFreeText: boolean;
  setEditOpponentIsFreeText: (b: boolean) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  customFields: ReturnType<typeof useCustomFields>;
}

const CaseEditModal = React.memo(function CaseEditModal({
  editingCase, setEditingCase, clients, opponents, litigationLevels, editOpponentIsFreeText, setEditOpponentIsFreeText, onClose, onSubmit, customFields,
}: CaseEditModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border-b-4 border-indigo-600 rounded-2xl p-8 shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto space-y-5" id="edit-case-modal">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <FileText className="h-5 w-5 text-indigo-600" />
            تعديل قضية {editingCase.caseNumber}
          </h2>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full text-slate-400 hover:text-slate-600 transition">
            <FileText className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-5 text-xs md:text-sm">
          {/* ── قسم 1: بيانات القضية الأساسية ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">بيانات القضية</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم القضية *</label>
                <input type="text" value={editingCase.caseNumber} onChange={e => setEditingCase({ ...editingCase, caseNumber: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" id="input-edit-case-number" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">السنة القضائية</label>
                <input type="text" value={editingCase.year || ''} onChange={e => setEditingCase({ ...editingCase, year: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 font-bold mb-1">المحكمة *</label>
                <input type="text" value={editingCase.court} onChange={e => setEditingCase({ ...editingCase, court: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" id="input-edit-case-court" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الدائرة القضائية</label>
                <input type="text" value={editingCase.circuit || ''} onChange={e => setEditingCase({ ...editingCase, circuit: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">رقم الملف الورقي</label>
                <input type="text" value={editingCase.fileNumber || ''} onChange={e => setEditingCase({ ...editingCase, fileNumber: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">نوع المحاكمة</label>
                <select value={editingCase.type} onChange={e => setEditingCase({ ...editingCase, type: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  <option value={CaseType.CIVIL}>مدني</option>
                  <option value={CaseType.CRIMINAL}>جنائي</option>
                  <option value={CaseType.PERSONAL_STATUS}>أسرة</option>
                  <option value={CaseType.ADMINISTRATIVE}>إداري</option>
                  <option value={CaseType.COMMERCIAL}>تجاري</option>
                  <option value={CaseType.LABOR}>عمالي</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">درجة التقاضي</label>
                <select value={editingCase.litigationLevel} onChange={e => setEditingCase({ ...editingCase, litigationLevel: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-bold text-slate-800">
                  {litigationLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الحالة</label>
                <select value={editingCase.status} onChange={e => setEditingCase({ ...editingCase, status: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white font-bold">
                  <option value="متداولة">متداولة</option>
                  <option value="محجوزة للحكم">محجوزة للحكم</option>
                  <option value="مشطوبة">مشطوبة</option>
                  <option value="منتهية ومحفوظة">منتهية ومحفوظة</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* ── قسم 2: طرفان القضية ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">الطرفان</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">الموكل *</label>
                <select value={editingCase.clientId} onChange={e => setEditingCase({ ...editingCase, clientId: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">صفة الموكل</label>
                <select value={editingCase.clientRole || ClientRole.PLAINTIFF} onChange={e => setEditingCase({ ...editingCase, clientRole: e.target.value as any })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                  <option value={ClientRole.PLAINTIFF}>مدعي / طالب</option>
                  <option value={ClientRole.DEFENDANT}>مدعى عليه / مطلوب</option>
                  <option value={ClientRole.ACCUSED}>متهم</option>
                  <option value={ClientRole.VICTIM}>مجني عليه</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">الخصم</label>
                {editOpponentIsFreeText ? (
                  <div className="flex gap-2">
                    <input type="text" value={editingCase.opponentName || ''} onChange={e => setEditingCase({ ...editingCase, opponentName: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
                    <button type="button" onClick={() => setEditOpponentIsFreeText(false)} className="text-xs text-indigo-600 whitespace-nowrap px-2">من القائمة</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select value={editingCase.opponentId || ''} onChange={e => { const op = opponents.find(o => o.id === e.target.value); setEditingCase({ ...editingCase, opponentId: e.target.value, opponentName: op ? op.fullName : '' }); }} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white">
                      <option value="">-- اختر الخصم --</option>
                      {opponents.filter(o => !o.isArchived).map(o => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                    </select>
                    <button type="button" onClick={() => setEditOpponentIsFreeText(true)} className="text-xs text-indigo-600 whitespace-nowrap px-2">حرفي</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">محامي الخصم</label>
                <input type="text" value={editingCase.opponentLawyer || ''} onChange={e => setEditingCase({ ...editingCase, opponentLawyer: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white" />
              </div>
            </div>
          </fieldset>

          {/* ── قسم 3: موضوع الدعوى والأتعاب ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">موضوع الدعوى والأتعاب</legend>
            <div>
              <label className="block text-slate-600 font-bold mb-1">موضوع الدعوى</label>
              <textarea value={editingCase.claimSubject || ''} onChange={e => setEditingCase({ ...editingCase, claimSubject: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white h-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold mb-1">إجمالي الأتعاب (ج.م)</label>
                <input type="text" inputMode="numeric" name="totalFees" defaultValue={editingCase.totalFees} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono" />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">المسدد (ج.م)</label>
                <input type="text" inputMode="numeric" name="paidFees" defaultValue={editingCase.paidFees} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono" />
              </div>
            </div>
          </fieldset>

          {/* ── قسم 4: ملاحظات ── */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">ملاحظات</legend>
            <textarea value={editingCase.notes || ''} onChange={e => setEditingCase({ ...editingCase, notes: e.target.value })} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-indigo-600 focus:bg-white h-16" placeholder="ملاحظات داخلية على القضية..." />
          </fieldset>

          {customFields.fields.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
              <CustomFieldsRenderer
                fields={customFields.fields}
                values={editingCase.customFieldValues || {}}
                onChange={(fieldId, val) => setEditingCase({ ...editingCase, customFieldValues: customFields.setFieldValue(fieldId, val, editingCase.customFieldValues || {}) })}
              />
            </fieldset>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition">إلغاء</button>
            <button type="submit" formNoValidate className="bg-slate-900 border border-indigo-500/25 text-indigo-400 hover:bg-slate-800 px-7 py-2.5 rounded-xl font-bold transition" id="submit-edit-case-btn">حفظ التغييرات</button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default CasesList;

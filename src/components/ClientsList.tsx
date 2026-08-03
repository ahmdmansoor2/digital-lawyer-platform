/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Users,
  Plus,
  Phone,
  MapPin,
  Mail,
  CreditCard,
  FileText,
  Trash2,
  Edit,
  ChevronLeft,
  AlertCircle,
  Briefcase,
  X,
  ShieldCheck,
  Archive,
  Printer,
  Eye,
  Download,
  QrCode,
  Maximize2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  Save,
  ArrowUpRight,
  ArrowDownLeft,
  Edit3,
  PlusCircle,
  Banknote,
  Gavel,
  FilePlus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Client, PowerOfAttorney, Case, OfficeProfile, LawDocument, Transaction, Session, CaseStatus } from '../types';
import { printSingleClient, printSingleDocument, printClientFileQR } from '../utils/printHelper';
import { exportClientToWord } from '../utils/wordExportHelper';
import { sendWhatsAppMessage, getGeneralUpdateText } from '../utils/whatsappHelper';
import { MessageSquare } from 'lucide-react';
import AttachmentManager from './AttachmentManager';
import ClientDetailModal from './ClientDetailModal';
import { findMatchSnippet } from '../utils/searchHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { ActionBtn, ActionBtnSmall } from './clients/ClientsListShared';
import AddEditClientModal from './clients/AddEditClientModal';
import { useCustomFields } from '../hooks/useCustomFields';
import ClientFilters, { type ClientViewMode } from './clients/ClientFilters';
import ClientHeader from './clients/ClientHeader';

interface ClientsListProps {
  clients: Client[];
  cases: Case[];
  documents?: LawDocument[];
  onAddDocument?: (newDoc: LawDocument) => void;
  onDeleteDocument?: (id: string) => void;
  onUpdateDocument?: (updatedDoc: LawDocument) => void;
  // ─── المعاملات المالية ───
  transactions?: Transaction[];
  onAddTransaction?: (t: Transaction) => void;
  onUpdateTransaction?: (t: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  // ─── الجلسات ───
  sessions?: Session[];
  onAddSession?: (s: Session) => void;
  onUpdateSession?: (s: Session) => void;
  onDeleteSession?: (id: string) => void;
  // ─── باقي الخصائص ───
  onAddClient: (newClient: Client) => void;
  onUpdateClient: (updatedClient: Client) => void;
  onDeleteClient: (id: string) => void;
  onAddPoaFromClient: (clientId: string, poa: PowerOfAttorney) => void;
  onSelectCase: (caseId: string) => void;
  onNavigateToCases: () => void;
  onArchiveClient?: (id: string) => void;
  officeProfile: OfficeProfile;
}

const ClientsList = React.memo(function ClientsList({
  clients,
  cases,
  documents = [],
  onAddDocument,
  onDeleteDocument,
  onUpdateDocument,
  transactions = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  sessions = [],
  onAddSession,
  onUpdateSession,
  onDeleteSession,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddPoaFromClient,
  onSelectCase,
  onNavigateToCases,
  onArchiveClient,
  officeProfile
}: ClientsListProps) {
  const confirm = useConfirm();
  const clientCustomFields = useCustomFields('client');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isClientDetailModalOpen, setIsClientDetailModalOpen] = useState(false);
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState<Client | null>(null);

  // Law Document Addition states for Client page
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<LawDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<LawDocument | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'large-icon' | 'medium-icon' | 'small-icon'>('grid');
  const [selectedDocFiles, setSelectedDocFiles] = useState<File[]>([]);
  const [newDocForm, setNewDocForm] = useState({
    name: '',
    type: 'أخرى' as LawDocument['type'],
    caseId: '',
    fileName: '',
    fileSize: '',
    notes: ''
  });

  // ─── حالة المدفوعات ──────────────────────────────────────────────────
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [txForm, setTxForm] = useState<Omit<Transaction, 'id'>>({ 
    caseId: '', caseNumber: '', clientName: '', type: 'أتعاب',
    ioType: 'وارد (income)', amount: 0, date: new Date().toISOString().split('T')[0],
    description: '', paymentMethod: 'نقدي'
  });

  // ─── حالة الجلسات ──────────────────────────────────────────────────
  const [showAddSession, setShowAddSession] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState<Omit<Session, 'id'>>({ 
    caseId: '', caseNumber: '', clientName: '',
    date: new Date().toISOString().split('T')[0], court: '', circuit: '',
    objective: '', decision: '', status: 'قادمة', judgeName: '', notes: '', time: ''
  });

  // ─── Client form state مستخرَج في AddEditClientModal (v2.9.2) ───────────
  // Inline Poa Form State inside Client Details Drawer
  const [isAddingPoaInline, setIsAddingPoaInline] = useState(false);
  const [poaForm, setPoaForm] = useState({
    poaNumber: '',
    office: '',
    type: 'عام قضايا' as 'عام قضايا' | 'خاص قضايا' | 'توكيل شامل',
    date: '2026-06-21'
  });

  const selectedClient = clients.find(cl => cl.id === selectedClientId);

  useEffect(() => {
    if (selectedClient && !fullScreen) {
      // Small delay to let React render the panel before scrolling
      requestAnimationFrame(() => {
        drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [selectedClient, fullScreen]);

  // Filter clients
  const filteredClients = clients.filter(cl => {
    if (cl.isArchived === true) return false;

    const query = searchQuery.toLowerCase();
    return (
      cl.name.toLowerCase().includes(query) ||
      cl.phone.includes(query) ||
      cl.nationalId.includes(query) ||
      cl.address.toLowerCase().includes(query) ||
      (cl.fileNumber && cl.fileNumber.includes(query))
    );
  });

  // Helper render functions for view modes
  const emptyMsg = () => 'لا يوجد موكلين يطابقون مسارات البحث والتدوين.';
  const renderEmpty = (isEmpty: boolean) => isEmpty ? (
    <div className="col-span-full bg-white border border-slate-200 py-12 px-6 rounded-2xl text-center text-slate-400">
      <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
      <p className="text-sm font-bold text-slate-500">{emptyMsg()}</p>
    </div>
  ) : null;

  // ActionBtn + ActionBtnSmall extracted to ./clients/ClientsListShared.tsx (v2.9.1)
  // Add/Edit modal + form state + submit handlers extracted to ./clients/AddEditClientModal.tsx (v2.9.2)

  // Generate QR SVG string dynamically for printing
  const handlePrintQR = useCallback(async (client: Client) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(
      <QRCodeSVG
        value={client.qrData || JSON.stringify({ id: client.id, name: client.name, file: client.fileNumber })}
        size={200}
        level="M"
      />
    );
    await new Promise(r => setTimeout(r, 30));
    const svg = container.querySelector('svg')?.outerHTML || '';
    root.unmount();
    container.remove();
    printClientFileQR(client, officeProfile, svg);
  }, [officeProfile]);

  // Add Poa inline
  const handleAddPoaInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;

    if (!poaForm.poaNumber || !poaForm.office) {
      await showAlert('الرجاء تدوين رقم التوكيل ومكتب التوثيق الصادر منه');
      return;
    }

    const newPoa: PowerOfAttorney = {
      id: 'poa_' + Date.now(),
      poaNumber: poaForm.poaNumber,
      office: poaForm.office,
      type: poaForm.type,
      date: poaForm.date
    };

    onAddPoaFromClient(selectedClientId, newPoa);
    setIsAddingPoaInline(false);
    setPoaForm({
      poaNumber: '',
      office: '',
      type: 'عام قضايا',
      date: '2026-06-21'
    });
  };

  const drawerBody = selectedClient ? (
    <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Box 1: Core Client metadata */}
              <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-100 lg:col-span-1 text-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  المستندات الدالة وبيانات التواصل
                </h3>

                <div className="space-y-3 font-medium text-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">الهاتف:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-mono flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {selectedClient.phone}
                      </strong>
                      <button
                        onClick={() => {
                          const msg = getGeneralUpdateText(selectedClient.name);
                          sendWhatsAppMessage(selectedClient.phone, msg);
                        }}
                        className="p-1 hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600 rounded-md transition duration-150 flex items-center gap-1 text-[11px] font-bold border border-emerald-100 bg-emerald-50/30 cursor-pointer"
                        title="مراسلة عبر واتساب"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-500" />
                        واتساب
                      </button>
                    </div>
                  </div>
                  {selectedClient.fileNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">رقم الملف:</span>
                      <strong className="text-indigo-700 font-mono font-bold">#{selectedClient.fileNumber}</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">الرقم القومي المصري:</span>
                    <strong className="text-slate-900 font-mono">{selectedClient.nationalId || 'غير مسجل'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">البريد الإلكتروني:</span>
                    <strong className="text-slate-900 font-mono flex items-center gap-1">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {selectedClient.email || 'لا يوجد بريد مسجل'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">محل الإقامة المختار:</span>
                    <strong className="text-slate-900 flex items-center gap-1 text-start">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {selectedClient.address}
                    </strong>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-1">توصيات وملاحظات الموكل المتراكمة:</h4>
                    <p className="bg-white p-3 rounded-lg border border-slate-100 text-slate-500 italic leading-relaxed">
                      {selectedClient.notes}
                    </p>
                  </div>
                )}

                {/* QR Code */}
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                    <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                    رمز الاستجابة السريع (QR) للملف
                  </h4>
                  <div className="flex justify-center bg-white p-3 rounded-xl border border-slate-100">
                    <QRCodeSVG 
                      value={selectedClient.qrData || JSON.stringify({ id: selectedClient.id, name: selectedClient.name, file: selectedClient.fileNumber })}
                      size={100}
                      level="M"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 text-center mt-1">يمكن مسح الكود للوصول السريع لملف الموكل</p>
                </div>
              </div>

              {/* Box 2: list of Power of Attorneys (التوكيلات الرسمية المودعة) */}
              <div className="space-y-4 lg:col-span-1 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    التوكيلات الرسمية الصادرة للغرفة
                  </h3>
                  
                  {!isAddingPoaInline && (
                    <button
                      onClick={() => setIsAddingPoaInline(true)}
                      className="text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                      id="btn-add-inline-poa"
                    >
                      <Plus className="h-3 w-3" />
                      إيداع توكيل
                    </button>
                  )}
                </div>

                {/* Inline Poa insertion box */}
                  {isAddingPoaInline && (
                    <div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <form onSubmit={handleAddPoaInlineSubmit} noValidate className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/50 space-y-3">
                        <h4 className="text-xs font-bold text-indigo-950">إيداع توكيل رسمي جديد</h4>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">رقم التوكيل الرسمي</label>
                            <input 
                              type="text" 
                              placeholder="مثال: ١٤٥٢ أ"
                              value={poaForm.poaNumber}
                              onChange={e => setPoaForm({...poaForm, poaNumber: e.target.value})}
                              className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">مكتب التوثيق الصادر منه</label>
                            <input 
                              type="text" 
                              placeholder="مثال: توثيق المنتزه"
                              value={poaForm.office}
                              onChange={e => setPoaForm({...poaForm, office: e.target.value})}
                              className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">نوع التوكيل</label>
                            <select
                              value={poaForm.type}
                              onChange={e => setPoaForm({...poaForm, type: e.target.value as any})}
                              className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white"
                            >
                              <option value="عام قضايا">عام قضايا رسمي</option>
                              <option value="خاص قضايا">خاص قضايا مخصص</option>
                              <option value="توكيل شامل">توكيل شامل للتصرف</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">تاريخ تحرير التوكيل</label>
                            <input 
                              type="date"
                              value={poaForm.date}
                              onChange={e => setPoaForm({...poaForm, date: e.target.value})}
                              className="w-full text-xs p-1.5 rounded border border-slate-200 bg-white" 
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <button 
                            type="button" 
                            onClick={() => setIsAddingPoaInline(false)}
                            className="px-2.5 py-1 text-[10px] rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
                          >
                            إلغاء
                          </button>
                          <button 
                            type="submit" 
                            className="px-2.5 py-1 text-[10px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          >
                            تأكيد وحفظ التوكيل
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                {/* Show existing client's poas */}
                <div className="space-y-2">
                  {selectedClient.poas.length === 0 ? (
                    <div className="text-center py-6 text-[11px] text-slate-400 bg-red-50/10 border border-slate-200/50 border-dashed rounded-xl">
                      يرجى الانتباه! لا توجد توكيلات رسمية مسجلة لهذا الموكل حتى الآن بمكتبنا.
                    </div>
                  ) : (
                    selectedClient.poas.map((poa) => (
                      <div 
                        key={poa.id}
                        className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-start gap-2.5"
                        id={`poa-item-${poa.id}`}
                      >
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                          <FileText className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="space-y-0.5 flex-grow">
                          <div className="flex items-center justify-between">
                            <span className="font-bold underline text-slate-900">توكيل: {poa.poaNumber}</span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{poa.type}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">مكتب التوثيق: {poa.office}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">صادر بتاريخ: {poa.date}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box 3: Associated case folders (ملفات القضايا التابعة للعميل) */}
              <div className="space-y-4 lg:col-span-1 text-xs">
                <h3 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-slate-600" />
                  الملفات القضائية المسجلة وموقفها
                </h3>

                <div className="space-y-2.5">
                  {cases.filter(c => c.clientId === selectedClient.id).length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-white border border-dashed rounded-xl">
                      <p>لا توجد قضايا مضافة باسم الموكل بعد.</p>
                      <button 
                        onClick={onNavigateToCases}
                        className="text-xs text-indigo-700 underline font-bold mt-1"
                      >
                        اضغط لفتح قضية جديدة له حالاً
                      </button>
                    </div>
                  ) : (
                    cases
                      .filter(c => c.clientId === selectedClient.id)
                      .map((c) => (
                        <div 
                          key={c.id}
                          className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition cursor-pointer flex flex-col justify-between gap-1.5"
                          onClick={() => onSelectCase(c.id)}
                          id={`associated-case-box-${c.id}`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-indigo-800">رقم: {c.caseNumber}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              c.status === CaseStatus.ACTIVE ? 'bg-emerald-100 text-emerald-800' :
                              c.status === CaseStatus.PLEADING ? 'bg-indigo-100 text-indigo-800' :
                              'bg-slate-200 text-slate-800'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          
                          <p className="font-heavy text-slate-950 text-xs leading-snug line-clamp-1">{c.court}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">موضوع: {c.claimSubject}</p>
                          
                           <span className="text-[9px] text-start text-slate-400 block pt-0.5 border-t border-slate-200/50">
                            اضغط استعراض ملف الدعوى في لسان القضايا ←
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>

            {/* Attachments Section */}
            <div className="pt-6 border-t border-slate-100">
              <AttachmentManager 
                attachments={selectedClient.attachments || []}
                onAddAttachment={(newAttachments) => {
                  const updatedAttachments = [...(selectedClient.attachments || []), ...newAttachments];
                  onUpdateClient({
                    ...selectedClient,
                    attachments: updatedAttachments
                  });
                }}
                onRemoveAttachment={(id) => {
                  const updatedAttachments = (selectedClient.attachments || []).filter(a => a.id !== id);
                  onUpdateClient({
                    ...selectedClient,
                    attachments: updatedAttachments
                  });
                }}
                title="صور المستندات والأوراق الثبوتية الخاصة بالموكل"
              />
            </div>

            {/* Integrated Law Documents from Treasury */}
            <div className="pt-6 border-t border-slate-100 space-y-4" id="client-treasury-docs-wrapper">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">مستندات الخزينة المرتبطة بالموكل ({documents.filter(doc => doc.clientId === selectedClient.id || doc.clientName === selectedClient.name).length})</h4>
                    <p className="text-[10px] text-slate-500">الملفات والمستندات الرسمية المؤرشفة مباشرة في خزينة المكتب لهذا الموكل.</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingDoc ? 'إغلاق نافذة الإضافة' : 'إضافة مستند رسمي للخزينة'}</span>
                </button>
              </div>

              {/* Inline Doc Upload Form - Queue-based unlimited files */}
              {isAddingDoc && (
                <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5 space-y-3" id="client-doc-inline-form">
                  <h5 className="text-[11px] font-bold text-indigo-950">رفع وأرشفة مستندات رسمية للموكل — يمكنك اختيار ملفات متعددة دفعة واحدة أو بشكل متكرر</h5>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (selectedDocFiles.length === 0) {
                      await showAlert('يرجى اختيار ملف واحد على الأقل');
                      return;
                    }
                    const selectedCase = cases.find(c => c.id === newDocForm.caseId);
                    selectedDocFiles.forEach((f, idx) => {
                      const docName = selectedDocFiles.length === 1 && newDocForm.name
                        ? newDocForm.name
                        : f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
                      const newDoc: LawDocument = {
                        id: 'doc_' + (Date.now() + idx),
                        name: docName,
                        type: newDocForm.type,
                        fileName: f.name,
                        fileSize: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
                        caseId: selectedCase?.id || '',
                        caseNumber: selectedCase?.caseNumber || '',
                        clientId: selectedClient.id,
                        clientName: selectedClient.name,
                        uploadedAt: new Date().toISOString().split('T')[0],
                        notes: newDocForm.notes,
                        scannedTextByAI: `مستند رسمي للموكل ${selectedClient.name} بعنوان ${docName}.`
                      };
                      if (onAddDocument) onAddDocument(newDoc);
                    });
                    setNewDocForm({ name: '', type: 'أخرى', caseId: '', fileName: '', fileSize: '', notes: '' });
                    setSelectedDocFiles([]);
                    setIsAddingDoc(false);
                  }} className="space-y-3 text-xs">
                    
                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[10px]">اسم المستند (اختياري عند رفع ملف واحد)</label>
                        <input
                          type="text"
                          value={newDocForm.name}
                          onChange={e => setNewDocForm({...newDocForm, name: e.target.value})}
                          placeholder="يُعبأ تلقائياً من اسم الملف عند الاختيار"
                          className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[10px]">تصنيف وموضوع المستندات</label>
                        <select
                          value={newDocForm.type}
                          onChange={e => setNewDocForm({...newDocForm, type: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none font-medium text-[11px]"
                        >
                          <option value="عريضة دعوى">عريضة دعوى</option>
                          <option value="حكم قضائي">حكم قضائي</option>
                          <option value="مذكرة دفاع">مذكرة دفاع</option>
                          <option value="توكيل رسمي">توكيل رسمي</option>
                          <option value="تقرير خبراء">تقرير خبراء</option>
                          <option value="مستندات ملكية">مستندات ملكية</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[10px]">ربط بقضية معينة للموكل (اختياري)</label>
                        <select
                          value={newDocForm.caseId}
                          onChange={e => setNewDocForm({...newDocForm, caseId: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none font-medium text-[11px]"
                        >
                          <option value="">-- غير مرتبط بقضية --</option>
                          {cases.filter(c => c.clientId === selectedClient.id).map(c => (
                            <option key={c.id} value={c.id}>{c.caseNumber} - {c.court}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[10px]">ملاحظات وهامش (تُطبق على جميع الملفات)</label>
                        <input
                          type="text"
                          value={newDocForm.notes}
                          onChange={e => setNewDocForm({...newDocForm, notes: e.target.value})}
                          placeholder="أي ملاحظات إضافية..."
                          className="w-full bg-white border border-slate-200 rounded p-1.5 outline-none"
                        />
                      </div>
                    </div>

                    {/* File Dropzone & Queue */}
                    <div className="space-y-2">
                      <label
                        htmlFor="client-doc-file-input"
                        className="flex flex-col items-center justify-center gap-2 p-5 bg-white border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition group"
                      >
                        <span className="text-3xl group-hover:scale-110 transition-transform">ًں</span>
                        <div className="text-center">
                          <span className="text-[11px] font-bold text-indigo-700 block">
                            {selectedDocFiles.length === 0 ? 'انقر لاختيار الملفات أو اسحبها هنا' : '+ إضافة المزيد من الملفات للقائمة'}
                          </span>
                          <span className="text-[10px] text-slate-400">يمكنك اختيار ملفات متعددة معاً، وتكرار الضغط لإضافة المزيد بلا حدود</span>
                        </div>
                        <input
                          type="file"
                          id="client-doc-file-input"
                          className="hidden"
                          multiple
                          onChange={e => {
                            const newFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
                            if (newFiles.length > 0) {
                              setSelectedDocFiles(prev => [...prev, ...newFiles]);
                              if (selectedDocFiles.length === 0 && newFiles.length === 1) {
                                setNewDocForm(prev => ({
                                  ...prev,
                                  name: prev.name || newFiles[0].name.substring(0, newFiles[0].name.lastIndexOf('.')) || newFiles[0].name,
                                }));
                              }
                            }
                            e.target.value = ''; // Reset input to allow re-selection
                          }}
                        />
                      </label>

                      {/* Display Selected Queue */}
                      {selectedDocFiles.length > 0 && (
                        <div className="bg-white border border-indigo-100 rounded-xl overflow-hidden shadow-xs">
                          <div className="bg-indigo-50/70 px-3 py-1.5 flex items-center justify-between border-b border-indigo-100">
                            <span className="text-[10px] font-bold text-indigo-800">
                              ًں قائمة الانتظار للمستندات ({selectedDocFiles.length} ملف — {(selectedDocFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedDocFiles([])}
                              className="text-[9px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                            >
                              مسح القائمة ✕
                            </button>
                          </div>
                          <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                            {selectedDocFiles.map((f, i) => (
                              <li key={i} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-base shrink-0">ًں</span>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-800 truncate">{f.name}</p>
                                    <p className="text-[9px] text-slate-400">{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocFiles(prev => prev.filter((_, idx) => idx !== i))}
                                   className="text-rose-500 hover:text-rose-700 font-bold text-xs shrink-0 me-2 cursor-pointer px-1.5 py-0.5"
                                >\u2715</button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={selectedDocFiles.length === 0}
                          className={`px-5 py-2 rounded-xl text-[11px] font-bold transition shadow-xs ${
                            selectedDocFiles.length > 0
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {selectedDocFiles.length > 0
                            ? `حفظ وأرشفة (${selectedDocFiles.length}) مستند في الخزينة ✕`
                            : 'أضف ملفات لحفظها'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Client Docs list */}
              {documents.filter(doc => doc.clientId === selectedClient.id || doc.clientName === selectedClient.name).length === 0 ? (
                <div className="p-5 bg-slate-50/50 border border-slate-150 rounded-xl text-center text-slate-400 text-[10px] font-sans">
                  لا توجد مستندات مؤرشفة لهذا الموكل في خزينة الملفات والمستندات.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {documents.filter(doc => doc.clientId === selectedClient.id || doc.clientName === selectedClient.name).map(doc => (
                    <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-slate-300 hover:shadow-xs transition">
                      <div className="flex items-start gap-2.5 overflow-hidden">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="overflow-hidden">
                          <h5 className="text-[11px] font-bold text-slate-800 leading-tight truncate" title={doc.name}>{doc.name}</h5>
                          <p className="text-[9px] text-slate-450 mt-0.5 truncate font-mono">{doc.fileName} ({doc.fileSize})</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="bg-slate-100 text-slate-600 text-[8px] px-1.5 py-0.5 rounded font-black">{doc.type}</span>
                            {doc.caseNumber && (
                              <span className="bg-blue-50 text-blue-800 text-[8px] px-1.5 py-0.5 rounded font-black">
                                قضية: {doc.caseNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-100"
                          title="عرض ومعاينة المستند"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDoc(doc)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-100"
                          title="تعديل بيانات المستند"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => printSingleDocument(doc, officeProfile)}
                          className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg border border-slate-100"
                          title="طباعة المستند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteDocument && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (await confirm('هل أنت متأكد من حذف هذا المستند من الخزينة نهائياً؟')) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-red-50/20"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* قسم المدفوعات والأتعاب */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="pt-6 border-t border-slate-100 space-y-4" id="client-transactions-wrapper">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0"><Banknote className="w-4 h-4" /></span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">المدفوعات والأتعاب ({transactions.filter(t => t.clientName === selectedClient.name).length})</h4>
                    <p className="text-[10px] text-slate-500">إدارة مدفوعات الموكل والأتعاب والمصروفات المرتبطة به</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowAddTransaction(true); setEditingTransaction(null); setTxForm({ caseId: '', caseNumber: '', clientName: selectedClient.name, type: 'أتعاب', ioType: 'وارد (income)', amount: 0, date: new Date().toISOString().split('T')[0], description: '', paymentMethod: 'نقدي' }); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer self-start sm:self-auto">
                  <Plus className="w-3.5 h-3.5" /><span>إضافة معاملة مالية</span>
                </button>
              </div>

              {/* نموذج الإضافة/التعديل */}
              {(showAddTransaction || editingTransaction) && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-emerald-900">{editingTransaction ? '✏️ تعديل المعاملة المالية' : '➕ إضافة معاملة مالية جديدة'}</h5>
                    <button onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">نوع المعاملة</label>
                      <select value={editingTransaction ? editingTransaction.type : txForm.type}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, type: e.target.value as any}) : setTxForm({...txForm, type: e.target.value as any})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="أتعاب">أتعاب محاماة</option>
                        <option value="مصروفات دعوى">مصروفات دعوى</option>
                        <option value="مصاريف مكتب تشغيلية">مصاريف تشغيلية</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">اتجاه المعاملة</label>
                      <select value={editingTransaction ? editingTransaction.ioType : txForm.ioType}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, ioType: e.target.value as any}) : setTxForm({...txForm, ioType: e.target.value as any})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="وارد (income)">وارد (مقبوض)</option>
                        <option value="صادر (expense)">صادر (مدفوع)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">المبلغ (جنيه)</label>
                      <input type="number" min="0"
                        value={editingTransaction ? editingTransaction.amount : txForm.amount}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, amount: +e.target.value}) : setTxForm({...txForm, amount: +e.target.value})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">طريقة الدفع</label>
                      <select value={editingTransaction ? editingTransaction.paymentMethod : txForm.paymentMethod}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, paymentMethod: e.target.value as any}) : setTxForm({...txForm, paymentMethod: e.target.value as any})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="نقدي">نقدي</option>
                        <option value="فودافون كاش / محفظة">فودافون كاش / محفظة</option>
                        <option value="تحويل بنكي">تحويل بنكي</option>
                        <option value="شيك">شيك</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">التاريخ</label>
                      <input type="date"
                        value={editingTransaction ? editingTransaction.date : txForm.date}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, date: e.target.value}) : setTxForm({...txForm, date: e.target.value})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">القضية المرتبطة (اختياري)</label>
                      <select value={editingTransaction ? editingTransaction.caseId : txForm.caseId}
                        onChange={e => { const c = cases.find(x => x.id === e.target.value); editingTransaction ? setEditingTransaction({...editingTransaction, caseId: e.target.value, caseNumber: c?.caseNumber || ''}) : setTxForm({...txForm, caseId: e.target.value, caseNumber: c?.caseNumber || ''}); }}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="">— بدون قضية —</option>
                        {cases.filter(c => c.clientId === selectedClient.id).map(c => <option key={c.id} value={c.id}>{c.caseNumber} — {c.claimSubject?.substring(0,30)}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">الوصف والبيان</label>
                      <input type="text"
                        value={editingTransaction ? editingTransaction.description : txForm.description}
                        onChange={e => editingTransaction ? setEditingTransaction({...editingTransaction, description: e.target.value}) : setTxForm({...txForm, description: e.target.value})}
                        placeholder="مثال: دفعة أولى من الأتعاب المتفق عليها"
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      if (editingTransaction) {
                        if (onUpdateTransaction) onUpdateTransaction(editingTransaction);
                        setEditingTransaction(null);
                      } else {
                        if (!txForm.description || txForm.amount <= 0) { await showAlert('الرجاء إدخال المبلغ والوصف'); return; }
                        const newTx: Transaction = { ...txForm, id: 'tx_' + Date.now(), clientName: selectedClient.name };
                        if (onAddTransaction) onAddTransaction(newTx);
                        setShowAddTransaction(false);
                      }
                    }} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1">
                      <Save className="w-3 h-3" />{editingTransaction ? 'حفظ التعديل' : 'حفظ المعاملة'}
                    </button>
                    <button onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black transition cursor-pointer">إلغاء</button>
                  </div>
                </div>
              )}

              {/* قائمة المعاملات */}
              {transactions.filter(t => t.clientName === selectedClient.name).length === 0 ? (
                <div className="p-5 bg-slate-50/50 border border-slate-150 rounded-xl text-center text-slate-400 text-[10px]">لا توجد معاملات مالية مسجلة لهذا الموكل.</div>
              ) : (
                <div className="space-y-2">
                  {transactions.filter(t => t.clientName === selectedClient.name).sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                      <div className={`p-2 rounded-lg shrink-0 ${tx.ioType.includes('income') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {tx.ioType.includes('income') ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 truncate">{tx.description || tx.type}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${tx.ioType.includes('income') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{tx.type}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span>{tx.date}</span>
                          <span>·</span>
                          <span>{tx.paymentMethod}</span>
                          {tx.caseNumber && <><span>·</span><span>قضية: {tx.caseNumber}</span></>}
                        </div>
                      </div>
                       <div className="text-end shrink-0">
                        <div className={`text-sm font-black ${tx.ioType.includes('income') ? 'text-emerald-600' : 'text-red-600'}`}>
                          {tx.ioType.includes('income') ? '+' : '-'}{tx.amount.toLocaleString('ar-EG')} ج
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingTransaction({...tx})} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer" title="تعديل"><Edit3 className="w-3.5 h-3.5" /></button>
                        {onDeleteTransaction && <button onClick={async () => { if (await confirm('هل تريد حذف هذه المعاملة الماليɿ')) onDeleteTransaction(tx.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  ))}
                  {/* الإجمالي */}
                  <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-xl text-xs font-black">
                    <span>إجمالي الوارد:</span>
                    <span className="text-emerald-400">+{transactions.filter(t => t.clientName === selectedClient.name && t.ioType.includes('income')).reduce((s,t) => s+t.amount, 0).toLocaleString('ar-EG')} ج</span>
                    <span>إجمالي الصادر:</span>
                    <span className="text-red-400">-{transactions.filter(t => t.clientName === selectedClient.name && !t.ioType.includes('income')).reduce((s,t) => s+t.amount, 0).toLocaleString('ar-EG')} ج</span>
                  </div>
                </div>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* قسم الجلسات */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="pt-6 border-t border-slate-100 space-y-4" id="client-sessions-wrapper">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shrink-0"><Gavel className="w-4 h-4" /></span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">الجلسات المرتبطة ({sessions.filter(s => cases.filter(c => c.clientId === selectedClient.id).some(c => c.id === s.caseId)).length})</h4>
                    <p className="text-[10px] text-slate-500">جلسات قضايا الموكل — إضافة وتعديل وحذف الجلسات</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowAddSession(true); setEditingSession(null); const firstCase = cases.find(c => c.clientId === selectedClient.id); setSessionForm({ caseId: firstCase?.id || '', caseNumber: firstCase?.caseNumber || '', clientName: selectedClient.name, date: new Date().toISOString().split('T')[0], court: firstCase?.court || '', circuit: firstCase?.circuit || '', objective: '', decision: '', status: 'قادمة', judgeName: '', notes: '', time: '' }); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition cursor-pointer self-start sm:self-auto">
                  <Plus className="w-3.5 h-3.5" /><span>إضافة جلسة</span>
                </button>
              </div>

              {/* نموذج إضافة/تعديل الجلسة */}
              {(showAddSession || editingSession) && (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black text-indigo-900">{editingSession ? '✏️ تعديل بيانات الجلسة' : '➕ إضافة جلسة جديدة'}</h5>
                    <button onClick={() => { setShowAddSession(false); setEditingSession(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">القضية</label>
                      <select value={editingSession ? editingSession.caseId : sessionForm.caseId}
                        onChange={e => { const c = cases.find(x => x.id === e.target.value); editingSession ? setEditingSession({...editingSession, caseId: e.target.value, caseNumber: c?.caseNumber||'', court: c?.court||'', circuit: c?.circuit||''}) : setSessionForm({...sessionForm, caseId: e.target.value, caseNumber: c?.caseNumber||'', court: c?.court||'', circuit: c?.circuit||''}); }}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="">— اختر القضية —</option>
                        {cases.filter(c => c.clientId === selectedClient.id).map(c => <option key={c.id} value={c.id}>{c.caseNumber} — {c.court}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">الحالة</label>
                      <select value={editingSession ? editingSession.status : sessionForm.status}
                        onChange={e => editingSession ? setEditingSession({...editingSession, status: e.target.value as any}) : setSessionForm({...sessionForm, status: e.target.value as any})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none text-[11px]">
                        <option value="قادمة">قادمة</option>
                        <option value="منتهية">منتهية</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ الجلسة</label>
                      <input type="date" value={editingSession ? editingSession.date : sessionForm.date}
                        onChange={e => editingSession ? setEditingSession({...editingSession, date: e.target.value}) : setSessionForm({...sessionForm, date: e.target.value})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">وقت الجلسة</label>
                      <input type="time" value={editingSession ? editingSession.time||'' : sessionForm.time||''}
                        onChange={e => editingSession ? setEditingSession({...editingSession, time: e.target.value}) : setSessionForm({...sessionForm, time: e.target.value})}
                        className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">المحكمة</label>
                      <input type="text" value={editingSession ? editingSession.court : sessionForm.court}
                        onChange={e => editingSession ? setEditingSession({...editingSession, court: e.target.value}) : setSessionForm({...sessionForm, court: e.target.value})}
                        placeholder="مثال: محكمة شمال القاهرة" className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">الدائرة</label>
                      <input type="text" value={editingSession ? editingSession.circuit : sessionForm.circuit}
                        onChange={e => editingSession ? setEditingSession({...editingSession, circuit: e.target.value}) : setSessionForm({...sessionForm, circuit: e.target.value})}
                        placeholder="مثال: الدائرة 12 مدني" className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">المطلوب بالجلسة / الهدف</label>
                      <input type="text" value={editingSession ? editingSession.objective : sessionForm.objective}
                        onChange={e => editingSession ? setEditingSession({...editingSession, objective: e.target.value}) : setSessionForm({...sessionForm, objective: e.target.value})}
                        placeholder="مثال: حضور جلسة وإبداء دفوع" className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">قرار المحكمة / ما تم بالجلسة</label>
                      <input type="text" value={editingSession ? editingSession.decision||'' : sessionForm.decision||''}
                        onChange={e => editingSession ? setEditingSession({...editingSession, decision: e.target.value}) : setSessionForm({...sessionForm, decision: e.target.value})}
                        placeholder="مثال: تأجيل للجلسة القادمة — حدد موعداً" className="w-full p-1.5 rounded border border-slate-200 bg-white outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      if (editingSession) {
                        if (onUpdateSession) onUpdateSession(editingSession);
                        setEditingSession(null);
                      } else {
                        if (!sessionForm.caseId || !sessionForm.date || !sessionForm.objective) { await showAlert('الرجاء تحديد القضية والتاريخ والمطلوب'); return; }
                        const newSess: Session = { ...sessionForm, id: 'sess_' + Date.now() };
                        if (onAddSession) onAddSession(newSess);
                        setShowAddSession(false);
                      }
                    }} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition cursor-pointer flex items-center justify-center gap-1">
                      <Save className="w-3 h-3" />{editingSession ? 'حفظ التعديل' : 'حفظ الجلسة'}
                    </button>
                    <button onClick={() => { setShowAddSession(false); setEditingSession(null); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-black transition cursor-pointer">إلغاء</button>
                  </div>
                </div>
              )}

              {/* قائمة الجلسات */}
              {sessions.filter(s => cases.filter(c => c.clientId === selectedClient.id).some(c => c.id === s.caseId)).length === 0 ? (
                <div className="p-5 bg-slate-50/50 border border-slate-150 rounded-xl text-center text-slate-400 text-[10px]">لا توجد جلسات مسجلة لقضايا هذا الموكل.</div>
              ) : (
                <div className="space-y-2">
                  {sessions.filter(s => cases.filter(c => c.clientId === selectedClient.id).some(c => c.id === s.caseId)).sort((a,b) => b.date.localeCompare(a.date)).map(sess => (
                    <div key={sess.id} className={`p-3 border rounded-xl flex items-start gap-3 transition hover:shadow-sm ${sess.status === 'قادمة' ? 'bg-blue-50/40 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${sess.status === 'قادمة' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                        <Gavel className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-800">{sess.objective}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sess.status === 'قادمة' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{sess.status}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{sess.date}</span>
                          {sess.time && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{sess.time}</span>}
                          <span>·</span>
                          <span>{sess.court}</span>
                          {sess.circuit && <><span>·</span><span>{sess.circuit}</span></>}
                        </div>
                        {sess.decision && <p className="mt-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded">القرار: {sess.decision}</p>}
                        <p className="text-[9px] text-slate-400 mt-0.5">القضية: {sess.caseNumber}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingSession({...sess})} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer" title="تعديل"><Edit3 className="w-3.5 h-3.5" /></button>
                        {onDeleteSession && <button onClick={async () => { if (await confirm('هل تريد حذف هذه الجلسɿ')) onDeleteSession(sess.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer" title="حذف"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
    </>
  ) : null;

  return (
     <div className="space-y-6 text-end" dir="rtl">

      {/* HEADER BAR — مستخرَج في ClientHeader (v2.9.7) */}
      <ClientHeader onAddClient={() => setIsAddingClient(true)} />

      {/* FILTER + VIEW MODE — مستخرَج في ClientFilters (v2.9.7) */}
      <ClientFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={filteredClients.length}
      />

      {/* CLIENT CARDS - متعدد طرق العرض */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderEmpty(filteredClients.length === 0)}
          {filteredClients.map((client) => {
            const clientCases = cases.filter(c => c.clientId === client.id);
            const poasCount = client.poas.length;
            return (
              <div
                key={client.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4 border-slate-200 hover:border-indigo-500/20 ${
                  selectedClientId === client.id ? 'border-2 border-indigo-600 shadow-md' : ''
                }`}
                id={`client-card-item-${client.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </span>
                    <span className="bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600 font-mono">
                      قومي: {client.nationalId}
                    </span>
                  </div>
                  {client.fileNumber && (
                    <div className="text-[9px] text-indigo-700 font-bold bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">
                      ملف رقم: {client.fileNumber}
                    </div>
                  )}
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight hover:text-indigo-700 transition mt-1" title={client.name}>
                    {client.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="truncate">{client.address}</span>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="space-y-0.5 text-center">
                    <span className="text-[9px] text-slate-400 block">التوكيلات</span>
                    <strong className="text-slate-800 font-mono text-xs">{poasCount}</strong>
                  </div>
                  <div className="space-y-0.5 text-center border-r border-slate-200">
                    <span className="text-[9px] text-slate-400 block">القضايا</span>
                    <strong className="text-slate-800 font-mono text-xs">{clientCases.length}</strong>
                  </div>
                  <div className="space-y-0.5 text-center border-r border-slate-200">
                    <span className="text-[9px] text-slate-400 block">المستندات</span>
                    <strong className="text-indigo-600 font-mono text-xs">{(client.attachments || []).length}</strong>
                  </div>
                </div>

                {searchQuery && (() => {
                  const match = findMatchSnippet({
                    name: client.name,
                    phone: client.phone,
                    nationalId: client.nationalId,
                    address: client.address,
                    fileNumber: client.fileNumber
                  }, searchQuery, {
                    name: 'الاسم',
                    phone: 'رقم الهاتف',
                    nationalId: 'الرقم القومي',
                    address: 'العنوان',
                    fileNumber: 'رقم الملف'
                  });
                  if (match) {
                    return (
                      <div className="text-[10px] text-slate-600 bg-indigo-50/50 border border-indigo-100 p-2 rounded-md font-sans">
                        <span className="text-indigo-800 font-extrabold block mb-0.5">مطابقة في {match.fieldName}:</span>
                        <span>{match.before}</span>
                        <mark className="bg-indigo-200 text-indigo-950 font-bold px-0.5 rounded">{match.match}</mark>
                        <span>{match.after}</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <button onClick={() => setSelectedClientId(client.id)}
                    className="flex-grow bg-slate-950 hover:bg-slate-900 text-indigo-500 rounded-lg py-2 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer">
                    استعراض <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setDetailClientId(client.id); setIsClientDetailModalOpen(true); }}
                    title="استعراض احترافي (Modal ملء الشاشة)"
                    className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg p-2 transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <ActionBtn
                    icon={MessageSquare}
                    title="واتساب"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendWhatsAppMessage(client.phone, getGeneralUpdateText(client.name));
                    }}
                    color="emerald"
                  />
                  <ActionBtn icon={Eye} title="عرض" onClick={() => printSingleClient(client, cases, officeProfile)} color="slate" />
                  <ActionBtn icon={QrCode} title="QR" onClick={() => handlePrintQR(client)} color="indigo" />
                  <ActionBtn icon={Printer} title="طباعة" onClick={() => printSingleClient(client, cases, officeProfile)} color="indigo" />
                  <ActionBtn icon={Edit} title="تعديل" onClick={() => setIsEditingClient(client)} color="slate" />
                  <ActionBtn icon={FileText} title="وورد" onClick={() => exportClientToWord(client, cases, officeProfile)} color="blue" />
                  <ActionBtn icon={Trash2} title="حذف" onClick={async (e) => {
                    e.stopPropagation();
                    if (await confirm(`حذف [${client.name}] نهائياً؟`)) { onDeleteClient(client.id); if (selectedClientId === client.id) setSelectedClientId(null); }
                  }} color="red" />
                  {onArchiveClient && (
                    <ActionBtn icon={Archive} title="أرشفة" onClick={async (e) => {
                      e.stopPropagation();
                      if (await confirm(`أرشفة [${client.name}]؟`)) onArchiveClient(client.id);
                    }} color="indigo" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                 <th className="text-end p-3 font-bold text-slate-600">رقم الملف</th>
                 <th className="text-end p-3 font-bold text-slate-600">الاسم</th>
                 <th className="text-end p-3 font-bold text-slate-600">الهاتف</th>
                 <th className="text-end p-3 font-bold text-slate-600 hidden md:table-cell">الرقم القومي</th>
                 <th className="text-end p-3 font-bold text-slate-600 hidden lg:table-cell">العنوان</th>
                <th className="text-center p-3 font-bold text-slate-600">توكيلات</th>
                <th className="text-center p-3 font-bold text-slate-600">قضايا</th>
                <th className="text-center p-3 font-bold text-slate-600">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">{emptyMsg()}</td></tr>
              ) : filteredClients.map(client => {
                const clientCases = cases.filter(c => c.clientId === client.id);
                const match = searchQuery ? findMatchSnippet({
                  name: client.name,
                  phone: client.phone,
                  nationalId: client.nationalId,
                  address: client.address,
                  fileNumber: client.fileNumber
                }, searchQuery, {
                  name: 'الاسم',
                  phone: 'رقم الهاتف',
                  nationalId: 'الرقم القومي',
                  address: 'العنوان',
                  fileNumber: 'رقم الملف'
                }) : null;

                return (
                  <React.Fragment key={client.id}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="p-3 font-mono font-bold text-indigo-700">{client.fileNumber || '—'}</td>
                      <td className="p-3 font-bold text-slate-900">{client.name}</td>
                      <td className="p-3 font-mono text-slate-600" dir="ltr">{client.phone}</td>
                      <td className="p-3 font-mono text-slate-600 hidden md:table-cell">{client.nationalId}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[200px] hidden lg:table-cell">{client.address}</td>
                      <td className="p-3 text-center font-mono">{client.poas.length}</td>
                      <td className="p-3 text-center font-mono">{clientCases.length}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-center">
                          <ActionBtnSmall icon={MessageSquare} title="واتساب" onClick={() => { const msg = getGeneralUpdateText(client.name); sendWhatsAppMessage(client.phone, msg); }} color="emerald" />
                          <ActionBtnSmall icon={Eye} title="عرض" onClick={() => printSingleClient(client, cases, officeProfile)} color="slate" />
                          <ActionBtnSmall icon={QrCode} title="QR" onClick={() => handlePrintQR(client)} color="indigo" />
                          <ActionBtnSmall icon={Edit} title="تعديل" onClick={() => setIsEditingClient(client)} color="slate" />
                        </div>
                      </td>
                    </tr>
                    {match && (
                      <tr className="bg-indigo-50/20 border-b border-slate-100">
                         <td colSpan={8} className="p-2 text-[10px] text-slate-500 font-sans text-end">
                           <span className="text-indigo-800 font-extrabold pe-4">مطابقة في {match.fieldName}:</span>
                          <span>{match.before}</span>
                          <mark className="bg-indigo-100 text-indigo-900 font-bold px-0.5 rounded">{match.match}</mark>
                          <span>{match.after}</span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(viewMode === 'large-icon' || viewMode === 'medium-icon' || viewMode === 'small-icon') && (
        <div className={`grid gap-4 ${
          viewMode === 'large-icon' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
          viewMode === 'medium-icon' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6' :
          'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'
        }`}>
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 py-12 px-6 rounded-2xl text-center text-slate-400">
              <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-500">لا يوجد موكلين.</p>
            </div>
          ) : filteredClients.map(client => (
            <div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center text-center p-3 ${
                selectedClientId === client.id ? 'border-2 border-indigo-600' : 'border-slate-200'
              }`}
              onClick={() => setSelectedClientId(client.id)}
              id={`icon-client-${client.id}`}
            >
              <div className={`${viewMode === 'large-icon' ? 'w-16 h-16 text-xl' : viewMode === 'medium-icon' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base'} bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-black mb-1.5`}>
                {client.name.charAt(0)}
              </div>
              {viewMode !== 'small-icon' && (
                <div className="min-w-0 w-full">
                  <div className="text-xs font-bold text-slate-900 truncate w-full">{client.name}</div>
                  {client.fileNumber && (
                    <div className="text-[9px] text-indigo-700 font-mono">#{client.fileNumber}</div>
                  )}
                  {viewMode === 'large-icon' && (
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">{client.phone}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DETAILED CLIENT DRAWER */}
      {selectedClient && (
        <>
          {!fullScreen && (
            <div ref={drawerRef} className="bg-white border-2 border-slate-900/10 p-6 rounded-2xl shadow-xl space-y-6" id={`client-drawer-${selectedClient.id}`}>
            {/* Header Client Drawer */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-950 text-indigo-500 rounded-xl">
                  <Users className="h-6 w-6" id="client-drawer-user-icon" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-mono">تاريخ التسجيل: {selectedClient.createdAt.split('T')[0]}</span>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">{selectedClient.name}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printSingleClient(selectedClient, cases, officeProfile)}
                  className="p-2 border border-slate-200 text-slate-750 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="عرض ومعاينة السجل التراكمي للموكل"
                  id={`view-client-drawer-btn-${selectedClient.id}`}
                >
                  <Eye className="h-4 w-4" />
                  <span>عرض السجل</span>
                </button>
                <button
                  onClick={() => printSingleClient(selectedClient, cases, officeProfile)}
                  className="p-2 border border-slate-250 text-indigo-700 bg-indigo-50/20 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="طباعة السجل التراكمي للموكل"
                  id={`print-client-drawer-btn-${selectedClient.id}`}
                >
                  <Printer className="h-4 w-4" />
                  <span>طباعة ملف الموكل</span>
                </button>
                <button
                  onClick={() => exportClientToWord(selectedClient, cases, officeProfile)}
                  className="p-2 border border-blue-200 text-blue-600 bg-blue-50/30 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="تصدير السجل التراكمي للموكل إلى ملف وورد"
                  id={`export-client-drawer-word-btn-${selectedClient.id}`}
                >
                  <FileText className="h-4 w-4" />
                  <span>تصدير إلى وورد</span>
                </button>
                <button
                  onClick={() => handlePrintQR(selectedClient)}
                  className="p-2 border border-indigo-200 text-indigo-600 bg-indigo-50/30 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="طباعة QR كود ملف الموكل"
                  id={`qr-client-drawer-btn-${selectedClient.id}`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>QR</span>
                </button>
                <button
                  onClick={() => setIsEditingClient(selectedClient)}
                  className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                  id={`edit-client-btn-${selectedClient.id}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (await confirm('هل ترغب في حذف ملف الموكل نهائياً؟ سيتم حذف جميع القضايا والجلسات والمعاملات والمواعيد والمهام والمستندات المرتبطة به.')) {
                      onDeleteClient(selectedClient.id);
                      setSelectedClientId(null);
                    }
                  }}
                  className="p-2 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition"
                  id={`delete-client-btn-${selectedClient.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFullScreen(true)}
                  className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                  title="شاشة كاملة"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fullScreen ? setFullScreen(false) : setSelectedClientId(null)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
                  id="close-client-drawer-btn"
                >
                  {fullScreen ? 'رجوع ✕' : 'إغلاق دليل الموكل ✕'}
                </button>
              </div>
            </div>
            {drawerBody}
            </div>
          )}

          {fullScreen && (
            <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
              <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header Client Drawer */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-950 text-indigo-500 rounded-xl">
                  <Users className="h-6 w-6" id="client-drawer-user-icon" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-mono">تاريخ التسجيل: {selectedClient.createdAt.split('T')[0]}</span>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">{selectedClient.name}</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printSingleClient(selectedClient, cases, officeProfile)}
                  className="p-2 border border-slate-200 text-slate-750 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="عرض ومعاينة السجل التراكمي للموكل"
                  id={`view-client-drawer-btn-${selectedClient.id}`}
                >
                  <Eye className="h-4 w-4" />
                  <span>عرض السجل</span>
                </button>
                <button
                  onClick={() => printSingleClient(selectedClient, cases, officeProfile)}
                  className="p-2 border border-slate-250 text-indigo-700 bg-indigo-50/20 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="طباعة السجل التراكمي للموكل"
                  id={`print-client-drawer-btn-${selectedClient.id}`}
                >
                  <Printer className="h-4 w-4" />
                  <span>طباعة ملف الموكل</span>
                </button>
                <button
                  onClick={() => exportClientToWord(selectedClient, cases, officeProfile)}
                  className="p-2 border border-blue-200 text-blue-600 bg-blue-50/30 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="تصدير السجل التراكمي للموكل إلى ملف وورد"
                  id={`export-client-drawer-word-btn-${selectedClient.id}`}
                >
                  <FileText className="h-4 w-4" />
                  <span>تصدير إلى وورد</span>
                </button>
                <button
                  onClick={() => handlePrintQR(selectedClient)}
                  className="p-2 border border-indigo-200 text-indigo-600 bg-indigo-50/30 rounded-lg hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 px-3 font-semibold text-xs shrink-0 cursor-pointer"
                  title="طباعة QR كود ملف الموكل"
                  id={`qr-client-drawer-btn-${selectedClient.id}`}
                >
                  <QrCode className="h-4 w-4" />
                  <span>QR</span>
                </button>
                <button
                  onClick={() => setIsEditingClient(selectedClient)}
                  className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                  id={`edit-client-btn-${selectedClient.id}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={async () => {
                    if (await confirm('هل ترغب في حذف ملف الموكل نهائياً؟ سيتم حذف جميع القضايا والجلسات والمعاملات والمواعيد والمهام والمستندات المرتبطة به.')) {
                      onDeleteClient(selectedClient.id);
                      setSelectedClientId(null);
                    }
                  }}
                  className="p-2 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition"
                  id={`delete-client-btn-${selectedClient.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setFullScreen(true)}
                  className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                  title="شاشة كاملة"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fullScreen ? setFullScreen(false) : setSelectedClientId(null)}
                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
                  id="close-client-drawer-btn"
                >
                  {fullScreen ? 'رجوع ✕' : 'إغلاق دليل الموكل ✕'}
                </button>
              </div>
            </div>
              {drawerBody}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD / EDIT CLIENT (extracted to ./clients/AddEditClientModal.tsx — v2.9.2) */}
      <AddEditClientModal
        mode="add"
        open={isAddingClient}
        onClose={() => setIsAddingClient(false)}
        onAddClient={onAddClient}
        customFields={clientCustomFields}
      />

      {/* MODAL: EDIT CLIENT (extracted to ./clients/AddEditClientModal.tsx — v2.9.2) */}
      <AddEditClientModal
        mode="edit"
        open={isEditingClient !== null}
        client={isEditingClient}
        onClose={() => setIsEditingClient(null)}
        onUpdateClient={onUpdateClient}
        customFields={clientCustomFields}
      />

      {/* VIEWING DOCUMENT MODAL */}
        {viewingDoc && (
          <div
            key="view-doc-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 text-end"
          >
            <div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-indigo-500">{viewingDoc.name}</h3>
                  <p className="text-[10px] text-slate-300 mt-0.5 font-mono">
                    الملف: {viewingDoc.fileName} ({viewingDoc.fileSize})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block font-bold text-[10px]">نوع ومستوى المستند</span>
                    <span className="font-bold text-slate-800">{viewingDoc.type}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block font-bold text-[10px]">تاريخ الأرشفة</span>
                    <span className="font-mono text-slate-800">{viewingDoc.uploadedAt}</span>
                  </div>
                  {viewingDoc.caseNumber && (
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block font-bold text-[10px]">مرتبط بالقضية رقم</span>
                      <span className="font-bold text-indigo-700">رقم {viewingDoc.caseNumber}</span>
                    </div>
                  )}
                  {viewingDoc.clientName && (
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block font-bold text-[10px]">اسم الموكل</span>
                      <span className="font-bold text-emerald-700">{viewingDoc.clientName}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-500 block">نص المستند المقروء بالماسح الضوئي الذكي (Simulated OCR)</span>
                  <div className="p-4 bg-indigo-50/20 border border-indigo-500/10 rounded-xl font-serif text-xs text-slate-800 leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-line">
                    {viewingDoc.scannedTextByAI || "لا يتوفر نص للماسح الضوئي لهذا المستند حالياً."}
                  </div>
                </div>

                {viewingDoc.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-500 block">الهوامش والملاحظات</span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-normal whitespace-pre-wrap">
                      {viewingDoc.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between gap-3">
                <button
                  type="button"
                  onClick={() => printSingleDocument(viewingDoc, officeProfile)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>بدء طباعة المستند</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-lg cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>
          </div>
        )}
      {/* EDITING DOCUMENT MODAL */}
        {editingDoc && (
          <div
            key="edit-doc-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 text-end"
          >
            <div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-indigo-500">تعديل بيانات المستند والمضمون</h3>
                  <p className="text-[10px] text-slate-300 mt-0.5 font-mono">
                    تحديث الملف: {editingDoc.fileName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (onUpdateDocument) {
                    onUpdateDocument(editingDoc);
                  }
                  setEditingDoc(null);
                }}
                className="p-5 space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">اسم المستند الرسمي *</label>
                  <input
                    type="text"
                    required
                    value={editingDoc.name}
                    onChange={(e) => setEditingDoc({ ...editingDoc, name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-end focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">تصنيف وموضوع المستند *</label>
                    <select
                      value={editingDoc.type}
                      onChange={(e) => setEditingDoc({ ...editingDoc, type: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-end cursor-pointer"
                    >
                      <option value="عريضة دعوى">عريضة دعوى</option>
                      <option value="حكم قضائي">حكم قضائي</option>
                      <option value="مذكرة دفاع">مذكرة دفاع</option>
                      <option value="توكيل رسمي">توكيل رسمي</option>
                      <option value="تقرير خبراء">تقرير خبراء</option>
                      <option value="مستندات ملكية">مستندات ملكية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">تاريخ الإثبات والأرشفة *</label>
                    <input
                      type="date"
                      required
                      value={editingDoc.uploadedAt}
                      onChange={(e) => setEditingDoc({ ...editingDoc, uploadedAt: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-end"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">مضمون ونص المستند المقروء (OCR)</label>
                  <textarea
                    value={editingDoc.scannedTextByAI || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, scannedTextByAI: e.target.value })}
                    placeholder="مضمون النص الرقمي المسحوب ضوئياً للمستند..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-end h-28"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">الهوامش والملاحظات الخاصة</label>
                  <input
                    type="text"
                    value={editingDoc.notes || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                    placeholder="هوامش أو ملاحظات إضافية على ملف القضية..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-end"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingDoc(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded font-bold text-xs cursor-pointer"
                  >
                    حفظ التعديلات الفورية
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      {/* ─── Professional Client Detail Modal (v2.8.0) ─── */}
      <ClientDetailModal
        open={isClientDetailModalOpen}
        onClose={() => { setIsClientDetailModalOpen(false); setDetailClientId(null); }}
        client={detailClientId ? clients.find(cl => cl.id === detailClientId) || null : null}
        cases={cases}
        sessions={sessions}
        transactions={transactions}
        documents={documents}
        officeProfile={officeProfile}
        onEdit={() => {
          // Close modal and open the inline edit form (same as Cases behavior)
          const cl = clients.find(c => c.id === detailClientId);
          if (cl) {
            setIsClientDetailModalOpen(false);
            setIsEditingClient(cl);
            setSelectedClientId(cl.id);
          }
        }}
        onPrint={() => {
          // Close modal and switch to the inline view
          const cl = clients.find(c => c.id === detailClientId);
          if (cl) {
            setIsClientDetailModalOpen(false);
            setSelectedClientId(cl.id);
          }
        }}
      />

    </div>
  );
});

export default ClientsList;



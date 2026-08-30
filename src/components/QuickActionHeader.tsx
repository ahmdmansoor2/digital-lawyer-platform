/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ChevronDown, 
  Plus, 
  Briefcase, 
  UserPlus, 
  Calendar, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  User,
  Scale,
  Home,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  CheckSquare,
  Building,
  Phone,
  Mail,
  MapPin,
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Client, 
  Case, 
  Session, 
  CaseType, 
  LitigationLevel, 
  CaseStatus, 
  ClientRole,
  OfficeProfile,
  LawTask,
  Transaction,
  BailiffPaper
} from '../types';
import { getLitigationLevels, saveLitigationLevels } from '../utils/courtHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';

interface QuickActionHeaderProps {
  clients: Client[];
  cases: Case[];
  sessions?: Session[];
  tasks?: LawTask[];
  transactions?: Transaction[];
  bailiffPapers?: BailiffPaper[];
  activeTab: string;
  onAddCase: (newCase: Case) => void;
  onUpdateCase?: (updatedCase: Case) => void;
  onAddClient: (newClient: Client) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  onAddSession: (newSession: Session) => void;
  onUpdateSession?: (updatedSession: Session) => void;
  onAddTask?: (newTask: LawTask) => void;
  onToggleTaskStatus?: (id: string) => void;
  onAddTransaction?: (newTx: Transaction) => void;
  onAddBailiffPaper?: (newPaper: BailiffPaper) => void;
  onUpdateBailiffPaper?: (updatedPaper: BailiffPaper) => void;
  officeProfile?: OfficeProfile;
  onUpdateOfficeProfile?: (updatedProfile: OfficeProfile) => void;
  onNavigate?: (tab: any) => void;
}

const QuickActionHeader = React.memo(function QuickActionHeader({
  clients,
  cases,
  sessions = [],
  tasks = [],
  transactions = [],
  bailiffPapers = [],
  activeTab,
  onAddCase,
  onUpdateCase,
  onAddClient,
  onUpdateClient,
  onAddSession,
  onUpdateSession,
  onAddTask,
  onToggleTaskStatus,
  onAddTransaction,
  onAddBailiffPaper,
  onUpdateBailiffPaper,
  officeProfile,
  onUpdateOfficeProfile,
  onNavigate
}: QuickActionHeaderProps) {
  const confirm = useConfirm();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'case' | 'client' | 'session' | 'task' | 'transaction' | 'bailiff' | 'quick-control' | null>(null);
  const [controlTab, setControlTab] = useState<'office' | 'levels' | 'cases' | 'clients'>('office');
  const [newLevelInput, setNewLevelInput] = useState('');
  
  // Custom non-intrusive Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [litigationLevels, setLitigationLevels] = useState<string[]>(() => getLitigationLevels());

  useEffect(() => {
    const handleLevelsChanged = () => {
      setLitigationLevels(getLitigationLevels());
    };
    window.addEventListener('litigation-levels-changed', handleLevelsChanged);
    return () => {
      window.removeEventListener('litigation-levels-changed', handleLevelsChanged);
    };
  }, []);

  // Form States
  // 4. New Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    caseId: '',
    assignedTo: 'أ. أحمد منصور الهاشمي',
    dueDate: new Date().toISOString().split('T')[0]
  });

  // 5. New Transaction Form
  const [transactionForm, setTransactionForm] = useState({
    caseId: '',
    type: 'أتعاب' as 'أتعاب' | 'مصروفات دعوى' | 'مصاريف مكتب تشغيلية',
    ioType: 'وارد (income)' as 'وارد (income)' | 'صادر (expense)',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'نقدي' as 'نقدي' | 'فودافون كاش / محفظة' | 'تحويل بنكي' | 'شيك'
  });

  // 6. New Bailiff Paper Form
  const [bailiffForm, setBailiffForm] = useState({
    title: '',
    paperNumber: '',
    submissionDate: new Date().toISOString().split('T')[0],
    receiptDate: '',
    courtName: '',
    courtLocation: '',
    status: 'قيد الإعلان والتسليم' as 'تم الاستلام والتسليم' | 'قيد الإعلان والتسليم' | 'مرتد لعدم الاستدلال' | 'مؤجل للإعادة',
    opponentName: '',
    caseId: '',
    notes: ''
  });

  // 7. Office Profile Form
  const [officeForm, setOfficeForm] = useState({
    officeName: officeProfile?.officeName || '',
    managingPartner: officeProfile?.managingPartner || '',
    barId: officeProfile?.barId || '',
    taxId: officeProfile?.taxId || '',
    phone: officeProfile?.phone || '',
    email: officeProfile?.email || '',
    address: officeProfile?.address || '',
    courtJurisdiction: officeProfile?.courtJurisdiction || ''
  });

  // Keep officeForm in sync when officeProfile changes
  useEffect(() => {
    if (officeProfile) {
      setOfficeForm({
        officeName: officeProfile.officeName || '',
        managingPartner: officeProfile.managingPartner || '',
        barId: officeProfile.barId || '',
        taxId: officeProfile.taxId || '',
        phone: officeProfile.phone || '',
        email: officeProfile.email || '',
        address: officeProfile.address || '',
        courtJurisdiction: officeProfile.courtJurisdiction || ''
      });
    }
  }, [officeProfile]);

  // 1. New Client Form
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    nationalId: '',
    address: '',
    email: '',
    notes: '',
    addPoa: false,
    poaNumber: '',
    poaOffice: '',
    poaType: 'عام قضايا' as 'عام قضايا' | 'خاص قضايا' | 'توكيل شامل'
  });

  // 2. New Case Form
  const [caseForm, setCaseForm] = useState({
    caseNumber: '',
    year: new Date().getFullYear().toString(),
    court: '',
    circuit: '',
    type: CaseType.CIVIL,
    litigationLevel: getLitigationLevels()[0] || 'ابتدائي (جزئي/كلي)',
    clientId: '',
    clientRole: ClientRole.PLAINTIFF,
    opponentName: '',
    opponentLawyer: '',
    claimSubject: '',
    notes: '',
    totalFees: '',
    paidFees: '0',
    createdAt: new Date().toISOString().split('T')[0]
  });

  // 3. New Session Form
  const [sessionForm, setSessionForm] = useState({
    caseId: '',
    date: new Date().toISOString().split('T')[0],
    objective: '',
    useCaseDefaults: true,
    customCourt: '',
    customCircuit: '',
    judgeName: '',
    notes: ''
  });

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Switch Tab label translations
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'رئيسية المكتب الاستشارية';
      case 'cases': return 'تداولات القضايا والدعاوى';
      case 'clients': return 'دفتر الموكلين والشركات';
      case 'calendar': return 'روزنامة وجدول الجلسات';
      case 'tasks': return 'المهام والإنذار المبكر';
      case 'documents': return 'خزينة المستندات والـ OCR';
      case 'templates': return 'إنشاء العقود والدعاوى التفاعلية';
      case 'legal-library': return 'بوابة التشريعات والمكتبة القانونية';
      case 'financials': return 'الحسابات والمعاملات المالية';
      case 'database': return 'هندسة وقواميس البيانات';
      case 'settings': return 'الإعدادات التشغيلية والضبط البرمجي';
      default: return 'منصة العمل';
    }
  };

  // Submit Client
  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.phone || !clientForm.nationalId) {
      await showAlert('الرجاء التأكد من إدخال الاسم، المحمول، والرقم القومي بالكامل');
      return;
    }

    if (clientForm.nationalId.length !== 14) {
      await showAlert('الرقم القومي المصري يجب أن يتكون من ١٤ رقماً بالتمام');
      return;
    }

    const newClient: Client = {
      id: 'client_' + Date.now(),
      name: clientForm.name,
      phone: clientForm.phone,
      nationalId: clientForm.nationalId,
      address: clientForm.address || 'القاهرة، مصر',
      email: clientForm.email || undefined,
      notes: clientForm.notes || undefined,
      poas: clientForm.addPoa && clientForm.poaNumber ? [{
        id: 'poa_' + Date.now(),
        poaNumber: clientForm.poaNumber,
        office: clientForm.poaOffice || 'مكتب توثيق نموذجي',
        type: clientForm.poaType,
        date: new Date().toISOString().split('T')[0]
      }] : [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddClient(newClient);
    setActiveModal(null);
    showToast(`تم قيد الموكل الجديد "${newClient.name}" وإثبات بياناته بنجاح`);
    
    // reset form
    setClientForm({
      name: '',
      phone: '',
      nationalId: '',
      address: '',
      email: '',
      notes: '',
      addPoa: false,
      poaNumber: '',
      poaOffice: '',
      poaType: 'عام قضايا'
    });
  };

  // Submit Case
  const handleCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseForm.caseNumber || !caseForm.clientId || !caseForm.court || !caseForm.circuit) {
      await showAlert('يرجى اختيار الموكل وتعبئة رقم القضية للمتابعة القضائية المستندة');
      return;
    }

    const linkedClient = clients.find(c => c.id === caseForm.clientId);
    if (!linkedClient) return;

    const newCase: Case = {
      id: 'case_' + Date.now(),
      caseNumber: caseForm.caseNumber,
      year: caseForm.year,
      court: caseForm.court,
      circuit: caseForm.circuit,
      type: caseForm.type,
      litigationLevel: caseForm.litigationLevel,
      clientId: caseForm.clientId,
      clientName: linkedClient.name,
      clientRole: caseForm.clientRole,
      opponentName: caseForm.opponentName || 'قيد التحديد',
      opponentLawyer: caseForm.opponentLawyer || undefined,
      status: CaseStatus.ACTIVE,
      claimSubject: caseForm.claimSubject || 'طلب تعويض ومستندات موضوعية',
      notes: caseForm.notes || undefined,
      totalFees: parseFloat(caseForm.totalFees) || 0,
      paidFees: parseFloat(caseForm.paidFees) || 0,
      createdAt: caseForm.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    onAddCase(newCase);
    setActiveModal(null);
    showToast(`تم قيّد الدعوى رقم "${newCase.caseNumber}" لصالح الموكل بنجاح`);

    // reset form
    setCaseForm({
      caseNumber: '',
      year: new Date().getFullYear().toString(),
      court: '',
      circuit: '',
      type: CaseType.CIVIL,
      litigationLevel: litigationLevels[0] || 'ابتدائي (جزئي/كلي)',
      clientId: '',
      clientRole: ClientRole.PLAINTIFF,
      opponentName: '',
      opponentLawyer: '',
      claimSubject: '',
      notes: '',
      totalFees: '',
      paidFees: '0',
      createdAt: new Date().toISOString().split('T')[0]
    });
  };

  // Submit Session
  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.caseId || !sessionForm.objective) {
      await showAlert('يرجى اختيار القضية وتدوين الغرض المطلوب بالجلسة');
      return;
    }

    const linkedCase = cases.find(c => c.id === sessionForm.caseId);
    if (!linkedCase) return;

    const newSession: Session = {
      id: 'session_' + Date.now(),
      caseId: sessionForm.caseId,
      caseNumber: linkedCase.caseNumber,
      clientName: linkedCase.clientName,
      date: sessionForm.date,
      court: sessionForm.useCaseDefaults ? linkedCase.court : (sessionForm.customCourt || linkedCase.court),
      circuit: sessionForm.useCaseDefaults ? linkedCase.circuit : (sessionForm.customCircuit || linkedCase.circuit),
      objective: sessionForm.objective,
      status: 'قادمة',
      judgeName: sessionForm.judgeName || undefined,
      notes: sessionForm.notes || undefined
    };

    onAddSession(newSession);
    setActiveModal(null);
    showToast(`تم جدولة الجلسة القادمة لـ ${newSession.date} بالقضية ${newSession.caseNumber}`);

    // reset form
    setSessionForm({
      caseId: '',
      date: new Date().toISOString().split('T')[0],
      objective: '',
      useCaseDefaults: true,
      customCourt: '',
      customCircuit: '',
      judgeName: '',
      notes: ''
    });
  };

  // Submit Task
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.dueDate) {
      await showAlert('يرجى كتابة عنوان التكليف وتحديد تاريخ الاستحقاق');
      return;
    }
    const linkedCase = cases.find(c => c.id === taskForm.caseId);
    const newTask: LawTask = {
      id: 'task_' + Date.now(),
      title: taskForm.title,
      description: taskForm.description || '',
      caseId: taskForm.caseId || '',
      caseNumber: linkedCase ? linkedCase.caseNumber : 'عام',
      assignedTo: taskForm.assignedTo,
      dueDate: taskForm.dueDate,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0]
    };
    if (onAddTask) {
      onAddTask(newTask);
      setActiveModal(null);
      showToast(`تم إسناد التكليف الجديد "${newTask.title}" بنجاح`);
      setTaskForm({
        title: '',
        description: '',
        caseId: '',
        assignedTo: 'أ. أحمد منصور الهاشمي',
        dueDate: new Date().toISOString().split('T')[0]
      });
    }
  };

  // Submit Transaction
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionForm.amount || isNaN(parseFloat(transactionForm.amount))) {
      await showAlert('يرجى إدخال مبلغ صحيح وصالح للمعاملة المالية');
      return;
    }
    const linkedCase = cases.find(c => c.id === transactionForm.caseId);
    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      caseId: transactionForm.caseId || undefined,
      caseNumber: linkedCase ? linkedCase.caseNumber : undefined,
      clientName: linkedCase ? linkedCase.clientName : 'معاملة تشغيلية عامة',
      type: transactionForm.type,
      ioType: transactionForm.ioType,
      amount: parseFloat(transactionForm.amount),
      date: transactionForm.date,
      description: transactionForm.description || transactionForm.type,
      paymentMethod: transactionForm.paymentMethod
    };
    if (onAddTransaction) {
      onAddTransaction(newTx);
      setActiveModal(null);
      showToast(`تم تقييد السند المالي بقيمة ${newTx.amount} ج.م بنجاح`);
      setTransactionForm({
        caseId: '',
        type: 'أتعاب',
        ioType: 'وارد (income)',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'نقدي'
      });
    }
  };

  // Submit Bailiff Paper
  const handleBailiffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bailiffForm.title || !bailiffForm.paperNumber) {
      await showAlert('يرجى تحديد موضوع الإعلان ورقم ورقة المحضرين');
      return;
    }
    const linkedCase = cases.find(c => c.id === bailiffForm.caseId);
    const newPaper: BailiffPaper = {
      id: 'bailiff_' + Date.now(),
      title: bailiffForm.title,
      paperNumber: bailiffForm.paperNumber,
      submissionDate: bailiffForm.submissionDate,
      receiptDate: bailiffForm.receiptDate || '',
      courtName: bailiffForm.courtName || 'محكمة الأسرة المختصة',
      courtLocation: bailiffForm.courtLocation || 'القاهرة',
      status: bailiffForm.status,
      opponentName: bailiffForm.opponentName || 'قيد التحديد',
      caseId: bailiffForm.caseId || undefined,
      caseNumber: linkedCase ? linkedCase.caseNumber : undefined,
      notes: bailiffForm.notes || undefined
    };
    if (onAddBailiffPaper) {
      onAddBailiffPaper(newPaper);
      setActiveModal(null);
      showToast(`تم قيد بيان المحضرين رقم "${newPaper.paperNumber}" بنجاح`);
      setBailiffForm({
        title: '',
        paperNumber: '',
        submissionDate: new Date().toISOString().split('T')[0],
        receiptDate: '',
        courtName: '',
        courtLocation: '',
        status: 'قيد الإعلان والتسليم',
        opponentName: '',
        caseId: '',
        notes: ''
      });
    }
  };

  // Submit Office Profile
  const handleOfficeProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeForm.officeName || !officeForm.managingPartner) {
      await showAlert('يرجى كتابة اسم المكتب والمدير المسؤول للترويسة الرسمية');
      return;
    }
    if (onUpdateOfficeProfile) {
      // الـ Context سيقوم بـ localStorage.setItem تلقائياً ويُبلّغ كل المكونات
      onUpdateOfficeProfile({
        officeName: officeForm.officeName,
        managingPartner: officeForm.managingPartner,
        barId: officeForm.barId,
        taxId: officeForm.taxId,
        phone: officeForm.phone,
        email: officeForm.email,
        address: officeForm.address,
        courtJurisdiction: officeForm.courtJurisdiction
      });

      setActiveModal(null);
      showToast('تم حفظ وتحديث بيانات المكتب الهوية المهنية الرسمية بنجاح!');
    }
  };

  return (
    <div className="w-full relative z-40" id="quick-action-header-root">
      
      {/* HEADER BAR */}
      <header className="bg-white border border-slate-200 rounded-lg p-3 px-4 shadow-xs flex justify-between items-center z-50 relative">
        
        {/* Title contextual area */}
        <div className="flex items-center gap-2">
          {activeTab !== 'dashboard' && onNavigate && (
            <div className="flex items-center gap-1.5 me-2" dir="rtl">
              <button
                onClick={() => onNavigate('back')}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="العودة للقائمة السابقة"
                id="header-back-btn"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-550" />
                <span>رجوع</span>
              </button>
              <button
                onClick={() => onNavigate('home')}
                className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="الرئيسية"
                id="header-home-btn"
              >
                <Home className="w-3.5 h-3.5 text-slate-550" />
                <span className="hidden xs:inline">الرئيسية</span>
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1"></div>
            </div>
          )}
          <div className="p-1 px-2.5 bg-slate-900 text-white rounded font-bold text-xs">
            {getTabLabel(activeTab)}
          </div>
          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
          {officeProfile?.logoDataUrl && (
            <img src={officeProfile.logoDataUrl} alt="شعار" className="h-6 w-6 rounded object-contain hidden sm:block" />
          )}
          <span className="text-slate-400 text-xs hidden sm:block font-medium">{officeProfile?.officeName || 'مكتب المستشار أحمد منصور للمحاماة والاستشارات القانونية'}</span>
        </div>

        {/* Action Menu Trigger container */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3.5 rounded shadow-sm flex items-center gap-2 transition cursor-pointer"
            id="quick-actions-dropdown-trigger"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-100 fill-indigo-100" />
            <span>الإجراءات السريعة</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Dropdown Panel */}
            {dropdownOpen && (
              <>
                {/* Click outside backdrop */}
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setDropdownOpen(false)}
                ></div>

                <div
                  className="absolute start-0 mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-2xl py-2.5 z-50 font-sans text-end animate-fade-in-down"
                  id="quick-actions-menu-panel"
                >
                  <div className="px-3 pb-1 border-b border-slate-100 mb-1.5 flex justify-between items-center">
                    <span className="text-[10px] text-slate-450 font-bold">بوابة الإجراءات السريعة</span>
                    <span className="p-0.5 bg-indigo-50 text-indigo-700 text-[9px] rounded px-1.5 font-bold">نشط</span>
                  </div>

                  <div className="px-3 py-1 text-[10px] text-slate-400 font-bold mb-1">
                    إضافات وقيد سريع لجميع الأقسام:
                  </div>

                  <button
                    onClick={() => {
                      setActiveModal('case');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-case"
                  >
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>قيد قضية جديدة</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">قضايا</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal('client');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-client"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>إحصاء موكل جديد</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">موكلين</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal('session');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-session"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>حجز وجدولة جلسة قضائية</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">جلسات</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal('task');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-task"
                  >
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>إسناد تكليف أو مهمة جديدة</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">مهام</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal('transaction');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-transaction"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                      <span>تسجيل إيصال مالي (وارد/صادر)</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">حسابات</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal('bailiff');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition"
                    id="quick-action-new-bailiff"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>قيد بيان محضُرين جديد</span>
                    </div>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">محضرين</span>
                  </button>

                  <div className="border-t border-slate-100 my-1.5"></div>

                  <div className="px-3 py-1 text-[10px] text-slate-400 font-bold mb-1">
                    التعديل والتحكم المركزي السريع:
                  </div>

                  <button
                    onClick={() => {
                      setActiveModal('quick-control');
                      setDropdownOpen(false);
                    }}
                    className="w-full text-end px-3 py-2 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-2.5 transition font-semibold"
                    id="quick-action-control-center"
                  >
                    <Sliders className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <div className="text-end">
                      <p className="text-xs font-bold text-indigo-900">مركز التعديل السريع للأقسام</p>
                      <p className="text-[9px] text-indigo-700 font-normal">تعديل بيانات المكتب، مستويات التقاضي وحالات التشغيل</p>
                    </div>
                  </button>
                </div>
              </>
            )}
        </div>
      </header>

      {/* MODAL WINDOWS CONTROLLER */}
        {activeModal && (
          <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center p-4 z-50 overflow-y-auto">
            {/* Click backdrop to exit */}
            <div className="absolute inset-0 cursor-default" onClick={() => setActiveModal(null)}></div>
            
            <div
              className={`bg-white border border-slate-200 rounded-lg shadow-xl w-full ${activeModal === 'quick-control' ? 'max-w-4xl' : 'max-w-lg'} p-5 z-10 max-h-[90vh] overflow-y-auto relative text-end font-sans animate-fade-in-up`}
              dir="rtl"
              id={`quick-add-${activeModal}-modal`}
            >
              {/* Close Button button */}
              <button
                onClick={() => setActiveModal(null)}
                className="absolute start-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>

              {/* MODAL 1: NEW CLIENT */}
              {activeModal === 'client' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">إثبات مِلَف موكل جديد</h3>
                      <p className="text-[11px] text-slate-500">تسجيل موكل أو شركة جديدة بالدفتر العام تمهيداً لتوثيق قضاياها وعقودها.</p>
                    </div>
                  </div>

                    <form onSubmit={handleClientSubmit} noValidate className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">الاسم الرباعي للموكل *</label>
                        <input 
                          type="text"
                          required
                          value={clientForm.name}
                          onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                          placeholder="مثال: أحمد عبد الله محمود محمد"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">رقم الهاتف المحمول *</label>
                        <input 
                          type="tel"
                          required
                          value={clientForm.phone}
                          onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                          placeholder="01xxxxxxxxx"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">الرقم القومي المصري (١٤ رقم) *</label>
                        <input 
                          type="text"
                          required
                          maxLength={14}
                          value={clientForm.nationalId}
                          onChange={(e) => setClientForm({...clientForm, nationalId: e.target.value.replace(/\D/g, '')})}
                          placeholder="290xxxxxxxxxxx"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">البريد الإلكتروني (اختياري)</label>
                        <input 
                          type="email"
                          value={clientForm.email}
                          onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                          placeholder="client@law.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">الموطن القانوني المختار وعنوان المراسلة</label>
                      <input 
                        type="text"
                        value={clientForm.address}
                        onChange={(e) => setClientForm({...clientForm, address: e.target.value})}
                        placeholder="مثال: ش 15، الهرم، الجيزة"
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">هوامش وملاحظات عن الموكل</label>
                      <textarea 
                        value={clientForm.notes}
                        onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                        placeholder="أية تفاصيل ذات أهمية قصوى للمحامين المعنيين..."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Nested Add Power of Attorney toggler */}
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-[11px]">
                        <input 
                          type="checkbox"
                          checked={clientForm.addPoa}
                          onChange={(e) => setClientForm({...clientForm, addPoa: e.target.checked})}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        إضافة بيانات التوكيل الرسمي للشهر العقاري فوراً؟
                      </label>

                      {clientForm.addPoa && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold block">رقم التوكيل</label>
                            <input 
                              type="text"
                              value={clientForm.poaNumber}
                              onChange={(e) => setClientForm({...clientForm, poaNumber: e.target.value})}
                              placeholder="م/١٢٤٥ لسنة ٢٠٢٦"
                              className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold block">مكتب التوثيق</label>
                            <input 
                              type="text"
                              value={clientForm.poaOffice}
                              onChange={(e) => setClientForm({...clientForm, poaOffice: e.target.value})}
                              placeholder="الأهرام النموذجي"
                              className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold block">نوع التوكيل</label>
                            <select
                              value={clientForm.poaType}
                              onChange={(e) => setClientForm({...clientForm, poaType: e.target.value as any})}
                              className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                            >
                              <option value="عام قضايا">عام قضايا</option>
                              <option value="خاص قضايا">خاص قضايا</option>
                              <option value="توكيل شامل">توكيل شامل</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-4 rounded font-bold shadow-xs"
                      >
                        قيد الموكل بالدفتر
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODAL 2: NEW CASE */}
              {activeModal === 'case' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">قيد دعوى وقضية جديدة</h3>
                      <p className="text-[11px] text-slate-500">إدخال بيانات الدعوى، المحكمة المختصة والخصوم، وضبط اتزان مبالغ الأتعاب بالدفاتر.</p>
                    </div>
                  </div>

                  {clients.length === 0 ? (
                    <div className="py-8 text-center text-slate-450 text-xs space-y-2">
                      <AlertCircle className="w-8 h-8 text-indigo-500 mx-auto" />
                      <p>لم يتم العثور على أي موكلين مسجلين مسبقاً بقاعدة الفولاذية.</p>
                      <button
                        type="button"
                        onClick={() => setActiveModal('client')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        انقر هنا لإدخال الموكل أولاً ➜
                      </button>
                    </div>
                  ) : (
                      <form onSubmit={handleCaseSubmit} noValidate className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">الموكل صاحب القضية *</label>
                          <select
                            required
                            value={caseForm.clientId}
                            onChange={(e) => setCaseForm({...caseForm, clientId: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="">-- اختر موكلاً مسجلاً --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.name} - رقم قومي: {c.nationalId}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">صفة الموكل بالدعوى *</label>
                          <select
                            value={caseForm.clientRole}
                            onChange={(e) => setCaseForm({...caseForm, clientRole: e.target.value as any})}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {Object.values(ClientRole).map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="space-y-1 col-span-1">
                          <label className="font-bold text-slate-700 block text-[11px]">رقم القضية الرسمي *</label>
                          <input 
                            type="text"
                            required
                            value={caseForm.caseNumber}
                            onChange={(e) => setCaseForm({...caseForm, caseNumber: e.target.value})}
                            placeholder="مثال: ١٤٢٣"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">السنة القضائية *</label>
                          <input 
                            type="text"
                            required
                            value={caseForm.year}
                            onChange={(e) => setCaseForm({...caseForm, year: e.target.value})}
                            placeholder="مثال: ٢٠٢٦"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">تاريخ تسجيل القضية *</label>
                          <input 
                            type="date"
                            required
                            value={caseForm.createdAt}
                            onChange={(e) => setCaseForm({...caseForm, createdAt: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">مجمع ومطاف المحاكم المختص *</label>
                          <input 
                            type="text"
                            required
                            value={caseForm.court}
                            onChange={(e) => setCaseForm({...caseForm, court: e.target.value})}
                            placeholder="مثال: محكمة شمال القاهرة الكلية"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">الدائرة المتخصصة بالجلوس *</label>
                          <input 
                            type="text"
                            required
                            value={caseForm.circuit}
                            onChange={(e) => setCaseForm({...caseForm, circuit: e.target.value})}
                            placeholder="مثال: دائرة ١٢ مدني مستأنف"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">نوع وتصنيف الدعوى</label>
                          <select
                            value={caseForm.type}
                            onChange={(e) => setCaseForm({...caseForm, type: e.target.value as any})}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs"
                          >
                            {Object.values(CaseType).map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">أعلى درجة تقاضي متداولة</label>
                          <select
                            value={caseForm.litigationLevel}
                            onChange={(e) => setCaseForm({...caseForm, litigationLevel: e.target.value as any})}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-800"
                          >
                            {litigationLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">الخصم العنيد المدعي/عليه</label>
                          <input 
                            type="text"
                            value={caseForm.opponentName}
                            onChange={(e) => setCaseForm({...caseForm, opponentName: e.target.value})}
                            placeholder="الاسم الكامل للخصم"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[11px]">محامي وأستاذ الخصم</label>
                          <input 
                            type="text"
                            value={caseForm.opponentLawyer}
                            onChange={(e) => setCaseForm({...caseForm, opponentLawyer: e.target.value})}
                            placeholder="وكيل الخصم بمصر"
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">موضوع عريضة الدعوى الكلي</label>
                        <input 
                          type="text"
                          value={caseForm.claimSubject}
                          onChange={(e) => setCaseForm({...caseForm, claimSubject: e.target.value})}
                          placeholder="مثال: المطالبة بقيمة سند الملكية للعين المشفوعة"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded border border-slate-150">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[10px]">إجمالي الأتعاب المتفق عليها (EGP)</label>
                          <input 
                            type="number"
                            value={caseForm.totalFees}
                            onChange={(e) => setCaseForm({...caseForm, totalFees: e.target.value})}
                            placeholder="المبلغ الإجمالي"
                            className="w-full bg-white border border-slate-200 rounded p-1 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[10px]">المقدم من الأتعاب المدفوع فورا</label>
                          <input 
                            type="number"
                            value={caseForm.paidFees}
                            onChange={(e) => setCaseForm({...caseForm, paidFees: e.target.value})}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded p-1 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-4 rounded font-bold shadow-xs"
                        >
                          تسجيل وقيد الدعوى
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* MODAL 3: NEW SESSION */}
              {activeModal === 'session' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">حجز وجدولة جلسة قضائية جديدة</h3>
                      <p className="text-[11px] text-slate-500">تثبيت ميعاد وأجل الجلسات المتعاقبة بالدعاوى لمنع فوات المواعيد المقررة بمصر.</p>
                    </div>
                  </div>

                  {cases.length === 0 ? (
                    <div className="py-8 text-center text-slate-450 text-xs space-y-2">
                      <AlertCircle className="w-8 h-8 text-indigo-500 mx-auto" />
                      <p>لا تتواجد أي قضايا مسجلة بالنظام لجدولة الجلسات عليها.</p>
                      <button
                        type="button"
                        onClick={() => setActiveModal('case')}
                        className="text-indigo-600 hover:underline font-bold"
                      >
                        انقر لإنشاء القضية الأولى الآن ➜
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSessionSubmit} noValidate className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">القضية المرجعية المستهدفة بالجلسة *</label>
                        <select
                          required
                          value={sessionForm.caseId}
                          onChange={(e) => setSessionForm({...sessionForm, caseId: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                        >
                          <option value="">-- اختر ملف القضية --</option>
                          {cases.map(cs => (
                            <option key={cs.id} value={cs.id}>{cs.caseNumber} - {cs.clientName} (محكمة: {cs.court})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">تاريخ انعقاد الجلسة والآجل القضائي *</label>
                        <input 
                          type="date"
                          required
                          value={sessionForm.date}
                          onChange={(e) => setSessionForm({...sessionForm, date: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">المطلوب بالجلسة وتهيئة الدعوى للمرافعة *</label>
                        <textarea 
                          required
                          value={sessionForm.objective}
                          onChange={(e) => setSessionForm({...sessionForm, objective: e.target.value})}
                          placeholder="مثال: تقديم المذكرات الجوابية النهائي وإثبات كيدية الاتهامات بمستندات التوثيق..."
                          rows={3}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none font-sans"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">اسم القاضي المختص بالدائرة</label>
                        <input 
                          type="text"
                          value={sessionForm.judgeName}
                          onChange={(e) => setSessionForm({...sessionForm, judgeName: e.target.value})}
                          placeholder="اسم القاضي"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">ملاحظات وتوجيهات للجلسة</label>
                        <input 
                          type="text"
                          value={sessionForm.notes}
                          onChange={(e) => setSessionForm({...sessionForm, notes: e.target.value})}
                          placeholder="ملاحظات..."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Fallback to custom court settings option */}
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-[11px]">
                          <input 
                            type="checkbox"
                            checked={sessionForm.useCaseDefaults}
                            onChange={(e) => setSessionForm({...sessionForm, useCaseDefaults: e.target.checked})}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          اعتماد المحكمة والدائرة المسجلتين بملف القضية تلقائياً
                        </label>

                        {!sessionForm.useCaseDefaults && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 block">المحكمة المغايرة</label>
                              <input 
                                type="text"
                                value={sessionForm.customCourt}
                                onChange={(e) => setSessionForm({...sessionForm, customCourt: e.target.value})}
                                placeholder="مثال: شمال الجيزة الكلية"
                                className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-500 block">الدائرة المغيرة</label>
                              <input 
                                type="text"
                                value={sessionForm.customCircuit}
                                onChange={(e) => setSessionForm({...sessionForm, customCircuit: e.target.value})}
                                placeholder="مثال: دائرة ٥ استئناف"
                                className="w-full bg-white border border-slate-200 rounded p-1 text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded font-bold shadow-xs"
                        >
                          جدولة الجلسة بالدفتر
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* MODAL: NEW TASK */}
              {activeModal === 'task' && (
                <div className="space-y-4 text-end">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <CheckSquare className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">إسناد تكليف أو مهمة إدارية جديدة</h3>
                      <p className="text-[11px] text-slate-500 font-medium">عيّن تكلِيفاً للمستشارين أو الزملاء مع ربطه بملف دعوى إن وجد.</p>
                    </div>
                  </div>

                    <form onSubmit={handleTaskSubmit} noValidate className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">عنوان التكليف / المهمة *</label>
                      <input
                        type="text"
                        required
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                        placeholder="مثال: تقديم مستندات مذكرة الرد أو استخراج شهادة من الجدول"
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">الوصف والتوجيهات</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({...taskForm, description: e.target.value})}
                        placeholder="دون هنا التفاصيل أو المستندات المحددة المطلوب تجهيزها..."
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end h-20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">الدعوى المرتبطة (اختياري)</label>
                        <select
                          value={taskForm.caseId}
                          onChange={(e) => setTaskForm({...taskForm, caseId: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        >
                          <option value="">-- مهمة عامة / غير مرتبطة بقضية --</option>
                          {cases.map(c => (
                            <option key={c.id} value={c.id}>
                              رقم {c.caseNumber} لسنة {c.year} ({c.clientName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">تاريخ الاستحقاق *</label>
                        <input
                          type="date"
                          required
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">الشخص المكلف بالعمل</label>
                      <select
                        value={taskForm.assignedTo}
                        onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                      >
                        <option value="أ. أحمد منصور الهاشمي">أ. أحمد منصور الهاشمي (المحامي الشريك)</option>
                        <option value="أ. يوسف محمد الجندي">أ. يوسف محمد الجندي (محامي استئناف)</option>
                        <option value="أ. سارة سليم علام">أ. سارة سليم علام (محامية جنائي)</option>
                        <option value="إدارة المتابعة والمكتب الفني">إدارة المتابعة والمكتب الفني</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white py-1.5 px-4 rounded font-bold text-xs shadow-xs"
                      >
                        إسناد التكليف فوراً
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODAL: NEW TRANSACTION */}
              {activeModal === 'transaction' && (
                <div className="space-y-4 text-end">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">تسجيل حركة مالية بالدفتر اليومي</h3>
                      <p className="text-[11px] text-slate-500 font-medium">قيد فوري للمقبوضات من الموكلين أو المصروفات الإدارية والقضائية لضبط ميزانية المكتب.</p>
                    </div>
                  </div>

                    <form onSubmit={handleTransactionSubmit} noValidate className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">نوع الحركة المالية *</label>
                        <select
                          value={transactionForm.ioType}
                          onChange={(e) => setTransactionForm({...transactionForm, ioType: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end font-bold"
                        >
                          <option value="وارد (income)" className="text-emerald-700 font-bold">وارد - إيراد (Income) [➕]</option>
                          <option value="صادر (expense)" className="text-rose-700 font-bold">صادر - مصروف (Expense) [➖]</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">المبلغ (جنية مصري) *</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={transactionForm.amount}
                          onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end font-bold text-slate-900 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">التصنيف الرئيسي للمعاملة</label>
                        <select
                          value={transactionForm.type}
                          onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        >
                          <option value="أتعاب">دفعة أتعاب محاماة</option>
                          <option value="مصروفات دعوى">رسوم ومصروفات دعوى قضائية</option>
                          <option value="مصاريف مكتب تشغيلية">مصاريف مكتب تشغيلية وإدارية</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">طريقة الدفع أو التحصيل</label>
                        <select
                          value={transactionForm.paymentMethod}
                          onChange={(e) => setTransactionForm({...transactionForm, paymentMethod: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        >
                          <option value="نقدي">نقدي (كاش في المكتب)</option>
                          <option value="فودافون كاش / محفظة">فودافون كاش / محفظة إلكترونية</option>
                          <option value="تحويل بنكي">تحويل بنكي مباشر</option>
                          <option value="شيك">شيك بنكي مقبول الدفع</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">ربط بملف دعوى (اختياري)</label>
                      <select
                        value={transactionForm.caseId}
                        onChange={(e) => setTransactionForm({...transactionForm, caseId: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                      >
                        <option value="">-- مصروفات تشغيلية عامة للمكتب --</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>
                            دعوى {c.caseNumber} لسنة {c.year} - الموكل: {c.clientName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">التاريخ</label>
                        <input
                          type="date"
                          required
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">البيان والتفاصيل</label>
                        <input
                          type="text"
                          value={transactionForm.description}
                          onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                          placeholder="تفاصيل إضافية عن السند المالي..."
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded font-bold text-xs shadow-xs"
                      >
                        حفظ وقيد المعاملة المالية
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODAL: NEW BAILIFF PAPER */}
              {activeModal === 'bailiff' && (
                <div className="space-y-4 text-end">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-150">
                    <FileText className="w-5 h-5 text-rose-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">تسجيل بيان أو ورقة محضُرين جديدة</h3>
                      <p className="text-[11px] text-slate-500 font-medium">متابعة دقيقة لإعلانات الدعاوى والأحكام في الأقسام والمحاكم المختلفة لمنع سقوط المدد.</p>
                    </div>
                  </div>

                    <form onSubmit={handleBailiffSubmit} noValidate className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">موضوع الإعلان / المحضرين *</label>
                        <input
                          type="text"
                          required
                          value={bailiffForm.title}
                          onChange={(e) => setBailiffForm({...bailiffForm, title: e.target.value})}
                          placeholder="مثال: صحيفة دعوى إخلاء، إعلان بالحكم"
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">رقم ورقة المحضرين / الملف *</label>
                        <input
                          type="text"
                          required
                          value={bailiffForm.paperNumber}
                          onChange={(e) => setBailiffForm({...bailiffForm, paperNumber: e.target.value})}
                          placeholder="مثال: ١٤٢٥ محضري الجيزة"
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">تاريخ تسليم الورقة للمحضرين</label>
                        <input
                          type="date"
                          required
                          value={bailiffForm.submissionDate}
                          onChange={(e) => setBailiffForm({...bailiffForm, submissionDate: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">تاريخ الإعادة المرتقب / الاستلام</label>
                        <input
                          type="date"
                          value={bailiffForm.receiptDate}
                          onChange={(e) => setBailiffForm({...bailiffForm, receiptDate: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">المحكمة التابع لها قلم المحضرين</label>
                        <input
                          type="text"
                          value={bailiffForm.courtName}
                          onChange={(e) => setBailiffForm({...bailiffForm, courtName: e.target.value})}
                          placeholder="مثال: محكمة أسرة الدقي"
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">الجهة / العنوان المطلوب إعلانه</label>
                        <input
                          type="text"
                          value={bailiffForm.courtLocation}
                          onChange={(e) => setBailiffForm({...bailiffForm, courtLocation: e.target.value})}
                          placeholder="العنوان التفصيلي للمعلن إليه..."
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">اسم الخصم / المعلن إليه</label>
                        <input
                          type="text"
                          value={bailiffForm.opponentName}
                          onChange={(e) => setBailiffForm({...bailiffForm, opponentName: e.target.value})}
                          placeholder="اسم الطرف الآخر المطلوب إعلانه..."
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 block">حالة ورقة المحضرين حالياً</label>
                        <select
                          value={bailiffForm.status}
                          onChange={(e) => setBailiffForm({...bailiffForm, status: e.target.value as any})}
                          className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        >
                          <option value="قيد الإعلان والتسليم">قيد الإعلان والتسليم (في حوزة المحضر)</option>
                          <option value="تم الاستلام والتسليم">تم الاستلام والتسليم (معلن رسمياً)</option>
                          <option value="مرتد لعدم الاستدلال">مرتد لعدم الاستدلال (عنوان غير صحيح/مغلق)</option>
                          <option value="مؤجل للإعادة">مؤجل للإعادة (إعادة إعلان)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">ربط بملف دعوى (اختياري)</label>
                      <select
                        value={bailiffForm.caseId}
                        onChange={(e) => setBailiffForm({...bailiffForm, caseId: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                      >
                        <option value="">-- إعلان عام غير مرتبط بملف دعوى --</option>
                        {cases.map(c => (
                          <option key={c.id} value={c.id}>
                            دعوى {c.caseNumber} لسنة {c.year} ({c.clientName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">ملاحظات إضافية وتوجيهات الاستلام</label>
                      <input
                        type="text"
                        value={bailiffForm.notes}
                        onChange={(e) => setBailiffForm({...bailiffForm, notes: e.target.value})}
                        placeholder="أية مستندات أو ملاحظات خاصة بـ قلم المحضرين..."
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveModal(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 px-4 rounded font-bold text-xs shadow-xs"
                      >
                        قيد وإثبات ورقة المحضرين
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* MODAL: QUICK CONTROL HUB */}
              {activeModal === 'quick-control' && (
                <div className="space-y-4 text-end">
                  {/* Title Area */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">مركز الضبط والتعديل السريع للأقسام</h3>
                        <p className="text-[11px] text-slate-500 font-medium">بوابة تحكم موحدة تتيح لك الضبط والتحديث الفوري لمختلف تفاصيل البرنامج من مكان واحد.</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full font-bold">بريميوم</span>
                  </div>

                  {/* Horizontal Tabs switcher */}
                  <div className="flex border-b border-slate-150 gap-1.5 p-1 bg-slate-50 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setControlTab('office')}
                      className={`flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        controlTab === 'office' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Building className="w-3.5 h-3.5" />
                      <span>بيانات المكتب والترويسة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setControlTab('levels')}
                      className={`flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        controlTab === 'levels' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>درجات التقاضي المتاحة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setControlTab('cases')}
                      className={`flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        controlTab === 'cases' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>التحكم السريع بالقضايا</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setControlTab('clients')}
                      className={`flex-1 text-center py-1.5 px-2 text-xs font-bold rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        controlTab === 'clients' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>ضبط الموكلين السريع</span>
                    </button>
                  </div>

                  {/* TAB CONTENT: OFFICE */}
                  {controlTab === 'office' && (
                      <form onSubmit={handleOfficeProfileSubmit} noValidate className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">اسم المكتب الرسمي *</label>
                          <input
                            type="text"
                            required
                            value={officeForm.officeName}
                            onChange={(e) => setOfficeForm({...officeForm, officeName: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">الرئيس المؤسس / الشريك المسؤول *</label>
                          <input
                            type="text"
                            required
                            value={officeForm.managingPartner}
                            onChange={(e) => setOfficeForm({...officeForm, managingPartner: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">رقم القيد بنقابة المحامين</label>
                          <input
                            type="text"
                            value={officeForm.barId}
                            onChange={(e) => setOfficeForm({...officeForm, barId: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">الرقم الضريبي للمكتب (الفاتورة الإلكترونية)</label>
                          <input
                            type="text"
                            value={officeForm.taxId}
                            onChange={(e) => setOfficeForm({...officeForm, taxId: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">هاتف التواصل</label>
                          <input
                            type="text"
                            value={officeForm.phone}
                            onChange={(e) => setOfficeForm({...officeForm, phone: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">البريد الإلكتروني المهني</label>
                          <input
                            type="email"
                            value={officeForm.email}
                            onChange={(e) => setOfficeForm({...officeForm, email: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">العنوان الجغرافي للمقر الرئيسي</label>
                          <input
                            type="text"
                            value={officeForm.address}
                            onChange={(e) => setOfficeForm({...officeForm, address: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700 block">الاختصاص القضائي الأساسي</label>
                          <input
                            type="text"
                            value={officeForm.courtJurisdiction}
                            onChange={(e) => setOfficeForm({...officeForm, courtJurisdiction: e.target.value})}
                            placeholder="مثال: محكمة استئناف القاهرة وجميع المحاكم التابعة"
                            className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setActiveModal(null)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-4 rounded font-bold text-xs"
                        >
                          إلغاء
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded font-bold text-xs shadow-xs"
                        >
                          حفظ وتحديث بيانات الترويسة الفوري
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB CONTENT: LEVELS */}
                  {controlTab === 'levels' && (
                    <div className="space-y-4 pt-1">
                      <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={newLevelInput}
                          onChange={(e) => setNewLevelInput(e.target.value)}
                          placeholder="مثال: القضاء الإداري (مجلس الدولة)، محكمة الأسرة..."
                          className="flex-1 bg-white border border-slate-200 rounded p-1.5 text-xs text-end"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newLevelInput.trim()) return;
                            const updated = [...litigationLevels, newLevelInput.trim()];
                            saveLitigationLevels(updated);
                            setLitigationLevels(updated);
                            setNewLevelInput('');
                            showToast(`تم إضافة درجة التقاضي: "${newLevelInput.trim()}"`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded shrink-0 cursor-pointer"
                        >
                          إضافة مستوى جديد ➕
                        </button>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-slate-500 mb-2">مستويات التقاضي ومحاكم التشغيل الحالية بالبرنامج:</p>
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                          {litigationLevels.map((level, i) => (
                            <div key={i} className="flex justify-between items-center bg-white border border-slate-150 p-2 rounded-md hover:bg-slate-50 transition">
                              <span className="text-xs font-semibold text-slate-800">{level}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (await confirm(`هل تريد بالتأكيد إزالة مستوى التقاضي "${level}"؟`)) {
                                    const updated = litigationLevels.filter(x => x !== level);
                                    saveLitigationLevels(updated);
                                    setLitigationLevels(updated);
                                    showToast(`تم إزالة درجة التقاضي: "${level}"`);
                                  }
                                }}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline"
                              >
                                حذف مستوى ❌
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: CASES */}
                  {controlTab === 'cases' && (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-slate-500 font-bold">تعديل سريع لحالة القضايا وتعديل بياناتها الأساسية فورياً:</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1">
                        {cases.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium">لا توجد قضايا مسجلة بالبرنامج حتى الآن.</div>
                        ) : (
                          cases.map(c => (
                            <div key={c.id} className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-2 hover:shadow-xs transition">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-xs text-slate-900">رقم القضية: {c.caseNumber} / {c.year}</span>
                                  <span className="text-[10px] text-slate-450 block font-medium">الموكل: {c.clientName} (الخصم: {c.opponentName})</span>
                                </div>
                                <select
                                  value={c.status}
                                  onChange={(e) => {
                                    if (onUpdateCase) {
                                      onUpdateCase({ ...c, status: e.target.value as any });
                                      showToast(`تم تغيير حالة القضية رقم ${c.caseNumber} بنجاح`);
                                    }
                                  }}
                                  className="text-[11px] bg-slate-50 border border-slate-200 rounded p-1 font-bold text-end cursor-pointer"
                                >
                                  <option value={CaseStatus.ACTIVE}>متداولة (نشطة ومستمرة)</option>
                                  <option value={CaseStatus.PLEADING}>محجوزة للحكم / المرافعة</option>
                                  <option value={CaseStatus.DISMISSED}>مشطوبة</option>
                                  <option value={CaseStatus.CLOSED}>منتهية ومحفوظة</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-0.5">
                                  <label className="text-[9px] text-slate-400 block font-bold">درجة التقاضي</label>
                                  <select
                                    value={c.litigationLevel}
                                    onChange={(e) => {
                                      if (onUpdateCase) {
                                        onUpdateCase({ ...c, litigationLevel: e.target.value });
                                        showToast(`تم تحديث مستوى التقاضي للدعوى رقم ${c.caseNumber}`);
                                      }
                                    }}
                                    className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded p-1 text-end cursor-pointer"
                                  >
                                    {litigationLevels.map((lvl, index) => (
                                      <option key={index} value={lvl}>{lvl}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-0.5">
                                  <label className="text-[9px] text-slate-400 block font-bold">المحكمة</label>
                                  <input
                                    type="text"
                                    defaultValue={c.court}
                                    onBlur={(e) => {
                                      if (onUpdateCase && e.target.value !== c.court) {
                                        onUpdateCase({ ...c, court: e.target.value });
                                        showToast(`تم تحديث محكمة الدعوى رقم ${c.caseNumber}`);
                                      }
                                    }}
                                    placeholder="المحكمة..."
                                    className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded p-1 text-end"
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: CLIENTS */}
                  {controlTab === 'clients' && (
                    <div className="space-y-3 pt-1">
                      <p className="text-[11px] text-slate-500 font-bold">تعديل فوري وسريع لبيانات التواصل والعناوين الخاصة بالموكلين المسجلين:</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1">
                        {clients.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs font-medium">لا توجد موكلين مسجلين بالبرنامج حتى الآن.</div>
                        ) : (
                          clients.map(cl => (
                            <div key={cl.id} className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-2 hover:shadow-xs transition">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-900">{cl.name}</span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 p-0.5 px-2 rounded-full font-bold">موكل مسجل</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 block font-bold">رقم الهاتف</label>
                                  <input
                                    type="text"
                                    defaultValue={cl.phone}
                                    onBlur={(e) => {
                                      if (onUpdateClient && e.target.value !== cl.phone) {
                                        onUpdateClient({ ...cl, phone: e.target.value });
                                        showToast(`تم تحديث هاتف الموكل: "${cl.name}"`);
                                      }
                                    }}
                                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-end font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] text-slate-400 block font-bold">العنوان التفصيلي</label>
                                  <input
                                    type="text"
                                    defaultValue={cl.address}
                                    onBlur={(e) => {
                                      if (onUpdateClient && e.target.value !== cl.address) {
                                        onUpdateClient({ ...cl, address: e.target.value });
                                        showToast(`تم تحديث عنوان الموكل: "${cl.name}"`);
                                      }
                                    }}
                                    className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded p-1 text-end"
                                  />
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* MODAL FOOTER */}
                  <div className="flex justify-end pt-3 border-t border-slate-150">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-1.5 px-5 rounded shadow-sm transition"
                    >
                      إغلاق نافذة الضبط والتحكم
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      {/* RENDER DYNAMIC SUCCESS TOAST NOTIFICATION */}
        {toastMessage && (
          <div
            className="fixed bottom-5 start-5 z-50 bg-[#1e293b] text-white border border-emerald-500/30 p-3 px-4 rounded-lg shadow-xl flex items-center gap-3 font-sans max-w-sm rounded text-end animate-toast-in"
            dir="rtl"
            id="quick-action-success-toast"
          >
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-full shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-white mb-0.5">عملية ناجحة</p>
              <p className="text-slate-350">{toastMessage}</p>
            </div>
          </div>
        )}
    </div>
  );
});

export default QuickActionHeader;

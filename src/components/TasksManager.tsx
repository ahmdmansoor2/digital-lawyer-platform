/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Briefcase, 
  Check, 
  Trash2, 
  Filter, 
  BellRing,
  HelpCircle,
  ChevronLeft,
  Printer,
  Eye,
  Edit
} from 'lucide-react';
import { LawTask, Case, Session, LegalDeadline, OfficeProfile } from '../types';
import { printSingleTask } from '../utils/printHelper';
import { useConfirm } from '../contexts/ConfirmContext';
import { showAlert } from '../utils/dialogs';
import { useCustomFields, CustomFieldsRenderer } from '../hooks/useCustomFields';

interface TasksManagerProps {
  tasks: LawTask[];
  cases: Case[];
  sessions: Session[];
  deadlines: LegalDeadline[];
  onAddTask: (newTask: LawTask) => void;
  onToggleTaskStatus: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (updatedTask: LawTask) => void;
  officeProfile: OfficeProfile;
}

const TasksManager = React.memo(function TasksManager({
  tasks,
  cases,
  sessions,
  deadlines,
  onAddTask,
  onToggleTaskStatus,
  onDeleteTask,
  onUpdateTask,
  officeProfile
}: TasksManagerProps) {
  const confirm = useConfirm();
  const taskCustomFields = useCustomFields('task');
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'calendar' | 'alerts'>('board');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<LawTask | null>(null);
  
  // Tasks filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  
  // Date context
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];

  const staffOptions = [
    'أ. محمد محمود',
    'أ. أحمد علي',
    'أ. نادين يوسف',
    'أ. محمود عبد السلام'
  ];

  // Task form state
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    caseId: '',
    assignedTo: staffOptions[0],
    dueDate: todayStr,
    time: '',
    customFieldValues: {} as Record<string, any>
  });

  // Calendar render helper state - current visible month
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed represents January, 5 is June)

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Helper calculation for 24h / 48h Alarms based on app reference date '2026-06-21'
  const getAlertStatus = (targetDateStr: string) => {
    const targetDate = new Date(targetDateStr);
    const diffTime = targetDate.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days diff

    if (diffDays === 1) {
      return { alert: true, hours: '24', label: 'تنبيه حرج جداً (٢٤ ساعة)', color: 'bg-red-50 text-red-700 border-red-300' };
    } else if (diffDays === 2) {
      return { alert: true, hours: '48', label: 'تنبيه عاجل (٤٨ ساعة)', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' };
    }
    return { alert: false, hours: '', label: '', color: '' };
  };

  // Compile all alert items (combine sessions, deadlines, and tasks)
  const alarmItems: { id: string; type: 'session' | 'deadline' | 'task'; title: string; linkedCase: string; dateStr: string; alertLabel: string; alarmType: '24' | '48'; original: any }[] = [];

  // 1. Process judicial sessions
  sessions.forEach(s => {
    const check = getAlertStatus(s.date);
    if (check.alert) {
      alarmItems.push({
        id: `sess_${s.id}`,
        type: 'session',
        title: `جلسة نظر دعوى: ${s.objective}`,
        linkedCase: s.caseNumber,
        dateStr: s.date,
        alertLabel: check.label,
        alarmType: check.hours as '24' | '48',
        original: s
      });
    }
  });

  // 2. Process procedural deadlines (مواعيد سقوط الحق)
  deadlines.forEach(d => {
    if (!d.isCompleted) {
      const check = getAlertStatus(d.deadlineDate);
      if (check.alert) {
        alarmItems.push({
          id: `dead_${d.id}`,
          type: 'deadline',
          title: `ميعاد سقوط إجرائي: ${d.title}`,
          linkedCase: d.caseNumber,
          dateStr: d.deadlineDate,
          alertLabel: check.label,
          alarmType: check.hours as '24' | '48',
          original: d
        });
      }
    }
  });

  // 3. Process tasks
  tasks.forEach(t => {
    if (t.status === 'pending') {
      const check = getAlertStatus(t.dueDate);
      if (check.alert) {
        alarmItems.push({
          id: `task_${t.id}`,
          type: 'task',
          title: `مهمة محاماة معلقة: ${t.title}`,
          linkedCase: t.caseNumber,
          dateStr: t.dueDate,
          alertLabel: check.label,
          alarmType: check.hours as '24' | '48',
          original: t
        });
      }
    }
  });

  // Handle task form submit
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.title || !taskFormData.caseId) {
      await showAlert('الرجاء إدخال عنوان المهمة وربطها بقضية معينة');
      return;
    }

    const selectedCase = cases.find(c => c.id === taskFormData.caseId);
    if (!selectedCase) {
      await showAlert('لم يتم العثور على القضية المحددة. قد تكون القضايا لم تُحمل بعد. حاول مرة أخرى.');
      return;
    }

    const newTask: LawTask = {
      id: 'task_' + Date.now(),
      title: taskFormData.title,
      description: taskFormData.description,
      caseId: selectedCase.id,
      caseNumber: selectedCase.caseNumber,
      assignedTo: taskFormData.assignedTo,
      dueDate: taskFormData.dueDate,
      status: 'pending',
      createdAt: todayStr,
      time: taskFormData.time || undefined,
      customFieldValues: Object.keys(taskFormData.customFieldValues).length > 0 ? taskFormData.customFieldValues : undefined
    };

    onAddTask(newTask);
    setIsAddingTask(false);
    setTaskFormData({
      title: '',
      description: '',
      caseId: '',
      assignedTo: staffOptions[0],
      dueDate: todayStr,
      time: ''
    });
  };

  // Filters application
  const filteredTasks = tasks.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesStaff = staffFilter === 'all' || t.assignedTo === staffFilter;
    return matchesStatus && matchesStaff;
  });

  // Calendar grid math
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 is Sunday, ..., 6 is Saturday
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);

  // Month modification
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Get events on a specific calendar day (Sessions, Deadlines, Tasks)
  const getDayEvents = (dayNum: number) => {
    // Format calendar day as YYYY-MM-DD
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const fullDateStr = `${currentYear}-${mStr}-${dStr}`;

    const daySessions = sessions.filter(s => s.date === fullDateStr);
    const dayDeadlines = deadlines.filter(d => d.deadlineDate === fullDateStr);
    const dayTasks = tasks.filter(t => t.dueDate === fullDateStr);

    return {
      sessions: daySessions,
      deadlines: dayDeadlines,
      tasks: dayTasks,
      hasEvents: daySessions.length > 0 || dayDeadlines.length > 0 || dayTasks.length > 0
    };
  };

  return (
    <div className="space-y-4" id="tasks-module-root">
      
      {/* MODULE HEADER AND QUICK SUB-TABS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 left-0 bg-indigo-600/10 w-64 h-64 rounded-full blur-sm transform -translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-mono px-2.5 py-1 rounded-full font-bold">
                مكتب المحامي الرقمي المحترف
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                أجندة المهام اليومية
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              ⚖️ إدارة المهام والأجندة والإنذار المبكر
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              إسناد المهام لأعضاء هيئة الدفاڡ ومراقبة المواعيد القضائية بإنذارات حية تضمن تتبع دائم وشامل لجميع تفاصيل عمل مكتبكم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto z-10">
            {/* Toggle navigation bar */}
            <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700/60 gap-1 text-xs font-bold">
              <button 
                onClick={() => setActiveSubTab('board')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                جدول المهام المكتبية
              </button>
              <button 
                onClick={() => setActiveSubTab('calendar')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                  activeSubTab === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-550" />
                التقويم القضائي التفاعلي
              </button>
              <button 
                onClick={() => setActiveSubTab('alerts')}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 relative cursor-pointer ${
                  activeSubTab === 'alerts' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <BellRing className="w-3.5 h-3.5 text-red-500" />
                التنبيهات السريعة
                {alarmItems.length > 0 && (
                   <span className="absolute -top-1.5 -start-1.5 w-4 h-4 bg-red-600 text-[9px] text-white rounded-full flex items-center justify-center font-bold">
                    {alarmItems.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK GLOBAL WARNING SYSTEM IF THERE ARE DENSE ALARMS */}
      {alarmItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-955 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 bg-red-600 text-white font-bold rounded text-[9px]">تنسيق عاجل جداً</span>
            <p className="font-semibold text-red-900">
              هنالك عدد ({alarmItems.length}) من المواعيد القضائية والجلسات المحسومة قانونياً تقترب خلال الـ ٢٤ أو ٤٨ ساعة القادمة!
            </p>
          </div>
          <button onClick={() => setActiveSubTab('alerts')} className="underline font-bold hover:text-red-950">
            تصفح وجدولة الإنذارات الآن ←
          </button>
        </div>
      )}

      {/* SUB-TAB 1: BOARD VIEW (إلتقاط وإسناد المهام) */}
      {activeSubTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Main tasks list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">أرشيف وجدول المهام القانونية</h3>
                
                {/* Filtration board */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-500">الحالة:</span>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-semibold"
                    >
                      <option value="all">الكل</option>
                      <option value="pending">معلقة</option>
                      <option value="completed">منتهية</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">المُحامي:</span>
                    <select 
                      value={staffFilter} 
                      onChange={(e) => setStaffFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none font-semibold"
                    >
                      <option value="all">كل الموظفين</option>
                      {staffOptions.map(staff => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tasks mapping */}
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  لا توجد مهام مطابقة لخيارات الفرز الحالية.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => {
                    const check = getAlertStatus(task.dueDate);
                    const isOverdue = new Date(task.dueDate) < todayDate && task.status === 'pending';
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`p-3 border rounded-lg transition-all flex items-start justify-between gap-3 ${
                          task.status === 'completed' 
                            ? 'bg-slate-50/50 border-slate-200 opacity-70' 
                            : isOverdue 
                              ? 'bg-red-50/40 border-red-250 hover:bg-red-50/60'
                              : check.alert
                                ? 'bg-indigo-50/50 border-indigo-350 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-indigo-500/30 hover:shadow-xs'
                        }`}
                        id={`task-item-${task.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <button 
                            onClick={() => onToggleTaskStatus(task.id)}
                            className={`p-1 mt-0.5 rounded transition ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-400'
                            }`}
                            id={`task-toggle-btn-${task.id}`}
                          >
                            {task.status === 'completed' ? (
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            ) : (
                              <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded-full" />
                            )}
                          </button>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-xs font-bold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                                {task.title}
                              </h4>
                              {isOverdue && (
                                <span className="bg-red-100 text-red-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  فوات الميعاد!
                                </span>
                              )}
                              {check.alert && (
                                <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5 text-indigo-600 animate-pulse" /> {check.hours} س
                                </span>
                              )}
                            </div>
                            
                            <p className="text-[11px] text-slate-500 leading-normal">
                              {task.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
                              <span className="flex items-center gap-1 font-sans text-slate-500">
                                <Briefcase className="w-3 h-3 opacity-60" /> القضية: {task.caseNumber}
                              </span>
                              <span className="flex items-center gap-1 font-sans text-slate-500">
                                <Users className="w-3 h-3 opacity-60" /> المسؤول: <strong className="text-slate-700">{task.assignedTo}</strong>
                              </span>
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3 opacity-60" /> تسليم: {task.dueDate}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              const relatedCase = cases.find(c => c.caseNumber === task.caseNumber);
                              printSingleTask(task, relatedCase, officeProfile);
                            }}
                            className="p-1 rounded text-slate-500 hover:bg-slate-100/50 hover:text-slate-700 transition cursor-pointer"
                            title="عرض ومعاينة تفاصيل التكليف بالمهمة"
                            id={`task-view-btn-${task.id}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => {
                              const relatedCase = cases.find(c => c.caseNumber === task.caseNumber);
                              printSingleTask(task, relatedCase, officeProfile);
                            }}
                            className="p-1 rounded text-indigo-700 hover:bg-indigo-100/50 hover:text-indigo-800 transition cursor-pointer"
                            title="طباعة تفاصيل التكليف بالمهمة"
                            id={`task-print-btn-${task.id}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                            title="تعديل بيانات التكليف بالمهمة"
                            id={`task-edit-btn-${task.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={async () => {
                              if (await confirm('هل أنت متأكد من حذف هذه المهمɿ')) {
                                onDeleteTask(task.id);
                              }
                            }}
                            className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                            title="حذف المهمة"
                            id={`task-delete-btn-${task.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Create task card */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="pb-1">
                <h3 className="text-xs font-bold text-slate-850">إضافة مهمة جديدة</h3>
                <p className="text-[10px] text-slate-450 leading-normal mt-0.5">قم بإسناد مهمة إدارية أو إجرائية لملف قضية محددة ولعضو من هيئة الدفاع وموظفي المكتب.</p>
              </div>

              <form onSubmit={handleTaskSubmit} className="space-y-2.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">عنوان المهمة الموكلة</label>
                  <input 
                    type="text" 
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({...taskFormData, title: e.target.value})}
                    placeholder="مثال: تقديم مستندات هيئة المساحة"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">تفصيل المطلوب والإرشادات</label>
                  <textarea 
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({...taskFormData, description: e.target.value})}
                    placeholder="اكتب المعيناʡ القرار المطلوب استهدافه، وأسماء الموظفين الآخرين إن وجد..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
                  />
                </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">ربط القضية المرجعية بمصر</label>
                    {cases.length === 0 ? (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded text-[10px] text-indigo-800 font-bold">
                        لا توجد قضايا متاحة حالياً. أضف قضية أولاً في قسم القضايا.
                      </div>
                    ) : (
                      <select 
                        value={taskFormData.caseId}
                        onChange={(e) => setTaskFormData({...taskFormData, caseId: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
                        required
                      >
                        <option value="">-- اختر القضية النشطة --</option>
                        {cases.map((cs) => (
                          <option key={cs.id} value={cs.id}>
                            {cs.caseNumber} - {cs.clientName} ({cs.court})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">اسناد المستشار المسؤول</label>
                    <select 
                      value={taskFormData.assignedTo}
                      onChange={(e) => setTaskFormData({...taskFormData, assignedTo: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans"
                    >
                      {staffOptions.map(staff => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">ميعاد التسليم النهائي</label>
                    <input 
                      type="date" 
                      value={taskFormData.dueDate}
                      onChange={(e) => setTaskFormData({...taskFormData, dueDate: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans font-mono"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">وقت التسليم</label>
                    <input 
                      type="time" 
                      value={taskFormData.time}
                      onChange={(e) => setTaskFormData({...taskFormData, time: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-sans font-mono"
                    />
                  </div>
                </div>

                {taskCustomFields.fields.length > 0 && (
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-black text-indigo-700 uppercase tracking-wider border-b border-indigo-200 pb-1 w-full">حقول إضافية</legend>
                    <CustomFieldsRenderer
                      fields={taskCustomFields.fields}
                      values={taskFormData.customFieldValues}
                      onChange={(fieldId, val) => setTaskFormData({ ...taskFormData, customFieldValues: taskCustomFields.setFieldValue(fieldId, val, taskFormData.customFieldValues) })}
                    />
                  </fieldset>
                )}

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded shadow-sm text-center flex items-center justify-center gap-1.5 transition mt-2 cursor-pointer"
                  id="add-task-submit-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  تسجيل وإسناد المهمة
                </button>
              </form>
            </div>

            <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs">
              <h4 className="font-bold text-slate-755 mb-1.5 flex items-center gap-1">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                المصلحة والمهام في قانون المرافعات:
              </h4>
              <p className="text-[11px] text-slate-500 leading-normal">
                المهام الإجرائية هي العصب الأساسي لحماية الأجل القضائي بمصر. يجب استلام شهادة عدم حصول استئناݡ أو إيداع صحف المذكرات في الآجال المقررة لتفادي سقوط الدعوى أو شطبها.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INTEGRATED SHINY LAW CALENDAR */}
      {activeSubTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Calendar core display */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-col">
            
            {/* Calendar controller header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-wrap gap-2 shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-800">الأجندة والتقويم القضائي لجمهورية مصر العربية</h3>
                <p className="text-[11px] text-slate-500">مرئي للشهر المحدد يعرض الجلساʡ التواريخ الفاصلة والمهام الإجرائية.</p>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 rounded border border-slate-200 p-1">
                <button 
                  onClick={handlePrevMonth} 
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                  id="prev-month-btn"
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2 min-w-[80px] text-center font-sans">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <button 
                  onClick={handleNextMonth} 
                  className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                  id="next-month-btn"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days grid layout */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 bg-slate-50 border-b border-slate-150 py-1.5 rounded-t shrink-0">
              <div>الأحد</div>
              <div>الاثنين</div>
              <div>الثلاثاء</div>
              <div>الأربعاء</div>
              <div>الخميس</div>
              <div>الجمعة</div>
              <div>السبت</div>
            </div>

            {/* Dates cells */}
            <div className="grid grid-cols-7 border-r border-b border-slate-100 flex-1 min-h-[320px]">
              {/* Empty spaces before first day of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="border-l border-t border-slate-100 bg-slate-50/30 p-1 min-h-[50px]" />
              ))}

              {/* Month dates rendering */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const events = getDayEvents(dayNum);
                const isCurrentToday = currentYear === 2026 && currentMonth === 5 && dayNum === 21;

                return (
                  <div 
                    key={`day-${dayNum}`} 
                    className={`border-l border-t border-slate-100 p-1.5 min-h-[65px] flex flex-col justify-between transition hover:bg-slate-50/50 ${
                      isCurrentToday ? 'bg-indigo-50/50 ring-1 ring-indigo-500/30 inset-0' : 'bg-white'
                    }`}
                  >
                    {/* Day number head */}
                    <div className="flex justify-between items-center text-[10px] shrink-0 mb-1">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono ${
                        isCurrentToday ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-700'
                      }`}>
                        {dayNum}
                      </span>
                      {isCurrentToday && (
                        <span className="text-[8px] bg-indigo-200 text-indigo-800 font-bold px-1 rounded font-sans">اليوم</span>
                      )}
                    </div>

                    {/* Events indicators stack */}
                    <div className="space-y-1 overflow-hidden">
                      {/* Sessions count */}
                      {events.sessions.length > 0 && (
                        <div className="bg-blue-50 text-blue-800 text-[8px] px-1 py-0.5 rounded flex items-center justify-between font-bold truncate">
                          <span>🏛️ جلسة ({events.sessions.length})</span>
                        </div>
                      )}

                      {/* Deadlines count */}
                      {events.deadlines.length > 0 && (
                        <div className="bg-red-50 text-red-800 text-[8px] px-1 py-0.5 rounded flex items-center justify-between font-bold truncate">
                          <span>⚖️ ميعاد ({events.deadlines.length})</span>
                        </div>
                      )}

                      {/* Tasks count */}
                      {events.tasks.length > 0 && (
                        <div className="bg-indigo-100 text-indigo-900 text-[8px] px-1 py-0.5 rounded flex items-center justify-between font-bold truncate">
                          <span>📋 مهمة ({events.tasks.length})</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Colors Guide Legend */}
            <div className="flex items-center gap-4 text-[9px] text-slate-500 pt-3 border-t border-slate-100 shrink-0 flex-wrap">
              <span className="font-bold flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded"></span> الجلسات القضائية الفورية برئيس الجلسة</span>
              <span className="font-bold flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded"></span> المواعيد الإجرائية وسقوط الآجال</span>
              <span className="font-bold flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded"></span> مهام محامين المكتب والتشغيل الإداري</span>
              <span className="font-bold flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-200 ring-1 ring-slate-400 rounded"></span> الأيام العادية الخالية من الجدولة</span>
            </div>

          </div>

          {/* Quick Agenda View Sidebar */}
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="pb-1 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800">أجندة أحداث الشهر الحالي</h3>
                <p className="text-[10px] text-slate-500">الأحداث المجدولة لشهر {monthNames[currentMonth]} {currentYear}</p>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pe-0.5">
                {/* Find monthly items */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const e = getDayEvents(dayNum);
                  const mStr = String(currentMonth + 1).padStart(2, '0');
                  const dStr = String(dayNum).padStart(2, '0');
                  const fullDateStr = `${currentYear}-${mStr}-${dStr}`;

                  if (!e.hasEvents) return null;

                  return (
                    <div key={`agenda-ev-${dayNum}`} className="border-e-2 border-slate-300 pe-2 space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 font-mono">{fullDateStr}</p>
                      
                      {e.sessions.map(s => (
                        <div key={s.id} className="bg-blue-50/50 p-1.5 rounded text-[10px] text-blue-900 border border-blue-200/50">
                          <p className="font-bold">🏛️ جلسة: {s.caseNumber}</p>
                          <p className="text-[9px] opacity-80">{s.objective}</p>
                        </div>
                      ))}

                      {e.deadlines.map(d => (
                        <div key={d.id} className="bg-red-50/50 p-1.5 rounded text-[10px] text-red-900 border border-red-200/50">
                          <p className="font-bold">⚖️ ميعاد قانوني: {d.title}</p>
                          <p className="text-[9px] opacity-80">{d.clientName}</p>
                        </div>
                      ))}

                      {e.tasks.map(t => (
                        <div key={t.id} className="bg-indigo-50/50 p-1.5 rounded text-[10px] text-indigo-900 border border-indigo-200/30">
                          <p className="font-bold">📝 مهمة: {t.title}</p>
                          <p className="text-[9px] opacity-80">المحقق: {t.assignedTo}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: ALERTS BOARD (الإنذار المبكر والتحذير الفعال) */}
      {activeSubTab === 'alerts' && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800">نظام الإنذار المبكر الذكي للمواعيد الإجرائية</h3>
            <p className="text-[11px] text-slate-500">قائمة تلقائية ترشح الأحداث التي تنتهي آمادها خلال الـ ٢٤ والـ ٤٨ ساعة المائة لتفادي أخطاء التقادم القضائي بمصر.</p>
          </div>

          {alarmItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs text-medium">
              <span className="p-2.5 bg-slate-100 rounded-full inline-block mb-3 text-slate-350">🔔</span>
              <p>خزينة الأجل ممتلئة ولا توجد جلسات أو مواعيد أو مهام مطلوبة متبقي عليها ٢٤ أو ٤٨ ساعة بالوقت الحالي.</p>
              <p className="text-[10px] text-slate-500 mt-1">يوم التحكيم والتقويم: {todayStr}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alarmItems.map((item) => {
                const isOverUrgent = item.alarmType === '24';
                
                return (
                  <div 
                    key={item.id} 
                    className={`p-3.5 rounded border transition-all ${
                      isOverUrgent 
                        ? 'bg-red-50/70 border-red-300 text-red-955' 
                        : 'bg-indigo-50/60 border-indigo-300 text-indigo-955'
                    }`}
                    id={`alarm-card-${item.id}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isOverUrgent ? 'bg-red-200 text-red-850' : 'bg-indigo-200 text-indigo-850'
                      }`}>
                        {item.alertLabel}
                      </span>
                      
                      <div className={`p-1.5 rounded-full ${
                        isOverUrgent ? 'bg-red-100 text-red-650' : 'bg-indigo-100 text-indigo-650'
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${isOverUrgent ? 'animate-bounce' : 'animate-pulse'}`} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-xs line-clamp-2">{item.title}</h4>
                      <p className="text-[10px] opacity-90">القضية المرتبطة: <strong className="font-mono">{item.linkedCase}</strong></p>
                      
                      <div className="pt-2 border-t border-slate-600/10 flex justify-between items-center text-[10px] opacity-80 pt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> الميعاد: <strong>{item.dateStr}</strong>
                        </span>
                        
                        <span className="font-bold underline">
                          {isOverUrgent ? 'متبقي يوم واحد!' : 'متبقي يومان'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: EDIT TASK */}
        {editingTask && (
          <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-b-4 border-indigo-600 rounded-2xl p-6 shadow-2xl max-w-xl w-full text-end space-y-4"
              id="edit-task-modal"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <button 
                  onClick={() => setEditingTask(null)}
                  className="text-slate-400 hover:text-slate-600 transition cursor-pointer font-bold text-lg"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 rounded-lg text-indigo-700">
                    <Edit className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">تعديل بيانات التكليف بالمهمة</h3>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                onUpdateTask(editingTask);
                setEditingTask(null);
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان التكليف / المهمة</label>
                  <input
                    type="text"
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs text-end bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التفاصيل والتوجيهات الفنية</label>
                  <textarea
                    rows={3}
                    required
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full border rounded-lg p-2.5 text-xs text-end bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الاستحقاق</label>
                    <input
                      type="date"
                      required
                      value={editingTask.dueDate}
                      onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      className="w-full border rounded-lg p-2.5 text-xs text-end bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المحامي المسؤول</label>
                    <select
                      value={editingTask.assignedTo}
                      onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                      className="w-full border rounded-lg p-2.5 text-xs text-end bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    >
                      {staffOptions.map(staff => (
                        <option key={staff} value={staff}>{staff}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">حالة المهمة</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as 'pending' | 'completed' })}
                    className="w-full border rounded-lg p-2.5 text-xs text-end bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  >
                    <option value="pending">قيد الانتظار (pending)</option>
                    <option value="completed">مكتملة (completed)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    type="submit"
                    className="flex-grow bg-slate-900 text-indigo-500 hover:bg-slate-800 rounded-lg py-2.5 text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    حفظ التعديلات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
});

export default TasksManager;

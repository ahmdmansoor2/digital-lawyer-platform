import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen, Search, Copy, Printer, Bookmark, Scale, Check, Landmark,
  ShieldAlert, Download, AlertCircle, FileText, BookmarkCheck, Folder,
  FolderPlus, File, Upload, Trash2, Plus, Book, CheckCircle, Clock,
  Gavel, Library, FileArchive, Import, FileInput, X, Edit, Tag, ArrowUpRight,
  User, Briefcase, Eye, ChevronLeft, ChevronRight, Star, StarOff,
  Menu, Grid3X3, List, Brain, Archive, Database,
} from 'lucide-react';
import { LawArticle, CourtPrecedent, LegalBook, LegalChapter, LegalReference, Case, BookFolder, OfficeProfile } from '../types';
import { useOfficeProfile } from '../contexts/OfficeProfileContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { mockLawArticles, mockCourtPrecedents, mockLegalBooks, legalCategories } from '../data/mockLegalLibrary';
import { exportHtmlToWord } from '../utils/wordExportHelper';
import { findMatchSnippet } from '../utils/searchHelper';
import FileViewer from './FileViewer';
import AdSenseBanner from './AdSenseBanner';
import { buildLawIndex, buildPrecedentIndex, buildBookIndex, searchLaws, searchPrecedents, searchBooks, rebuildAllIndexes } from '../utils/fullTextSearch';
import { sanitizeHtml } from '../utils/sanitizer';
import { logger } from '../utils/logger';
import {
  LegalLibraryProps,
  SegmentType,
  ViewMode,
  mergeById,
  highlightSearchTerm,
} from './legalLibraryShared';
import {
  getAllLegalLaws,
  getAllLegalPrecedents,
  getAllLegalBooks,
  saveLegalLaw,
  saveLegalPrecedent,
  saveLegalBook,
  saveLegalLaws,
  saveLegalPrecedents,
  saveLegalBooks,
  updateLegalLaw,
  updateLegalPrecedent,
  updateLegalBook,
  deleteLegalLaw,
  deleteLegalPrecedent,
  deleteLegalBook,
} from '../utils/indexedDBHelper';
import {
  loadLawsFromLocal,
  loadPrecedentsFromLocal,
  loadBooksFromLocal,
  loadEncyclopediasFromLocal,
  loadFoldersFromLocal,
  saveLawsToLocal,
  savePrecedentsToLocal,
  saveBooksToLocal,
  saveEncyclopediasToLocal,
  saveFoldersToLocal,
  getStorageDiagnostics,
  exportLibraryToJSON,
  importLibraryFromJSON,
  clearCustomLibraryData,
  hydrateFromDisk,
  StorageDiagnostics,
  LibraryBackup,
} from '../utils/legalLibraryStorage';
import { showAlert } from '../utils/dialogs';

const LegalLibrary = React.memo(function LegalLibrary({ cases = [], onLinkLegalReference }: LegalLibraryProps) {
  const confirm = useConfirm();
  const [activeSegment, setActiveSegment] = useState<SegmentType>('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [smartSearch, setSmartSearch] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [searchField, setSearchField] = useState<'all' | 'title' | 'content' | 'tags'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Recently Viewed state
  const [recentlyViewed, setRecentlyViewed] = useState<{ id: string; type: string; title: string; subtitle: string; viewedAt: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('legal_recently_viewed') || '[]'); } catch { return []; }
  });

  // Notes and Annotations state
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('legal_item_annotations') || '{}'); } catch { return {}; }
  });

  // Office profile settings — مزامنة فورية عبر OfficeProfileContext
  const officeProfile = useOfficeProfile().officeProfile;

  // Edit States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ type: 'law' | 'precedent' | 'book' | 'folder' | 'encyclopedia'; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Interactive Book Chapter & Article Creation
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isAddingArticle, setIsAddingArticle] = useState<string | null>(null); // holds chapter ID
  const [newArticleForm, setNewArticleForm] = useState({ articleNumber: '', content: '', tags: '' });

  // Data state — تهيئة مدمجة: بيانات افتراضية + أي محتوى مخصص محفوظ في localStorage
  const [laws, setLaws] = useState<LawArticle[]>(() => {
    const isInit = localStorage.getItem('legal_library_initialized_v2') === 'true';
    const saved = loadLawsFromLocal();
    if (!isInit && saved.length === 0) {
      saveLawsToLocal(mockLawArticles);
      return mockLawArticles;
    }
    return saved;
  });
  const [precedents, setPrecedents] = useState<CourtPrecedent[]>(() => {
    const isInit = localStorage.getItem('legal_library_initialized_v2') === 'true';
    const saved = loadPrecedentsFromLocal();
    if (!isInit && saved.length === 0) {
      savePrecedentsToLocal(mockCourtPrecedents);
      return mockCourtPrecedents;
    }
    return saved;
  });
  const [books, setBooks] = useState<LegalBook[]>(() => {
    const isInit = localStorage.getItem('legal_library_initialized_v2') === 'true';
    const saved = loadBooksFromLocal();
    if (!isInit && saved.length === 0) {
      saveBooksToLocal(mockLegalBooks);
      localStorage.setItem('legal_library_initialized_v2', 'true');
      return mockLegalBooks;
    }
    return saved;
  });
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);

  // Selection state
  const [selectedLawId, setSelectedLawId] = useState<string | null>(null);
  const [selectedPrecId, setSelectedPrecId] = useState<string | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  // Persisted bookmarks
  const [bookmarkedLawIds, setBookmarkedLawIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('legal_law_bookmarks') || '[]'); } catch { return []; }
  });
  const [bookmarkedPrecIds, setBookmarkedPrecIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('legal_prec_bookmarks') || '[]'); } catch { return []; }
  });
  const [bookmarkedBookIds, setBookmarkedBookIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('legal_book_bookmarks') || '[]'); } catch { return []; }
  });

  // Encyclopedias (localStorage/disk-based)
  const [encyclopedias, setEncyclopedias] = useState<any[]>(() => {
    return loadEncyclopediasFromLocal();
  });
  const [selectedEncId, setSelectedEncId] = useState<string | null>(null);

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'law' | 'precedent' | 'book' | 'folder'>('law');
  const [isImporting, setIsImporting] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const [importedFiles, setImportedFiles] = useState<{ name: string; size: string; dataUrl: string; uploadedAt: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const encFileInputRef = useRef<HTMLInputElement>(null);

  // File Viewer state
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const [fileViewerData, setFileViewerData] = useState<{ bookId?: string; dataUrl: string; name: string; type: string; size?: string; extractedText?: string } | null>(null);
  const [bookFolders, setBookFolders] = useState<BookFolder[]>(() => { try { return loadFoldersFromLocal(); } catch { return []; } });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: '', description: '', color: '#6366f1' });

  const openFileViewer = (book: LegalBook) => {
    if (!book.fileDataUrl) return;
    setFileViewerData({
      bookId: book.id,
      dataUrl: book.fileDataUrl,
      name: book.fileName || book.title,
      type: book.fileType || '',
      size: book.fileSize,
      extractedText: book.extractedText
    });
    setFileViewerOpen(true);
  };

  const handleSaveExtractedText = (bookId: string, text: string) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, extractedText: text } : b));
  };

  // Persist bookmarks & settings
  useEffect(() => { localStorage.setItem('legal_law_bookmarks', JSON.stringify(bookmarkedLawIds)); }, [bookmarkedLawIds]);
  useEffect(() => { localStorage.setItem('legal_prec_bookmarks', JSON.stringify(bookmarkedPrecIds)); }, [bookmarkedPrecIds]);
  useEffect(() => { localStorage.setItem('legal_book_bookmarks', JSON.stringify(bookmarkedBookIds)); }, [bookmarkedBookIds]);
  useEffect(() => { saveEncyclopediasToLocal(encyclopedias); }, [encyclopedias]);

  // Sync recently viewed and annotations
  useEffect(() => {
    localStorage.setItem('legal_recently_viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem('legal_item_annotations', JSON.stringify(annotations));
  }, [annotations]);

  // مزامنة تلقائية مع localStorage عند تغيير البيانات (الحفظ الفوري)
  useEffect(() => { saveLawsToLocal(laws); }, [laws]);
  useEffect(() => { savePrecedentsToLocal(precedents); }, [precedents]);
  useEffect(() => { saveBooksToLocal(books); }, [books]);

  useEffect(() => {
    saveFoldersToLocal(bookFolders);
  }, [bookFolders]);

  const addToRecentlyViewed = (id: string, type: string, title: string, subtitle: string) => {
    const newItem = {
      id,
      type,
      title,
      subtitle: subtitle ? subtitle.substring(0, 60) + (subtitle.length > 60 ? '...' : '') : '',
      viewedAt: new Date().toLocaleDateString('ar-EG')
    };
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return [newItem, ...filtered].slice(0, 4);
    });
  };

  const handleSelectLaw = (law: LawArticle) => {
    setSelectedLawId(law.id);
    addToRecentlyViewed(law.id, 'law', law.articleNumber, law.lawName);
  };
  const handleSelectPrec = (prec: CourtPrecedent) => {
    setSelectedPrecId(prec.id);
    addToRecentlyViewed(prec.id, 'precedent', prec.principle, prec.courtName);
  };
  const handleSelectBook = (book: LegalBook) => {
    setSelectedBookId(book.id);
    addToRecentlyViewed(book.id, 'book', book.title, book.description);
  };
  const handleSelectEnc = (enc: any) => {
    setSelectedEncId(enc.id);
    addToRecentlyViewed(enc.id, 'encyclopedia', enc.title, enc.description || '');
  };

  // تحميل البيانات من القرص (في Electron) أو localStorage + IDB (في المتصفح)
  // الترتيب: 1) ملف القرص (إن وُجد) - الأكثر موثوقية في Electron
  //         2) localStorage - للبيانات المحلية (fallback)
  //         3) IDB - نسخة احتياطية ثانوية
  //         4) mock - البيانات الافتراضية
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // أولاً: تشخيص
        const diag = await getStorageDiagnostics();
        if (cancelled) return;
        setDiagnostics(diag);
        logger.debug('[LegalLibrary] تشخيص التخزين:', diag);

        // ثانياً: قراءة أولية من localStorage (متزامن وفوري)
        let lawsData = loadLawsFromLocal();
        let precsData = loadPrecedentsFromLocal();
        let booksData = loadBooksFromLocal();
        let encsData = loadEncyclopediasFromLocal();

        // ثالثاً: محاولة قراءة من القرص عبر Electron IPC (مضمون 100%)
        const diskResult = await hydrateFromDisk();
        if (diskResult) {
          logger.debug('[LegalLibrary] ✅ تم استرداد البيانات من ملف القرص:', diskResult);
          // استخدم بيانات القرص (هي المصدر الأكثر موثوقية)
          lawsData = loadLawsFromLocal();
          precsData = loadPrecedentsFromLocal();
          booksData = loadBooksFromLocal();
          encsData = loadEncyclopediasFromLocal();
        }

        const isInit = localStorage.getItem('legal_library_initialized_v2') === 'true';
        let mergedLaws = lawsData;
        let mergedPrecs = precsData;
        let mergedBooks = booksData;

        if (!isInit) {
          mergedLaws = mergeById(mockLawArticles, lawsData);
          mergedPrecs = mergeById(mockCourtPrecedents, precsData);
          mergedBooks = mergeById(mockLegalBooks, booksData);
          saveLawsToLocal(mergedLaws);
          savePrecedentsToLocal(mergedPrecs);
          saveBooksToLocal(mergedBooks);
          localStorage.setItem('legal_library_initialized_v2', 'true');
        }

        if (cancelled) return;

        // تحديث الحالة مرة واحدة فقط (تجنب race conditions)
        if (lawsData.length > 0 || precsData.length > 0 || booksData.length > 0 || encsData.length > 0) {
          setLaws(mergedLaws);
          setPrecedents(mergedPrecs);
          setBooks(mergedBooks);
          setEncyclopedias(encsData);
          logger.debug('[LegalLibrary] ✅ تم تحميل البيانات:', {
            laws: mergedLaws.length, precedents: mergedPrecs.length, books: mergedBooks.length, encyclopedias: encsData.length
          });
        } else {
          // لا توجد بيانات محفوظة - حاول من IndexedDB كآخر محاولة
          try {
            const [dbLaws, dbPrecs, dbBooks] = await Promise.all([
              getAllLegalLaws(),
              getAllLegalPrecedents(),
              getAllLegalBooks(),
            ]);
            if (cancelled) return;
            const finalLaws = isInit ? dbLaws : mergeById(mockLawArticles, dbLaws);
            const finalPrecs = isInit ? dbPrecs : mergeById(mockCourtPrecedents, dbPrecs);
            const finalBooks = isInit ? dbBooks : mergeById(mockLegalBooks, dbBooks);
            
            setLaws(finalLaws);
            setPrecedents(finalPrecs);
            setBooks(finalBooks);
            setEncyclopedias(encsData);
            saveLawsToLocal(finalLaws);
            savePrecedentsToLocal(finalPrecs);
            saveBooksToLocal(finalBooks);
            saveEncyclopediasToLocal(encsData);
            if (!isInit) localStorage.setItem('legal_library_initialized_v2', 'true');
          } catch (idbErr: any) {
            logger.debug('[LegalLibrary] لا توجد بيانات في أي مكان، استخدام الافتراضي');
            setEncyclopedias(encsData);
          }
        }

        if (!cancelled) setLoadError(null);
      } catch (e: any) {
        console.error('[LegalLibrary] فشل تحميل المكتبة:', e);
        if (!cancelled) setLoadError(e?.message || 'تعذّر استرداد المكتبة القانونية');
      } finally {
        if (!cancelled) setIsLoadingLibrary(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rebuild search indexes when data changes
  useEffect(() => {
    try { rebuildAllIndexes(laws, precedents, books); } catch (e) { console.error('Search index rebuild failed', e); }
  }, [laws, precedents, books]);

  // Smart search results
  const smartSearchResults = useMemo(() => {
    if (!searchQuery.trim() || !smartSearch) return null;
    return {
      laws: searchLaws(searchQuery),
      precedents: searchPrecedents(searchQuery),
      books: searchBooks(searchQuery),
    };
  }, [searchQuery, smartSearch]);

  // Tag cloud generation
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    laws.forEach(l => l.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    precedents.forEach(p => p.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    books.forEach(b => b.tags?.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .slice(0, 10);
  }, [laws, precedents, books]);

  // ===== Filtered Data =====
  const filteredLaws = useMemo(() => {
    let result = laws;
    if (selectedCategory !== 'all' && selectedCategory !== 'bookmarks') {
      const catKey = legalCategories.find(c => c.id === selectedCategory);
      if (catKey) result = result.filter(l => l.lawName?.includes(catKey.name) || l.tags?.includes(catKey.id));
    }
    if (selectedCategory === 'bookmarks') result = result.filter(l => bookmarkedLawIds.includes(l.id));
    if (selectedTag) result = result.filter(l => l.tags?.includes(selectedTag));
    
    if (searchQuery.trim()) {
      if (smartSearch && smartSearchResults) {
        result = smartSearchResults.laws;
      } else {
        const q = searchQuery.toLowerCase();
        result = result.filter(l => {
          const matchTitle = l.lawName.toLowerCase().includes(q) || l.articleNumber.toLowerCase().includes(q);
          const matchContent = l.content.toLowerCase().includes(q) || (l.chapterName || '').toLowerCase().includes(q);
          const matchTags = l.tags?.some(t => t.toLowerCase().includes(q)) || false;
          
          if (searchField === 'title') return matchTitle;
          if (searchField === 'content') return matchContent;
          if (searchField === 'tags') return matchTags;
          return matchTitle || matchContent || matchTags;
        });
      }
    }
    return result;
  }, [laws, selectedCategory, selectedTag, searchQuery, smartSearch, smartSearchResults, searchField, bookmarkedLawIds]);

  const filteredPrecs = useMemo(() => {
    let result = precedents;
    if (selectedCategory !== 'all' && selectedCategory !== 'bookmarks') {
      result = result.filter(p => p.category === selectedCategory);
    }
    if (selectedCategory === 'bookmarks') result = result.filter(p => bookmarkedPrecIds.includes(p.id));
    if (selectedTag) result = result.filter(p => p.tags?.includes(selectedTag));
    
    if (searchQuery.trim()) {
      if (smartSearch && smartSearchResults) {
        result = smartSearchResults.precedents;
      } else {
        const q = searchQuery.toLowerCase();
        result = result.filter(p => {
          const matchTitle = p.principle.toLowerCase().includes(q) || p.rulingNumber.toLowerCase().includes(q);
          const matchContent = p.detailedDecision.toLowerCase().includes(q);
          const matchTags = p.tags?.some(t => t.toLowerCase().includes(q)) || false;
          
          if (searchField === 'title') return matchTitle;
          if (searchField === 'content') return matchContent;
          if (searchField === 'tags') return matchTags;
          return matchTitle || matchContent || matchTags;
        });
      }
    }
    return result;
  }, [precedents, selectedCategory, selectedTag, searchQuery, smartSearch, smartSearchResults, searchField, bookmarkedPrecIds]);

  const filteredBooks = useMemo(() => {
    let result = books;
    if (selectedFolderId) {
      result = result.filter(b => b.folderId === selectedFolderId);
    }
    if (selectedCategory !== 'all' && selectedCategory !== 'bookmarks') {
      result = result.filter(b => b.category === selectedCategory);
    }
    if (selectedCategory === 'bookmarks') result = result.filter(b => bookmarkedBookIds.includes(b.id));
    if (selectedTag) result = result.filter(b => b.tags?.includes(selectedTag));
    
    if (searchQuery.trim()) {
      if (smartSearch && smartSearchResults) {
        result = smartSearchResults.books;
      } else {
        const q = searchQuery.toLowerCase();
        result = result.filter(b => {
          const matchTitle = b.title.toLowerCase().includes(q);
          const matchContent = b.description.toLowerCase().includes(q);
          const matchTags = b.tags.some(t => t.toLowerCase().includes(q));
          
          if (searchField === 'title') return matchTitle;
          if (searchField === 'content') return matchContent;
          if (searchField === 'tags') return matchTags;
          return matchTitle || matchContent || matchTags;
        });
      }
    }
    return result;
  }, [books, selectedCategory, selectedFolderId, selectedTag, searchQuery, smartSearch, smartSearchResults, searchField, bookmarkedBookIds]);

  const selectedLaw = selectedLawId ? laws.find(l => l.id === selectedLawId) : null;
  const selectedPrec = selectedPrecId ? precedents.find(p => p.id === selectedPrecId) : null;
  const selectedBook = selectedBookId ? books.find(b => b.id === selectedBookId) : null;
  const selectedEnc = selectedEncId ? encyclopedias.find((e: any) => e.id === selectedEncId) : null;

  // ===== Helpers =====
  const toggleLawBookmark = (id: string) => {
    setBookmarkedLawIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const togglePrecBookmark = (id: string) => {
    setBookmarkedPrecIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleBookBookmark = (id: string) => {
    setBookmarkedBookIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteBook = async (id: string) => {
    if (!await confirm('هل أنت متأكد من حذف هذا الكتاȿ سيتم حذفه نهائياً من قاعدة البيانات.')) return;
    setBooks(prev => prev.filter(b => b.id !== id));
    if (selectedBookId === id) setSelectedBookId(null);
    // حذف من IndexedDB فعلياً (إن لم يكن عنصراً من البيانات الافتراضية)
    if (!id.startsWith('book_')) {
      deleteLegalBook(id).catch((e) => {
        console.error('[LegalLibrary] فشل حذف الكتاب من IndexedDB:', e);
      });
    }
  };

  const handleDeleteLaw = async (id: string) => {
    if (!await confirm('هل أنت متأكد من حذف هذه المادة القانونيɿ')) return;
    setLaws(prev => prev.filter(l => l.id !== id));
    if (selectedLawId === id) setSelectedLawId(null);
    if (!id.match(/^(civ|pen|fam|com|const|lab)_/)) {
      deleteLegalLaw(id).catch((e) => {
        console.error('[LegalLibrary] فشل حذف المادة من IndexedDB:', e);
      });
    }
  };

  const handleDeletePrecedent = async (id: string) => {
    if (!await confirm('هل أنت متأكد من حذف هذا السابق القضائي؟')) return;
    setPrecedents(prev => prev.filter(p => p.id !== id));
    if (selectedPrecId === id) setSelectedPrecId(null);
    if (!id.startsWith('prec_')) {
      deleteLegalPrecedent(id).catch((e) => {
        console.error('[LegalLibrary] فشل حذف السابق من IndexedDB:', e);
      });
    }
  };

  // ===== Full Edit & Update Helpers =====
  const openEditModal = (type: 'law' | 'precedent' | 'book' | 'folder' | 'encyclopedia', data: any) => {
    setEditItem({ type, data });
    setEditForm({ ...data, tags: data.tags ? data.tags.join(', ') : '' });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    const { type, data } = editItem;

    if (type === 'law') {
      const updated: LawArticle = {
        ...data,
        lawName: editForm.lawName,
        articleNumber: editForm.articleNumber,
        content: editForm.content,
        chapterName: editForm.chapterName || undefined,
        tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      };
      setLaws(prev => prev.map(l => l.id === data.id ? updated : l));
      await updateLegalLaw(updated);
    } else if (type === 'precedent') {
      const updated: CourtPrecedent = {
        ...data,
        category: editForm.category,
        principle: editForm.principle,
        courtName: editForm.courtName,
        rulingNumber: editForm.rulingNumber,
        rulingDate: editForm.rulingDate,
        detailedDecision: editForm.detailedDecision,
        tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      };
      setPrecedents(prev => prev.map(p => p.id === data.id ? updated : p));
      await updateLegalPrecedent(updated);
    } else if (type === 'book') {
      const updated: LegalBook = {
        ...data,
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        folderId: editForm.folderId || undefined,
        tags: editForm.tags ? editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      };
      setBooks(prev => prev.map(b => b.id === data.id ? updated : b));
      await updateLegalBook(updated);
    } else if (type === 'encyclopedia') {
      setEncyclopedias(prev => prev.map((e: any) => e.id === data.id ? { ...e, title: editForm.title, description: editForm.description } : e));
    }

    setIsEditModalOpen(false);
    setEditItem(null);
  };

  // ===== Format Printing Helper =====
  const printLegalItem = (title: string, htmlContent: string) => {
    const currentDate = new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const header = officeProfile ? `
      <div style="border-bottom: 3px double #1e293b; padding-bottom: 12px; margin-bottom: 25px; direction: rtl; font-family: 'Tajawal', sans-serif;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="text-align: right; border: none; font-size: 11pt; padding: 0;">
              <h1 style="margin: 0 0 5px 0; font-size: 17pt; color: #1e293b; font-weight: 900;">${officeProfile.officeName}</h1>
              <p style="margin: 0; font-weight: bold; color: #334155;">المستشار القانوني: ${officeProfile.managingPartner}</p>
              <p style="margin: 3px 0 0 0; font-size: 9.5pt; color: #64748b;">رقم القيد: ${officeProfile.barId} | الهواتف والفاكس: ${officeProfile.phone}</p>
              <p style="margin: 2px 0 0 0; font-size: 9.5pt; color: #64748b;">العنوان: ${officeProfile.address}</p>
            </td>
            <td style="text-align: left; border: none; font-size: 9.5pt; color: #64748b; vertical-align: top; padding: 0; width: 30%;">
              <div style="background: #f8fafc; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: right;">
                <p style="margin: 2px 0;"><strong>التاريخ:</strong> ${currentDate}</p>
                <p style="margin: 2px 0;"><strong>مستخرج من:</strong> منصة المحامي</p>
                <p style="margin: 2px 0;"><strong>النوع:</strong> مستند فني معتمد</p>
              </div>
            </td>
          </tr>
        </table>
      </div>
    ` : `
      <div style="border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 25px; text-align: center; font-family: 'Tajawal', sans-serif;">
        <h2 style="margin: 0 0 5px 0; color: #1f2937;">المكتبة القانونية الرقمية</h2>
        <p style="font-size: 9pt; color: #777; margin: 0;">تم استخراج وطباعة المستند في تاريخ: ${currentDate}</p>
      </div>
    `;

    const footer = `
      <div style="margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-size: 8.5pt; color: #64748b; direction: rtl; font-family: 'Tajawal', sans-serif;">
        <table style="width: 100%; border: none; margin-top: 15px; margin-bottom: 15px;">
          <tr style="border: none;">
            <td style="border: none; text-align: center; width: 50%;">
              <p style="font-weight: bold; color: #475569; margin-bottom: 20px;">خاتم واعتماد المكتب القانوني</p>
              <div style="width: 70px; height: 70px; border: 2px dashed #94a3b8; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #475569; font-size: 8pt;">
                معتمد
              </div>
            </td>
            <td style="border: none; text-align: center; width: 50%;">
              <p style="font-weight: bold; color: #475569; margin-bottom: 35px;">توقيع المحامي المسؤول</p>
              <div style="border-top: 1px dashed #94a3b8; width: 60%; margin: 0 auto;"></div>
            </td>
          </tr>
        </table>
        <p style="margin: 5px 0;">تم استخراج هذا المرجع وصيانته الكترونياً بواسطة "نظام إدارة المكاتب القانونية - منصة المحامي الرقمية".</p>
        <p style="margin: 2px 0; font-size: 7.5pt; color: #94a3b8;">حقوق الطبع وإصدارات التشريعات محفوظة © مكتبة المحامي الذكي</p>
      </div>
    `;

    const fullHtml = `
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Tajawal', 'Arial', sans-serif;
              direction: rtl;
              text-align: right;
              padding: 25px;
              color: #1e293b;
              background-color: #fff;
              line-height: 1.8;
            }
            h1, h2, h3, h4 { color: #0f172a; margin-top: 15px; }
            p { margin: 8px 0; }
            hr { border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0; }
            .content-box {
              padding: 20px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              font-size: 11pt;
              text-align: justify;
              white-space: pre-wrap;
            }
            .annotation-box {
              margin-top: 25px;
              padding: 15px;
              background-color: #f1f5f9;
              border-right: 4px solid #4f46e5;
              border-radius: 4px;
              font-size: 10pt;
            }
            @media print {
              body { padding: 10px; }
              @page { margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${header}
          ${htmlContent}
          ${footer}
          <script>
            // انتظر تحميل الخطوط قبل الطباعة
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() { window.print(); });
            } else {
              setTimeout(function() { window.print(); }, 800);
            }
          <\/script>
        </body>
      </html>
    `;

    // إذا كنا في بيئة إلكترون، نستخدم واجهة الـ API الخاصة بها للطباعة بشكل سليم
    const hasElectronApi = typeof window !== 'undefined' && (window as any).electronAPI && typeof (window as any).electronAPI.print === 'function';
    if (hasElectronApi) {
      (window as any).electronAPI.print(fullHtml, title);
    } else {
      // استخدام Blob URL بدلاً من document.write — يعمل في المتصفح
      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');

      if (win) {
        win.addEventListener('load', () => {
          URL.revokeObjectURL(blobUrl);
        });
      } else {
        // fallback: إذا تعذّر فتح نافذة جديدة (popup blocked) استخدم iframe مخفي
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          try {
            iframe.contentWindow?.print();
          } finally {
            setTimeout(() => {
              iframe.remove();
              URL.revokeObjectURL(blobUrl);
            }, 2000);
          }
        };
      }
    }
  };

  // ===== Exporters to Word =====
  const handleExportLawToWord = (law: LawArticle) => {
    const bodyContent = `
      <div style="direction: rtl; text-align: right;">
        <h2 style="font-family: 'Tajawal', sans-serif; color: #1e3a8a;">مادة قانونية: ${law.articleNumber}</h2>
        <p style="font-size: 11pt; font-weight: bold; color: #b45309;">القانون: ${law.lawName}</p>
        ${law.chapterName ? `<p style="font-size: 10pt; color: #475569;">الفصل/الباب: ${law.chapterName}</p>` : ''}
        <hr style="border-top: 1.5px solid #cbd5e1;"/>
        <div style="font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.7; text-align: justify; padding: 15px; background: #fafafa; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${law.content.replace(/\n/g, '<br/>')}
        </div>
        ${annotations[law.id] ? `
          <div style="margin-top: 30px; padding: 12px; background-color: #f1f5f9; border-right: 5px solid #4f46e5; border-radius: 4px; font-family: 'Tajawal', sans-serif;">
            <h4 style="color: #4f46e5; margin: 0 0 8px 0; font-weight: bold;">تعليق المحامي الشخصي وهامش الدفوع:</h4>
            <p style="margin: 0; font-size: 10.5pt; color: #334155; line-height: 1.6;">${annotations[law.id].replace(/\n/g, '<br/>')}</p>
          </div>
        ` : ''}
      </div>
    `;
    exportHtmlToWord(law.articleNumber, bodyContent, `مادة_${law.articleNumber.replace(/\s+/g, '_')}`, officeProfile);
  };

  const handleExportPrecToWord = (prec: CourtPrecedent) => {
    const bodyContent = `
      <div style="direction: rtl; text-align: right;">
        <h2 style="font-family: 'Tajawal', sans-serif; color: #1e3a8a;">مبدأ قضائي: ${prec.principle}</h2>
        <p style="font-size: 11pt; font-weight: bold; color: #b45309;">المحكمة: ${prec.courtName}</p>
        <p style="font-size: 10pt; color: #475569;">رقم الحكم: ${prec.rulingNumber} | تاريخ الحكم: ${prec.rulingDate} | التصنيف: ${prec.category}</p>
        <hr style="border-top: 1.5px solid #cbd5e1;"/>
        <h3 style="font-family: 'Tajawal', sans-serif; color: #1e293b;">نص القرار والمنطوق التفصيلي:</h3>
        <div style="font-family: 'Arial', sans-serif; font-size: 12pt; line-height: 1.7; text-align: justify; padding: 15px; background: #fafafa; border-radius: 6px; border: 1px solid #e2e8f0;">
          ${prec.detailedDecision.replace(/\n/g, '<br/>')}
        </div>
        ${annotations[prec.id] ? `
          <div style="margin-top: 30px; padding: 12px; background-color: #f1f5f9; border-right: 5px solid #4f46e5; border-radius: 4px; font-family: 'Tajawal', sans-serif;">
            <h4 style="color: #4f46e5; margin: 0 0 8px 0; font-weight: bold;">تعليق المحامي الشخصي وهامش الدفوع:</h4>
            <p style="margin: 0; font-size: 10.5pt; color: #334155; line-height: 1.6;">${annotations[prec.id].replace(/\n/g, '<br/>')}</p>
          </div>
        ` : ''}
      </div>
    `;
    exportHtmlToWord('مبدأ_قضائي_محكمة_النقض', bodyContent, `حكم_${prec.rulingNumber.replace(/[\s\/\\:*?"<>|]+/g, '_')}`, officeProfile);
  };

  const linkToCase = async (ref: LegalReference) => {
    if (!onLinkLegalReference || cases.length === 0) {
      await showAlert('الرجاء اختيار قضية لربطها');
      return;
    }
    const caseId = prompt('أدخل رقم القضية (أو اتركه فارغاً لاختيار أول قضية):');
    const targetCase = caseId ? cases.find(c => c.caseNumber === caseId || c.id === caseId) : cases[0];
    if (targetCase) {
      onLinkLegalReference(targetCase.id, ref);
      await showAlert(`تم الربط مع القضية: ${targetCase.caseNumber}`);
    } else {
      await showAlert('لم يتم العثور على القضية');
    }
  };

  // ===== Import from file =====
  const textExtensions = ['txt', 'json', 'csv', 'xml', 'html', 'md', 'rtf'];

  // استرجاع من ملف JSON احتياطي
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as LibraryBackup;
      if (!await confirm(`سيتم استبدال المكتبة الحالية بـ ${backup.laws?.length || 0} مادɡ ${backup.precedents?.length || 0} سابޡ ${backup.books?.length || 0} كتاب من النسخة الاحتياطية. هل تريد المتابعɿ`)) {
        if (backupInputRef.current) backupInputRef.current.value = '';
        return;
      }
      const counts = importLibraryFromJSON(backup);
      setLaws(prev => mergeById(prev, loadLawsFromLocal()));
      setPrecedents(prev => mergeById(prev, loadPrecedentsFromLocal()));
      setBooks(prev => mergeById(prev, loadBooksFromLocal()));
      await showAlert(`تم استرجاع ${counts.laws} مادɡ ${counts.precedents} سابޡ و ${counts.books} كتاب بنجاح.`);
    } catch (e: any) {
      console.error('[LegalLibrary] فشل استرجاع النسخة الاحتياطية:', e);
      await showAlert(`تعذّر قراءة الملف: ${e?.message || 'ملف غير صالح'}`);
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsImporting(true);

    const newLaws: LawArticle[] = [];
    const newPrecs: CourtPrecedent[] = [];
    const newBooks: LegalBook[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = (file.name.split('.').pop() || '').toLowerCase();

      if (ext === 'json') {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item.articleNumber) newLaws.push({ ...item, id: 'custom_law_' + Date.now() + '_' + Math.random() });
              else if (item.principle) newPrecs.push({ ...item, id: 'custom_prec_' + Date.now() + '_' + Math.random() });
              else if (item.title && item.chapters) newBooks.push({ ...item, id: 'custom_book_' + Date.now() + '_' + Math.random(), source: 'imported' as const });
            });
          }
        } catch { /* ignore */ }
      } else {
        try {
          // Read file as Data URL to support ALL extensions
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          });

          const formattedSize = file.size > 1024 * 1024 
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' 
            : (file.size / 1024).toFixed(1) + ' KB';

          newBooks.push({
            id: 'custom_book_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 7),
            title: file.name.replace(/\.[^/.]+$/, ''),
            description: `ملف مستورد مسبقاً: ${file.name}`,
            category: selectedCategory === 'all' || selectedCategory === 'bookmarks' ? 'عام' : selectedCategory,
            tags: ['مستورد', ext.toUpperCase()],
            chapters: [],
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            fileDataUrl: dataUrl,
            fileName: file.name,
            fileSize: formattedSize,
            fileType: file.type,
            source: 'imported'
          });
        } catch (fileErr) {
          console.error('[handleImportFile] فشل قراءة الملف:', file.name, fileErr);
        }
      }
    }

    setLaws(prev => [...prev, ...newLaws]);
    setPrecedents(prev => [...prev, ...newPrecs]);
    setBooks(prev => [...prev, ...newBooks]);
    try {
      await saveLegalLaws(newLaws);
      await saveLegalPrecedents(newPrecs);
      await saveLegalBooks(newBooks);
    } catch (e) {
      console.error('[LegalLibrary] فشل حفظ الملفات المستوردة في IndexedDB:', e);
      await showAlert('تم استيراد الملفات في الذاكرɡ لكن تعذّر حفظها في قاعدة البيانات المحلية. قد تختفي بعد إعادة فتح البرنامج.');
    }

    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== Add item =====
  const [newBookFile, setNewBookFile] = useState<{ dataUrl: string; name: string; size: string; type: string } | null>(null);
  const [newForm, setNewForm] = useState({ lawName: '', articleNumber: '', content: '', tags: '', principle: '', courtName: '', rulingNumber: '', rulingDate: '', detailedDecision: '', category: 'مدني', title: '', description: '', folderId: '' });

  const handleAddItem = async () => {
    if (addModalType === 'book') {
      const newBook: LegalBook = {
        id: 'custom_book_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        title: newForm.title || (newBookFile ? newBookFile.name.replace(/\.[^/.]+$/, '') : 'كتاب جديد'),
        description: newForm.description || (newBookFile ? `ملف مرفق: ${newBookFile.name}` : ''),
        category: newForm.category,
        tags: newForm.tags ? newForm.tags.split(',').map(t => t.trim()).filter(Boolean) : (newBookFile ? ['مرفق'] : []),
        chapters: [],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        fileDataUrl: newBookFile?.dataUrl,
        fileName: newBookFile?.name,
        fileSize: newBookFile?.size,
        fileType: newBookFile?.type,
        folderId: newForm.folderId || undefined,
        source: 'custom',
      };
      setBooks(prev => [...prev, newBook]);
      saveLegalBook(newBook).catch(async (e) => {
        console.error('[LegalLibrary] فشل حفظ الكتاب الجديد:', e);
        await showAlert('تم إضافة الكتاب في الذاكرة لكن تعذّر حفظه محلياً.');
      });
      setNewBookFile(null);
    } else if (addModalType === 'law') {
      const newLaw: LawArticle = {
        id: 'custom_law_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        lawName: newForm.lawName,
        articleNumber: newForm.articleNumber,
        content: newForm.content,
        tags: newForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      setLaws(prev => [...prev, newLaw]);
      saveLegalLaw(newLaw).catch(async (e) => {
        console.error('[LegalLibrary] فشل حفظ المادة الجديدة:', e);
        await showAlert('تم إضافة المادة في الذاكرة لكن تعذّر حفظها محلياً.');
      });
    } else if (addModalType === 'precedent') {
      const newPrec: CourtPrecedent = {
        id: 'custom_prec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        category: newForm.category as any,
        principle: newForm.principle,
        courtName: newForm.courtName,
        rulingNumber: newForm.rulingNumber,
        rulingDate: newForm.rulingDate,
        detailedDecision: newForm.detailedDecision,
        tags: newForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      setPrecedents(prev => [...prev, newPrec]);
      saveLegalPrecedent(newPrec).catch(async (e) => {
        console.error('[LegalLibrary] فشل حفظ السابق الجديد:', e);
        await showAlert('تم إضافة السابق في الذاكرة لكن تعذّر حفظه محلياً.');
      });
    }
    setIsAddModalOpen(false);
    setNewForm({ lawName: '', articleNumber: '', content: '', tags: '', principle: '', courtName: '', rulingNumber: '', rulingDate: '', detailedDecision: '', category: 'مدني', title: '', description: '' });
  };

  return (
    <div className="space-y-6 text-end" dir="rtl">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute top-0 right-0 bg-indigo-600/10 w-72 h-72 rounded-full blur-sm transform translate-x-12 -translate-y-12"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-1 rounded-full font-bold">مكتب المحامي الرقمي</span>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> المكتبة القانونية الرقمية
              </span>
            </div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <Library className="h-5 w-5 text-indigo-500" />
              المكتبة القانونية والبحث الذكي
            </h1>
            <p className="text-[11px] text-slate-400">عدد غير محدود من الكتب والقوانين مع البحث الذكي والأرشفة الفورية</p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><FileText className="w-3 h-3 text-indigo-400" /> {laws.length} مادة</span>
            <span className="flex items-center gap-1"><Gavel className="w-3 h-3 text-indigo-400" /> {precedents.length} حكم</span>
            <span className="flex items-center gap-1"><Book className="w-3 h-3 text-emerald-400" /> {books.length} كتاب</span>
            {isLoadingLibrary && (
              <span className="flex items-center gap-1 text-indigo-300">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                جاري الاسترداد...
              </span>
            )}
            {!isLoadingLibrary && loadError && (
              <span className="flex items-center gap-1 text-red-300" title={loadError}>
                <AlertCircle className="w-3 h-3" /> فشل الاسترداد (يعمل على localStorage)
              </span>
            )}
            {!isLoadingLibrary && !loadError && (
              <span className="flex items-center gap-1 text-emerald-300" title="تم استرداد البيانات بنجاح من التخزين المحلي">
                <CheckCircle className="w-3 h-3" /> تم الاسترداد
              </span>
            )}
            <button
              onClick={async () => {
                const d = await getStorageDiagnostics();
                setDiagnostics(d);
                await showAlert(
                  `=== تشخيص التخزين ===\n` +
                  `• localStorage: ${d.localStorageAvailable ? '✅ متاح' : '❌ غير متاح'}\n` +
                  `• المساحة المستخدمة: ${(d.localStorageUsedBytes / 1024).toFixed(1)} KB\n` +
                  `• المساحة القصوى: ${(d.localStorageQuotaBytes / 1024 / 1024).toFixed(1)} MB\n` +
                  `• ملف القرص: ${d.electronDiskPath || 'غير متاح (متصفح)'}\n` +
                  `• حالة القرص: ${d.electronDiskWritable ? '✅ قابل للكتابة' : '❌ غير قابل'}\n` +
                  `• عناصر في الذاكرة: ${d.lawsInCache} مادɡ ${d.precedentsInCache} سابޡ ${d.booksInCache} كتاب\n` +
                  `• عناصر في localStorage: ${d.lawsInLocal} مادɡ ${d.precedentsInLocal} سابޡ ${d.booksInLocal} كتاب\n` +
                  `• آخر حفظ: ${d.libraryMeta?.lastSavedAt || 'لم يسجل بعد'}\n` +
                  `• مكان التخزين: ${d.libraryMeta?.storageLocation || 'غير معروف'}\n` +
                  (d.electronDiskError ? `• خطأ القرص: ${d.electronDiskError}` : '')
                );
              }}
              className="text-slate-400 hover:text-white transition"
              title="عرض تفاصيل التخزين"
            >
              <Database className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const backup = exportLibraryToJSON();
                const json = JSON.stringify(backup, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `legal-library-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-slate-400 hover:text-emerald-300 transition"
              title="تصدير البيانات كنسخة احتياطية JSON"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* لوحة الإحصائيات المتقدمة والمستندات الأخيرة */}
      {showStats && (
        <div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200"
        >
          {/* إحصائيات سريعة */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">المواد والتشريعات</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-indigo-600 font-mono">{laws.length}</span>
                <span className="text-[9px] text-slate-400">مادة قانونية</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (laws.length / 50) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">المبادئ والأحكام</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-indigo-600 font-mono">{precedents.length}</span>
                <span className="text-[9px] text-slate-400">حكم نقض</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (precedents.length / 20) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">المراجع والكتب</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-600 font-mono">{books.length}</span>
                <span className="text-[9px] text-slate-400">مجلد ومرجع</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, (books.length / 10) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-bold">المفضلة والمؤرشفة</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-rose-600 font-mono">{bookmarkedLawIds.length + bookmarkedPrecIds.length + bookmarkedBookIds.length}</span>
                <span className="text-[9px] text-slate-400">عنصر مميز</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-rose-500 h-full" style={{ width: `${Math.min(100, ((bookmarkedLawIds.length + bookmarkedPrecIds.length + bookmarkedBookIds.length) / 10) * 100)}%` }}></div>
              </div>
            </div>
          </div>

          {/* المستندات الأخيرة */}
          <div className="lg:col-span-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-700 font-black flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                المفتوحة مؤخراً
              </span>
              <button 
                onClick={() => setRecentlyViewed([])}
                className="text-[8px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                مسح السجل
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[85px] pe-0.5">
              {recentlyViewed.length === 0 ? (
                <p className="text-[9px] text-slate-400 text-center py-4">لم تفتح أي مستندات بعد</p>
              ) : (
                recentlyViewed.map(item => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (item.type === 'law') handleSelectLaw(laws.find(l => l.id === item.id) || laws[0]);
                      if (item.type === 'precedent') handleSelectPrec(precedents.find(p => p.id === item.id) || precedents[0]);
                      if (item.type === 'book') handleSelectBook(books.find(b => b.id === item.id) || books[0]);
                      if (item.type === 'encyclopedia') handleSelectEnc(encyclopedias.find(e => e.id === item.id) || encyclopedias[0]);
                    }}
                    className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition border border-transparent hover:border-slate-100"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.type === 'law' ? 'bg-indigo-500' : item.type === 'precedent' ? 'bg-indigo-500' : item.type === 'book' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}></span>
                      <p className="text-[9px] font-bold text-slate-700 truncate max-w-[170px]" title={item.title}>{item.title}</p>
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono shrink-0">{item.viewedAt}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AdSense In-Article Banner */}
      <AdSenseBanner slot="3911754995" format="fluid" layout="in-article" className="max-w-5xl mx-auto w-full my-3" />

      {/* Tabs & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Toggler for stats dashboard */}
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
              showStats ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="إخفاء/إظهار لوحة التحليلات"
          >
            {showStats ? 'إخفاء الإحصائيات' : 'إظهار الإحصائيات'}
          </button>
          
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            {(['books', 'laws', 'precedents', 'encyclopedias'] as SegmentType[]).map(seg => (
              <button key={seg} onClick={() => { setActiveSegment(seg); setSelectedCategory('all'); setSelectedTag(null); }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                  activeSegment === seg ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {seg === 'books' && <><Book className="w-3 h-3 inline ms-1" />الكتب</>}
                {seg === 'laws' && <><Scale className="w-3 h-3 inline ms-1" />القوانين</>}
                {seg === 'precedents' && <><Gavel className="w-3 h-3 inline ms-1" />الأحكام</>}
                {seg === 'encyclopedias' && <><Folder className="w-3 h-3 inline ms-1" />الموسوعات</>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer">
              {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <Grid3X3 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-slate-950 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition">
              <Plus className="w-3 h-3" /> إضافة
            </button>
          </div>
        </div>

        {/* Search Bar & Advanced Fields */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={`بحث في ${activeSegment === 'books' ? 'الكتب' : activeSegment === 'laws' ? 'القوانين' : activeSegment === 'precedents' ? 'الأحكام' : 'الموسوعات'}...`}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pe-9 ps-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
            />
          </div>

          {/* Search scope dropdown */}
          <select 
            value={searchField} 
            onChange={e => setSearchField(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-[10px] font-bold text-slate-600 outline-none cursor-pointer focus:border-indigo-400"
          >
            <option value="all">كل الحقول</option>
            <option value="title">العنوان فقط</option>
            <option value="content">المضمون والنص</option>
            <option value="tags">الكلمات المفتاحية</option>
          </select>

          <button onClick={() => setSmartSearch(!smartSearch)}
            className={`px-2.5 py-2 rounded-xl text-[10px] font-bold border cursor-pointer transition ${
              smartSearch ? 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
          >
            <Brain className="w-3 h-3 inline ms-1" />بحث ذكي
          </button>
          <button onClick={async () => {
            const customLaws = laws.filter(l => l.id.startsWith('custom_law_'));
            const customPrecs = precedents.filter(p => p.id.startsWith('custom_prec_'));
            const customBooks = books.filter(b => b.id.startsWith('custom_book_'));
            try {
              await Promise.all([
                saveLegalLaws(customLaws),
                saveLegalPrecedents(customPrecs),
                saveLegalBooks(customBooks),
              ]);
              await showAlert(`تم حفظ ${customLaws.length} مادɡ ${customPrecs.length} سابޡ و ${customBooks.length} كتاب من محتواك المخصص في قاعدة البيانات المحلية.`);
            } catch (e) {
              console.error('[LegalLibrary] فشل الأرشفة:', e);
              await showAlert('تعذّر إكمال الأرشفة في قاعدة البيانات.');
            }
          }}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 cursor-pointer transition">
            <Archive className="w-3 h-3 inline ms-1" />أرشفة مخصصة
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-blue-200 bg-blue-50 text-blue-700 cursor-pointer transition">
            <FileInput className="w-3 h-3 inline ms-1" />استيراد
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" multiple />

          <button onClick={() => backupInputRef.current?.click()}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 cursor-pointer transition"
            title="استرجاع بيانات محفوظة من ملف JSON">
            <FileArchive className="w-3 h-3 inline ms-1" />استرجاع
          </button>
          <input
            type="file"
            ref={backupInputRef}
            onChange={handleImportBackup}
            accept=".json,application/json"
            className="hidden"
          />

          <button onClick={async () => {
            if (!await confirm('هل تريد مسح جميع الإضافات المخصصة فقط والإبقاء على المحتوى الافتراضي؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
            const removed = clearCustomLibraryData();
            setLaws(prev => prev.filter(l => !l.id.startsWith('custom_law_')));
            setPrecedents(prev => prev.filter(p => !p.id.startsWith('custom_prec_')));
            setBooks(prev => prev.filter(b => !b.id.startsWith('custom_book_')));
            await showAlert(`تم مسح ${removed.laws} مادɡ ${removed.precedents} سابޡ ${removed.books} كتاب من البيانات المخصصة.`);
          }}
            className="px-2.5 py-2 rounded-xl text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-700 cursor-pointer transition"
            title="مسح الإضافات المخصصة فقط">
            <Trash2 className="w-3 h-3 inline ms-1" />إعادة الضبط
          </button>
        </div>

        {/* Category & Tag Cloud filters */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { setSelectedCategory('all'); setSelectedTag(null); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition ${
                selectedCategory === 'all' && !selectedTag ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}>الكل</button>
            <button onClick={() => { setSelectedCategory('bookmarks'); setSelectedTag(null); }}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition flex items-center gap-1 ${
                selectedCategory === 'bookmarks' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}><Star className="w-2.5 h-2.5" />المفضلة</button>
            {activeSegment === 'books' && bookFolders.map(f => (
              <button key={f.id} onClick={() => { setSelectedFolderId(selectedFolderId === f.id ? null : f.id); setSelectedTag(null); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition flex items-center gap-1 ${
                  selectedFolderId === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}><Folder className="w-2.5 h-2.5" />{f.name}</button>
            ))}
            {activeSegment === 'books' && (
              <button onClick={() => { setFolderForm({ name: '', description: '', color: '#6366f1' }); setFolderModalOpen(true); }}
                className="px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition flex items-center gap-1 text-indigo-600 border-dashed border-indigo-300 hover:bg-indigo-50">
                <FolderPlus className="w-2.5 h-2.5" />مجلد جديد
              </button>
            )}
            {legalCategories.filter(c => activeSegment !== 'precedents' || ['جنائي','مدني','أحوال شخصية','مجلس دولة'].includes(c.name)).map(cat => (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setSelectedTag(null); }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition ${
                  selectedCategory === cat.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}>{cat.name}</button>
            ))}
          </div>

          {/* Tag cloud layout */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50/50 p-2 rounded-xl border border-slate-200/50">
              <span className="text-[9px] text-slate-400 font-bold ms-1">وسوم شائعة:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSelectedTag(selectedTag === tag ? null : tag); setSelectedCategory('all'); }}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer transition ${
                    selectedTag === tag ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* Imported Files Bar */}
        {importedFiles.length > 0 && (
          <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                <FileArchive className="w-3 h-3" /> الملفات المستوردة ({importedFiles.length})
              </h4>
              <button onClick={async () => { if (await confirm('حذف جميع الملفات المستوردɿ')) setImportedFiles([]); }}
                className="text-[9px] text-red-400 hover:text-red-600 font-bold cursor-pointer">حذف الكل</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {importedFiles.map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-2 flex items-center gap-2 max-w-[220px]">
                  {f.dataUrl.startsWith('data:image/') ? (
                    <img src={f.dataUrl} alt={f.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-700 truncate leading-tight">{f.name}</p>
                    <p className="text-[7px] text-slate-400">{f.size}</p>
                  </div>
                   <div className="flex items-center gap-1 shrink-0">
                    <a href={f.dataUrl} download={f.name}
                      className="text-indigo-400 hover:text-indigo-600 cursor-pointer">
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => setImportedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* List Panel */}
        <div className={`${activeSegment === 'encyclopedias' ? 'xl:col-span-5' : selectedLawId || selectedPrecId || selectedBookId || selectedEncId ? 'xl:col-span-5' : 'xl:col-span-12'} space-y-2`}>
          {activeSegment === 'books' && (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredBooks.map(book => (
                  <div key={book.id} onClick={() => handleSelectBook(book)}
                    className={`p-4 border rounded-xl cursor-pointer transition ${
                      selectedBookId === book.id ? 'border-indigo-500 bg-indigo-50/20 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${book.fileDataUrl ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {book.fileDataUrl ? <FileText className="w-4 h-4" /> : <Book className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{book.title}</h4>
                          <p className="text-[9px] text-slate-400">
                            {book.fileDataUrl 
                              ? `${book.fileSize || 'مستند'} | ${book.fileType?.split('/').pop()?.toUpperCase() || 'ملف'}`
                              : `${book.chapters.length} فصل | ${book.chapters.reduce((s, c) => s + c.articles.length, 0)} مادة`
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {book.fileDataUrl && (
                          <button
                            onClick={e => { e.stopPropagation(); openFileViewer(book); }}
                            className="text-slate-300 hover:text-indigo-500 cursor-pointer transition"
                            title="عرض الملف"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); openEditModal('book', book); }}
                          className="text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="تعديل بيانات الكتاب">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleBookBookmark(book.id); }}
                          className="text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="إضافة للمفضلة">
                          {bookmarkedBookIds.includes(book.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteBook(book.id); }}
                          className="text-slate-200 hover:text-red-500 cursor-pointer transition" title="حذف الكتاب">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 line-clamp-2">{book.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {book.tags.slice(0, 3).map(t => <span key={t} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>)}
                    </div>
                  </div>
                ))}
                {filteredBooks.length === 0 && <div className="col-span-2 py-8 text-center text-slate-400 text-xs">لا توجد كتب</div>}
              </div>
            ) : (
              <div className="space-y-1">
                  {filteredBooks.map(book => (
                    <div key={book.id} onClick={() => handleSelectBook(book)}
                      className={`p-2 border rounded-lg cursor-pointer transition flex items-center gap-2 ${
                        selectedBookId === book.id ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}>
                      {book.fileDataUrl ? <FileText className="w-4 h-4 text-emerald-500 shrink-0" /> : <Book className="w-4 h-4 text-indigo-500 shrink-0" />}
                      <span className="text-xs font-bold text-slate-900 flex-1">{book.title}</span>
                      <span className="text-[9px] text-slate-400">{book.fileDataUrl ? book.fileSize : `${book.chapters.length} فصول`}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {book.fileDataUrl && (
                          <button onClick={e => { e.stopPropagation(); openFileViewer(book); }}
                            className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="عرض الملف">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={e => { e.stopPropagation(); openEditModal('book', book); }}
                          className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="تعديل بيانات الكتاب">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); toggleBookBookmark(book.id); }}
                          className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="إضافة للمفضلة">
                          {bookmarkedBookIds.includes(book.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteBook(book.id); }}
                          className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition" title="حذف الكتاب">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )
          )}

          {activeSegment === 'laws' && filteredLaws.map(law => (
            <div key={law.id} onClick={() => handleSelectLaw(law)}
              className={`p-3 border rounded-xl cursor-pointer transition ${
                selectedLawId === law.id ? 'border-indigo-500 bg-indigo-50/15 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg shrink-0"><FileText className="w-3.5 h-3.5" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-slate-900 truncate">{law.lawName}</h4>
                    <p className="text-[10px] text-indigo-700 font-bold">{law.articleNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggleLawBookmark(law.id); }}
                    className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="إضافة للمفضلة">
                    {bookmarkedLawIds.includes(law.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEditModal('law', law); }}
                    className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="تعديل المادة">
                    <Edit className="w-3.5 h-3.5 animate-pulse" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleExportLawToWord(law); }}
                    className="p-1 text-slate-300 hover:text-blue-500 cursor-pointer transition" title="تصدير إلى Word">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={e => { 
                      e.stopPropagation(); 
                      printLegalItem(law.articleNumber, `
                        <h2>مادة قانونية: ${law.articleNumber}</h2>
                        <h3>القانون: ${law.lawName}</h3>
                        ${law.chapterName ? `<p><strong>الفصل/الباب:</strong> ${law.chapterName}</p>` : ''}
                        <hr/>
                        <div class="content-box">${law.content}</div>
                        ${annotations[law.id] ? `<div class="annotation-box"><strong>ملاحظة المحامي الشخصية:</strong><br/>${annotations[law.id]}</div>` : ''}
                      `); 
                    }} 
                    className="p-1 text-slate-300 hover:text-slate-500 cursor-pointer transition" 
                    title="طباعة المادة"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteLaw(law.id); }}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition" title="حذف المادة">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {searchQuery && (
                (() => {
                  const snippet = findMatchSnippet(
                    { 'المحتوى': law.content, 'الفصل': law.chapterName || '' },
                    searchQuery,
                    { 'المحتوى': 'المحتوى', 'الفصل': 'الفصل' }
                  );
                  const html = snippet
                    ? `<span class="font-bold text-indigo-700">${snippet.fieldName}: </span>${snippet.match.replace(/\n/g, '<br>')}`
                    : law.content.substring(0, 150) + '...';
                  return (
                    <div
                      className="mt-1.5 text-[10px] text-slate-600 bg-indigo-50/50 p-1.5 rounded border border-indigo-100"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
                    />
                  );
                })()
              )}
            </div>
          ))}

          {activeSegment === 'precedents' && filteredPrecs.map(prec => (
            <div key={prec.id} onClick={() => handleSelectPrec(prec)}
              className={`p-3 border rounded-xl cursor-pointer transition ${
                selectedPrecId === prec.id ? 'border-indigo-500 bg-indigo-50/15 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    prec.category === 'جنائي' ? 'bg-red-50 text-red-600' : prec.category === 'مدني' ? 'bg-blue-50 text-blue-600' : prec.category === 'أحوال شخصية' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                  }`}><Gavel className="w-3.5 h-3.5" /></div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-slate-900 line-clamp-2">{prec.principle}</h4>
                    <p className="text-[9px] text-slate-400 truncate">{prec.courtName} | {prec.rulingNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); togglePrecBookmark(prec.id); }}
                    className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="إضافة للمفضلة">
                    {bookmarkedPrecIds.includes(prec.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); openEditModal('precedent', prec); }}
                    className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="تعديل الحكم">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleExportPrecToWord(prec); }}
                    className="p-1 text-slate-300 hover:text-blue-500 cursor-pointer transition" title="تصدير إلى Word">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={e => { 
                      e.stopPropagation(); 
                      printLegalItem('سابق قضائي ومبدأ قانوني', `
                        <h2>مبدأ قضائي: ${prec.principle}</h2>
                        <p><strong>المحكمة:</strong> ${prec.courtName} | <strong>رقم الحكم:</strong> ${prec.rulingNumber} | <strong>تاريخ الحكم:</strong> ${prec.rulingDate}</p>
                        <hr/>
                        <div class="content-box">${prec.detailedDecision}</div>
                        ${annotations[prec.id] ? `<div class="annotation-box"><strong>ملاحظة المحامي الشخصية:</strong><br/>${annotations[prec.id]}</div>` : ''}
                      `); 
                    }} 
                    className="p-1 text-slate-300 hover:text-slate-500 cursor-pointer transition" 
                    title="طباعة الحكم"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleDeletePrecedent(prec.id); }}
                    className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition" title="حذف الحكم">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                prec.category === 'جنائي' ? 'bg-red-50 text-red-600' : prec.category === 'مدني' ? 'bg-blue-50 text-blue-600' : prec.category === 'أحوال شخصية' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
              }`}>{prec.category}</span>
            </div>
          ))}

          {activeSegment === 'encyclopedias' && (
            <div className="space-y-2">
              {encyclopedias.map((enc: any) => (
                <div key={enc.id} onClick={() => handleSelectEnc(enc)}
                  className={`p-3 border rounded-xl cursor-pointer transition ${
                    selectedEncId === enc.id ? 'border-emerald-500 bg-emerald-50/15' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{enc.title}</h4>
                      <p className="text-[9px] text-slate-400">{enc.files.length} ملف | {enc.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={e => { e.stopPropagation(); openEditModal('encyclopedia', enc); }}
                        className="p-1 text-slate-300 hover:text-indigo-500 cursor-pointer transition" title="تعديل الموسوعة">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async e => { e.stopPropagation(); if (await confirm('حذف الموسوعɿ')) { setEncyclopedias(prev => prev.filter((e: any) => e.id !== enc.id)); if (selectedEncId === enc.id) setSelectedEncId(null); } }}
                        className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition" title="حذف الموسوعة">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => { setAddModalType('folder'); setIsAddModalOpen(true); }}
                className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 cursor-pointer flex items-center justify-center gap-1 transition">
                <FolderPlus className="w-4 h-4" /> إضافة موسوعة جديدة
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
          {(selectedLaw && activeSegment === 'laws') || (selectedPrec && activeSegment === 'precedents') || (selectedBook && activeSegment === 'books') || (selectedEnc && activeSegment === 'encyclopedias') ? (
            <div key={selectedLaw?.id || selectedPrec?.id || selectedBook?.id || selectedEnc?.id}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
            >
              {selectedLaw && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">{selectedLaw.lawName}</h2>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1">{selectedLaw.articleNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => toggleLawBookmark(selectedLaw.id)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                        {bookmarkedLawIds.includes(selectedLaw.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <button onClick={() => openEditModal('law', selectedLaw)} className="p-1.5 rounded-lg hover:bg-slate-100 text-indigo-500 cursor-pointer" title="تعديل المادة">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleExportLawToWord(selectedLaw)} className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-500 cursor-pointer" title="تصدير إلى Word">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => printLegalItem(selectedLaw.articleNumber, `
                          <h2>مادة قانونية: ${selectedLaw.articleNumber}</h2>
                          <h3>القانون: ${selectedLaw.lawName}</h3>
                          ${selectedLaw.chapterName ? `<p><strong>الفصل/الباب:</strong> ${selectedLaw.chapterName}</p>` : ''}
                          <hr/>
                          <div class="content-box">${selectedLaw.content}</div>
                          ${annotations[selectedLaw.id] ? `<div class="annotation-box"><strong>ملاحظة المحامي الشخصية:</strong><br/>${annotations[selectedLaw.id]}</div>` : ''}
                        `)} 
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" 
                        title="طباعة المادة"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => linkToCase({ type: 'law', id: selectedLaw.id, label: `${selectedLaw.articleNumber} - ${selectedLaw.lawName}`, articleNumber: selectedLaw.articleNumber })}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 cursor-pointer" title="ربط بالقضية"><Briefcase className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteLaw(selectedLaw.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title="حذف المادة">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {selectedLaw.chapterName && <p className="text-[11px] text-slate-500 font-bold">{selectedLaw.chapterName}</p>}
                  <div className="p-4 bg-indigo-50/30 border border-indigo-100 rounded-xl text-xs text-slate-700 leading-relaxed text-justify whitespace-pre-wrap font-sans">
                    {selectedLaw.content}
                  </div>
                  {selectedLaw.tags && selectedLaw.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedLaw.tags.map(t => <span key={t} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">{t}</span>)}
                    </div>
                  )}

                  {/* مفكرة الهوامش والتعليقات الخاصة بالمحامي */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-1 mb-2">
                      <Brain className="w-3.5 h-3.5 text-indigo-500" />
                      التعليقات والهوامش القضائية الخاصة بك
                    </h4>
                    {annotations[selectedLaw.id] ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative">
                        <p className="text-[11px] text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">{annotations[selectedLaw.id]}</p>
                        <div className="flex gap-2 justify-end mt-2">
                          <button 
                            onClick={() => {
                              const text = prompt('تعديل التعليق الملاحظة:', annotations[selectedLaw.id]);
                              if (text !== null) {
                                setAnnotations(prev => ({ ...prev, [selectedLaw.id]: text.trim() }));
                              }
                            }}
                            className="text-[9px] text-indigo-600 hover:underline font-bold"
                          >تعديل</button>
                          <button 
                            onClick={async () => {
                              if (await confirm('حذف هذا التعلي޿')) {
                                setAnnotations(prev => {
                                  const updated = { ...prev };
                                  delete updated[selectedLaw.id];
                                  return updated;
                                });
                              }
                            }}
                            className="text-[9px] text-red-500 hover:underline font-bold"
                          >حذف</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          id="law-new-annotation-input"
                          type="text" 
                          placeholder="أضف ملاحظاتك أو مذكراتك أو الدفوع المتعلقة بهذه المادة..."
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] outline-none font-sans"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) {
                                setAnnotations(prev => ({ ...prev, [selectedLaw.id]: val }));
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('law-new-annotation-input') as HTMLInputElement;
                            const val = input?.value.trim();
                            if (val) {
                              setAnnotations(prev => ({ ...prev, [selectedLaw.id]: val }));
                              input.value = '';
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition"
                        >حفظ</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedPrec && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        selectedPrec.category === 'جنائي' ? 'bg-red-50 text-red-600' : selectedPrec.category === 'مدني' ? 'bg-blue-50 text-blue-600' : selectedPrec.category === 'أحوال شخصية' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>{selectedPrec.category}</span>
                      <h2 className="text-sm font-black text-slate-900 mt-1">{selectedPrec.principle}</h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => togglePrecBookmark(selectedPrec.id)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                        {bookmarkedPrecIds.includes(selectedPrec.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <button onClick={() => openEditModal('precedent', selectedPrec)} className="p-1.5 rounded-lg hover:bg-slate-100 text-indigo-500 cursor-pointer" title="تعديل الحكم">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleExportPrecToWord(selectedPrec)} className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-500 cursor-pointer" title="تصدير إلى Word">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => printLegalItem('سابق قضائي ومبدأ قانوني', `
                          <h2>مبدأ قضائي: ${selectedPrec.principle}</h2>
                          <p><strong>المحكمة:</strong> ${selectedPrec.courtName} | <strong>رقم الحكم:</strong> ${selectedPrec.rulingNumber} | <strong>تاريخ الحكم:</strong> ${selectedPrec.rulingDate}</p>
                          <hr/>
                          <div class="content-box">${selectedPrec.detailedDecision}</div>
                          ${annotations[selectedPrec.id] ? `<div class="annotation-box"><strong>ملاحظة المحامي الشخصية:</strong><br/>${annotations[selectedPrec.id]}</div>` : ''}
                        `)} 
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" 
                        title="طباعة الحكم"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => linkToCase({ type: 'precedent', id: selectedPrec.id, label: selectedPrec.principle })}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 cursor-pointer" title="ربط بالقضية"><Briefcase className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePrecedent(selectedPrec.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title="حذف الحكم">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
                    <p className="text-[10px] text-indigo-600 font-bold">{selectedPrec.courtName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{selectedPrec.rulingNumber} | {selectedPrec.rulingDate}</p>
                  </div>
                  <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed text-justify whitespace-pre-wrap">
                    {selectedPrec.detailedDecision}
                  </div>
                  {selectedPrec.tags && selectedPrec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPrec.tags.map(t => <span key={t} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{t}</span>)}
                    </div>
                  )}

                  {/* مفكرة الهوامش والتعليقات الخاصة بالمحامي */}
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <h4 className="text-[11px] font-black text-slate-800 flex items-center gap-1 mb-2">
                      <Brain className="w-3.5 h-3.5 text-indigo-500" />
                      التعليقات والهوامش القضائية الخاصة بك
                    </h4>
                    {annotations[selectedPrec.id] ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative">
                        <p className="text-[11px] text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">{annotations[selectedPrec.id]}</p>
                        <div className="flex gap-2 justify-end mt-2">
                          <button 
                            onClick={() => {
                              const text = prompt('تعديل التعليق الملاحظة:', annotations[selectedPrec.id]);
                              if (text !== null) {
                                setAnnotations(prev => ({ ...prev, [selectedPrec.id]: text.trim() }));
                              }
                            }}
                            className="text-[9px] text-indigo-600 hover:underline font-bold"
                          >تعديل</button>
                          <button 
                            onClick={async () => {
                              if (await confirm('حذف هذا التعلي޿')) {
                                setAnnotations(prev => {
                                  const updated = { ...prev };
                                  delete updated[selectedPrec.id];
                                  return updated;
                                });
                              }
                            }}
                            className="text-[9px] text-red-500 hover:underline font-bold"
                          >حذف</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          id="prec-new-annotation-input"
                          type="text" 
                          placeholder="أضف ملاحظاتك أو مذكراتك أو الدفوع المتعلقة بهذا المبدأ..."
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] outline-none font-sans"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) {
                                setAnnotations(prev => ({ ...prev, [selectedPrec.id]: val }));
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('prec-new-annotation-input') as HTMLInputElement;
                            const val = input?.value.trim();
                            if (val) {
                              setAnnotations(prev => ({ ...prev, [selectedPrec.id]: val }));
                              input.value = '';
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition"
                        >حفظ</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedBook && (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">{selectedBook.title}</h2>
                      <p className="text-[11px] text-slate-500">{selectedBook.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEditModal('book', selectedBook)} className="p-1.5 rounded-lg hover:bg-slate-100 text-indigo-500 cursor-pointer" title="تعديل تفاصيل الكتاب">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { handleDeleteBook(selectedBook.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer" title="حذف الكتاب"><Trash2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => toggleBookBookmark(selectedBook.id)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                        {bookmarkedBookIds.includes(selectedBook.id) ? <Star className="w-3.5 h-3.5 text-indigo-500" /> : <StarOff className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedBook.tags.map(t => <span key={t} className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">{t}</span>)}
                  </div>
                  <div className="h-px bg-slate-100"></div>

                  {selectedBook.fileDataUrl && (
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-800/40 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-xl">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-white">{selectedBook.fileName || selectedBook.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {selectedBook.fileSize || 'حجم غير معروف'}
                              {selectedBook.fileType && ` · ${selectedBook.fileType.split('/').pop()?.toUpperCase()}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openFileViewer(selectedBook)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> عرض الملف
                          </button>
                          <a
                            href={selectedBook.fileDataUrl}
                            download={selectedBook.fileName || `${selectedBook.title}`}
                            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 transition"
                          >
                            <Download className="w-3.5 h-3.5" /> تحميل
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* إدارة فصول ومواد الكتاب المخصص */}
                  {selectedBook.source !== 'mock' && (
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-800">هيكلة فصول ومواد الكتاب</span>
                        {!isAddingChapter ? (
                          <button 
                            onClick={() => setIsAddingChapter(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg transition"
                          >
                            + إضافة فصل جديد
                          </button>
                        ) : (
                          <div className="flex gap-1.5 items-center">
                            <input 
                              type="text" 
                              placeholder="عنوان الفصل..." 
                              value={newChapterTitle} 
                              onChange={e => setNewChapterTitle(e.target.value)}
                              className="border border-slate-200 bg-white rounded-lg px-2 py-0.5 text-[9px] outline-none font-sans"
                            />
                            <button 
                              onClick={() => {
                                if (!newChapterTitle.trim()) return;
                                const newCh = {
                                  id: 'ch_custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                                  title: newChapterTitle.trim(),
                                  articles: []
                                };
                                setBooks(prev => prev.map(b => b.id === selectedBook.id ? { ...b, chapters: [...b.chapters, newCh] } : b));
                                setNewChapterTitle('');
                                setIsAddingChapter(false);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg"
                            >حفظ</button>
                            <button 
                              onClick={() => { setIsAddingChapter(false); setNewChapterTitle(''); }}
                              className="text-slate-400 hover:text-slate-600 text-[9px] font-bold"
                            >إلغاء</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {selectedBook.chapters.map(ch => (
                      <div key={ch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedChapter(expandedChapter === ch.id ? null : ch.id)}
                          className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                          <span className="text-xs font-bold text-slate-800">{ch.title}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-[9px] text-slate-400">{ch.articles.length} مادة</span>
                            {expandedChapter === ch.id ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" /> : <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />}
                          </span>
                        </button>
                        {expandedChapter === ch.id && (
                          <div className="divide-y divide-slate-100">
                            {ch.articles.map(art => (
                              <div key={art.id} className="p-3 hover:bg-slate-50 transition">
                                <span className="text-[10px] font-bold text-indigo-700">{art.articleNumber}</span>
                                <p className="text-[10.5px] text-slate-700 mt-1 leading-relaxed">{art.content.substring(0, 200)}...</p>
                                <button onClick={() => { setSelectedLawId(art.id); setActiveSegment('laws'); }}
                                  className="text-[9px] text-indigo-500 hover:text-indigo-700 font-bold mt-1">عرض كامل المادة</button>
                              </div>
                            ))}

                            {/* نموذج إضافة مادة للفصل */}
                            {selectedBook.source !== 'mock' && (
                              <div className="p-3 bg-slate-50/50 border-t border-slate-200">
                                {isAddingArticle === ch.id ? (
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      placeholder="رقم المادة (مثال: المادة ٢٥)..." 
                                      value={newArticleForm.articleNumber}
                                      onChange={e => setNewArticleForm({ ...newArticleForm, articleNumber: e.target.value })}
                                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] outline-none bg-white font-sans"
                                    />
                                    <textarea 
                                      placeholder="نص المادة القانوني..." 
                                      value={newArticleForm.content}
                                      onChange={e => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
                                      className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] outline-none bg-white min-h-[60px] font-sans"
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button 
                                        onClick={() => {
                                          if (!newArticleForm.articleNumber.trim() || !newArticleForm.content.trim()) return;
                                          const newArt = {
                                            id: 'art_custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                                            lawName: selectedBook.title,
                                            articleNumber: newArticleForm.articleNumber.trim(),
                                            content: newArticleForm.content.trim(),
                                            chapterName: ch.title,
                                            tags: []
                                          };
                                          setBooks(prev => prev.map(b => {
                                            if (b.id !== selectedBook.id) return b;
                                            return {
                                              ...b,
                                              chapters: b.chapters.map(c => c.id === ch.id ? { ...c, articles: [...c.articles, newArt] } : c)
                                            };
                                          }));
                                          setLaws(prev => [...prev, newArt]);
                                          setNewArticleForm({ articleNumber: '', content: '', tags: '' });
                                          setIsAddingArticle(null);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg transition"
                                      >حفظ المادة</button>
                                      <button 
                                        onClick={() => setIsAddingArticle(null)}
                                        className="text-slate-400 hover:text-slate-600 text-[9px] font-bold"
                                      >إلغاء</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setIsAddingArticle(ch.id)}
                                    className="text-indigo-600 hover:text-indigo-800 text-[9px] font-bold block mx-auto transition"
                                  >
                                    + إضافة مادة جديدة لهذا الفصل
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {selectedEnc && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black text-slate-900">{selectedEnc.title}</h2>
                      <p className="text-[11px] text-slate-500">{selectedEnc.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openEditModal('encyclopedia', selectedEnc)} className="p-1.5 rounded-lg hover:bg-slate-100 text-indigo-500 cursor-pointer" title="تعديل الموسوعة">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async () => { if (await confirm('حذف الموسوعɿ')) { setEncyclopedias(prev => prev.filter((e: any) => e.id !== selectedEnc.id)); setSelectedEncId(null); } }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition"
                    onDragOver={e => e.preventDefault()}
                    onDrop={async e => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files) as File[];
                      const newFiles = await Promise.all(files.map(f => new Promise<any>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB', type: f.type, uploadedAt: new Date().toISOString().split('T')[0], dataUrl: reader.result });
                        reader.readAsDataURL(f);
                      })));
                      setEncyclopedias(prev => prev.map((enc: any) => enc.id === selectedEnc.id ? { ...enc, files: [...enc.files, ...newFiles] } : enc));
                    }}
                    onClick={() => encFileInputRef.current?.click()}>
                    <input ref={encFileInputRef} type="file" multiple className="hidden" onChange={async e => {
                      const files = Array.from(e.target.files || []) as File[];
                      if (files.length === 0) return;
                      const newFiles = await Promise.all(files.map(f => new Promise<any>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ name: f.name, size: (f.size / 1024).toFixed(1) + ' KB', type: f.type, uploadedAt: new Date().toISOString().split('T')[0], dataUrl: reader.result });
                        reader.readAsDataURL(f);
                      })));
                      setEncyclopedias(prev => prev.map((enc: any) => enc.id === selectedEnc.id ? { ...enc, files: [...enc.files, ...newFiles] } : enc));
                      if (encFileInputRef.current) encFileInputRef.current.value = '';
                    }} />
                    <Upload className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">اسحب وأسقط الملفات هنا</p>
                    <p className="text-[9px] text-slate-300 mt-1">أو انقر لاختيار ملفات متعددة</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedEnc.files.map((f: any, i: number) => (
                      <div key={i} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
                        <File className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{f.name}</p>
                          <p className="text-[8px] text-slate-400">{f.size}</p>
                        </div>
                        {f.dataUrl && <a href={f.dataUrl} download={f.name} className="text-indigo-500 hover:text-indigo-700"><Download className="w-3 h-3" /></a>}
                        <button onClick={() => {
                          setEncyclopedias(prev => prev.map((enc: any) => enc.id === selectedEnc.id ? { ...enc, files: enc.files.filter((_: any, idx: number) => idx !== i) } : enc));
                        }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeSegment !== 'encyclopedias' ? (
            <div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="xl:col-span-7 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center p-10 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-400">اختر عنصراً من القائمة لعرض تفاصيله</h3>
              <p className="text-[11px] text-slate-300 mt-1">استخدم البحث الذكي للعثور على ما تبحث عنه بسرعة</p>
            </div>
          ) : null}
      </div>

      {/* Smart Search Overlay */}
      {smartSearch && searchQuery.trim() && smartSearchResults && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-black text-indigo-700 flex items-center gap-1"><Brain className="w-3.5 h-3.5" /> نتائج البحث الذكي</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
              <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> القوانين ({smartSearchResults.laws.length})</p>
              {smartSearchResults.laws.slice(0, 3).map(l => <p key={l.id} className="text-[9px] text-slate-600 mt-1 cursor-pointer hover:text-indigo-600" onClick={() => { setSelectedLawId(l.id); setActiveSegment('laws'); }}>{l.lawName} - {l.articleNumber}</p>)}
            </div>
            <div className="p-3 bg-indigo-50/30 border border-indigo-100 rounded-xl">
              <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1"><Gavel className="w-3 h-3" /> الأحكام ({smartSearchResults.precedents.length})</p>
              {smartSearchResults.precedents.slice(0, 3).map(p => <p key={p.id} className="text-[9px] text-slate-600 mt-1 cursor-pointer hover:text-indigo-600" onClick={() => { setSelectedPrecId(p.id); setActiveSegment('precedents'); }}>{p.principle.substring(0, 50)}...</p>)}
            </div>
            <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Book className="w-3 h-3" /> الكتب ({smartSearchResults.books.length})</p>
              {smartSearchResults.books.slice(0, 3).map(b => <p key={b.id} className="text-[9px] text-slate-600 mt-1 cursor-pointer hover:text-emerald-600" onClick={() => { setSelectedBookId(b.id); setActiveSegment('books'); }}>{b.title}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal — بدون AnimatePresence لتفادي مشاكل التحميل في Electron */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900">
                {addModalType === 'book' ? 'إضافة كتاب جديد' : addModalType === 'law' ? 'إضافة مادة قانونية' : addModalType === 'precedent' ? 'إضافة حكم قضائي' : 'إضافة موسوعة جديدة'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="flex gap-1 mb-4 bg-slate-50 p-1 rounded-lg">
              {(['book', 'law', 'precedent'] as const).map(t => (
                <button key={t} onClick={() => setAddModalType(t)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    addModalType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}>{t === 'book' ? 'كتاب' : t === 'law' ? 'مادة' : 'حكم'}</button>
              ))}
            </div>

            {addModalType === 'book' && (
              <div className="space-y-3">
                {/* File Upload Zone */}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={async e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (!file) return;
                    const dataUrl = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(file);
                    });
                    const formattedSize = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : (file.size / 1024).toFixed(1) + ' KB';
                    setNewBookFile({ dataUrl, name: file.name, size: formattedSize, type: file.type });
                    if (!newForm.title) setNewForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }));
                  }}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${newBookFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/10'}`}
                >
                  {newBookFile ? (
                    <div className="space-y-1">
                      <FileText className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-emerald-700">{newBookFile.name}</p>
                      <p className="text-[10px] text-slate-500">{newBookFile.size}</p>
                      <button onClick={() => setNewBookFile(null)} className="text-[10px] text-red-500 hover:text-red-700 font-bold mt-1">حذف الملف</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs text-slate-400 font-bold">اسحب وأسقط ملف (PDF, Word, صورة...) أو</p>
                      <label className="cursor-pointer text-[10px] text-indigo-600 font-bold hover:underline">
                        اختر ملفاً من الجهاز
                        <input type="file" className="hidden" onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });
                          const formattedSize = file.size > 1024 * 1024 ? (file.size / (1024 * 1024)).toFixed(1) + ' MB' : (file.size / 1024).toFixed(1) + ' KB';
                          setNewBookFile({ dataUrl, name: file.name, size: formattedSize, type: file.type });
                          if (!newForm.title) setNewForm(f => ({ ...f, title: file.name.replace(/\.[^/.]+$/, '') }));
                        }} />
                      </label>
                      <p className="text-[9px] text-slate-400">يدعم جميع الامتدادات: PDF, DOCX, XLSX, TXT, صور...</p>
                    </div>
                  )}
                </div>
                <input value={newForm.title} onChange={e => setNewForm({...newForm, title: e.target.value})} placeholder="عنوان الكتاب / المرجع" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                <textarea value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} placeholder="وصف الكتاب" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none min-h-[60px]" />
                <select value={newForm.category} onChange={e => setNewForm({...newForm, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                  {legalCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {bookFolders.length > 0 && (
                  <select value={newForm.folderId} onChange={e => setNewForm({...newForm, folderId: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                    <option value="">بدون مجلد</option>
                    {bookFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                )}
                <input value={newForm.tags} onChange={e => setNewForm({...newForm, tags: e.target.value})} placeholder="وسوم (مفصولة بفواصل)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
            )}
            {addModalType === 'law' && (
              <div className="space-y-3">
                <input value={newForm.lawName} onChange={e => setNewForm({...newForm, lawName: e.target.value})} placeholder="اسم القانون" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                <input value={newForm.articleNumber} onChange={e => setNewForm({...newForm, articleNumber: e.target.value})} placeholder="رقم المادة" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                <textarea value={newForm.content} onChange={e => setNewForm({...newForm, content: e.target.value})} placeholder="نص المادة القانوني" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none min-h-[120px]" />
                <input value={newForm.tags} onChange={e => setNewForm({...newForm, tags: e.target.value})} placeholder="وسوم (مفصولة بفواصل)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
            )}
            {addModalType === 'precedent' && (
              <div className="space-y-3">
                <select value={newForm.category} onChange={e => setNewForm({...newForm, category: e.target.value})} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none bg-white">
                  <option value="مدني">مدني</option><option value="جنائي">جنائي</option><option value="أحوال شخصية">أحوال شخصية</option><option value="مجلس دولة">مجلس دولة</option>
                </select>
                <input value={newForm.principle} onChange={e => setNewForm({...newForm, principle: e.target.value})} placeholder="المبدأ القانوني" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                <input value={newForm.courtName} onChange={e => setNewForm({...newForm, courtName: e.target.value})} placeholder="اسم المحكمة" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={newForm.rulingNumber} onChange={e => setNewForm({...newForm, rulingNumber: e.target.value})} placeholder="رقم الحكم" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                  <input value={newForm.rulingDate} onChange={e => setNewForm({...newForm, rulingDate: e.target.value})} type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
                </div>
                <textarea value={newForm.detailedDecision} onChange={e => setNewForm({...newForm, detailedDecision: e.target.value})} placeholder="نص الحكم كاملاً" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none min-h-[120px]" />
                <input value={newForm.tags} onChange={e => setNewForm({...newForm, tags: e.target.value})} placeholder="وسوم (مفصولة بفواصل)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
              </div>
            )}

            <button onClick={handleAddItem}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 text-xs font-bold py-2.5 rounded-xl mt-4 cursor-pointer transition">
              حفظ
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────── */}
      {isEditModalOpen && editItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Edit className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editItem.type === 'law' ? 'تعديل المادة القانونية' :
                     editItem.type === 'precedent' ? 'تعديل الحكم القضائي' :
                     editItem.type === 'book' ? 'تعديل بيانات الكتاب' :
                     'تعديل الموسوعة / المجلد'}
                  </h3>
                  <p className="text-[9px] text-slate-400">البيانات المحدثة ستُحفظ فوراً في قاعدة البيانات</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl cursor-pointer transition">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-3">
              {/* Law Fields */}
              {editItem.type === 'law' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">اسم القانون</label>
                    <input
                      value={editForm.lawName || ''}
                      onChange={e => setEditForm({ ...editForm, lawName: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="اسم القانون..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">رقم المادة</label>
                    <input
                      value={editForm.articleNumber || ''}
                      onChange={e => setEditForm({ ...editForm, articleNumber: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="المادة رقم..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الفصل / الباب (اختياري)</label>
                    <input
                      value={editForm.chapterName || ''}
                      onChange={e => setEditForm({ ...editForm, chapterName: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="الفصل أو الباب..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">نص المادة</label>
                    <textarea
                      value={editForm.content || ''}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans min-h-[140px]"
                      placeholder="نص المادة القانونية كاملاً..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الوسوم (مفصولة بفواصل)</label>
                    <input
                      value={editForm.tags || ''}
                      onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="مدني، حقوޡ عقود..."
                    />
                  </div>
                </>
              )}

              {/* Precedent Fields */}
              {editItem.type === 'precedent' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">التصنيف</label>
                    <select
                      value={editForm.category || 'مدني'}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
                    >
                      <option value="مدني">مدني</option>
                      <option value="جنائي">جنائي</option>
                      <option value="أحوال شخصية">أحوال شخصية</option>
                      <option value="مجلس دولة">مجلس دولة</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">المبدأ القانوني</label>
                    <textarea
                      value={editForm.principle || ''}
                      onChange={e => setEditForm({ ...editForm, principle: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans min-h-[80px]"
                      placeholder="المبدأ القانوني المستخلص..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">اسم المحكمة</label>
                    <input
                      value={editForm.courtName || ''}
                      onChange={e => setEditForm({ ...editForm, courtName: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="محكمة النقض - الدائرة المدنية..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">رقم الحكم</label>
                      <input
                        value={editForm.rulingNumber || ''}
                        onChange={e => setEditForm({ ...editForm, rulingNumber: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                        placeholder="الطعن رقم..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">تاريخ الحكم</label>
                      <input
                        type="date"
                        value={editForm.rulingDate || ''}
                        onChange={e => setEditForm({ ...editForm, rulingDate: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">نص الحكم كاملاً</label>
                    <textarea
                      value={editForm.detailedDecision || ''}
                      onChange={e => setEditForm({ ...editForm, detailedDecision: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans min-h-[120px]"
                      placeholder="منطوق الحكم ومسبباته التفصيلية..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الوسوم (مفصولة بفواصل)</label>
                    <input
                      value={editForm.tags || ''}
                      onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="تعوي֡ ضرѡ فسخ..."
                    />
                  </div>
                </>
              )}

              {/* Book Fields */}
              {editItem.type === 'book' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">عنوان الكتاب / المرجع</label>
                    <input
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="عنوان الكتاب..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الوصف</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans min-h-[80px]"
                      placeholder="وصف موجز للكتاب..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">التصنيف</label>
                    <select
                      value={editForm.category || ''}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
                    >
                      {legalCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {bookFolders.length > 0 && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-1">المجلد</label>
                      <select
                        value={editForm.folderId || ''}
                        onChange={e => setEditForm({ ...editForm, folderId: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 bg-white"
                      >
                        <option value="">بدون مجلد</option>
                        {bookFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الوسوم (مفصولة بفواصل)</label>
                    <input
                      value={editForm.tags || ''}
                      onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="وسوم..."
                    />
                  </div>
                </>
              )}

              {/* Encyclopedia Fields */}
              {editItem.type === 'encyclopedia' && (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">عنوان الموسوعة</label>
                    <input
                      value={editForm.title || ''}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans"
                      placeholder="اسم الموسوعة القانونية..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-1">الوصف</label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-sans min-h-[80px]"
                      placeholder="وصف الموسوعة..."
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={handleEditSave}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 rounded-xl cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" />
                حفظ التعديلات
              </button>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reading Mode Overlay */}
        {readMode && selectedLaw && (
          <div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white p-8 overflow-y-auto" dir="rtl">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-black text-slate-900">{selectedLaw.articleNumber} - {selectedLaw.lawName}</h2>
                <button onClick={() => setReadMode(false)} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="text-sm text-slate-800 leading-loose text-justify whitespace-pre-wrap font-sans">
                {selectedLaw.content}
              </div>
            </div>
          </div>
        )}
      {isImporting && (
        <div className="fixed bottom-4 end-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 animate-spin" /> جاري استيراد الملفات...
        </div>
      )}

      {/* ── Folder Management Modal ─────────────────────── */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50" onClick={() => setFolderModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-5 shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900">إدارة المجلدات</h3>
              <button onClick={() => setFolderModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input value={folderForm.name} onChange={e => setFolderForm({...folderForm, name: e.target.value})} placeholder="اسم المجلد" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none" />
              <textarea value={folderForm.description} onChange={e => setFolderForm({...folderForm, description: e.target.value})} placeholder="وصف المجلد (اختياري)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none min-h-[50px]" />
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-slate-500 font-bold">اللون:</label>
                <input type="color" value={folderForm.color} onChange={e => setFolderForm({...folderForm, color: e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => {
                if (!folderForm.name.trim()) return;
                const newFolder = {
                  id: 'folder_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                  name: folderForm.name.trim(),
                  description: folderForm.description.trim(),
                  color: folderForm.color,
                  createdAt: new Date().toISOString().split('T')[0],
                };
                setBookFolders(prev => [...prev, newFolder]);
                setFolderForm({ name: '', description: '', color: '#6366f1' });
              }} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl cursor-pointer transition">إضافة المجلد</button>
              <button onClick={() => setFolderModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl cursor-pointer transition">إلغاء</button>
            </div>
            {bookFolders.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-400 font-bold mb-2">المجلدات الحالية:</p>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {bookFolders.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: f.color || '#6366f1'}}></div>
                        <span className="text-xs font-bold text-slate-700">{f.name}</span>
                        <span className="text-[9px] text-slate-400">({books.filter(b => b.folderId === f.id).length} كتب)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          setFolderForm({ name: f.name, description: f.description || '', color: f.color || '#6366f1' });
                          setBookFolders(prev => prev.filter(x => x.id !== f.id));
                        }} className="text-slate-300 hover:text-indigo-500 cursor-pointer p-1" title="تعديل"><Edit className="w-3 h-3" /></button>
                        <button onClick={async () => {
                          if (!await confirm('حذف المجلد "' + f.name + '"؟ الكتب لن تُحذف.')) return;
                          setBookFolders(prev => prev.filter(x => x.id !== f.id));
                          setBooks(prev => prev.map(b => b.folderId === f.id ? { ...b, folderId: undefined } : b));
                          if (selectedFolderId === f.id) setSelectedFolderId(null);
                        }} className="text-slate-300 hover:text-red-500 cursor-pointer p-1" title="حذف"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AdSense Multiplex Banner (Bottom Recommendations) */}
      <AdSenseBanner slot="8981348923" format="autorelaxed" className="max-w-5xl mx-auto w-full my-6" />

      {/* ── File Viewer Modal ──────────────────────────── */}
      {fileViewerData && (
        <FileViewer
          isOpen={fileViewerOpen}
          onClose={() => setFileViewerOpen(false)}
          fileDataUrl={fileViewerData.dataUrl}
          fileName={fileViewerData.name}
          fileType={fileViewerData.type}
          fileSize={fileViewerData.size}
          initialExtractedText={fileViewerData.extractedText || ''}
          onSaveExtractedText={(text) => {
            if (fileViewerData.bookId) {
              handleSaveExtractedText(fileViewerData.bookId, text);
              // Update local state to reflect it immediately in viewer if still open
              setFileViewerData(prev => prev ? { ...prev, extractedText: text } : null);
            }
          }}
        />
      )}
    </div>
  );
});

export default LegalLibrary;

/**
 * Renderer logic — يستخدم window.genAPI للـ IPC
 */

const api = window.genAPI;

// Toast helper
const toast = (type, message) => {
  const container = document.getElementById('toast-container');
  const colors = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-rose-500 text-white',
    info: 'bg-slate-700 text-white',
    warning: 'bg-amber-500 text-white',
  };
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const el = document.createElement('div');
  el.className = `toast ${colors[type]} px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 min-w-[280px]`;
  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.remove(), 300); }, 3000);
};

const confirmDialog = (title, message, danger = false) => {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const okBtn = document.getElementById('confirm-ok');
    okBtn.className = `flex-1 text-white text-xs font-bold py-2.5 rounded-xl ${danger ? 'btn-danger' : 'btn-primary'}`;
    document.getElementById('confirm-modal').classList.remove('hidden');
    const cleanup = (val) => {
      document.getElementById('confirm-modal').classList.add('hidden');
      document.getElementById('confirm-ok').onclick = null;
      document.getElementById('confirm-cancel').onclick = null;
      resolve(val);
    };
    okBtn.onclick = () => cleanup(true);
    document.getElementById('confirm-cancel').onclick = () => cleanup(false);
  });
};

// Tabs
const sections = document.querySelectorAll('section[data-section]');
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    sections.forEach(s => s.classList.toggle('hidden', s.dataset.section !== target));
    if (target === 'records') refreshRecords();
  });
});

const f = {
  customer: document.getElementById('f-customer'),
  key: document.getElementById('f-key'),
  machine: document.getElementById('f-machine'),
  duration: document.getElementById('f-duration'),
  maxusers: document.getElementById('f-maxusers'),
  features: document.getElementById('f-features'),
  notes: document.getElementById('f-notes'),
};

document.getElementById('btn-fetch-machine').addEventListener('click', async () => {
  const id = await api.getMachineId();
  f.machine.value = id;
  toast('success', 'تم جلب معرّف هذا الجهاز');
});
document.getElementById('btn-clear-machine').addEventListener('click', () => { f.machine.value = ''; });

document.querySelectorAll('.preset-btn').forEach(b => {
  b.addEventListener('click', () => { f.duration.value = b.dataset.preset; });
});

document.getElementById('btn-reset-form').addEventListener('click', () => {
  Object.values(f).forEach(el => {
    if (el.tagName === 'SELECT') el.value = '';
    else if (el.id === 'f-duration') el.value = '365';
    else if (el.id === 'f-maxusers') el.value = '-1';
    else el.value = '';
  });
  document.getElementById('result-card').classList.add('hidden');
  document.getElementById('result-empty').classList.remove('hidden');
  currentGenerated = null;
});

let currentGenerated = null;

document.getElementById('btn-generate').addEventListener('click', async () => {
  const opts = {
    customerName: f.customer.value.trim(),
    customerKey: f.key.value.trim(),
    machineId: f.machine.value.trim() || null,
    durationDays: parseInt(f.duration.value, 10),
    maxUsers: parseInt(f.maxusers.value, 10),
    features: f.features.value,
    notes: f.notes.value.trim(),
  };

  if (!opts.customerKey) return toast('error', 'Customer Key مطلوب');
  if (!opts.durationDays || opts.durationDays < 1) return toast('error', 'المدة يجب أن تكون رقماً موجباً');
  if (!opts.customerName) opts.customerName = opts.customerKey;

  const btn = document.getElementById('btn-generate');
  btn.disabled = true;
  btn.innerHTML = '<svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg> جاري التوليد...';

  const res = await api.generate(opts);
  btn.disabled = false;
  btn.innerHTML = '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> توليد المفتاح';

  if (!res.success) return toast('error', res.error);

  currentGenerated = res;
  showResult(res);
  await refreshRecords();
  toast('success', 'تم توليد المفتاح بنجاح');
});

function showResult(res) {
  document.getElementById('result-empty').classList.add('hidden');
  document.getElementById('result-card').classList.remove('hidden');
  document.getElementById('result-token').textContent = res.token;
  document.getElementById('result-customer').textContent = res.record.customerName;
  document.getElementById('result-key').textContent = res.record.customerKey;
  document.getElementById('result-expires').textContent = new Date(res.payload.expiresAt).toLocaleString('ar-EG');
  document.getElementById('result-duration').textContent = `${res.record.durationDays} يوم`;
}

document.getElementById('btn-copy-token').addEventListener('click', async () => {
  if (!currentGenerated) return;
  const res = await api.copy(currentGenerated.token);
  if (res.success) toast('success', 'تم نسخ المفتاح للحافظة');
});

document.getElementById('btn-verify-now').addEventListener('click', async () => {
  if (!currentGenerated) return;
  const verifyRes = await api.verify(currentGenerated.token);
  showVerifyResult(verifyRes, currentGenerated.token);
  switchTab('verify');
});

document.getElementById('btn-save-record').addEventListener('click', async () => {
  if (!currentGenerated) return;
  await refreshRecords();
  toast('success', 'محفوظ في السجل');
});

function switchTab(name) {
  tabBtns.forEach(b => { if (b.dataset.tab === name) b.click(); });
}

// Verify
document.getElementById('btn-verify').addEventListener('click', async () => {
  const token = document.getElementById('verify-token').value.trim();
  if (!token) return toast('error', 'ألصق المفتاح أولاً');
  const res = await api.verify(token);
  showVerifyResult(res, token);
});

function showVerifyResult(res, token) {
  const container = document.getElementById('verify-result');
  container.classList.remove('hidden');

  if (!res.valid) {
    container.innerHTML = `
      <div class="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mt-3 space-y-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-rose-500/30 flex items-center justify-center text-rose-300 font-bold">✕</div>
          <p class="text-sm font-black text-rose-300">ترخيص غير صالح</p>
        </div>
        <p class="text-[11px] text-slate-300">السبب: ${res.reason || 'غير محدد'}</p>
        ${res.expired ? '<p class="text-[10px] text-amber-300">⚠️ الترخيص انتهى صلاحيته</p>' : ''}
      </div>`;
    return;
  }

  const p = res.payload;
  const daysColor = res.daysLeft <= 7 ? 'text-rose-300' : res.daysLeft <= 30 ? 'text-amber-300' : 'text-emerald-300';
  container.innerHTML = `
    <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mt-3 space-y-3">
      <div class="flex items-center gap-2 pb-2 border-b border-emerald-500/20">
        <div class="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold">✓</div>
        <p class="text-sm font-black text-emerald-300">ترخيص صالح</p>
        <span class="${daysColor} text-xs font-bold mr-auto">${res.daysLeft} يوم متبقي</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">العميل:</span> <span class="font-bold text-white mr-1">${p.customer}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">المعرّف:</span> <span class="font-bold text-white mr-1 mono">${p.key}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">تاريخ الإصدار:</span> <span class="font-bold text-white mr-1">${new Date(p.issuedAt).toLocaleString('ar-EG')}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">تاريخ الانتهاء:</span> <span class="font-bold text-white mr-1">${new Date(p.expiresAt).toLocaleString('ar-EG')}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">الجهاز:</span> <span class="font-bold text-white mr-1 mono break-all">${p.machineId || '(أي جهاز)'}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">الميزات:</span> <span class="font-bold text-white mr-1">${p.features || '-'}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">حد المستخدمين:</span> <span class="font-bold text-white mr-1">${p.maxUsers === -1 ? 'غير محدود' : p.maxUsers}</span></div>
        <div class="bg-slate-900/60 rounded p-2"><span class="text-slate-400">الإصدار:</span> <span class="font-bold text-white mr-1">v${p.version}</span></div>
      </div>
      ${p.notes ? `<div class="bg-slate-900/60 rounded p-2 text-[11px]"><span class="text-slate-400">ملاحظات:</span> <span class="text-slate-200 mr-1">${p.notes}</span></div>` : ''}
    </div>`;
}

// Records
async function refreshRecords() {
  const records = await api.list();
  document.getElementById('records-count').textContent = records.length;

  const search = document.getElementById('records-search').value.toLowerCase().trim();
  const filtered = !search ? records : records.filter(r =>
    (r.customerName || '').toLowerCase().includes(search) ||
    (r.customerKey || '').toLowerCase().includes(search) ||
    (r.token || '').toLowerCase().includes(search)
  );

  const table = document.getElementById('records-table');
  if (filtered.length === 0) {
    table.innerHTML = `<div class="text-center py-10 text-slate-500 text-xs">${records.length === 0 ? 'لا توجد تراخيص بعد. ابدأ بتوليد مفتاح من تبويب "توليد مفتاح".' : 'لا توجد نتائج تطابق البحث.'}</div>`;
    return;
  }

  let html = `
    <table class="w-full text-[11px]">
      <thead class="bg-slate-900 sticky top-0">
        <tr class="text-slate-400">
          <th class="px-3 py-2 text-right">التاريخ</th>
          <th class="px-3 py-2 text-right">العميل</th>
          <th class="px-3 py-2 text-right">المعرّف</th>
          <th class="px-3 py-2 text-right">المدة</th>
          <th class="px-3 py-2 text-right">الانتهاء</th>
          <th class="px-3 py-2 text-right">الجهاز</th>
          <th class="px-3 py-2 text-center">الحالة</th>
          <th class="px-3 py-2 text-center">إجراءات</th>
        </tr>
      </thead>
      <tbody>`;
  for (const r of filtered.slice(0, 500)) {
    const expired = r.payload && Date.now() > r.payload.expiresAt;
    const daysLeft = r.payload ? Math.ceil((r.payload.expiresAt - Date.now()) / 86400000) : 0;
    const statusColor = expired ? 'text-rose-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400';
    const statusText = expired ? `منتهي (-${Math.abs(daysLeft)} يوم)` : `${daysLeft} يوم`;
    html += `
      <tr class="border-b border-slate-800 row-hover">
        <td class="px-3 py-2 text-slate-400 mono">${new Date(r.generatedAt).toLocaleString('ar-EG')}</td>
        <td class="px-3 py-2 font-bold text-slate-200">${r.customerName || '-'}</td>
        <td class="px-3 py-2 mono text-slate-300">${r.customerKey}</td>
        <td class="px-3 py-2 text-slate-300">${r.durationDays} يوم</td>
        <td class="px-3 py-2 text-slate-400 mono">${r.payload ? new Date(r.payload.expiresAt).toLocaleDateString('ar-EG') : '-'}</td>
        <td class="px-3 py-2 mono text-[10px] text-slate-500 truncate max-w-[120px]" title="${r.machineId || 'أي جهاز'}">${r.machineId || '🔓 أي جهاز'}</td>
        <td class="px-3 py-2 text-center font-bold ${statusColor}">${statusText}</td>
        <td class="px-3 py-2 text-center">
          <button data-action="copy" data-id="${r.id}" class="text-[10px] font-bold px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded mr-1">📋</button>
          <button data-action="verify" data-id="${r.id}" class="text-[10px] font-bold px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded mr-1">✓</button>
          <button data-action="delete" data-id="${r.id}" class="text-[10px] font-bold px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded">🗑️</button>
        </td>
      </tr>`;
  }
  html += '</tbody></table>';
  table.innerHTML = html;
  table.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'copy') copyRecordToken(id);
      else if (btn.dataset.action === 'verify') verifyRecordToken(id);
      else if (btn.dataset.action === 'delete') deleteRecord(id);
    });
  });
}

async function copyRecordToken(id) {
  const records = await api.list();
  const r = records.find(x => x.id === id);
  if (!r) return;
  await api.copy(r.token);
  toast('success', `تم نسخ مفتاح "${r.customerName}"`);
}

async function verifyRecordToken(id) {
  const records = await api.list();
  const r = records.find(x => x.id === id);
  if (!r) return;
  document.getElementById('verify-token').value = r.token;
  switchTab('verify');
  document.getElementById('btn-verify').click();
}

async function deleteRecord(id) {
  const ok = await confirmDialog('حذف السجل', 'هل تريد حذف هذا السجل نهائياً؟\nلن تتمكن من استعادته.', true);
  if (!ok) return;
  await api.delete(id);
  await refreshRecords();
  toast('success', 'تم الحذف');
}

document.getElementById('records-search').addEventListener('input', refreshRecords);

document.getElementById('btn-clear-all').addEventListener('click', async () => {
  const ok = await confirmDialog('⚠️ مسح كل السجلات', 'سيتم حذف كل سجلات التراخيص المُولَّدة نهائياً.\n\nهل أنت متأكد؟', true);
  if (!ok) return;
  await api.clear();
  await refreshRecords();
  toast('success', 'تم مسح كل السجلات');
});

['json', 'csv', 'txt'].forEach(fmt => {
  document.getElementById('btn-export-' + fmt).addEventListener('click', async () => {
    const res = await api.export({ format: fmt });
    if (res.success) toast('success', `تم التصدير إلى ${res.path}`);
    else if (!res.canceled) toast('error', 'فشل التصدير');
  });
});

// Batch
document.getElementById('btn-batch-template').addEventListener('click', () => {
  const t = document.getElementById('batch-input');
  t.value = t.value || `مكتب أحمد أحمد,AHMED-001,365,
مكتب سارة,SARA-002,180,abc123machineid
شركة محمد,MOHAMED-003,90,`;
  t.focus();
});

document.getElementById('btn-batch-generate').addEventListener('click', async () => {
  const text = document.getElementById('batch-input').value.trim();
  if (!text) return toast('error', 'ألصق قائمة العملاء أولاً');
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return toast('error', 'لا توجد أسطر صالحة');
  const resultsEl = document.getElementById('batch-results');
  resultsEl.innerHTML = `<div class="text-xs text-slate-400">⏳ جاري توليد ${lines.length} مفتاح...</div>`;

  const tokens = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    const [name, key, dur, machine] = parts;
    if (!key || !dur) {
      tokens.push({ line: i + 1, ok: false, error: 'بيانات ناقصة في السطر' });
      continue;
    }
    const res = await api.generate({
      customerName: name || key,
      customerKey: key,
      durationDays: parseInt(dur, 10),
      machineId: machine || null,
      maxUsers: -1,
      features: 'full',
      notes: 'توليد دفعة',
    });
    if (res.success) {
      tokens.push({ line: i + 1, ok: true, token: res.token, key, name });
    } else {
      tokens.push({ line: i + 1, ok: false, error: res.error, key });
    }
  }

  await refreshRecords();
  let html = '<div class="space-y-2">';
  for (const t of tokens) {
    if (t.ok) {
      const safeToken = t.token.replace(/'/g, "\\'");
      html += `<div class="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[11px] font-bold text-emerald-300">✓ سطر ${t.line}: ${t.name}</span>
          <button data-copy="${safeToken}" class="text-[10px] px-2 py-1 bg-emerald-600 text-white rounded">نسخ</button>
        </div>
        <p class="mono text-[10px] text-slate-300 break-all">${t.token}</p>
      </div>`;
    } else {
      html += `<div class="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
        <span class="text-[11px] font-bold text-rose-300">✕ سطر ${t.line}: ${t.key || '(فارغ)'} — ${t.error}</span>
      </div>`;
    }
  }
  html += '</div>';
  resultsEl.innerHTML = html;
  resultsEl.querySelectorAll('button[data-copy]').forEach(b => {
    b.addEventListener('click', async () => {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = '✓ منسوخ';
    });
  });
  toast('success', `تم توليد ${tokens.filter(t => t.ok).length}/${tokens.length} مفتاح`);
});

// About
document.getElementById('btn-reveal-secret').addEventListener('click', async () => {
  const el = document.getElementById('secret-display');
  if (el.classList.contains('hidden')) {
    const secret = await api.getSecret();
    document.getElementById('secret-value').textContent = secret;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
});

// Init
(async () => {
  if (api.isElectron) {
    document.getElementById('status-pill').innerHTML = '✓ متصل بالخدمة المحلية (Electron)';
    document.getElementById('status-pill').classList.remove('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/30');
    document.getElementById('status-pill').classList.add('bg-indigo-500/20', 'text-indigo-300', 'border-indigo-500/30');
  }
  await refreshRecords();
})();

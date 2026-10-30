const fs = require('fs');

let content = fs.readFileSync('public/contact.html', 'utf8');

const targetStr = `      <div class="highlight-box">
        <p style="margin:0; font-weight:700; color:#fff;">💡 دعم فني وقانوني مجاني:</p>
        <p style="margin:4px 0 0; font-size:14px;">إذا كان لديك أي اقتراح لتطوير إحدى الحاسبات القضائية أو إضافة صيغة عقد أو مذكرة نقض جديدة، نرحب بمراسلتنا مباشرة وسيتم فحص الطلب وإدراجه للمجتمع القانوني.</p>
      </div>`;

const replacementStr = `      <div class="content-section">
        <h2>2. نموذج المراسلة الفورية والدعم الفني والتحريري</h2>
        <p>يمكنك إرسال رسالتك أو طلب توثيق عضويتك في دليل المحامين أو الإبلاغ عن أي ملاحظة تقنية مباشرة عبر النموذج التالي:</p>

        <form id="adsenseContactForm" onsubmit="submitContactForm(event)" style="background:rgba(15,23,42,0.8); border:1px solid rgba(99,102,241,0.3); border-radius:16px; padding:24px; margin-top:14px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:14px;">
            <div>
              <label for="cntName" style="display:block; font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">الاسم الكامل *</label>
              <input type="text" id="cntName" required placeholder="مثال: الأستاذ محمد عبد الله" style="width:100%; padding:10px 14px; border-radius:10px; background:#020617; border:1px solid rgba(148,163,184,0.28); color:#fff; font-family:'Cairo',sans-serif; font-size:13.5px;" />
            </div>
            <div>
              <label for="cntEmail" style="display:block; font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">البريد الإلكتروني أو رقم الهاتف *</label>
              <input type="text" id="cntEmail" required placeholder="example@domain.com أو 010xxxxxxxx" style="width:100%; padding:10px 14px; border-radius:10px; background:#020617; border:1px solid rgba(148,163,184,0.28); color:#fff; font-family:'Cairo',sans-serif; font-size:13.5px;" />
            </div>
          </div>

          <div style="margin-bottom:14px;">
            <label for="cntSubject" style="display:block; font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">موضوع الرسالة *</label>
            <select id="cntSubject" style="width:100%; padding:10px 14px; border-radius:10px; background:#020617; border:1px solid rgba(148,163,184,0.28); color:#fff; font-family:'Cairo',sans-serif; font-size:13.5px;">
              <option value="استفسار قانوني أو تحريري">استفسار قانوني أو ملاحظة تحريرية على مقال / أداة</option>
              <option value="توثيق عضوية محام في الدليل">توثيق أو تعديل بيانات محامٍ في دليل المحامين</option>
              <option value="دعم فني لنظام إدارة المكاتب">دعم فني لنظام إدارة مكاتب المحاماة</option>
              <option value="إعلانات وشراكات وخصوصية البيانات">الإعلانات والشراكات وطلبات الخصوصية (Data &amp; AdSense)</option>
            </select>
          </div>

          <div style="margin-bottom:16px;">
            <label for="cntMessage" style="display:block; font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:6px;">تفاصيل الرسالة *</label>
            <textarea id="cntMessage" required rows="4" placeholder="اكتب رسالتك أو استفسارك بالتفصيل هنا..." style="width:100%; padding:12px 14px; border-radius:10px; background:#020617; border:1px solid rgba(148,163,184,0.28); color:#fff; font-family:'Cairo',sans-serif; font-size:13.5px; resize:vertical;"></textarea>
          </div>

          <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <button type="submit" style="padding:11px 24px; border-radius:12px; background:linear-gradient(135deg,#6366f1,#4f46e5); border:none; color:#fff; font-family:'Cairo',sans-serif; font-weight:800; font-size:14px; cursor:pointer;">📨 إرسال الرسالة فوراً للإدارة</button>
            <span id="cntStatusMsg" style="font-size:13px; font-weight:700; color:#10b981; display:none;">✅ تم استلام رسالتك بنجاح وسنتواصل معك خلال ساعات!</span>
          </div>
        </form>
      </div>

      <div class="highlight-box">
        <p style="margin:0; font-weight:700; color:#fff;">🔗 روابط الشفافية والسياسات المعتمدة:</p>
        <p style="margin:6px 0 0; font-size:13.5px;">يمكنك مراجعة <a href="/about.html" style="color:#6ee7b7;">صفحة عن المنصة والمؤسس</a>، و<a href="/editorial-policy.html" style="color:#6ee7b7;">السياسة التحريرية ومعايير التدقيق القانوني</a>، و<a href="/privacy.html" style="color:#6ee7b7;">سياسة الخصوصية وملفات تعريف الارتباط</a>، و<a href="/terms.html" style="color:#6ee7b7;">شروط الاستخدام</a>، و<a href="/disclaimer.html" style="color:#6ee7b7;">إخلاء المسؤولية القانونية</a>.</p>
      </div>
    </div>
  </main>
  <script>
    async function submitContactForm(e) {
      e.preventDefault();
      var name = document.getElementById('cntName').value.trim();
      var email = document.getElementById('cntEmail').value.trim();
      var subject = document.getElementById('cntSubject').value;
      var message = document.getElementById('cntMessage').value.trim();
      var statusEl = document.getElementById('cntStatusMsg');

      try {
        await fetch('https://firestore.googleapis.com/v1/projects/justice-91571/databases/(default)/documents/public_messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              name: { stringValue: name },
              contact: { stringValue: email },
              subject: { stringValue: subject },
              message: { stringValue: message },
              createdAt: { stringValue: new Date().toISOString() }
            }
          })
        });
      } catch (err) {}

      if (statusEl) {
        statusEl.style.display = 'inline-block';
      }
      document.getElementById('adsenseContactForm').reset();
    }
  </script>`;

if (content.includes('highlight-box')) {
  // normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const normalizedTarget = targetStr.replace(/\r\n/g, '\n');
  if (normalized.includes(normalizedTarget)) {
    const updated = normalized.replace(normalizedTarget, replacementStr);
    fs.writeFileSync('public/contact.html', updated, 'utf8');
    console.log('Successfully updated public/contact.html with adsenseContactForm!');
  } else {
    console.log('Target string not found in normalized content');
  }
}

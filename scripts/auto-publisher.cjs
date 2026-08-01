/**
 * ═══════════════════════════════════════════════════════════════
 * منصة المحامي الرقمية — ناشر المدونة التلقائي اليومي
 * auto-publisher.cjs
 * يُشغَّل يومياً في تمام الساعة 9:00 صباحاً (توقيت القاهرة)
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── مسارات المشروع ────────────────────────────────────────────
const ROOT        = path.resolve(__dirname, '..');
const BLOG_DIR    = path.join(ROOT, 'public', 'blog');
const BLOG_INDEX  = path.join(BLOG_DIR, 'index.html');
const LOG_FILE    = path.join(__dirname, 'published-log.json');
const FAIL_LOG    = path.join(__dirname, 'failed-drafts.json');

// ─── ألوان البطاقات المتاحة ─────────────────────────────────────
const COVERS = ['indigo','amber','cyan','purple','emerald'];

// ═══════════════════════════════════════════════════════════════
// مجموعة المواضيع القانونية المصرية (Evergreen Pool)
// كل موضوع يحتوي على: slug, tag, coverColor, coverIcon, readTime,
//   title, metaDesc, keywords, body (HTML مجزأ بأقسام)
// ═══════════════════════════════════════════════════════════════
const TOPIC_POOL = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'tenant-rights-egypt',
    tag: 'قانون الإيجارات',
    coverColor: 'amber',
    coverIcon: '🏠',
    readTime: '6',
    pubDate: '',       // يُملأ وقت التشغيل
    title: 'حقوق المستأجر في القانون المصري: ما لا يعرفه كثيرون',
    metaDesc: 'دليل شامل لحقوق المستأجر في مصر: متى يحق للمالك الإخلاء؟ وما الحماية القانونية المكفولة للمستأجر؟',
    keywords: 'حقوق المستأجر, قانون الإيجار, إخلاء مستأجر, عقد إيجار مصر',
    body: `
      <div class="highlight">
        <p>الإيجار من أكثر المسائل القانونية التي تشغل بال المصريين يومياً، سواء كنت مستأجراً تخشى الإخلاء، أو مالكاً تريد استرداد وحدتك. في هذا المقال نكشف أهم الحقوق المقررة قانوناً.</p>
      </div>

      <h2><span class="num">1</span> أنواع عقود الإيجار في مصر</h2>
      <p>يميّز القانون المصري بين نوعين رئيسيين من عقود الإيجار:</p>
      <ul>
        <li><strong>الإيجار القديم (قبل 1996):</strong> يخضع لقوانين الإيجار الاستثنائية التي تمنح المستأجر وذريته حق الامتداد القانوني للعقد.</li>
        <li><strong>الإيجار الجديد (بعد 1996):</strong> يخضع للقانون المدني، ومدته وشروطه تُحدد بالاتفاق بين الطرفين.</li>
      </ul>

      <h2><span class="num">2</span> حقوق المستأجر الأساسية</h2>
      <div class="stage">
        <div class="stage-title">🛡️ الحقوق المكفولة للمستأجر</div>
        <p>• <strong>الحيازة الهادئة:</strong> لا يجوز للمالك دخول الشقة بدون إذن المستأجر أو منع وصول المرافق.</p>
        <p>• <strong>الإخطار المسبق:</strong> لا تصح دعوى الإخلاء دون إعلان مسبق وفق الإجراءات القانونية.</p>
        <p>• <strong>الأولوية في التجديد:</strong> للمستأجر الأولوية في تجديد العقد بشروط مماثلة عند انتهائه.</p>
        <p>• <strong>حق الإصلاح:</strong> إذا توقف الملاك عن الإصلاحات الضرورية، يجوز للمستأجر مطالبته قضائياً.</p>
      </div>

      <h2><span class="num">3</span> متى يحق للمالك إخلاء المستأجر؟</h2>
      <p>الإخلاء القانوني في عقود الإيجار الحديثة يكون في حالات محددة فقط:</p>
      <ul>
        <li><strong>عدم سداد الإيجار:</strong> بعد إنذار رسمي وإعطاء مهلة كافية.</li>
        <li><strong>انتهاء مدة العقد:</strong> دون رغبة في التجديد من أحد الطرفين.</li>
        <li><strong>الاستخدام المخالف:</strong> إذا استخدم المستأجر الوحدة في غرض مخالف لعقد الإيجار.</li>
        <li><strong>الضرر الجسيم بالعقار:</strong> إذا تسبب المستأجر في أضرار مادية كبيرة.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">⚠️</span>
        <p><strong>تحذير مهم:</strong> الإخلاء بالقوة أو قطع المرافق دون حكم قضائي جريمة يعاقب عليها القانون. يحق للمستأجر تقديم بلاغ جنائي ضد المالك في هذه الحالة.</p>
      </div>

      <h2><span class="num">4</span> كيف تحمي نفسك كمستأجر؟</h2>
      <ul>
        <li>وثّق دفعات الإيجار دائماً بإيصالات موقعة أو تحويل بنكي.</li>
        <li>احتفظ بنسخة من عقد الإيجار الموثق.</li>
        <li>أبلغ عن أي أعطال في الوحدة كتابياً وبشكل رسمي للمالك.</li>
        <li>استشر محامياً فور تلقي أي إنذار أو دعوى إخلاء.</li>
      </ul>

      <h2>الخلاصة</h2>
      <p>القانون المصري يوفر حماية واسعة للمستأجر، لكنها مشروطة بالالتزام بشروط العقد. الوثائق والإجراءات هي خط الدفاع الأول في أي نزاع إيجاري.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'labor-rights-termination',
    tag: 'قانون العمل',
    coverColor: 'indigo',
    coverIcon: '⚖️',
    readTime: '7',
    pubDate: '',
    title: 'فصل العامل تعسفياً: حقوقك القانونية وكيف تسترد تعويضك',
    metaDesc: 'إذا أُنهي عقد عملك بشكل تعسفي فلك حق في التعويض. اكتشف كيف يحميك قانون العمل المصري وما الخطوات العملية للمطالبة بحقك.',
    keywords: 'فصل تعسفي, تعويض فصل, قانون العمل المصري, إنهاء عقد عمل',
    body: `
      <div class="highlight">
        <p>فقدان العمل صدمة كافية وحدها — لكن فقدانه بشكل غير قانوني مضاعفة للضرر. القانون المصري يكفل للعامل تعويضاً إذا أثبت تعسف صاحب العمل في الإنهاء. إليك كل ما تحتاج معرفته.</p>
      </div>

      <h2><span class="num">1</span> ما الفرق بين الفصل المشروع والتعسفي؟</h2>
      <p>يُعدّ الإنهاء مشروعاً إذا كان لأسباب موضوعية مقبولة قانوناً مثل:</p>
      <ul>
        <li>الإخلال الجسيم بالتزامات العقد بعد إنذار موثق.</li>
        <li>ارتكاب جريمة جنائية أو سرقة في مكان العمل.</li>
        <li>التغيب بدون عذر مشروع لمدة تتجاوز الحد المقرر قانوناً.</li>
        <li>الإفصاح عن أسرار المنشأة لمنافسين.</li>
      </ul>
      <p>أما الإنهاء <strong>التعسفي</strong> فهو كل إنهاء بدون سبب مقبول أو لأسباب غير قانونية مثل الانتساب لنقابة، أو الحمل، أو الشكوى لجهات رقابية.</p>

      <h2><span class="num">2</span> ما التعويضات المقررة للعامل؟</h2>
      <div class="stage">
        <div class="stage-title">💰 حقوقك المالية عند الإنهاء</div>
        <p>• <strong>مكافأة نهاية الخدمة:</strong> شهر عن كل سنة للعقود غير المحددة المدة.</p>
        <p>• <strong>تعويض الإشعار:</strong> مدة العقد المتبقية أو الأجر عن مدة الإشعار.</p>
        <p>• <strong>تعويض الفصل التعسفي:</strong> ما يراه القاضي مناسباً استناداً لمدة الخدمة والأجر والضرر.</p>
        <p>• <strong>رصيد الإجازات:</strong> صرف الإجازات المتراكمة غير المستنفدة.</p>
      </div>

      <h2><span class="num">3</span> كيف تطالب بحقك خطوة بخطوة؟</h2>
      <ul>
        <li><strong>الخطوة الأولى:</strong> اجمع كل مستندات عقد العمل، مسيرة الراتب، وقرار الفصل الرسمي.</li>
        <li><strong>الخطوة الثانية:</strong> تقدم بشكوى لمكتب العمل خلال فترة زمنية معقولة من تاريخ الإنهاء.</li>
        <li><strong>الخطوة الثالثة:</strong> انتظر مرحلة الوساطة الإدارية بين الطرفين.</li>
        <li><strong>الخطوة الرابعة:</strong> إذا فشلت الوساطة، تُحال القضية لمحاكم العمل.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>نصيحة ذهبية:</strong> لا تترك بياناتك في مكان العمل عند مغادرته. خذ نسخاً من عقدك وأي مراسلات هامة قبل انتهاء خدمتك أو ربما لن تتمكن من الوصول إليها لاحقاً.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>الفصل التعسفي ليس نهاية الطريق. القانون المصري يوفر آليات فعّالة للمطالبة بالتعويض — لكن التوقيت والمستندات هما مفتاح النجاح. استشر محامياً في أسرع وقت ممكن.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'inheritance-law-egypt',
    tag: 'قانون الميراث',
    coverColor: 'cyan',
    coverIcon: '📜',
    readTime: '8',
    pubDate: '',
    title: 'قانون الميراث في مصر: كيف تُقسَّم التركة وما حقك فيها؟',
    metaDesc: 'دليل عملي لقانون الميراث في مصر: الأنصبة الشرعية، إجراءات حصر الإرث، ودور المحاكم في قسمة التركات.',
    keywords: 'قانون الميراث مصر, قسمة التركة, حصر الإرث, ميراث إسلامي',
    body: `
      <div class="highlight">
        <p>وفاة أحد الأهل لحظة صعبة — لكنها تصبح أصعب عندما تتحول إلى خلافات حول الميراث. فهم القانون مسبقاً يوفر الكثير من الصراعات العائلية والأزمات المالية.</p>
      </div>

      <h2><span class="num">1</span> من هم الورثة وما نصيب كل منهم؟</h2>
      <p>المنظومة القانونية المصرية في الميراث مستمدة من أحكام الشريعة الإسلامية للمسلمين، وقانون الأحوال الشخصية للأقباط. أبرز الأنصبة الشرعية للمسلمين:</p>
      <ul>
        <li><strong>الزوجة:</strong> الثمن مع الأولاد، والربع بدونهم.</li>
        <li><strong>الزوج:</strong> الربع مع الأولاد، والنصف بدونهم.</li>
        <li><strong>الأم:</strong> السدس مع الأولاد أو جمع الإخوة، والثلث بدونهم.</li>
        <li><strong>البنت:</strong> النصف إذا كانت وحيدة، والثلثان لاثنتين فأكثر.</li>
        <li><strong>الأبناء:</strong> يأخذون الباقي تعصيباً (للذكر ضعف الأنثى).</li>
      </ul>

      <h2><span class="num">2</span> إجراءات استخراج حصر الإرث</h2>
      <div class="stage">
        <div class="stage-title">📋 خطوات حصر الإرث الرسمي</div>
        <p>• <strong>شهادة الوفاة الرسمية</strong> من السجل المدني.</p>
        <p>• <strong>إعلام وراثة</strong> من محكمة الأسرة أو مكتب التوثيق الشرعي.</p>
        <p>• <strong>تقديم مستندات</strong> تثبت صلة القرابة (شهادات الميلاد، عقد الزواج).</p>
        <p>• <strong>شهادة شاهدَين</strong> من الجيران أو المعارف للتحقق من الورثة.</p>
      </div>

      <h2><span class="num">3</span> ما هي ديون التركة وكيف تؤثر على الميراث؟</h2>
      <p>قبل توزيع الميراث تُسدَّد من التركة:</p>
      <ul>
        <li>تجهيز ودفن المتوفى.</li>
        <li>ديون المتوفى الثابتة قانوناً.</li>
        <li>حقوق الزوجية (المهر المؤخر للزوجة).</li>
        <li>الوصية الصحيحة بما لا يتجاوز ثلث التركة.</li>
      </ul>
      <p>فقط ما تبقى بعد ذلك يُوزَّع على الورثة حسب أنصبتهم.</p>

      <div class="callout">
        <span class="callout-icon">⚠️</span>
        <p><strong>انتبه:</strong> الوارث الذي قتل مورّثه عمداً يُحرم من الميراث قانوناً. وكذلك الوارث الذي ثبتت ردته في حال المورث المسلم.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>الميراث حق يكفله الشرع والقانون — لكن استيفاءه يحتاج إجراءات دقيقة وتوثيقاً سليماً. استعن بمحامٍ متخصص في شؤون الأسرة لتجنب أي مطب قانوني.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'divorce-procedures-egypt',
    tag: 'قانون الأسرة',
    coverColor: 'purple',
    coverIcon: '👨‍👩‍👧',
    readTime: '7',
    pubDate: '',
    title: 'إجراءات الطلاق في مصر: دليل الخطوات من البداية للنهاية',
    metaDesc: 'ما إجراءات الطلاق في مصر؟ وكيف يختلف الخلع عن الطلاق العادي؟ دليل عملي لكل ما تحتاج معرفته.',
    keywords: 'طلاق مصر, إجراءات الطلاق, خلع, قانون الأسرة المصري',
    body: `
      <div class="highlight">
        <p>الطلاق قرار مصيري تصحبه تداعيات قانونية واجتماعية معقدة. فهم الإجراءات مسبقاً يساعدك على اتخاذ قراراتك ببصيرة وحماية حقوقك وحقوق أبنائك.</p>
      </div>

      <h2><span class="num">1</span> أنواع إنهاء الزواج في القانون المصري</h2>
      <ul>
        <li><strong>الطلاق بإرادة الزوج:</strong> يصدر من الزوج ويشترط توثيقه لدى مأذون معتمد ثم تسجيله في المحكمة.</li>
        <li><strong>الخلع:</strong> حق المرأة في إنهاء الزواج مقابل رد المهر، دون الحاجة لموافقة الزوج.</li>
        <li><strong>الطلاق القضائي (التطليق):</strong> تلجأ إليه الزوجة بادعاء الضرر أو الهجر أو الغياب.</li>
        <li><strong>فسخ الزواج:</strong> لأسباب شرعية كالردة أو ثبوت المحرمية.</li>
      </ul>

      <h2><span class="num">2</span> خطوات إجراءات الطلاق القضائي</h2>
      <div class="stage">
        <div class="stage-title">📋 مراحل دعوى الطلاق</div>
        <p>• <strong>رفع الدعوى</strong> أمام محكمة الأسرة المختصة بمحل إقامة الزوجة.</p>
        <p>• <strong>جلسة الصلح الإلزامية</strong> بحضور محكمَيْن (واحد من كل جانب).</p>
        <p>• <strong>سماع الشهود</strong> وتقديم المستندات الداعمة لدعوى الضرر.</p>
        <p>• <strong>صدور الحكم</strong> وتسجيله رسمياً في سجلات الأحوال المدنية.</p>
      </div>

      <h2><span class="num">3</span> حقوق الزوجة المالية بعد الطلاق</h2>
      <ul>
        <li><strong>نفقة العدة:</strong> تستحقها عن مدة العدة (3 أشهر للمطلقة الحائل).</li>
        <li><strong>متعة الطلاق:</strong> تعويض مالي عادل وفقاً لمدة الزواج وحال الزوج.</li>
        <li><strong>نفقة الأبناء:</strong> تُحكم بها المحكمة وتُعاد تقديرها كلما تغيرت الأحوال.</li>
        <li><strong>حق الحضانة:</strong> للأم بالأولوية حتى سن معينة ثم تنتقل للقضاء.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>للزوجين معاً:</strong> الطلاق بالتراضي (الاتفاق المسبق) يختصر الإجراءات ويقلل التوترات، خاصة عند وجود أطفال. يُنصح بتوثيق كافة الاتفاقيات المالية كتابياً أمام محامٍ.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>الطلاق ليس مجرد قرار شخصي — هو إجراء قانوني له مسار محدد وحقوق مكفولة. التوجيه القانوني المبكر يوفر عليك الوقت والمال ويحمي حقوقك وحقوق أبنائك.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'company-incorporation-egypt',
    tag: 'قانون الشركات',
    coverColor: 'emerald',
    coverIcon: '🏢',
    readTime: '7',
    pubDate: '',
    title: 'كيف تؤسس شركتك في مصر؟ دليل شامل للمستثمر الجديد',
    metaDesc: 'خطوات تأسيس الشركات في مصر: الأنواع المتاحة، المتطلبات القانونية، والتكاليف الفعلية للتسجيل.',
    keywords: 'تأسيس شركة مصر, إجراءات تأسيس شركة, شركة ذات مسؤولية محدودة مصر',
    body: `
      <div class="highlight">
        <p>مصر بيئة استثمارية واعدة — لكن رحلة تأسيس الشركة تحتاج فهماً دقيقاً للإجراءات والمتطلبات القانونية لتبدأ صحيحاً من اليوم الأول.</p>
      </div>

      <h2><span class="num">1</span> أشكال الشركات في القانون المصري</h2>
      <ul>
        <li><strong>شركة ذات مسؤولية محدودة (LLC):</strong> الأنسب للشركات الصغيرة والمتوسطة. مسؤولية كل شريك محدودة بحصته.</li>
        <li><strong>شركة مساهمة (S.A.E):</strong> للمشاريع الكبيرة. رأس المال مقسّم لأسهم قابلة للتداول.</li>
        <li><strong>شركة التضامن:</strong> يتحمل الشركاء المسؤولية الكاملة والتضامنية عن ديون الشركة.</li>
        <li><strong>المنشأة الفردية:</strong> لشخص واحد، تُسجَّل باسمه شخصياً وليس كيان مستقل.</li>
      </ul>

      <h2><span class="num">2</span> خطوات التأسيس الرسمية</h2>
      <div class="stage">
        <div class="stage-title">📋 مراحل التأسيس عبر GAFI</div>
        <p>• <strong>حجز الاسم التجاري</strong> وتأكيد عدم التعارض مع أسماء مسجلة.</p>
        <p>• <strong>إعداد عقد التأسيس</strong> وتوثيقه أمام الشهر العقاري.</p>
        <p>• <strong>فتح حساب بنكي</strong> وإيداع الحد الأدنى لرأس المال.</p>
        <p>• <strong>التسجيل في السجل التجاري</strong> والحصول على البطاقة الضريبية.</p>
        <p>• <strong>اشتراك الموظفين</strong> في منظومة التأمينات الاجتماعية.</p>
      </div>

      <h2><span class="num">3</span> التكاليف والمتطلبات المالية</h2>
      <ul>
        <li><strong>رأس المال الأدنى لـ LLC:</strong> لا يوجد حد أدنى مقرر قانوناً حالياً للشركات الصغيرة.</li>
        <li><strong>رسوم التسجيل:</strong> تتفاوت حسب نوع الشركة ورأس المال.</li>
        <li><strong>أتعاب المحامي:</strong> موصى بها لضمان صحة العقود وتجنب الأخطاء المكلفة.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>نصيحة مهمة:</strong> اعتمد على محامٍ أو مكتب قانوني متخصص في قانون الأعمال للتأسيس. الأخطاء في عقد التأسيس قد تكلفك أضعاف ما وفرته بالاستغناء عن المحامي.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>تأسيس الشركة في مصر أصبح أيسر من ذي قبل بفضل الإصلاحات التشريعية — لكنه يظل إجراءً قانونياً دقيقاً يستحق الاستعانة بخبير.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'consumer-protection-egypt',
    tag: 'حقوق المستهلك',
    coverColor: 'cyan',
    coverIcon: '🛒',
    readTime: '6',
    pubDate: '',
    title: 'حقوق المستهلك في مصر: كيف تشتكي وتسترد حقك؟',
    metaDesc: 'قانون حماية المستهلك في مصر يكفل لك حقوقاً واسعة. تعرّف على كيفية تقديم شكوى والحصول على تعويض.',
    keywords: 'حماية المستهلك مصر, شكوى منتج, تعويض مستهلك, قانون حماية المستهلك',
    body: `
      <div class="highlight">
        <p>اشتريت منتجاً معيباً؟ تعرضت لغش تجاري أو إعلان مضلل؟ القانون المصري يمنحك أدوات فعّالة لاسترداد حقك — شرط أن تعرفها وتستخدمها بالطريقة الصحيحة.</p>
      </div>

      <h2><span class="num">1</span> ما أبرز حقوقك كمستهلك؟</h2>
      <ul>
        <li><strong>الحق في الأمان:</strong> المنتجات يجب أن تكون آمنة ومطابقة للمواصفات.</li>
        <li><strong>الحق في الإعلام:</strong> يحق لك الاطلاع على مكونات المنتج وتاريخ الصلاحية.</li>
        <li><strong>الحق في الاختيار:</strong> حرية الاختيار دون إكراه أو تحايل تجاري.</li>
        <li><strong>حق التقاضي:</strong> تقديم شكوى وطلب التعويض عن الضرر.</li>
      </ul>

      <h2><span class="num">2</span> كيف تقدم شكوى رسمية؟</h2>
      <div class="stage">
        <div class="stage-title">📞 قنوات الشكوى الرسمية</div>
        <p>• <strong>جهاز حماية المستهلك:</strong> عبر الموقع الإلكتروني أو الخط الساخن 19588.</p>
        <p>• <strong>النيابة التجارية:</strong> في حالات الغش الجسيم أو المنتجات الضارة بالصحة.</p>
        <p>• <strong>المحاكم المدنية:</strong> لطلب التعويض إذا لحق بك ضرر مالي مثبت.</p>
      </div>

      <h2><span class="num">3</span> ما المستندات التي تحتاجها؟</h2>
      <ul>
        <li>الفاتورة الأصلية أو إيصال الشراء.</li>
        <li>صور واضحة للمنتج المعيب أو غير المطابق.</li>
        <li>أي تواصل مكتوب مع البائع أو الشركة.</li>
        <li>تقرير طبي إن كان المنتج سبب ضرراً صحياً.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>نصيحة:</strong> دائماً احتفظ بفاتورة الشراء حتى لو بدت صغيرة. هي الدليل الأول في أي نزاع مع البائع أو المصنّع.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>حقوق المستهلك في مصر محمية قانوناً — لكن تفعيلها يحتاج يقظة ومتابعة. لا تتردد في الشكوى الرسمية؛ وجودك يحمي غيرك من المستهلكين أيضاً.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'real-estate-contract-risks',
    tag: 'عقود العقارات',
    coverColor: 'amber',
    coverIcon: '🏗️',
    readTime: '7',
    pubDate: '',
    title: 'شراء شقة من المطوّر العقاري: 7 بنود في العقد لا تتجاهلها',
    metaDesc: 'قبل توقيع عقد الشراء مع أي مطور عقاري، تأكد من وجود هذه البنود الحماية الجوهرية في عقدك.',
    keywords: 'عقد شراء شقة, مطور عقاري, بنود عقد عقاري, حماية مشتري العقار مصر',
    body: `
      <div class="highlight">
        <p>شراء شقة قرار يغير حياتك — ولأن مبلغ الشراء كبير، فإن أي إهمال في قراءة العقد قد يكلفك سنوات من النزاعات القانونية. إليك 7 بنود لا تتجاهلها أبداً.</p>
      </div>

      <h2><span class="num">1</span> بيانات الوحدة بدقة كاملة</h2>
      <p>يجب أن ينص العقد بوضوح على: رقم الوحدة، الطابق، المساحة الصافية بالمتر المربع (وليس الإجمالية فقط)، وطريقة احتساب المساحة. أي اختلاف لاحق يكون لصالح ما هو مكتوب في العقد.</p>

      <h2><span class="num">2</span> موعد التسليم وجزاء التأخير</h2>
      <div class="stage">
        <div class="stage-title">⏰ بند التسليم الحاسم</div>
        <p>يجب تحديد تاريخ التسليم بالشهر والسنة، مع نص صريح على <strong>غرامة التأخير</strong> لكل شهر تأخير. بدون هذا البند أنت بلا حماية إذا تأخر التسليم سنوات.</p>
      </div>

      <h2><span class="num">3</span> مواصفات التشطيب بالتفصيل</h2>
      <p>العقد يجب أن يحدد نوع التشطيب (خام، نصف تشطيب، كامل)، وجودة مواد البناء الرئيسية. المواصفات الغامضة مصدر خلافات لانهائية.</p>

      <h2><span class="num">4</span> آلية استرداد المبالغ عند الفسخ</h2>
      <ul>
        <li>تحديد متى يحق للمشتري فسخ العقد واسترداد أمواله.</li>
        <li>المهلة الزمنية لإعادة الدفعات (اشترط ألا تتجاوز 60 يوماً).</li>
        <li>هل تُستردّ الأموال بالكامل أم تُستقطع رسوم فسخ؟</li>
      </ul>

      <h2><span class="num">5</span> الجدول الزمني للدفعات</h2>
      <p>يجب ربط كل دفعة بمرحلة إنجاز محددة، لا بتواريخ عشوائية. دفعة مرتبطة بـ"إتمام الهيكل" أفضل بكثير من "بعد 6 أشهر من التعاقد".</p>

      <div class="callout">
        <span class="callout-icon">⚠️</span>
        <p><strong>تحذير:</strong> لا توقّع أي عقد عقاري قبل عرضه على محامٍ متخصص. تكلفة المراجعة القانونية أقل بكثير من تكلفة النزاع القضائي لاحقاً.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>العقد الجيد يحميك قبل أن تبدأ المشكلة، لا بعدها. خصص وقتاً لقراءة كل بند، واستعن بمحامٍ قبل التوقيع.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'criminal-defense-rights',
    tag: 'الدفاع الجنائي',
    coverColor: 'indigo',
    coverIcon: '🔒',
    readTime: '6',
    pubDate: '',
    title: 'حقوق المتهم في القانون المصري: ما لا يستطيع أحد انتزاعه منك',
    metaDesc: 'إذا واجهت اتهاماً جنائياً، تعرّف على حقوقك القانونية المكفولة دستورياً في مصر وكيف تتعامل مع التحقيق.',
    keywords: 'حقوق المتهم مصر, دفاع جنائي, حق المحاكمة العادلة, تحقيق جنائي',
    body: `
      <div class="highlight">
        <p>مواجهة اتهام جنائي تجربة مرعبة — لكن القانون المصري يكفل للمتهم حقوقاً دستورية لا تسقط مهما كانت طبيعة الاتهام. معرفتها قد تُحدث فارقاً جوهرياً في مسار القضية.</p>
      </div>

      <h2><span class="num">1</span> الحق في الصمت</h2>
      <p>للمتهم الحق في التزام الصمت خلال التحقيق. لا يجوز إجباره على الإدلاء بأقوال تضر بمصلحته. الاعتراف الصحيح قانوناً هو الذي يصدر طوعاً دون إكراه.</p>

      <h2><span class="num">2</span> الحق في محامٍ</h2>
      <div class="stage">
        <div class="stage-title">⚖️ حق أساسي لا يُنتزع</div>
        <p>• المتهم له الحق في تعيين محامٍ من اختياره قبل بدء الاستجواب.</p>
        <p>• إذا كان عاجزاً عن تحمّل أتعاب المحامي، تعيّن المحكمة له محامياً على نفقة الدولة.</p>
        <p>• أي إجراء تحقيق يجري بدون إخطار المتهم بحقه في المحامي يكون باطلاً.</p>
      </div>

      <h2><span class="num">3</span> الحق في المحاكمة العادلة</h2>
      <ul>
        <li><strong>قرينة البراءة:</strong> المتهم بريء حتى تثبت إدانته بحكم قضائي نهائي.</li>
        <li><strong>علنية المحاكمة:</strong> كقاعدة عامة، والاستثناء يحتاج قراراً من المحكمة.</li>
        <li><strong>الحق في الطعن:</strong> له حق الاستئناف والنقض في كافة الأحكام.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">⚠️</span>
        <p><strong>مهم جداً:</strong> لا تتكلم مع رجال الضبط أو المحقق بدون حضور محاميك. حتى الكلام البريء قد يُفسَّر ضدك في سياق التحقيق.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>الاتهام ليس إدانة. استعن بمحامٍ جنائي فور علمك بأي اتهام — المبادرة المبكرة هي أقوى سلاح في الدفاع.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'debt-collection-egypt',
    tag: 'التنفيذ وتحصيل الديون',
    coverColor: 'amber',
    coverIcon: '💳',
    readTime: '6',
    pubDate: '',
    title: 'كيف تحصّل دَينك في مصر؟ من الإنذار إلى الحجز القضائي',
    metaDesc: 'دليل عملي لتحصيل الديون قانونياً في مصر: الإجراءات، الأدوات القانونية، والطرق الأسرع للحصول على حقك.',
    keywords: 'تحصيل ديون مصر, حجز على أموال, دعوى مطالبة مدنية, إنذار دين',
    body: `
      <div class="highlight">
        <p>المطل بحق الدائن ظلم — والقانون المصري يوفر أدوات فعّالة لاستيفاء الديون، من الإنذار الودي حتى الحجز على الأصول. إليك خارطة الطريق الكاملة.</p>
      </div>

      <h2><span class="num">1</span> ابدأ بالإنذار الرسمي</h2>
      <p>قبل اللجوء للقضاء، أرسل إلى المدين إنذاراً رسمياً على يد محضر. هذا الإجراء:</p>
      <ul>
        <li>يُثبت رفض المدين السداد رسمياً.</li>
        <li>يبدأ احتساب فوائد التأخير قانونياً.</li>
        <li>يُقدَّم دليلاً في المحكمة على مطالبتك السابقة.</li>
      </ul>

      <h2><span class="num">2</span> أمر الأداء: الطريق الأسرع للديون المثبتة</h2>
      <div class="stage">
        <div class="stage-title">⚡ أمر الأداء (Writ of Payment)</div>
        <p>إذا كان دينك ثابتاً بمستند رسمي (شيك، سند، عقد موثق)، يمكنك التقدم لقاضي الأداء مباشرة للحصول على حكم دون جلسات معقدة. الإجراء أسرع وأقل تكلفة.</p>
      </div>

      <h2><span class="num">3</span> الحجز التحفظي: تجميد أصول المدين</h2>
      <p>إذا خشيت أن يخفي المدين أمواله، يمكنك الحصول على <strong>أمر حجز تحفظي</strong> يجمّد أصوله قبل صدور الحكم. يشمل:</p>
      <ul>
        <li>الحجز على الحسابات البنكية.</li>
        <li>الحجز على العقارات ومنع التصرف فيها.</li>
        <li>الحجز على السيارات والمنقولات.</li>
      </ul>

      <div class="callout">
        <span class="callout-icon">💡</span>
        <p><strong>نصيحة ذهبية:</strong> احتفظ دائماً بدليل مكتوب على الدين (عقد، رسائل واتساب، شيك). الديون الشفهية أصعب في الإثبات وتستغرق وقتاً أطول أمام المحاكم.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>الصبر على المدين له حدود — والقانون يوفر أدوات فعّالة. كلما أسرعت في اتخاذ الإجراءات القانونية، كانت فرصتك في تحصيل حقك أكبر.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    slug: 'administrative-appeals-egypt',
    tag: 'القانون الإداري',
    coverColor: 'purple',
    coverIcon: '🏛️',
    readTime: '6',
    pubDate: '',
    title: 'كيف تطعن في قرار إداري ظالم؟ دليلك للتقاضي أمام مجلس الدولة',
    metaDesc: 'تضرّرت من قرار حكومي أو إداري؟ تعرّف على كيفية الطعن أمام محاكم مجلس الدولة في مصر.',
    keywords: 'طعن قرار إداري, مجلس الدولة مصر, قضاء إداري, دعوى إلغاء قرار',
    body: `
      <div class="highlight">
        <p>القرارات الإدارية التي تؤثر على حياتك وعملك ليست نهائية. القضاء الإداري المصري يمنحك حق الطعن فيها وإلزام الجهة الإدارية بالرضوخ للقانون.</p>
      </div>

      <h2><span class="num">1</span> ما القرارات القابلة للطعن؟</h2>
      <ul>
        <li>قرارات الفصل من الوظيفة الحكومية.</li>
        <li>رفض منح ترخيص أو تجديده.</li>
        <li>قرارات الحرمان من معاش أو مزايا اجتماعية.</li>
        <li>قرارات نزع الملكية للمنفعة العامة.</li>
        <li>قرارات الإحالة للتقاعد المبكر التعسفية.</li>
      </ul>

      <h2><span class="num">2</span> الطريق إلى مجلس الدولة</h2>
      <div class="stage">
        <div class="stage-title">📋 خطوات الطعن الإداري</div>
        <p>• <strong>التظلم الإداري:</strong> ابدأ بتظلم رسمي لرئيس الجهة المصدِرة للقرار.</p>
        <p>• <strong>انتظار الرد:</strong> 60 يوماً هي المهلة القانونية للجهة للرد. الصمت يُعدّ رفضاً ضمنياً.</p>
        <p>• <strong>رفع الدعوى:</strong> إلى محكمة القضاء الإداري المختصة خلال 60 يوماً من تاريخ الرفض.</p>
      </div>

      <h2><span class="num">3</span> الوقف التنفيذي: وسيلة الحماية الفورية</h2>
      <p>إذا كان تنفيذ القرار سيلحق بك ضرراً بالغاً يصعب إصلاحه لاحقاً، يمكنك طلب <strong>وقف تنفيذ القرار</strong> مؤقتاً ريثما يصدر حكم المحكمة.</p>

      <div class="callout">
        <span class="callout-icon">⚠️</span>
        <p><strong>تنبيه للمواعيد:</strong> مواعيد الطعن الإداري قاطعة — لا تمديد لها. التأخر ولو يوماً واحداً قد يُسقط دعواك كاملةً. تحرّك فور صدور القرار.</p>
      </div>

      <h2>الخلاصة</h2>
      <p>مجلس الدولة سلاح المواطن في مواجهة تعسف الإدارة. استخدمه قبل انتهاء المواعيد القانونية.</p>
      <p><em>هذا المقال لأغراض التوعية القانونية العامة ولا يغني عن استشارة محامٍ متخصص.</em></p>
    `
  }

]; // end TOPIC_POOL


// ═══════════════════════════════════════════════════════════════
// دوال مساعدة
// ═══════════════════════════════════════════════════════════════

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return { published: [] };
  return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
}

function saveLog(data) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getPublishedSlugs(log) {
  return new Set(log.published.map(p => p.slug));
}

function pickNextTopic(published) {
  for (const topic of TOPIC_POOL) {
    if (!published.has(topic.slug)) return topic;
  }
  return null; // كل المواضيع نُشرت
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateAr(isoDate) {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

// ═══════════════════════════════════════════════════════════════
// توليد ملف HTML للمقال (نظام التصميم الموحد)
// ═══════════════════════════════════════════════════════════════

function generateArticleHTML(topic) {
  const dateAr = formatDateAr(topic.pubDate);

  // تحديد لون الأكسنت حسب لون الغلاف
  const accentMap = {
    indigo:  { hex: '#6366f1', rgb: '99,102,241',  light: '#a5b4fc' },
    amber:   { hex: '#f59e0b', rgb: '245,158,11',  light: '#fcd34d' },
    cyan:    { hex: '#06b6d4', rgb: '6,182,212',   light: '#67e8f9' },
    purple:  { hex: '#a855f7', rgb: '168,85,247',  light: '#d8b4fe' },
    emerald: { hex: '#10b981', rgb: '16,185,129',  light: '#6ee7b7' },
  };
  const accent = accentMap[topic.coverColor] || accentMap.indigo;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${topic.title} - منصة المحامي الرقمية</title>
  <meta name="description" content="${topic.metaDesc}" />
  <meta name="keywords" content="${topic.keywords}" />
  <link rel="canonical" href="https://justice-91571.web.app/blog/${topic.slug}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${topic.title}" />
  <meta property="og:description" content="${topic.metaDesc}" />
  <meta property="og:url" content="https://justice-91571.web.app/blog/${topic.slug}.html" />
  <meta property="og:site_name" content="منصة المحامي الرقمية" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin="anonymous"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a; --border: rgba(148,163,184,0.12);
      --indigo: #6366f1; --purple: #7c3aed; --emerald: #10b981; --cyan: #06b6d4;
      --accent: ${accent.hex}; --accent-light: ${accent.light};
      --text: #f1f5f9; --muted: #94a3b8; --card-bg: rgba(15,23,42,0.75);
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg); color: var(--text);
      min-height: 100vh; line-height: 1.9;
      background-image:
        radial-gradient(ellipse at 50% 0%, rgba(${accent.rgb},0.15) 0%, transparent 60%),
        linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
      background-size: 100% 100%, 48px 48px, 48px 48px;
    }
    nav.main-nav { position: sticky; top: 0; z-index: 100; background: rgba(15,23,42,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border); }
    .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 24px; height: 68px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .logo-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, var(--accent), var(--indigo)); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 20px rgba(${accent.rgb},0.35); transition: transform 0.2s; }
    .nav-logo:hover .logo-icon { transform: scale(1.07); }
    .logo-text { display: flex; flex-direction: column; }
    .logo-name { font-size: 15px; font-weight: 900; color: #fff; line-height: 1.2; }
    .logo-sub { font-size: 10px; color: var(--emerald); font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 28px; }
    .nav-links a { font-size: 13px; font-weight: 700; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--accent-light); }
    .nav-cta { padding: 9px 22px; border-radius: 10px; background: linear-gradient(135deg, var(--accent), var(--indigo)); color: #fff; font-size: 12px; font-weight: 900; text-decoration: none; box-shadow: 0 4px 16px rgba(${accent.rgb},0.3); transition: transform 0.2s, box-shadow 0.2s; }
    .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(${accent.rgb},0.45); }
    .breadcrumbs { max-width: 860px; margin: 16px auto 0; padding: 0 24px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
    .breadcrumbs a { color: var(--muted); text-decoration: none; font-weight: 700; transition: color 0.2s; }
    .breadcrumbs a:hover { color: var(--accent-light); }
    .breadcrumbs .sep { opacity: 0.4; font-size: 10px; }
    .breadcrumbs .current { color: #e2e8f0; font-weight: 800; }
    .article-hero { max-width: 860px; margin: 0 auto; padding: 40px 24px 32px; }
    .article-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 999px; background: rgba(${accent.rgb},0.12); border: 1px solid rgba(${accent.rgb},0.3); color: var(--accent-light); font-size: 11px; font-weight: 800; margin-bottom: 20px; }
    .article-hero h1 { font-size: clamp(1.8rem, 4vw, 2.7rem); font-weight: 900; line-height: 1.3; margin-bottom: 20px; color: #fff; }
    .article-meta { display: flex; align-items: center; gap: 20px; font-size: 12px; color: var(--muted); flex-wrap: wrap; }
    .article-meta span { display: flex; align-items: center; gap: 6px; }
    .article-container { max-width: 860px; margin: 0 auto; padding: 0 24px 64px; }
    .article-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 24px; padding: 48px 44px; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 8px 40px rgba(0,0,0,0.25); }
    .article-card h2 { font-size: 22px; font-weight: 900; color: #fff; margin: 40px 0 16px; display: flex; align-items: center; gap: 12px; line-height: 1.4; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .article-card h2:first-of-type { margin-top: 0; }
    .article-card h2 .num { color: var(--accent-light); font-size: 13px; background: rgba(${accent.rgb},0.15); border: 1px solid rgba(${accent.rgb},0.3); padding: 2px 10px; border-radius: 999px; flex-shrink: 0; }
    .article-card h3 { font-size: 18px; font-weight: 800; color: #e2e8f0; margin: 28px 0 12px; }
    .article-card p { font-size: 15px; color: #cbd5e1; line-height: 1.95; margin-bottom: 16px; }
    .article-card strong { color: #fff; font-weight: 800; }
    .article-card ul, .article-card ol { margin: 16px 0 24px; padding-right: 20px; list-style-position: outside; }
    .article-card li { font-size: 14px; color: #cbd5e1; line-height: 1.9; margin-bottom: 10px; }
    .article-card li strong { color: var(--accent-light); }
    .highlight { background: linear-gradient(135deg, rgba(${accent.rgb},0.12), rgba(99,102,241,0.08)); border: 1px solid rgba(${accent.rgb},0.3); border-radius: 16px; padding: 24px 28px; margin: 24px 0 32px; }
    .highlight p { color: #f1f5f9; margin-bottom: 0; font-size: 16px; font-weight: 700; line-height: 1.8; }
    .callout { background: rgba(${accent.rgb},0.08); border: 1px solid rgba(${accent.rgb},0.3); border-radius: 16px; padding: 20px 24px; margin: 28px 0; display: flex; gap: 14px; align-items: flex-start; }
    .callout-icon { font-size: 24px; flex-shrink: 0; }
    .callout p { margin-bottom: 0; color: var(--accent-light); font-size: 14px; }
    .callout p strong { color: #fff; }
    .stage { background: rgba(30,41,59,0.6); border: 1px solid var(--border); border-right: 4px solid var(--accent); border-radius: 16px; padding: 24px; margin: 20px 0; }
    .stage-title { font-size: 16px; font-weight: 900; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .stage p { margin-bottom: 8px; font-size: 14px; color: #cbd5e1; }
    .stage p:last-child { margin-bottom: 0; }
    .back-link { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border); }
    .back-link a { display: inline-flex; align-items: center; gap: 8px; color: var(--accent-light); font-size: 13px; font-weight: 800; text-decoration: none; padding: 10px 24px; border-radius: 12px; background: rgba(${accent.rgb},0.1); border: 1px solid rgba(${accent.rgb},0.3); transition: all 0.2s; }
    .back-link a:hover { background: rgba(${accent.rgb},0.2); transform: translateX(-3px); }
    .cta-section { text-align: center; padding: 0 24px 64px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 16px 48px; border-radius: 16px; background: linear-gradient(135deg, var(--emerald), #0891b2, var(--indigo)); color: #fff; font-size: 15px; font-weight: 900; text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.25); transition: transform 0.2s, box-shadow 0.2s; }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(16,185,129,0.4); }
    .ad-slot { margin: 32px auto; max-width: 100%; text-align: center; min-height: 90px; }
    .ad-slot--top { margin-top: 8px; margin-bottom: 32px; }
    .ad-slot--bottom { margin: 32px auto 8px; }
    .ad-label { display: block; font-size: 10px; color: var(--muted); text-align: center; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.5px; }
    footer { border-top: 1px solid var(--border); background: rgba(15,23,42,0.95); padding: 56px 24px 32px; }
    .footer-inner { max-width: 1200px; margin: 0 auto; }
    .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px; margin-bottom: 36px; }
    .footer-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .footer-logo-icon { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, var(--indigo), var(--purple)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .footer-logo-name { font-size: 15px; font-weight: 900; color: #fff; }
    .footer-desc { font-size: 12px; color: var(--muted); line-height: 1.8; max-width: 280px; }
    .footer-email { font-size: 12px; color: var(--indigo); margin-top: 10px; font-weight: 700; }
    .footer-email a { color: var(--indigo); text-decoration: none; }
    .footer-email a:hover { text-decoration: underline; }
    .footer-col h4 { font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 14px; }
    .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .footer-col ul a { font-size: 12px; color: var(--muted); text-decoration: none; transition: color 0.2s; }
    .footer-col ul a:hover { color: var(--indigo); }
    .footer-bottom { border-top: 1px solid rgba(148,163,184,0.08); padding-top: 20px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: rgba(148,163,184,0.5); }
    @media (max-width: 768px) { .article-card { padding: 28px 20px; } .footer-grid { grid-template-columns: 1fr; gap: 28px; } .nav-links { display: none; } }
  </style>
</head>
<body>
  <nav class="main-nav">
    <div class="nav-inner">
      <a href="/" class="nav-logo">
        <div class="logo-icon">${topic.coverIcon}</div>
        <div class="logo-text">
          <span class="logo-name">منصة المحامي الرقمية</span>
          <span class="logo-sub">مجاني 100% • نظام إدارة مكاتب المحاماة</span>
        </div>
      </a>
      <div class="nav-links">
        <a href="/">الرئيسية</a>
        <a href="/about.html">عن المنصة</a>
        <a href="/features.html">المميزات</a>
        <a href="/pricing.html">مجانية بالكامل</a>
        <a href="/blog/" class="active">المدونة</a>
        <a href="/contact.html">تواصل معنا</a>
      </div>
      <a href="/" class="nav-cta">دخول المنصة مجاناً 🚀</a>
    </div>
  </nav>

  <nav class="breadcrumbs" aria-label="مسار التنقل">
    <a href="/">الرئيسية</a>
    <span class="sep">‹</span>
    <a href="/blog/">المدونة القانونية</a>
    <span class="sep">‹</span>
    <span class="current">${topic.tag}</span>
  </nav>

  <div class="article-hero">
    <div class="article-badge">${topic.coverIcon} ${topic.tag}</div>
    <h1>${topic.title}</h1>
    <div class="article-meta">
      <span>📅 ${dateAr}</span>
      <span>✍️ فريق منصة المحامي الرقمية</span>
      <span>⏱️ ${topic.readTime} دقائق قراءة</span>
    </div>
    <div class="ad-slot ad-slot--top" role="complementary" aria-label="إعلان">
      <span class="ad-label">إعلان</span>
      <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7725405859334364" data-ad-slot="2168039898" data-ad-format="auto" data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>
  </div>

  <div class="article-container">
    <article class="article-card">
      ${topic.body}
      <div class="back-link">
        <a href="/blog/">← العودة للمدونة القانونية</a>
      </div>
    </article>
  </div>

  <div class="ad-slot ad-slot--bottom" role="complementary" aria-label="إعلان">
    <span class="ad-label">إعلان</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-7725405859334364" data-ad-slot="2168039898" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>

  <div class="cta-section">
    <a href="/" class="cta-btn">ابدأ استخدام المنصة مجاناً الآن 🚀</a>
  </div>

  <footer>
    <div class="footer-inner">
      <div class="footer-grid">
        <div>
          <div class="footer-logo">
            <div class="footer-logo-icon">⚖️</div>
            <span class="footer-logo-name">منصة المحامي الرقمية</span>
          </div>
          <p class="footer-desc">النظام البرمجي المتكامل والمجاني لإدارة مكاتب المحاماة في جمهورية مصر العربية.</p>
          <p class="footer-email">التواصل: <a href="mailto:ahmdmansoor222@gmail.com">ahmdmansoor222@gmail.com</a></p>
        </div>
        <div class="footer-col">
          <h4>أقسام المنصة</h4>
          <ul>
            <li><a href="/">الرئيسية</a></li>
            <li><a href="/about.html">عن المنصة</a></li>
            <li><a href="/features.html">المميزات</a></li>
            <li><a href="/pricing.html">مجانية بالكامل</a></li>
            <li><a href="/blog/">المدونة القانونية</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>السياسات والتواصل</h4>
          <ul>
            <li><a href="/privacy.html">سياسة الخصوصية</a></li>
            <li><a href="/terms.html">شروط الاستخدام</a></li>
            <li><a href="/contact.html">تواصل معنا</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 منصة المحامي الرقمية — جميع الحقوق محفوظة</span>
        <span>خدمة مجانية للمحامين والقانونيين في مصر</span>
      </div>
    </div>
  </footer>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════
// تحديث صفحة index.html للمدونة
// ═══════════════════════════════════════════════════════════════

function addCardToBlogIndex(topic) {
  let html = fs.readFileSync(BLOG_INDEX, 'utf8');

  const ANCHOR = '<!-- NEW_CARD_ANCHOR -->';

  const cardHTML = `<a href="/blog/${topic.slug}.html" class="post-card">
        <div class="post-cover ${topic.coverColor}">
          <span class="post-cover-icon">${topic.coverIcon}</span>
          <span class="post-cover-tag">${topic.tag}</span>
        </div>
        <div class="post-body">
          <div class="post-meta">
            <span>📅 ${formatDateAr(topic.pubDate)}</span>
            <span>⏱️ ${topic.readTime} دقائق</span>
          </div>
          <h3>${topic.title}</h3>
          <p>${topic.metaDesc}</p>
          <div class="post-cta">اقرأ المقال ←</div>
        </div>
      </a>

      ${ANCHOR}`;

  if (!html.includes(ANCHOR)) {
    console.error('❌ لم يُعثر على anchor النشر في index.html — يُرجى مراجعة الملف يدوياً');
    process.exit(1);
  }

  // أدرج البطاقة مكان الـ anchor (والـ anchor يبقى للمقال التالي)
  html = html.replace(ANCHOR, cardHTML);

  fs.writeFileSync(BLOG_INDEX, html, 'utf8');
}


// ═══════════════════════════════════════════════════════════════
// الدالة الرئيسية — تُنفَّذ عند تشغيل السكريبت
// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('🚀 ناشر المدونة التلقائي — منصة المحامي الرقمية');
  console.log(`⏰ وقت التشغيل: ${new Date().toLocaleString('ar-EG')}`);

  const log  = loadLog();
  const done = getPublishedSlugs(log);
  const topic = pickNextTopic(done);

  if (!topic) {
    console.log('✅ جميع المواضيع تم نشرها. يرجى إضافة مواضيع جديدة إلى TOPIC_POOL.');
    return;
  }

  topic.pubDate = todayStr();
  console.log(`📰 الموضوع المختار: ${topic.title}`);

  // 1. توليد ملف HTML
  const html     = generateArticleHTML(topic);
  const htmlPath = path.join(BLOG_DIR, `${topic.slug}.html`);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ تم إنشاء الملف: ${htmlPath}`);

  // 2. تحديث صفحة الفهرس
  addCardToBlogIndex(topic);
  console.log('✅ تم تحديث blog/index.html');

  // 3. Build
  console.log('🔨 جاري البناء...');
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    console.log('✅ اكتمل البناء');
  } catch (e) {
    const draft = { topic, error: e.message, time: new Date().toISOString() };
    const fails = fs.existsSync(FAIL_LOG) ? JSON.parse(fs.readFileSync(FAIL_LOG,'utf8')) : [];
    fails.push(draft);
    fs.writeFileSync(FAIL_LOG, JSON.stringify(fails,null,2),'utf8');
    console.error('❌ فشل البناء — تم حفظ المسودة في failed-drafts.json');
    process.exit(1);
  }

  // 4. Deploy
  console.log('🚀 جاري النشر على Firebase...');
  try {
    const tokenFlag = process.env.FIREBASE_TOKEN
      ? `--token "${process.env.FIREBASE_TOKEN}"`
      : '';
    execSync(
      `npx -y firebase-tools deploy --only hosting ${tokenFlag}`,
      { cwd: ROOT, stdio: 'inherit' }
    );
    console.log('✅ تم النشر بنجاح!');
  } catch (e) {
    console.error('❌ فشل النشر على Firebase:', e.message);
    process.exit(1);
  }

  // 5. تحديث السجل
  log.published.push({
    title: topic.title,
    date:  topic.pubDate,
    slug:  topic.slug,
    url:   `https://justice-91571.web.app/blog/${topic.slug}.html`,
    tags:  [topic.tag]
  });
  saveLog(log);

  console.log(`\n🎉 نُشر المقال بنجاح: "${topic.title}"`);
  console.log(`🔗 الرابط: https://justice-91571.web.app/blog/${topic.slug}.html`);
}

main();

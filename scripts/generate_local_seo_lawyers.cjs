const fs = require('fs');
const path = require('path');

const GOVERNORATES = [
  {
    slug: 'cairo',
    name: 'القاهرة',
    capital: 'القاهرة',
    cities: 'مدينة نصر، التجمع الخامس، المعادي، العباسية، مصر الجديدة، حلوان، وسط البلد، شبرا، الزمالك',
    courts: 'محكمة استئناف القاهرة، محكمة شمال القاهرة (العباسية)، محكمة جنوب القاهرة (زينهم)، محكمة القاهرة الجديدة، المحكمة الدستورية العليا',
    bar: 'نقابة المحامين الفرعية بشمال وجنوب القاهرة',
    specialties: 'النقض والجنايات الكبرى، قضايا الشركات والاستثمار، منازعات مجلس الدولة، قضايا الأسرة والتركات، والتحكيم الدولي',
    desc: 'العاصمة والمركز القضائي الرئيسي لجمهورية مصر العربية، وتضم مقر محكمة النقض والمحكمة الدستورية العليا ومجلس الدولة بالعباسية واستئناف القاهرة.'
  },
  {
    slug: 'giza',
    name: 'الجيزة',
    capital: 'الجيزة',
    cities: 'الدقي، المهندسين، 6 أكتوبر، الشيخ زايد، الهرم، فيصل، العجوزة، الحوامدية، البدرشين',
    courts: 'محكمة استئناف القاهرة مأمورية الجيزة، محكمة جنوب الجيزة الابتدائية، محكمة 6 أكتوبر الابتدائية، مجمع محاكم تاج الدول',
    bar: 'نقابة المحامين الفرعية بالجيزة (شمال وجنوب)',
    specialties: 'منازعات مجلس الدولة بالدقي، قضايا الاستثمار وتأسيس الشركات بأكتوبر، المنازعات العقارية والمدنية، وجنايات الجيزة',
    desc: 'تضم كبرى المحاكم الاستئنافية ومقر مجلس الدولة الرئيسي بالدقي والمحاكم المتخصصة في 6 أكتوبر والشيخ زايد.'
  },
  {
    slug: 'alexandria',
    name: 'الإسكندرية',
    capital: 'الإسكندرية',
    cities: 'سموحة، المنشية، سيدي جابر، الرمل، محرم بك، العجمي، ميامي، برج العرب، المنتزه',
    courts: 'محكمة استئناف الإسكندرية (أبيس)، محكمة الإسكندرية الابتدائية (المنشية ومحرم بك)، محاكم الأسرة، المحكمة الاقتصادية',
    bar: 'نقابة المحامين الفرعية بالإسكندرية',
    specialties: 'القضايا البحرية والتجارية، منازعات الموانئ والشحن، قضايا الأحوال الشخصية والأسرة، الجنايات، والمنازعات العقارية',
    desc: 'العاصمة الثانية لجمهورية مصر العربية وتضم أقدم المحاكم المصرية ومقر محكمة استئناف الإسكندرية التاريخي والمحكمة البحرية والتجارية.'
  },
  {
    slug: 'dakahlia',
    name: 'الدقهلية',
    capital: 'المنصورة',
    cities: 'المنصورة، طلخا، ميت غمر، دكرنس، السنبلاوين، بلقاس، شربين، منية النصر',
    courts: 'محكمة استئناف المنصورة (المقر الرئيسي)، محكمة المنصورة الابتدائية، محاكم الأسرة بالدقهلية',
    bar: 'نقابة المحامين الفرعية بشمال وجنوب الدقهلية',
    specialties: 'جنايات المنصورة الكبرى، دعاوى التعويضات والمدني، قضايا الشيكات وإيصالات الأمانة، والمنازعات الزراعية والتركات',
    desc: 'قلب الدلتا القضائي وتضم محكمة استئناف المنصورة التي تمتد ولايتها على عدة محافظات بنشاط جنائي ومدني واسع.'
  },
  {
    slug: 'sharqia',
    name: 'الشرقية',
    capital: 'الزقازيق',
    cities: 'الزقازيق، العاشر من رمضان، بلبيس، فاقوس، منيا القمح، أبو حماد، ههيا، الحسينية',
    courts: 'محكمة استئناف الإسماعيلية مأمورية الزقازيق، محكمة الزقازيق الابتدائية، محكمة ههيا الابتدائية',
    bar: 'نقابة المحامين الفرعية بالشرقية',
    specialties: 'المنازعات العمالية والصناعية بالعاشر من رمضان، منازعات الأراضي والزراعة، الجنايات، وقضايا الأسرة',
    desc: 'ثالث أكبر محافظات مصر سكاناً، وتتميز بكثافة القضايا العمالية والتجارية بالعاشر من رمضان والمنازعات المدنية.'
  },
  {
    slug: 'qalyubia',
    name: 'القليوبية',
    capital: 'بنها',
    cities: 'بنها، شبرا الخيمة، قليوب، الخانكة، طوخ، القناطر الخيرية، كفر شكر، العبور',
    courts: 'محكمة بنها الابتدائية، محكمة شبرا الخيمة الابتدائية، استئناف طنطا مأمورية بنها',
    bar: 'نقابة المحامين الفرعية بشمال وجنوب القليوبية',
    specialties: 'النزاعات الصناعية بشبرا والعبور، القضايا المدنية والجنائية ببنها، منازعات الإيجارات والأراضي',
    desc: 'بوابة القاهرة الشمالية وتضم مجمعي محاكم ضخمين في بنها وشبرا الخيمة بنشاط قضائي جنائي وعمالي كثيف.'
  },
  {
    slug: 'gharbia',
    name: 'الغربية',
    capital: 'طنطا',
    cities: 'طنطا، المحلة الكبرى، زفتى، كفر الزيات، السنطة، سمنود، بسيون، قطور',
    courts: 'محكمة استئناف طنطا (المقر الرئيسي)، محكمة طنطا الابتدائية، محكمة المحلة الكبرى الابتدائية',
    bar: 'نقابة المحامين الفرعية بالغربية (طنطا والمحلة)',
    specialties: 'الطعون الاستئنافية الكبرى، قضايا الغزل والنسيج والعمال بالمحلة، الجنايات، والمنازعات المدنية والتجارية',
    desc: 'المقر الإقليمي التاريخي لمحكمة استئناف طنطا التي تمتد ولايتها القضائية على قطاع وسط الدلتا بالكامل.'
  },
  {
    slug: 'monufia',
    name: 'المنوفية',
    capital: 'شبين الكوم',
    cities: 'شبين الكوم، منوف، أشمون، قويسنا، بركة السبع، تلا، الشهداء، مدينة السادات',
    courts: 'محكمة شبين الكوم الابتدائية، مأمورية استئناف طنطا بشبين الكوم، محكمة السادات الجزئية',
    bar: 'نقابة المحامين الفرعية بالمنوفية',
    specialties: 'المنازعات الاستثمارية والصناعية بالسادات، قضايا المواريث والملكية الزراعية، والمدني والجنائي',
    desc: 'مركز قضائي رائد يضم قضاة ومحامين بارزين، وتغطي دوائرها منازعات صناعية بالسادات ومنازعات زراعية ومدنية.'
  },
  {
    slug: 'beheira',
    name: 'البحيرة',
    capital: 'دمنهور',
    cities: 'دمنهور، كفر الدوار، إيتاي البارود، كوم حمادة، أبو حمص، رشيد، حوش عيسى، وادي النطرون',
    courts: 'محكمة دمنهور الابتدائية، محكمة إيتاي البارود الابتدائية، مأمورية استئناف الإسكندرية بدمنهور',
    bar: 'نقابة المحامين الفرعية بشمال وجنوب البحيرة',
    specialties: 'قضايا الأراضي الزراعية والاستصلاح بوادي النطرون، المنازعات العمالية بكفر الدوار، والجنايات',
    desc: 'أكبر محافظات غرب الدلتا مساحة وتضم نشاطاً قضائياً ضخماً في النزاعات الزراعية والصناعية والمنازعات العقارية.'
  },
  {
    slug: 'kafr-el-sheikh',
    name: 'كفر الشيخ',
    capital: 'كفر الشيخ',
    cities: 'كفر الشيخ، دسوق، فوه، بيلا، بلطيم، سيدي سالم، مطوبس، الرياض، قلين',
    courts: 'محكمة كفر الشيخ الابتدائية، مأمورية استئناف طنطا بكفر الشيخ',
    bar: 'نقابة المحامين الفرعية بكفر الشيخ',
    specialties: 'قضايا الاستزراع السمكي، الأراضي الزراعية وأملاك الدولة، الأحوال الشخصية، والجنايات',
    desc: 'تغطي قضايا الاستزراع السمكي، الأراضي الزراعية، والأحوال الشخصية، وتضم دوائر جنايات واستئناف نشطة.'
  },
  {
    slug: 'damietta',
    name: 'دمياط',
    capital: 'دمياط',
    cities: 'دمياط، دمياط الجديدة، رأس البر، كفر سعد، فارسكور، الروضة، الزرقا',
    courts: 'محكمة دمياط الابتدائية، مأمورية استئناف المنصورة بدمياط، المحكمة الاقتصادية',
    bar: 'نقابة المحامين الفرعية بدمياط',
    specialties: 'المنازعات التجارية وصناعة الأثاث، قضايا الموانئ والشحن، الشيكات والشركات، والنزاعات العقارية برأس البر',
    desc: 'مركز تجاري وصناعي ومينائي هام، وتتميز قضاياه بالنزاعات التجارية والمصرفية والشركات والشحن البحري.'
  },
  {
    slug: 'port-said',
    name: 'بورسعيد',
    capital: 'بورسعيد',
    cities: 'حي الشرق، حي العرب، حي المناخ، حي الضواحي، حي الزهور، بورفؤاد، الجنوب',
    courts: 'محكمة بورسعيد الابتدائية، مأمورية استئناف الإسماعيلية ببورسعيد، المحكمة الاقتصادية ببورسعيد',
    bar: 'نقابة المحامين الفرعية ببورسعيد',
    specialties: 'قضايا التهريب والجمارك، المنازعات البحرية ومنازعات قناة السويس، قضايا الشركات والاستثمار',
    desc: 'مدينة المنطقة الحرة والميناء العالمي، وتختص محاكمها بالمنازعات الجمركية والاقتصادية والبحرية والتجارية الدولية.'
  },
  {
    slug: 'ismailia',
    name: 'الإسماعيلية',
    capital: 'الإسماعيلية',
    cities: 'الإسماعيلية، القنطرة غرب، القنطرة شرق، التل الكبير، فايد، القصاصين، أبو صوير',
    courts: 'محكمة استئناف الإسماعيلية (المقر الرئيسي)، محكمة الإسماعيلية الابتدائية',
    bar: 'نقابة المحامين الفرعية بالإسماعيلية',
    specialties: 'قضايا الاستئناف العالي لقطاع القناة، منازعات الملاحة والاستثمار الزراعي، والمدني والجنائي',
    desc: 'المقر الإقليمي لمحكمة استئناف القناة وسيناء، وتضم منازعات ملاحة وقناة السويس واستثمار زراعي وصناعي.'
  },
  {
    slug: 'suez',
    name: 'السويس',
    capital: 'السويس',
    cities: 'حي السويس، الأربعين، فيصل، عتاقة، الجناين، العين السخنة',
    courts: 'محكمة السويس الابتدائية، مأمورية استئناف الإسماعيلية بالسويس',
    bar: 'نقابة المحامين الفرعية بالسويس',
    specialties: 'منازعات شركات البترول والطاقة، قضايا الموانئ والجمارك، النزاعات العقارية بالسخنة، والقضايا العمالية',
    desc: 'قلب الموانئ البحرية والصناعات البترولية والعين السخنة، وتتميز بنزاعات البترول والشركات والعمال والجمارك.'
  },
  {
    slug: 'fayoum',
    name: 'الفيوم',
    capital: 'الفيوم',
    cities: 'الفيوم، إطسا، سنورس، طامية، يوسف الصديق، إبشواي',
    courts: 'محكمة الفيوم الابتدائية، مأمورية استئناف بني سويف بالفيوم',
    bar: 'نقابة المحامين الفرعية بالفيوم',
    specialties: 'منازعات الملكية العقارية والأراضي الزراعية والري، قضايا الأسرة والتركات، والمدني والجنائي',
    desc: 'تتميز دوائرها بمنازعات الملكية العقارية والأراضي الزراعية والري، وقضايا الأسرة والتركات والمدني.'
  },
  {
    slug: 'beni-suef',
    name: 'بني سويف',
    capital: 'بني سويف',
    cities: 'بني سويف، الواسطى، ببا، ناصر، الفشن، سمسطا، إهناسيا، شرق النيل',
    courts: 'محكمة استئناف بني سويف (المقر الرئيسي)، محكمة بني سويف الابتدائية',
    bar: 'نقابة المحامين الفرعية ببني سويف',
    specialties: 'الطعون الاستئنافية الكبرى، قضايا مصانع شرق النيل والأسمنت، الجنايات، والمنازعات المدنية',
    desc: 'مقر محكمة استئناف بني سويف التي تمتد ولايتها على محافظات شمال الصعيد، وتضم دوائر جنائية ومدنية عليا.'
  },
  {
    slug: 'minya',
    name: 'المنيا',
    capital: 'المنيا',
    cities: 'المنيا، مغاغة، بني مزار، ملوي، سمالوط، أبو قرقاص، مطاي، دير مواس، المنيا الجديدة',
    courts: 'محكمة المنيا الابتدائية، مأمورية استئناف بني سويف بالمنيا',
    bar: 'نقابة المحامين الفرعية بالمنيا (شمال وجنوب)',
    specialties: 'جنايات المنيا الكبرى، منازعات الأراضي الزراعية والمحاجر، قضايا الأحوال الشخصية والأسرة',
    desc: 'عروس الصعيد وإحدى كبرى محافظات الجمهورية، وتشتهر بدوائر جنايات المنيا وقضايا الملكية الزراعية والأحوال الشخصية.'
  },
  {
    slug: 'assiut',
    name: 'أسيوط',
    capital: 'أسيوط',
    cities: 'أسيوط، ديروط، القوصية، منفلوط، أبنوب، الفتح، صدفا، البداري، الغنايم، ساحل سليم',
    courts: 'محكمة استئناف أسيوط (المقر الرئيسي)، محكمة أسيوط الابتدائية، محكمة القضاء الإداري بأسيوط',
    bar: 'نقابة المحامين الفرعية بأسيوط (شمال وجنوب)',
    specialties: 'الطعون الاستئنافية الكبرى، قضايا مجلس الدولة والقضاء الإداري، الجنايات، ونزاعات التركات والأراضي',
    desc: 'عاصمة الصعيد القضائية والمقر التاريخي لمحكمة استئناف أسيوط ومجلس الدولة لقطاع وسط وجنوب الصعيد.'
  },
  {
    slug: 'sohag',
    name: 'سوهاج',
    capital: 'سوهاج',
    cities: 'سوهاج، أخميم، طهطا، جرجا، المراغة، البلينا، المنشأة، ساقلتة، طما، دار السلام، جهينة',
    courts: 'محكمة سوهاج الابتدائية، مأمورية استئناف أسيوط بسوهاج',
    bar: 'نقابة المحامين الفرعية بسوهاج (شمال وجنوب)',
    specialties: 'قضايا الجنايات الكبرى، قضايا النزاعات العائلية والتركات، الفرز والتجنيب، والأحوال الشخصية',
    desc: 'مركز قضائي عريق يضم كبرى دوائر الجنايات وقضايا النزاعات العائلية والتركات والفرز والتجنيب.'
  },
  {
    slug: 'qena',
    name: 'قنا',
    capital: 'قنا',
    cities: 'قنا، نجع حمادي، دشنا، قوص، نقادة، فرشوط، أبو تشت، الوقف، قفط',
    courts: 'محكمة قنا الابتدائية، محكمة استئناف قنا، محكمة نجع حمادي الابتدائية',
    bar: 'نقابة المحامين الفرعية بقنا',
    specialties: 'جنايات قنا ونجع حمادي، قضايا المصالحات والتركات، منازعات زراعة القصب والأراضي، والمدني',
    desc: 'تغطي محاكمها قضايا الجنايات الكبرى والنزاعات الزراعية والمصالحات والتركات والأحوال الشخصية.'
  },
  {
    slug: 'luxor',
    name: 'الأقصر',
    capital: 'الأقصر',
    cities: 'الأقصر، إسنا، أرمنت، الطود، البياضية، القرنة، الزينية',
    courts: 'محكمة الأقصر الابتدائية، مأمورية استئناف قنا بالأقصر',
    bar: 'نقابة المحامين الفرعية بالأقصر',
    specialties: 'النزاعات الفندقية والسياحية، عقود الاستثمار والتطوير، المنازعات المدنية وقضايا التركات',
    desc: 'العاصمة السياحية العالمية، وتختص محاكمها بالنزاعات الفندقية والسياحية والاستثمارية والمدنية.'
  },
  {
    slug: 'aswan',
    name: 'أسوان',
    capital: 'أسوان',
    cities: 'أسوان، كوم أمبو، إدفو، دراو، نصر النوبة، أبو سمبل، كلابشة',
    courts: 'محكمة أسوان الابتدائية، مأمورية استئناف قنا بأسوان',
    bar: 'نقابة المحامين الفرعية بأسوان',
    specialties: 'قضايا التعدين والذهب والمحاجر، منازعات الملاحة النيلية والسياحة، قضايا أراضي النوبة والتعويضات',
    desc: 'بوابة مصر الجنوبية وتتميز بنزاعات التعدين والمحاجر والملاحة النيلية والتعويضات وأراضي النوبة.'
  },
  {
    slug: 'red-sea',
    name: 'البحر الأحمر',
    capital: 'الغردقة',
    cities: 'الغردقة، رأس غارب، سفاجا، القصير، مرسى علم، الشلاتين، حلايب',
    courts: 'محكمة البحر الأحمر الابتدائية بالغردقة، مأمورية استئناف قنا بالغردقة',
    bar: 'نقابة المحامين الفرعية بالبحر الأحمر',
    specialties: 'منازعات التطوير العقاري والسياحي، عقود الفنادق، قضايا الاستثمار الأجنبي وتأسيس الشركات، والموانئ',
    desc: 'تتميز بنزاعات التطوير السياحي، عقود الفنادق، قضايا الاستثمار الأجنبي، الموانئ، والشركات الدولية.'
  },
  {
    slug: 'matrouh',
    name: 'مطروح',
    capital: 'مرسى مطروح',
    cities: 'مرسى مطروح، العلمين الجديدة، رأس الحكمة، الضبعة، الحمام، السلوم، سيوة',
    courts: 'محكمة مطروح الابتدائية، محكمة العلمين الجديدة، مأمورية استئناف الإسكندرية بمطروح',
    bar: 'نقابة المحامين الفرعية بمطروح',
    specialties: 'عقود البيع والاستثمار العقاري بالساحل الشمالي ورأس الحكمة، منازعات الأراضي، والمدني والجنائي',
    desc: 'منطقة الاستثمار العقاري الكبرى بالساحل الشمالي والعلمين الجديدة ورأس الحكمة والنزاعات العقارية الضخمة.'
  },
  {
    slug: 'new-valley',
    name: 'الوادي الجديد',
    capital: 'الخارجة',
    cities: 'الخارجة، الداخلة، الفرافرة، باريس، بلاط',
    courts: 'محكمة الوادي الجديد الابتدائية بالخارجة، مأمورية استئناف أسيوط بالخارجة',
    bar: 'نقابة المحامين الفرعية بالوادي الجديد',
    specialties: 'منازعات استصلاح الأراضي الزراعية وتمليكها، قضايا المياه الجوفية، المشروعات القومية، والمدني',
    desc: 'أكبر محافظات مصر مساحة، وتختص بقضايا استصلاح الأراضي الزراعية والمياه الجوفية والمشروعات القومية.'
  },
  {
    slug: 'north-sinai',
    name: 'شمال سيناء',
    capital: 'العريش',
    cities: 'العريش، بئر العبد، الشيخ زويد، رفح، نخل، الحسنة',
    courts: 'محكمة شمال سيناء الابتدائية بالعريش، مأمورية استئناف الإسماعيلية بالعريش',
    bar: 'نقابة المحامين الفرعية بشمال سيناء',
    specialties: 'قضايا التعويضات، منازعات تمليك الأراضي والعقارات بسيناء، والجنايات والأحوال الشخصية',
    desc: 'بوابة مصر الشرقية وتختص بمنازعات تمليك الأراضي والتعويضات وقضايا الجنايات والحدود.'
  },
  {
    slug: 'south-sinai',
    name: 'جنوب سيناء',
    capital: 'طور سيناء',
    cities: 'شرم الشيخ، طور سيناء، رأس سدر، دهب، نويبع، طابا، سانت كاترين',
    courts: 'محكمة جنوب سيناء الابتدائية بالطور، مجمع محاكم شرم الشيخ',
    bar: 'نقابة المحامين الفرعية بجنوب سيناء',
    specialties: 'منازعات الفنادق والقرى السياحية بشرم الشيخ، عقود الشركات والاستثمار، والنزاعات المدنية والتجارية',
    desc: 'تغطي النزاعات الفندقية والقرى السياحية بشرم الشيخ وتراخيص الاستثمار العقاري والسياحي الدولي.'
  }
];

const targetDir = path.join(__dirname, '..', 'public', 'lawyers');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function generateGovernorateHtml(gov) {
  const title = `دليل ومحامو ${gov.name} 2026 - ابحث عن محامٍ معتمد وتواصل مباشرة | المحامي الرقمي`;
  const desc = `دليل المحامين المشتغلين والمقيدين بالنقض والاستئناف في محافظة ${gov.name} (${gov.cities}). استشارات وترافع في ${gov.specialties}. تواصل فوري مجاناً.`;
  const url = `https://mohamidigital.online/lawyers/${gov.slug}.html`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="keywords" content="محامي في ${gov.name}, دليل محامين ${gov.name}, محامي جنايات ${gov.name}, محامي اسرة ${gov.name}, محامي شركات ${gov.name}, محكمة ${gov.name}, ارقام محامين ${gov.name}, المستشار أحمد منصور" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

  <!-- OpenGraph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:site_name" content="المحامي الرقمي" />
  <meta property="og:image" content="https://mohamidigital.online/images/og-lawyers-directory.jpg" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="https://mohamidigital.online/images/og-lawyers-directory.jpg" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/header.css?v=20260904-luxury-navy" />

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "name": "دليل محامين محافظة ${gov.name} المعتمدين | المحامي الرقمي",
    "description": "${desc}",
    "url": "${url}",
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "محافظة ${gov.name}"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${gov.capital}",
      "addressRegion": "${gov.name}",
      "addressCountry": "EG"
    },
    "serviceType": "Legal Consultation, Litigation & Lawyer Directory",
    "provider": {
      "@type": "Organization",
      "name": "منصة المحامي الرقمية",
      "url": "https://mohamidigital.online/"
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://mohamidigital.online/" },
      { "@type": "ListItem", "position": 2, "name": "دليل المحامين", "item": "https://mohamidigital.online/lawyers-directory.html" },
      { "@type": "ListItem", "position": 3, "name": "محامو ${gov.name}", "item": "${url}" }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "كيف أختار أفضل محامي في محافظة ${gov.name}؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "يُنصح باختيار المحامي المقيد بالدرجة القضائية المناسبة لموضوع دعواك (نقض، استئناف عالي، أو ابتدائي)، مع التأكد من اختصاصه الدقيق في نوع القضية (جنائي، أسرة، مدني، شركات) وقربه من دائرة المحكمة المختصة بـ ${gov.name}."
        }
      },
      {
        "@type": "Question",
        "name": "ما هي المحاكم الرئيسية التابعة لمحافظة ${gov.name}؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "تشمل المحاكم الرئيسية في ${gov.name}: ${gov.courts}، بالإضافة إلى محاكم الأسرة والدوائر الجزئية بالمراكز."
        }
      },
      {
        "@type": "Question",
        "name": "كيف يتم توكيل محامٍ في ${gov.name} عبر الشهر العقاري؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "يتوجه الموكل ببطاقة الرقم القومي السارية إلى أي فرع توثيق شهر عقاري بمحافظة ${gov.name} لطلب (توكيل رسمي عام في القضايا) لصالح الأستاذ المحامي مع ذكر اسمه ودرجة قيده ورقم بطاقته."
        }
      },
      {
        "@type": "Question",
        "name": "هل يمكن للمحامين في ${gov.name} الانضمام والتسجيل في هذا الدليل؟",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "نعم، تتيح منصة المحامي الرقمية لجميع السادة الأساتذة المحامين المشتغلين والمقيدين بنقابة المحامين بـ ${gov.name} تسجيل مكاتبهم مجاناً وتلقي طلبات الاستشارات والتوكيل عبر الدليل الرسمي."
        }
      }
    ]
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080f28; --bg2: #0f172a; --border: rgba(148,163,184,0.15);
      --indigo: #6366f1; --indigo-light: #818cf8; --emerald: #10b981;
      --text: #f1f5f9; --muted: #94a3b8; --card: rgba(15,23,42,0.85);
    }
    body { font-family: 'Cairo', sans-serif; background: #080f28; color: var(--text); min-height: 100vh; line-height: 1.7; }
    .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
    
    .breadcrumbs { padding: 12px 0; font-size: 0.85rem; color: var(--muted); display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .breadcrumbs a { color: var(--indigo-light); text-decoration: none; font-weight: 600; }
    
    .hero-gov { padding: 40px 24px; text-align: center; background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 70%); border-radius: 20px; border: 1px solid var(--border); margin-bottom: 30px; }
    .gov-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; padding: 6px 16px; border-radius: 99px; font-size: 0.85rem; font-weight: 800; margin-bottom: 14px; }
    .hero-gov h1 { font-size: 1.9rem; font-weight: 900; color: #fff; margin-bottom: 12px; }
    .hero-gov p { font-size: 1.05rem; color: #cbd5e1; max-width: 800px; margin: 0 auto 20px; }
    
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 35px; }
    .info-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; }
    .info-card-title { font-size: 0.85rem; font-weight: 800; color: #34d399; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .info-card-text { font-size: 0.95rem; color: #e2e8f0; font-weight: 600; }
    
    .section-title { font-size: 1.35rem; font-weight: 900; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-right: 4px solid var(--indigo); padding-right: 12px; }
    
    .specialties-box { background: rgba(30,41,59,0.6); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 35px; }
    .spec-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .spec-pill { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #c7d2fe; padding: 6px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; }

    .lawyer-card-featured { background: linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9)); border: 1px solid rgba(52,211,153,0.35); border-radius: 16px; padding: 24px; margin-bottom: 35px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .lawyer-card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 14px; }
    .lawyer-name { font-size: 1.3rem; font-weight: 900; color: #fff; }
    .lawyer-rank { font-size: 0.85rem; color: #34d399; font-weight: 800; }
    .lawyer-actions-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
    .btn-act-wa { display: inline-flex; align-items: center; gap: 6px; background: #059669; color: #fff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.9rem; }
    .btn-act-call { display: inline-flex; align-items: center; gap: 6px; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.9rem; }
    .btn-act-dir { display: inline-flex; align-items: center; gap: 6px; background: rgba(148,163,184,0.15); border: 1px solid var(--border); color: #cbd5e1; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 0.9rem; }

    .faq-block { margin-bottom: 40px; }
    .faq-item { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 12px; }
    .faq-q { font-size: 1rem; font-weight: 800; color: #38bdf8; margin-bottom: 8px; }
    .faq-a { font-size: 0.9rem; color: #cbd5e1; line-height: 1.8; }

    .govs-nav-block { background: rgba(15,23,42,0.6); border: 1px solid var(--border); border-radius: 16px; padding: 22px; margin-bottom: 40px; }
    .govs-links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; margin-top: 14px; }
    .gov-link-pill { display: block; text-align: center; padding: 8px 10px; background: rgba(30,41,59,0.7); border: 1px solid var(--border); border-radius: 8px; color: #cbd5e1; text-decoration: none; font-size: 0.85rem; font-weight: 700; transition: all 0.2s; }
    .gov-link-pill:hover, .gov-link-pill.active { background: #4f46e5; color: #fff; border-color: #6366f1; }
  </style>
</head>
<body>

  <!-- Site Header -->
  <header class="uh-bar" id="siteHeader">
    <div class="uh-inner">
      <a href="/" class="uh-logo" aria-label="منصة المحامي الرقمية">
        <span class="uh-badge">⚖️</span>
        <span class="uh-brand">
          <span class="uh-title">المحامي الرقمي</span>
          <span class="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
        </span>
      </a>

      <nav class="uh-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        <a href="/" class="uh-link">🏠 الرئيسية</a>
        <a href="/lawyers-directory.html" class="uh-link active">👨‍⚖️ دليل المحامين</a>
        <a href="/legal-consultations.html" class="uh-link">💬 الاستشارات</a>
        <a href="/contract-generator.html" class="uh-link">⚡ صانع العقود</a>
        <a href="/courts-directory.html" class="uh-link">🏛️ دليل المحاكم</a>
        <a href="/blog/" class="uh-link">📚 المدونة</a>
      </nav>
    </div>
  </header>

  <div class="container" style="padding-top: 90px;">
    
    <div class="breadcrumbs">
      <a href="/">الرئيسية</a>
      <span>›</span>
      <a href="/lawyers-directory.html">دليل المحامين المشتغلين</a>
      <span>›</span>
      <span>محامو محافظة ${gov.name}</span>
    </div>

    <!-- Hero -->
    <section class="hero-gov">
      <div class="gov-badge">📍 دليل المحامين المعتمد في جمهورية مصر العربية</div>
      <h1>أفضل محامين في ${gov.name} ٢٠٢٦</h1>
      <p>${gov.desc}</p>
      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
        <a href="/lawyers-directory.html" class="btn-act-wa">🔍 بحث متقدم في كافة المحامين</a>
        <a href="/legal-consultations.html" class="btn-act-call">💬 طلب استشارة فورية بمحافظة ${gov.name}</a>
      </div>
    </section>

    <!-- Info Cards -->
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">🏛️ المحاكم الرئيسية المختصة</div>
        <div class="info-card-text">${gov.courts}</div>
      </div>
      <div class="info-card">
        <div class="info-card-title">🏢 عاصمة المحافظة والمراكز</div>
        <div class="info-card-text">${gov.capital} (${gov.cities})</div>
      </div>
      <div class="info-card">
        <div class="info-card-title">📜 النقابة الفرعية للمحامين</div>
        <div class="info-card-text">${gov.bar}</div>
      </div>
    </div>

    <!-- Specialties Box -->
    <div class="specialties-box">
      <h3 style="font-size:1.1rem; color:#fff; font-weight:800;">⚖️ مجالات الترافع والتخصصات الأكثر طلباً في ${gov.name}:</h3>
      <div class="spec-pills">
        ${gov.specialties.split(/[،,]+/).map(s => `<span class="spec-pill">⚖️ ${s.trim()}</span>`).join('')}
      </div>
    </div>

    <!-- Featured Lawyer Card -->
    <div class="section-title">👨‍⚖️ المكتب الاستشاري المعتمد للترافع بمحافظة ${gov.name}</div>
    <div class="lawyer-card-featured">
      <div class="lawyer-card-header">
        <div>
          <div class="lawyer-name">الأستاذ / أحمد منصور المحامي</div>
          <div class="lawyer-rank">⚖️ محامٍ بالنقض والدستورية العليا والإدارية العليا</div>
          <div style="font-size:0.85rem; color:#94a3b8; margin-top:4px;">📍 متاح للترافع والاستشارات المباشرة بدوائر محاكم ${gov.name} والقاهرة الكبرى وكافة محافظات الجمهورية</div>
        </div>
        <span style="background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#6ee7b7; padding:4px 12px; border-radius:20px; font-size:0.85rem; font-weight:800;">✓ مقيد بالنقض - خبرة +22 عاماً</span>
      </div>
      <p style="color:#cbd5e1; font-size:0.95rem; line-height:1.8;">
        ترافع متخصص في قضايا الجنايات الكبرى، الطعون بالنقض، منازعات الشركات وتأسيسها، قضايا الأموال العامة، المنازعات العقارية الكبرى والتعويضات المدنية، وقضايا الأسرة المعقدة وإعلام الوراثة.
      </p>
      <div class="lawyer-actions-row">
        <a href="https://wa.me/201000787780?text=${encodeURIComponent('مرحباً أستاذ أحمد منصور، أود استشارة قضائية بشأن دعوى بمحافظة ' + gov.name)}" target="_blank" class="btn-act-wa">💬 تواصل واتساب فوري</a>
        <a href="tel:01000787780" class="btn-act-call">📞 اتصال مباشر بالمكتب</a>
        <a href="/contract-generator.html" class="btn-act-dir">⚡ صانع العقود والصيغ الفورية</a>
      </div>
    </div>

    <!-- Local Courts Directory Quick Link -->
    <div class="section-title">🏛️ المحاكم والشهر العقاري في ${gov.name}</div>
    <div style="background:var(--card); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:35px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
      <div>
        <h4 style="font-size:1.05rem; color:#fff; font-weight:800;">دليل مقار المحاكم ومكاتب التوثيق بـ ${gov.name}</h4>
        <p style="font-size:0.9rem; color:#94a3b8; margin-top:4px;">تعرف على عناوين المحاكم، مواعيد العمل الصباحية والمسائية، ورسوم التوثيق والشهر العقاري.</p>
      </div>
      <a href="/courts-directory.html" class="btn-act-call">🏛️ تصفح دليل المحاكم والشهر العقاري</a>
    </div>

    <!-- FAQ -->
    <div class="section-title">❓ الأسئلة الشائعة حول توكيل محامٍ في ${gov.name}</div>
    <div class="faq-block">
      <div class="faq-item">
        <div class="faq-q">كيف أختار أفضل محامي في محافظة ${gov.name}؟</div>
        <div class="faq-a">يُنصح باختيار المحامي المقيد بالدرجة القضائية المناسبة لموضوع دعواك (نقض، استئناف عالي، أو ابتدائي)، مع التأكد من اختصاصه الدقيق في نوع القضية (جنائي، أسرة، مدني، شركات) وقربه من دائرة المحكمة المختصة بـ ${gov.name}.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">ما هي أتعاب المحاماة التقريبية في قضايا ${gov.name}؟</div>
        <div class="faq-a">تختلف الأتعاب بحسب طبيعة الدعوى (جنايات، جنح، تعويضات مدنية، أحوال شخصية) ودرجة قيد المحامي ونطاق الجهد المستغرق والمستندات المطلوبة، ويتم الاتفاق عليها برضاء الطرفين وتثبيتها بموجب عقد اتفاق أتعاب محاماة رسمي.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">كيف يتم عمل توكيل قضايا للمحامي في الشهر العقاري بـ ${gov.name}؟</div>
        <div class="faq-a">يتوجه الموكل ببطاقة الرقم القومي السارية إلى أقرب فرع توثيق شهر عقاري بمحافظة ${gov.name}، ويطلب تحرير (توكيل رسمي عام في القضايا) باسم المحامي ودرجة قيده، ويتم تسليمه للمحامي لمباشرة الإجراءات وسداد الرسوم.</div>
      </div>
    </div>

    <!-- ⚖️ بطاقة الموثوقية والتدقيق التشريعي (E-E-A-T) -->
    <section class="eeat-review-card" style="margin: 36px 0 30px; padding: 22px 24px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1px solid rgba(52, 211, 153, 0.35); border-right: 5px solid #10b981; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); direction: rtl;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 26px;">⚖️</span>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #34d399;">دليل قضائي معتمد ومدقق تشريعياً</div>
            <div style="font-size: 13px; color: #cbd5e1; font-weight: 600;">إشراف وتدقيق: <strong style="color: #fff;">المستشار أحمد منصور</strong> — محامٍ بالنقض والدستورية العليا</div>
          </div>
        </div>
        <span style="display: inline-block; padding: 4px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 20px; font-size: 11px; font-weight: 700; color: #6ee7b7;">✓ تحديث تشريعي وقضائي مستمر ٢٠٢٦</span>
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: #94a3b8;">
        تم إعداد بيانات المحاكم والاختصاصات القضائية لمحافظة ${gov.name} وفق أحدث القرارات الوزارية الصادرة عن وزارة العدل المصرية ونقابة المحامين العامة.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; align-items: center;">
        <a href="/editorial-policy.html" style="color: #38bdf8; text-decoration: none; font-weight: 700;">📖 السياسة التحريرية</a>
        <span style="color: #475569;">•</span>
        <a href="/why-trust-us.html" style="color: #38bdf8; text-decoration: none; font-weight: 700;">🛡️ منهجية الثقة</a>
        <span style="color: #475569;">•</span>
        <a href="/contact.html" style="color: #38bdf8; text-decoration: none; font-weight: 700;">💬 تواصل مع الإدارة القضائية</a>
      </div>
    </section>

    <!-- Governorates Navigation Grid -->
    <div class="govs-nav-block">
      <h3 style="font-size:1.15rem; color:#fff; font-weight:800; margin-bottom:6px;">📍 تصفح دليل المحامين في كافة المحافظات المصرية:</h3>
      <p style="font-size:0.85rem; color:#94a3b8;">اختر المحافظة لاستعراض المحامين المعتمدين والمحاكم المختصة:</p>
      <div class="govs-links-grid">
        ${GOVERNORATES.map(g => `<a href="/lawyers/${g.slug}.html" class="gov-link-pill ${g.slug === gov.slug ? 'active' : ''}">محامو ${g.name}</a>`).join('\n        ')}
      </div>
    </div>

  </div>

  <!-- Smart Download Banner -->
  <div class="smart-download-banner" id="smartDownloadBanner">
    <div class="sdb-card">
      <div class="sdb-header">
        <span class="sdb-badge">🚀 تجربة مجانية كاملة 30 يوماً</span>
        <div class="sdb-platforms">
          <span class="sdb-platform-tag">💻 ويندوز للكمبيوتر (Setup & Portable)</span>
          <span class="sdb-platform-tag">📱 أندرويد APK</span>
          <span class="sdb-platform-tag">🍏 آيفون PWA</span>
        </div>
      </div>
      <div class="sdb-title">⚖️ منظومة المحامي الرقمية لإدارة مكاتب المحاماة (إصدار 2026)</div>
      <div class="sdb-desc">
        نظّم قضاياك، جدول جلساتك، أوراق المحضرين، والعقود والصيغ في نظام رقمي متكامل ومشفّر محلياً بنسبة 100% يعمل دون الحاجة للإنترنت.
      </div>
      <div class="sdb-actions">
        <a href="/download.html" class="sdb-btn-primary"><span>📥 تحميل البرنامج وتجربته مجاناً (30 يوماً)</span></a>
        <a href="https://wa.me/201000787780?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%D8%A3%D8%B3%D8%AA%D8%A7%D8%B0%20%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D9%81%D9%8A%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D9%86%D8%B3%D8%AE%D8%A9%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%A7%D9%84%D9%85%D8%AD%D8%A7%D9%85%D9%8A%20%D8%A7%D9%84%D8%B1%D9%82%D9%85%D9%8A%D8%A9" class="sdb-btn-whatsapp" target="_blank" rel="noopener"><span>💬 واتساب للتفعيل الفوري: 01000787780</span></a>
      </div>
    </div>
  </div>

  <footer class="uh-footer" style="background:#040817; border-top:1px solid var(--border); padding:30px 20px; text-align:center; font-size:0.85rem; color:#64748b;">
    <p>© 2026 منصة المحامي الرقمية · الدليل الرسمي للمحامين المشتغلين بمحافظة ${gov.name} · إشراف الأستاذ أحمد منصور المحامي بالنقض</p>
  </footer>

  <script src="/sidebar.js?v=20260904" defer></script>
  <script src="/mobile-dock.js" defer></script>
</body>
</html>`;
}

function generateIndexHubHtml() {
  const title = `دليل المحامين في محافظات مصر 2026 - ابحث عن محامٍ معتمد في محافظتك | المحامي الرقمي`;
  const desc = `الدليل الإقليمي الشامل للمحامين المشتغلين والمقيدين بنقابة المحامين في كافة المحافظات المصرية الـ 27. اختر محافظتك للتواصل المباشر مع محامي معتمد.`;
  const url = `https://mohamidigital.online/lawyers/`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://mohamidigital.online/images/og-lawyers-directory.jpg" />

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/header.css?v=20260904-luxury-navy" />

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "دليل المحامين في محافظات مصر | المحامي الرقمي",
    "description": "${desc}",
    "url": "${url}"
  }
  </script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080f28; --bg2: #0f172a; --border: rgba(148,163,184,0.15);
      --indigo: #6366f1; --indigo-light: #818cf8; --emerald: #10b981;
      --text: #f1f5f9; --muted: #94a3b8; --card: rgba(15,23,42,0.85);
    }
    body { font-family: 'Cairo', sans-serif; background: #080f28; color: var(--text); min-height: 100vh; line-height: 1.7; }
    .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
    
    .hero-hub { padding: 50px 24px; text-align: center; background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 70%); border-radius: 20px; border: 1px solid var(--border); margin-bottom: 35px; }
    .hub-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; padding: 6px 16px; border-radius: 99px; font-size: 0.85rem; font-weight: 800; margin-bottom: 14px; }
    .hero-hub h1 { font-size: 2.1rem; font-weight: 900; color: #fff; margin-bottom: 12px; }
    .hero-hub p { font-size: 1.05rem; color: #cbd5e1; max-width: 800px; margin: 0 auto 20px; }

    .govs-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 18px; margin-bottom: 45px; }
    .gov-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 22px; text-decoration: none; color: inherit; transition: all 0.25s ease; display: flex; flex-direction: column; justify-content: space-between; }
    .gov-card:hover { transform: translateY(-4px); border-color: var(--indigo); box-shadow: 0 12px 28px rgba(99,102,241,0.2); }
    .gov-card-name { font-size: 1.25rem; font-weight: 900; color: #fff; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
    .gov-card-badge { font-size: 0.75rem; background: rgba(99,102,241,0.2); color: #a5b4fc; padding: 3px 8px; border-radius: 6px; font-weight: 700; }
    .gov-card-cities { font-size: 0.85rem; color: var(--muted); margin-bottom: 12px; }
    .gov-card-courts { font-size: 0.85rem; color: #34d399; font-weight: 700; margin-bottom: 14px; }
    .gov-card-btn { text-align: center; background: rgba(30,41,59,0.8); border: 1px solid var(--border); border-radius: 8px; padding: 8px; font-size: 0.85rem; font-weight: 800; color: #38bdf8; }
    .gov-card:hover .gov-card-btn { background: #4f46e5; color: #fff; border-color: #6366f1; }
  </style>
</head>
<body>

  <!-- Site Header -->
  <header class="uh-bar" id="siteHeader">
    <div class="uh-inner">
      <a href="/" class="uh-logo" aria-label="منصة المحامي الرقمية">
        <span class="uh-badge">⚖️</span>
        <span class="uh-brand">
          <span class="uh-title">المحامي الرقمي</span>
          <span class="uh-sub">مساعدك القانوني الذكي · مجاناً</span>
        </span>
      </a>

      <nav class="uh-nav" id="headerNav" role="navigation" aria-label="القائمة الرئيسية">
        <a href="/" class="uh-link">🏠 الرئيسية</a>
        <a href="/lawyers-directory.html" class="uh-link active">👨‍⚖️ دليل المحامين</a>
        <a href="/legal-consultations.html" class="uh-link">💬 الاستشارات</a>
        <a href="/contract-generator.html" class="uh-link">⚡ صانع العقود</a>
        <a href="/courts-directory.html" class="uh-link">🏛️ دليل المحاكم</a>
        <a href="/blog/" class="uh-link">📚 المدونة</a>
      </nav>
    </div>
  </header>

  <div class="container" style="padding-top: 90px;">
    
    <div class="hero-hub">
      <div class="hub-badge">🇪🇬 الدليل الإقليمي لمحامي جمهورية مصر العربية</div>
      <h1>دليل المحامين في كافة المحافظات المصرية ٢٠٢٦</h1>
      <p>ابحث عن أفضل المحامين المعتمدين والمقيدين بالنقض والاستئناف في محافظتك وتواصل مباشرة لطلب الاستشارات والترافع القضائي.</p>
      <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
        <a href="/lawyers-directory.html" style="background:#059669; color:#fff; padding:10px 22px; border-radius:10px; text-decoration:none; font-weight:800; font-size:0.9rem;">🔍 دليل المحامين العام ومحرك البحث</a>
        <a href="/legal-consultations.html" style="background:#2563eb; color:#fff; padding:10px 22px; border-radius:10px; text-decoration:none; font-weight:800; font-size:0.9rem;">💬 طلب استشارة قانونية فورية</a>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="govs-cards-grid">
      ${GOVERNORATES.map(g => `
        <a href="/lawyers/${g.slug}.html" class="gov-card">
          <div>
            <div class="gov-card-name">
              <span>محامو ${g.name}</span>
              <span class="gov-card-badge">📍 ${g.capital}</span>
            </div>
            <div class="gov-card-cities">المدن والمراكز: ${g.cities.split('،').slice(0, 4).join('، ')}...</div>
            <div class="gov-card-courts">🏛️ ${g.courts.split('،')[0]}</div>
          </div>
          <div class="gov-card-btn">استعراض محامين ومحاكم ${g.name} ←</div>
        </a>
      `).join('')}
    </div>

    <!-- EEAT Card -->
    <section class="eeat-review-card" style="margin: 20px 0 35px; padding: 22px 24px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1px solid rgba(52, 211, 153, 0.35); border-right: 5px solid #10b981; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); direction: rtl;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 26px;">⚖️</span>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #34d399;">الدليل الإقليمي الرسمي للمحامين المشتغلين بمصر</div>
            <div style="font-size: 13px; color: #cbd5e1; font-weight: 600;">إشراف وتدقيق: <strong style="color: #fff;">المستشار أحمد منصور</strong> — محامٍ بالنقض والدستورية العليا</div>
          </div>
        </div>
        <span style="display: inline-block; padding: 4px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 20px; font-size: 11px; font-weight: 700; color: #6ee7b7;">✓ تحديث تشريعي وقضائي مستمر ٢٠٢٦</span>
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: #94a3b8;">
        يغطي هذا الدليل كافة المحافظات والمحاكم الابتدائية والاستئنافية بجمهورية مصر العربية لتسهيل وصول المواطنين والمؤسسات إلى التمثيل القضائي الرصين.
      </p>
    </section>

  </div>

  <footer class="uh-footer" style="background:#040817; border-top:1px solid var(--border); padding:30px 20px; text-align:center; font-size:0.85rem; color:#64748b;">
    <p>© 2026 منصة المحامي الرقمية · الدليل الرسمي للمحامين في محافظات مصر · إشراف الأستاذ أحمد منصور المحامي بالنقض</p>
  </footer>

  <script src="/sidebar.js?v=20260904" defer></script>
  <script src="/mobile-dock.js" defer></script>
</body>
</html>`;
}

// Write Governorates
let count = 0;
for (const gov of GOVERNORATES) {
  const filePath = path.join(targetDir, `${gov.slug}.html`);
  const html = generateGovernorateHtml(gov);
  fs.writeFileSync(filePath, html, 'utf8');
  count++;
  console.log(`Generated: public/lawyers/${gov.slug}.html`);
}

// Write Index Hub
const indexHubPath = path.join(targetDir, 'index.html');
fs.writeFileSync(indexHubPath, generateIndexHubHtml(), 'utf8');
console.log(`Generated: public/lawyers/index.html`);

console.log(`\nSuccessfully generated ${count} governorate landing pages + 1 hub index in public/lawyers/`);

// Update sitemap.xml strictly following Rule #6 (verify file exists via fs.existsSync)
const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
let sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

let addedToSitemap = 0;
const newUrls = [
  'https://mohamidigital.online/lawyers/index.html',
  ...GOVERNORATES.map(g => `https://mohamidigital.online/lawyers/${g.slug}.html`)
];

for (const u of newUrls) {
  if (!sitemapContent.includes(u)) {
    // Verify file exists on disk
    const relFile = u.replace('https://mohamidigital.online/', 'public/');
    if (fs.existsSync(relFile)) {
      const entry = `  <url>\n    <loc>${u}</loc>\n    <lastmod>2026-10-16</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
      sitemapContent = sitemapContent.replace('</urlset>', entry + '</urlset>');
      addedToSitemap++;
    }
  }
}

if (addedToSitemap > 0) {
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
  console.log(`Added ${addedToSitemap} verified URLs to public/sitemap.xml`);
}

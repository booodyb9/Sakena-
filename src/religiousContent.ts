export type ReligiousEntry = {
  id: string;
  title: string;
  text: string;
  source: string;
  category: string;
  total?: number;
  explanation?: string;
  explanationUrl?: string;
};

export const hadith: ReligiousEntry[] = [
  {
    id: 'h1',
    explanation: 'يشمل فضل تعلّم القرآن تلاوته وحفظه وفهم معانيه وأحكامه، ويزداد الخير بتعليم الآخرين والعمل بما تعلّمه الإنسان.',
    explanationUrl: 'https://hadeethenc.com/ar/browse/hadith/5913',
    title: 'خيركم من تعلّم القرآن',
    text: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ.',
    source: 'صحيح البخاري، حديث ٥٠٢٧',
    category: 'القرآن',
  },
  {
    id: 'h2',
    explanation: 'الصدقة لا تقتصر على المال؛ فالكلام الحسن، كالذكر والدعاء والسلام وما ينفع الناس، من أعمال البر التي يؤجر عليها المسلم.',
    explanationUrl: 'https://hadeethenc.com/ar/browse/hadith/4568',
    title: 'الكلمة الطيبة',
    text: 'الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ.',
    source: 'من حديث في صحيح البخاري، ٢٩٨٩',
    category: 'الأخلاق',
  },
  {
    id: 'h3',
    explanation: 'اللين والتأني في القول والعمل يجعلان التعامل أحسن وأقرب إلى تحقيق المقصود. أما العنف وترك الرفق فيفسدان الأمور ويزيدان مشقتها.',
    explanationUrl: 'https://hadeethenc.com/ar/browse/hadith/5796',
    title: 'الرفق زينة',
    text: 'إِنَّ الرِّفْقَ لَا يَكُونُ فِي شَيْءٍ إِلَّا زَانَهُ، وَلَا يُنْزَعُ مِنْ شَيْءٍ إِلَّا شَانَهُ.',
    source: 'صحيح مسلم، حديث ٢٥٩٤',
    category: 'الأخلاق',
  },
  {
    id: 'h4',
    explanation: 'هاتان العبارتان يسيرتان في النطق وعظيمتان في الأجر؛ لأنهما تجمعان تنزيه الله عن النقص والثناء عليه بالكمال والعظمة.',
    explanationUrl: 'https://hadeethenc.com/ar/browse/hadith/5507',
    title: 'فضل الذكر',
    text: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ.',
    source: 'صحيح البخاري، حديث ٦٤٠٦',
    category: 'الذكر',
  },
  {
    id: 'h5',
    explanation: 'من كمال الإيمان أن يحب المسلم لأخيه الخير في الدين والدنيا كما يحبه لنفسه، وأن يكره له الشر، فينصح له ويبتعد عن الحسد والغش.',
    explanationUrl: 'https://hadeethenc.com/ar/browse/hadith/4717',
    title: 'المحبة للناس',
    text: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ.',
    source: 'صحيح البخاري، حديث ١٣؛ وصحيح مسلم، ٤٥',
    category: 'الأخلاق',
  },
];

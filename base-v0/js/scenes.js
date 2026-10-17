// =====================================================================
//  הסיפור שלנו · עונה 2
//  All content lives here. Edit text, dates and images freely.
//  Images: drop files into /img with the names below. Missing images
//  fall back to an emoji placeholder, so the site works without them.
// =====================================================================

window.CONFIG = {
  // Auto-play: how long each scene stays on screen (ms) unless a scene sets `hold`
  autoHold: 9000,

  // Opening ("previously on...") lines, shown one after another
  intro: [
    { text: 'בפרק הקודם...', cls: '' },
    { text: 'שאלתי אותך שאלה אחת.', cls: 'big' },
    { text: 'ואת אמרת לי כן.', cls: 'big gold' },
  ],
  introTitle: { small: 'הסיפור שלנו', big: 'עונה 2' },
  introButton: '▶  לצפייה בפרק',
};

window.SCENES = [
  {
    // TODO: exact proposal date
    date: '2026-04-15',
    chapter: 'פרק 0',
    dateLabel: 'היום שבו אמרת כן',
    title: 'מהנקודה שבה עצרנו',
    emoji: '💍',
    image: 'img/00-ring.jpg',
    text: [
      'הטבעת על האצבע, הלב עוד דופק מהר, ושנינו לא באמת הבנו מה קרה.',
      'מכאן מתחילה העונה השנייה. בלי תסריט, רק אנחנו.',
    ],
  },
  {
    date: '2026-05-10',
    chapter: 'פרק 1',
    dateLabel: 'מאי 2026',
    title: 'סאגת הקטנת הטבעת',
    emoji: '💎',
    image: 'img/01-jeweler.jpg',
    text: [
      'טבעת אחת, צורף אחד ואינספור נסיעות. קצת גדולה, עוד קצת, עוד טיפה... עד שהיא פשוט ישבה בול.',
    ],
    hold: 12000,
    widget: {
      type: 'ring',
      hint: 'גררי כדי להקטין את הטבעת',
      steps: [
        { size: 56, label: 'גדולה מדי. מסתובבת על האצבע 🙃' },
        { size: 54, label: 'ביקור שני אצל הצורף' },
        { size: 52, label: '״רק עוד טיפה״, ביקור שלישי' },
        { size: 51, label: 'כמעט... ביקור רביעי' },
        { size: 50, label: 'בול. מושלמת. כמוך ✨' },
      ],
    },
  },
  {
    date: '2026-06-15',
    chapter: 'פרק 2',
    dateLabel: 'יוני 2026',
    title: 'דרמת מחיר למשתכן',
    emoji: '🎲',
    image: 'img/02-lottery.jpg',
    text: [
      'חיכינו לתוצאות ההגרלה כמו לגמר המונדיאל. הגורל אמר ״לא הפעם״, אז החלטנו לא להשאיר את הבית שלנו להגרלה.',
    ],
    hold: 12000,
    widget: {
      type: 'scratch',
      cover: 'גרדי לבדיקת תוצאות 🪙',
      title: 'לא זכיתם בהגרלה 😅',
      text: 'אבל אני כבר זכיתי בפרס הגדול: בך.',
    },
  },
  {
    date: '2026-07-20',
    chapter: 'פרק 3',
    dateLabel: 'יולי–אוגוסט 2026',
    title: 'הדרבי: בת ים נגד רמלה',
    emoji: '🏙️',
    image: 'img/03-derby.jpg',
    text: [
      'הים מול השקט. הטיילת מול הירוק. טבלאות, סיורים, ויכוחים עד מאוחר בלילה.',
    ],
    hold: 15000,
    widget: {
      type: 'versus',
      hint: 'הקישי על כל צד כדי לשמוע את הטיעונים',
      sides: [
        { name: 'בת ים', who: 'הצד של נתן', args: ['הים במרחק הליכה 🌊', 'שקיעות כל ערב', 'קרוב לתל אביב'] },
        { name: 'רמלה', who: 'הצד של לינורי', args: ['שכונה ירוקה ושקטה 🌳', 'יותר בית בפחות כסף', 'מרגיש כמו בית'] },
      ],
      judge: '⚖️  שקלול סופי',
      bonus: '+ נתן התפשר 😇',
      result: 'רמלה ניצחה 🏆',
    },
  },
  {
    date: '2026-09-20',
    chapter: 'פרק 4',
    dateLabel: 'ספטמבר–אוקטובר 2026',
    title: 'חותמים. רשמית.',
    emoji: '🔑',
    image: 'img/04-contract.jpg',
    text: [
      'חוזה, עורך דין, יועץ משכנתא ועשרות חתימות. היד עם הטבעת חתמה על הבית הראשון שלנו. עכשיו נשאר רק לחכות למפתח.',
    ],
    hold: 10000,
    widget: {
      type: 'countdown',
      label: 'עד שהמפתח אצלנו ביד:',
      // TODO: exact key handover date
      target: '2027-01-15T12:00:00',
    },
  },
  {
    date: '2026-10-12',
    chapter: 'פרק 5',
    dateLabel: 'עכשיו',
    title: 'קרב השיפוץ והמיקרוגל',
    emoji: '🥐',
    image: 'img/05-kitchen.jpg',
    text: [
      'מטבח, ארונות, ריצוף... ואז הוא הגיע: מיקרוגל ״קו אפס״ מובנה ב-3,000 ש״ח. הדיון עדיין פתוח. רשמית.',
    ],
    hold: 12000,
    widget: {
      type: 'poll',
      question: 'הצבעה בלייב:',
      options: ['בעד המיקרו של לינור 🥐', 'בעד ניהול תקציב שפוי 📊'],
      results: [100, 0],
      winner: 0,
      noteWin: 'הקול נקלט. ההחלטה התקבלה פה אחד 🎉',
      noteLose: 'הקול נקלט... ותוקן אוטומטית לטובת המיקרו 😉',
    },
  },
  {
    date: '2026-10-19',
    chapter: 'פרק 6',
    dateLabel: 'היום!',
    title: 'יום הולדת שמח, לינורי',
    emoji: '🎂',
    image: 'img/06-cake.jpg',
    text: [
      'לאישה שאמרה כן, שנלחמה על כל מילימטר בטבעת, שבחרה איתי בית ושעוד תנצח בוויכוח על המיקרוגל.',
      'השנה הזו הייתה הכי טובה שלי, ואת הסיבה. אוהב אותך. נתן.',
    ],
    hold: 16000,
    widget: {
      type: 'cake',
      candles: 3,
      hint: 'כבי את הנרות ותביעי משאלה',
      mic: '🎤  לכבות בנשיפה',
      wish: 'מזל טוב! 🎉',
    },
  },
  {
    date: '2027-01-15',
    chapter: 'אפילוג',
    dateLabel: 'מכאן והלאה',
    title: 'מפת הדרכים לעתיד',
    emoji: '🗺️',
    image: 'img/07-future.jpg',
    text: ['העונה הבאה כבר בכתיבה.'],
    widget: {
      type: 'roadmap',
      steps: [
        { emoji: '🏠', label: 'בית משלנו' },
        { emoji: '💒', label: 'חתונה מטורפת' },
        { emoji: '👶', label: 'ילד/ה' },
      ],
      end: 'עונה 3 · בקרוב',
    },
  },
];

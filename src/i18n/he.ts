export const he = {
  // Auth
  login: 'כניסה',
  register: 'הרשמה',
  email: 'דוא"ל',
  password: 'סיסמה',
  username: 'שם משתמש',
  loginBtn: 'כנס',
  registerBtn: 'הירשם',
  logout: 'יציאה',
  loginError: 'שם משתמש או סיסמה שגויים',
  notAllowed: 'הדוא"ל שלך אינו מורשה להירשם לליגה',
  alreadyHaveAccount: 'כבר יש לי חשבון',
  noAccount: 'אין לי חשבון',

  // Navigation
  dashboard: 'ראשי',
  leaderboard: 'טבלה',
  predictionsFeed: 'ניחושים',
  goldenBets: 'הימורי זהב',
  admin: 'ניהול',

  // Dashboard / Matches
  nextMatches: 'משחקים קרובים',
  myPredictions: 'הניחושים שלי',
  locked: 'נעול',
  submit: 'שמור ניחוש',
  saved: 'נשמר!',
  noUpcoming: 'אין משחקים קרובים',

  // Match stages
  GROUP: 'בתים',
  R32: 'שלב ה-32',
  R16: 'שמינית גמר',
  QF: 'רבע גמר',
  SF: 'חצי גמר',
  THIRD: 'מקום שלישי',
  FINAL: 'גמר',

  // Match center
  predictions: 'ניחושים',
  allPredictions: 'ניחושי כל הקבוצה',
  qualifier: 'עולה הלאה',

  // Leaderboard
  rank: 'מקום',
  player: 'שחקן',
  points: 'נקודות',

  // Golden bets
  goldenBetsTitle: 'הימורי זהב',
  goldenBetsDesc: 'ניחוש פעם אחת — לפני תחילת הטורניר',
  tournamentWinner: 'אלוף הטורניר',
  topScorer: 'מלך השערים',
  saveGoldenBets: 'שמור הימורי זהב',
  goldenBetsClosed: 'ההגשה נסגרה — הטורניר התחיל',

  // Admin
  adminTitle: 'פאנל ניהול',
  overrideScore: 'עדכון תוצאה ידנית',
  recalculate: 'חשב מחדש נקודות',
  teamA: 'קבוצה א׳',
  teamB: 'קבוצה ב׳',
  scoreA: 'שערים א׳',
  scoreB: 'שערים ב׳',
  save: 'שמור',

  // Common
  loading: 'טוען...',
  error: 'שגיאה',
  vs: 'נגד',
}

export type HebKey = keyof typeof he

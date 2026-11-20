import fs from 'fs';

const d = JSON.parse(fs.readFileSync('/tmp/egypt_parsed_enriched.json', 'utf8'));
const { parsed, enToQid, arToInfo, wdData } = d;

const NAT_MAP = {
  EGY: 'Egypt', EGYPT: 'Egypt',
  MAR: 'Morocco', MOROCCO: 'Morocco',
  ALG: 'Algeria', ALGERIA: 'Algeria',
  TUN: 'Tunisia', TUNISIA: 'Tunisia',
  NGA: 'Nigeria', NGR: 'Nigeria', NIGERIA: 'Nigeria',
  GHA: 'Ghana', GHANA: 'Ghana',
  CIV: 'Ivory Coast',
  SEN: 'Senegal', SENEGAL: 'Senegal',
  MLI: 'Mali', MALI: 'Mali',
  BFA: 'Burkina Faso',
  BEN: 'Benin',
  CMR: 'Cameroon', CAMEROON: 'Cameroon',
  ANG: 'Angola',
  UGA: 'Uganda', UGANDA: 'Uganda',
  RWA: 'Rwanda',
  KEN: 'Kenya',
  PLE: 'Palestine', PSE: 'Palestine', PALESTINE: 'Palestine',
  JOR: 'Jordan', JORDAN: 'Jordan',
  IRQ: 'Iraq', IRAQ: 'Iraq',
  SVN: 'Slovenia',
  BRA: 'Brazil', BRAZIL: 'Brazil',
  COL: 'Colombia',
  NED: 'Netherlands', NETHERLANDS: 'Netherlands',
  FRA: 'France', FRANCE: 'France',
  SLE: 'Sierra Leone',
  LBR: 'Liberia', LIBERIA: 'Liberia',
  MRT: 'Mauritania', MAURITANIA: 'Mauritania',
  TAN: 'Tanzania',
  ZAM: 'Zambia',
  GUI: 'Guinea',
  RSA: 'South Africa',
  LBN: 'Lebanon',
  CAF: 'Central African Republic',
  BDI: 'Burundi',
  GAB: 'Gabon', GABON: 'Gabon',
  ERI: 'Eritrea',
  TOG: 'Togo',
  QAT: 'Qatar',
  COD: 'DR Congo',
};

function normNat(raw) {
  const k = (raw || 'EGY').trim().toUpperCase();
  return NAT_MAP[k] || 'Egypt';
}

function cleanPlayerName(raw) {
  let s = (raw || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\(on loan[^)]*\)/gi, '')
    .replace(/\(captain\)/gi, '')
    .replace(/\(vice-captain\)/gi, '')
    .replace(/\(footballer[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Remove stray quotes like "Shika" -> Shika if needed, keep clean quotes out
  s = s.replace(/[""]/g, '').replace(/'+/g, "'").trim();
  return s;
}

function mapWdPosition(posIds, fallbackPos) {
  if (posIds && posIds.length) {
    if (posIds.includes('Q201330')) return 'GK';
    if (posIds.includes('Q268258')) return 'CB';
    if (posIds.includes('Q90173132')) return 'RB';
    if (posIds.includes('Q18691898')) return 'CDM';
    if (posIds.includes('Q90326494')) return 'CAM';
    if (posIds.includes('Q6008848')) return 'CM';
    if (posIds.includes('Q11681748') || posIds.includes('Q2827965')) return fallbackPos === 'FW' ? 'RW' : 'RM';
    if (posIds.includes('Q9731197')) return 'ST';
    if (posIds.includes('Q336286')) return 'CB';
    if (posIds.includes('Q193592')) return 'CM';
    if (posIds.includes('Q280658') || posIds.includes('Q3446915')) return 'ST';
  }
  const f = (fallbackPos || 'MF').toUpperCase();
  if (f === 'GK' || f === 'حارس') return 'GK';
  if (f === 'DF' || f === 'دفاع' || f === 'مدافع') return 'DF';
  if (f === 'MF' || f === 'وسط') return 'MF';
  if (f === 'FW' || f === 'هجوم' || f === 'مهاجم') return 'FW';
  return 'MF';
}

// Balance generic DF / MF / FW tokens cleanly across specific roles
function assignSpecificPositions(players) {
  const dfRoles = ['CB', 'CB', 'LB', 'RB', 'CB', 'LB', 'RB', 'CB'];
  const mfRoles = ['CM', 'CDM', 'CAM', 'CM', 'LM', 'RM', 'CDM', 'CM'];
  const fwRoles = ['ST', 'RW', 'LW', 'ST', 'ST', 'RW', 'LW', 'ST'];
  let dIdx = 0, mIdx = 0, fIdx = 0;
  for (const p of players) {
    if (p.posDetail === 'DF') {
      p.posDetail = dfRoles[dIdx++ % dfRoles.length];
    } else if (p.posDetail === 'MF') {
      p.posDetail = mfRoles[mIdx++ % mfRoles.length];
    } else if (p.posDetail === 'FW') {
      p.posDetail = fwRoles[fIdx++ % fwRoles.length];
    }
  }
}

function makeStats(posDetail, ovr) {
  const clamp = (n) => Math.max(25, Math.min(92, Math.round(n)));
  if (posDetail === 'GK') {
    return [clamp(ovr - 26), clamp(ovr - 36), clamp(ovr - 8), clamp(ovr - 3), clamp(ovr - 28), clamp(ovr - 5)];
  }
  if (posDetail === 'CB') {
    return [clamp(ovr - 3), clamp(ovr - 24), clamp(ovr - 9), clamp(ovr - 8), clamp(ovr + 1), clamp(ovr + 2)];
  }
  if (posDetail === 'LB' || posDetail === 'RB') {
    return [clamp(ovr + 4), clamp(ovr - 17), clamp(ovr - 4), clamp(ovr - 3), clamp(ovr + 1), clamp(ovr - 3)];
  }
  if (posDetail === 'CDM') {
    return [clamp(ovr - 5), clamp(ovr - 11), clamp(ovr - 1), clamp(ovr - 3), clamp(ovr + 1), clamp(ovr + 2)];
  }
  if (posDetail === 'CM') {
    return [clamp(ovr - 3), clamp(ovr - 4), clamp(ovr + 1), clamp(ovr + 2), clamp(ovr - 9), clamp(ovr - 5)];
  }
  if (posDetail === 'CAM') {
    return [clamp(ovr + 3), clamp(ovr - 4), clamp(ovr + 1), clamp(ovr + 2), clamp(ovr - 21), clamp(ovr - 6)];
  }
  if (posDetail === 'LM' || posDetail === 'RM' || posDetail === 'LW' || posDetail === 'RW') {
    return [clamp(ovr + 7), clamp(ovr - 2), clamp(ovr - 3), clamp(ovr + 3), clamp(ovr - 35), clamp(ovr - 8)];
  }
  // ST
  return [clamp(ovr + 3), clamp(ovr + 1), clamp(ovr - 9), clamp(ovr), clamp(ovr - 36), clamp(ovr - 2)];
}

function validDob(dob) {
  if (!dob || typeof dob !== 'string') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, day] = dob.split('-').map(Number);
  if (y < 1978 || y > 2010 || m < 1 || m > 12 || day < 1 || day > 31) return null;
  return dob;
}

function ageFromDob(dob, fallbackAge) {
  if (!dob) return fallbackAge;
  const [y, m, day] = dob.split('-').map(Number);
  const now = new Date('2026-11-15');
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < day)) age--;
  return Math.max(16, Math.min(44, age));
}

// 13 Domestic Egypt National Team players — exact unified identities & attributes
const NT_PLAYERS_BY_CLUB = {
  'fc27-743': [
    { eaId: 'tm-661455', name: 'Oufa Shobeir', posDetail: 'GK', ovr: 78, nat: 'Egypt', dob: '2000-05-15', age: 26, stats: [45,36,66,74,46,70], no: 31, aliases: ['mostafa shobeir', 'oufa shobeir'] },
    { eaId: 'tm-734542', name: 'Marwan Ateya', posDetail: 'CB', ovr: 78, nat: 'Egypt', dob: '1998-08-01', age: 28, stats: [75,50,68,69,79,80], no: 13, aliases: ['marwan attia', 'marwan ateya'] },
    { eaId: 'tm-343974', name: 'Mohamed Hany', posDetail: 'RB', ovr: 76, nat: 'Egypt', dob: '1996-02-02', age: 30, stats: [80,58,71,73,77,72], no: 30, aliases: ['mohamed hany'], isViceCaptain: true },
    { eaId: 'tm-320722', name: 'Zizo', posDetail: 'RW', ovr: 78, nat: 'Egypt', dob: '1996-01-10', age: 30, stats: [85,76,75,81,40,69], no: 25, aliases: ['zizo', 'ahmed sayed zizo', 'ahmed sayed'] },
  ],
  'fc27-744': [
    { eaId: 'tm-479682', name: 'Mohanad Lasheen', posDetail: 'CB', ovr: 78, nat: 'Egypt', dob: '1996-05-29', age: 30, stats: [75,50,68,69,79,80], no: 14, aliases: ['mohanad lasheen'] },
    { eaId: 'tm-476625', name: 'Mahmoud Marei', posDetail: 'CB', ovr: 77, nat: 'Egypt', dob: '1998-04-24', age: 28, stats: [74,49,67,68,78,79], no: 3, aliases: ['mahmoud marei'] },
    { eaId: 'tm-333004', name: 'Karim Hafez', posDetail: 'LB', ovr: 76, nat: 'Egypt', dob: '1996-03-12', age: 30, stats: [80,58,71,73,77,72], no: 29, aliases: ['karim hafez'] },
    { eaId: 'tm-729390', name: 'Mahmoud Saber', posDetail: 'CAM', ovr: 77, nat: 'Egypt', dob: '2001-07-30', age: 25, stats: [81,73,78,79,55,71], no: 8, aliases: ['mahmoud saber'] },
    { eaId: 'tm-355593', name: 'Nasser Maher', posDetail: 'CAM', ovr: 77, nat: 'Egypt', dob: '1997-02-08', age: 29, stats: [81,73,78,79,55,71], no: 27, aliases: ['nasser maher'] },
  ],
  'fc27-745': [
    { eaId: 'tm-465966', name: 'Ahmed Fatouh', posDetail: 'LB', ovr: 76, nat: 'Egypt', dob: '1998-03-22', age: 28, stats: [80,58,71,73,77,72], no: 13, aliases: ['ahmed abou el fotouh', 'ahmed fatouh'] },
    { eaId: 'tm-308526', name: 'Mahmoud El Wensh', posDetail: 'CB', ovr: 75, nat: 'Egypt', dob: '1995-06-01', age: 31, stats: [72,47,65,66,76,77], no: 28, aliases: ['mahmoud hamdy', 'mahmoud el wensh'], isViceCaptain: true },
    { eaId: 'tm-731666', name: 'Mohamed Shehata', posDetail: 'CM', ovr: 77, nat: 'Egypt', dob: '2001-02-08', age: 25, stats: [74,73,78,79,68,71], no: 17, aliases: ['mohamed shehata'] },
  ],
  'fc27-746': [
    { eaId: 'tm-1307898', name: 'Mohamed Alaa', posDetail: 'GK', ovr: 76, nat: 'Egypt', dob: '1999-09-01', age: 27, stats: [45,34,64,72,44,68], no: 26, aliases: ['mohamed alaa'] },
  ],
};

// Curated TM 2026/27 & Enriched Squads for Clubs Without Full Enwiki {{Fs player}} Tables
const MANUAL_SQUADS = {
  // Smouha SC (Transfermarkt 2026/27 + resolved arwiki captains/veterans)
  'fc27-754': [
    { name: 'Ahmed Mayhoub', posDetail: 'GK', nat: 'Egypt', no: 1, isCaptain: true },
    { name: 'Hussein Taimour', posDetail: 'GK', nat: 'Egypt', no: 16 },
    { name: 'Mohamed Haidar', posDetail: 'GK', nat: 'Egypt', no: 33 },
    { name: 'Mohamed Ragab', posDetail: 'CB', nat: 'Egypt', no: 5 },
    { name: 'Ahmed Abdelrasoul', posDetail: 'CB', nat: 'Egypt', no: 4 },
    { name: 'Omar Mohsen', posDetail: 'CB', nat: 'Egypt', no: 6 },
    { name: 'Clement Niyigena', posDetail: 'CB', nat: 'Rwanda', no: 15 },
    { name: 'Mohamed Desouki', posDetail: 'LB', nat: 'Egypt', no: 21 },
    { name: 'Abdelrahman Amer', posDetail: 'LB', nat: 'Egypt', no: 13 },
    { name: 'Ali Lala', posDetail: 'RB', nat: 'Egypt', no: 2 },
    { name: 'Hesham Hafez', posDetail: 'RB', nat: 'Egypt', no: 24 },
    { name: 'Attidjikou Samadou', posDetail: 'CDM', nat: 'Benin', no: 14 },
    { name: 'Mohamed Adel', posDetail: 'CDM', nat: 'Egypt', no: 8 },
    { name: 'Khaled El Ghandour', posDetail: 'CM', nat: 'Egypt', no: 10, isViceCaptain: true },
    { name: 'Samir Fekri', posDetail: 'CM', nat: 'Egypt', no: 7 },
    { name: 'Kone Mohamed', posDetail: 'CM', nat: 'Ivory Coast', no: 18 },
    { name: 'Ahmed Ali Amin', posDetail: 'CM', nat: 'Egypt', no: 22 },
    { name: 'Ahmed Ehab', posDetail: 'CAM', nat: 'Egypt', no: 19 },
    { name: 'Mohamed Abdelsamia', posDetail: 'CAM', nat: 'Egypt', no: 20 },
    { name: 'Stephen Amankona', posDetail: 'LW', nat: 'Ghana', no: 11 },
    { name: 'Makarona', posDetail: 'RW', nat: 'Egypt', no: 17 },
    { name: 'Pape Badji', posDetail: 'ST', nat: 'Senegal', no: 9 },
    { name: 'Fady Farid', posDetail: 'ST', nat: 'Egypt', no: 27 },
    { name: 'Hossam Ashraf', posDetail: 'ST', nat: 'Egypt', no: 99 },
    { name: 'Gabriel Chukwudi', posDetail: 'ST', nat: 'Nigeria', no: 29 },
    { name: 'Emmanuel Nweke', posDetail: 'ST', nat: 'Nigeria', no: 30 },
  ],
  // Abou Qir Fertilizers SC (Transfermarkt 2026/27 full positional roster)
  'fc27-762': [
    { name: 'Mohamed Shika', posDetail: 'GK', nat: 'Egypt', no: 1, isCaptain: true },
    { name: 'Mahmoud Genesh', posDetail: 'GK', nat: 'Egypt', no: 16 },
    { name: 'El Sayed El Sawy', posDetail: 'GK', nat: 'Egypt', no: 23 },
    { name: 'Mohamed Dabash', posDetail: 'CB', nat: 'Egypt', no: 5, isViceCaptain: true },
    { name: 'Bashar Al-Shobaki', posDetail: 'CB', nat: 'Egypt', no: 4 },
    { name: 'Eyad Salah', posDetail: 'CB', nat: 'Egypt', no: 6 },
    { name: 'Ahmed Fayez', posDetail: 'LB', nat: 'Egypt', no: 3 },
    { name: 'Gaber Kamel', posDetail: 'RB', nat: 'Egypt', no: 2 },
    { name: 'Islam Ashraf', posDetail: 'LB', nat: 'Egypt', no: 21 },
    { name: 'Mohamed Alaa El Din', posDetail: 'RB', nat: 'Egypt', no: 12 },
    { name: 'Ramez Milad', posDetail: 'CDM', nat: 'Egypt', no: 14 },
    { name: 'Emad Hamdi', posDetail: 'CDM', nat: 'Egypt', no: 8 },
    { name: 'Seif El Agouz', posDetail: 'CDM', nat: 'Egypt', no: 15 },
    { name: 'Youssef Hamdi', posDetail: 'CM', nat: 'Egypt', no: 17 },
    { name: 'Glid Otanga', posDetail: 'CM', nat: 'Congo', no: 18 },
    { name: 'Omar Ibrahim', posDetail: 'CM', nat: 'Egypt', no: 22 },
    { name: 'Emad Fathi', posDetail: 'CM', nat: 'Egypt', no: 19 },
    { name: 'Ziad Shaker', posDetail: 'CM', nat: 'Egypt', no: 24 },
    { name: 'Quaison Kofi Gideon', posDetail: 'CAM', nat: 'Ghana', no: 10 },
    { name: 'Ziad Farag', posDetail: 'CAM', nat: 'Egypt', no: 20 },
    { name: 'Prince Tweneboah', posDetail: 'LW', nat: 'Ghana', no: 11 },
    { name: 'Favour Akem', posDetail: 'LW', nat: 'Nigeria', no: 27 },
    { name: 'Mohamed Camara', posDetail: 'LW', nat: 'Guinea', no: 29 },
    { name: 'Mostafa Shehata', posDetail: 'RW', nat: 'Egypt', no: 7 },
    { name: 'Ali Hussein', posDetail: 'ST', nat: 'Egypt', no: 9 },
    { name: 'Mahmoud Abou-Gouda', posDetail: 'ST', nat: 'Egypt', no: 30 },
    { name: 'Hesham Ramadan', posDetail: 'ST', nat: 'Egypt', no: 25 },
    { name: 'Abdelrahman El Desouki', posDetail: 'ST', nat: 'Egypt', no: 32 },
  ],
  // Raya SC (Transfermarkt verified squad)
  'fc27-776': [
    { name: 'Mohamed Mokhtar', posDetail: 'GK', nat: 'Egypt', no: 1, isCaptain: true },
    { name: 'Ahmed Hamed', posDetail: 'GK', nat: 'Egypt', no: 16 },
    { name: 'Mohamed Hussein', posDetail: 'CB', nat: 'Egypt', no: 4, isViceCaptain: true },
    { name: 'Ahmed Menam', posDetail: 'CB', nat: 'Egypt', no: 5 },
    { name: 'Mahmoud El Malek', posDetail: 'CB', nat: 'Egypt', no: 6 },
    { name: 'Mohamed El Koumy', posDetail: 'LB', nat: 'Egypt', no: 3 },
    { name: 'Mohamed El Gendy', posDetail: 'RB', nat: 'Egypt', no: 2 },
    { name: 'Ali Abbas', posDetail: 'CDM', nat: 'Egypt', no: 14 },
    { name: 'Karim Khamis', posDetail: 'CM', nat: 'Egypt', no: 8 },
    { name: 'Ali El Masry', posDetail: 'CM', nat: 'Egypt', no: 15 },
    { name: 'Youssef Mohamed', posDetail: 'CAM', nat: 'Egypt', no: 10 },
    { name: 'Belal Zakaria', posDetail: 'CAM', nat: 'Egypt', no: 17 },
    { name: 'Mohamed Hamed', posDetail: 'CAM', nat: 'Egypt', no: 19 },
    { name: 'Mahmoud Belia', posDetail: 'CM', nat: 'Egypt', no: 20 },
    { name: 'Hankora', posDetail: 'RM', nat: 'Egypt', no: 7 },
    { name: 'Abdelrahman Gondaya', posDetail: 'LW', nat: 'Egypt', no: 11 },
    { name: 'Abdallah Bahr', posDetail: 'ST', nat: 'Egypt', no: 9 },
    { name: 'Gaber Salem', posDetail: 'ST', nat: 'Egypt', no: 18 },
    { name: 'Ahmed Wael', posDetail: 'ST', nat: 'Egypt', no: 22 },
    { name: 'Bebo', posDetail: 'RW', nat: 'Egypt', no: 27 },
  ],
  // El Sekka El Hadid SC (Transfermarkt verified 2025/26-26/27 squad)
  'fc27-777': [
    { name: 'Hossam Hasabo', posDetail: 'GK', nat: 'Egypt', no: 1, isCaptain: true },
    { name: 'Youssef Rahoma', posDetail: 'GK', nat: 'Egypt', no: 16 },
    { name: 'Momen Mohamed', posDetail: 'GK', nat: 'Egypt', no: 23 },
    { name: 'Mahmoud El Halawani', posDetail: 'CB', nat: 'Egypt', no: 4 },
    { name: 'Mohamed Gebs', posDetail: 'CB', nat: 'Egypt', no: 5 },
    { name: 'Saidou', posDetail: 'CB', nat: 'Egypt', no: 6 },
    { name: 'Hamdi Marcelo', posDetail: 'LB', nat: 'Egypt', no: 3 },
    { name: 'Islam Adel', posDetail: 'LB', nat: 'Egypt', no: 13 },
    { name: 'Mohamed Negm', posDetail: 'LB', nat: 'Egypt', no: 21 },
    { name: 'Ahmed Fawzy', posDetail: 'RB', nat: 'Egypt', no: 2 },
    { name: 'Ziad Ashraf', posDetail: 'RB', nat: 'Egypt', no: 24 },
    { name: 'Abdelrahman Ashri', posDetail: 'CDM', nat: 'Egypt', no: 14 },
    { name: 'Ahmed Adel', posDetail: 'CDM', nat: 'Egypt', no: 15 },
    { name: 'Naser Naser', posDetail: 'CDM', nat: 'Egypt', no: 8 },
    { name: 'Youssef Magdy', posDetail: 'CM', nat: 'Egypt', no: 17, isViceCaptain: true },
    { name: 'Mohamed Osama', posDetail: 'CM', nat: 'Egypt', no: 18 },
    { name: 'Ahmed Said', posDetail: 'CM', nat: 'Egypt', no: 19 },
    { name: 'Mohamed Khalifa', posDetail: 'CM', nat: 'Egypt', no: 20 },
    { name: 'Omar Barakat', posDetail: 'CM', nat: 'Egypt', no: 22 },
    { name: 'Walid Adel', posDetail: 'CAM', nat: 'Egypt', no: 10 },
    { name: 'Ahmed Fathi', posDetail: 'CAM', nat: 'Egypt', no: 25 },
    { name: 'Ahmed Essam', posDetail: 'LW', nat: 'Egypt', no: 11 },
    { name: 'Erick Silva', posDetail: 'ST', nat: 'Brazil', no: 9 },
  ],
};

// Transliterations for unresolved arwiki names on El Entag El Harby + Tanta SC
const AR_NAME_TRANSLIT = {
  'السيد الشبراوي': 'El Sayed El Shabrawy',
  'علاء سلامة': 'Alaa Salama',
  'مامادو نياس': 'Mamadou Niass',
  'محمد عادل': 'Mohamed Adel',
  'محمد شوقي غريب': 'Mohamed Shawky Gharib',
  'محمد الشبيني': 'Mohamed El Shebiny',
  'محمد فييرا': 'Mohamed Vieira',
  'محمود عادل': 'Mahmoud Adel',
  'محمد عصام الغندور': 'Mohamed Essam El Ghandour',
  'أحمد الألفي': 'Ahmed El Alfi',
  'إسلام فؤاد': 'Islam Fouad',
  'تاديو لوانجا': 'Taddeo Lwanga',
  'دينيس تيتيه': 'Dennis Tetteh',
  'الحسن ضيوف': 'El Hadji Diouf',
  'جون أيفيري': 'John Avire',
  'وليد عادل': 'Walid Adel',
  'أحمد فهمي': 'Ahmed Fahmy',
  'أحمد قطاوي': 'Ahmed Qattawy',
  'محمد الشاذلي': 'Mohamed El Shazly',
  'مصطفى أمين': 'Mostafa Amin',
  'إيهاب سمير': 'Ihab Samir',
  'أحمد الشناوي': 'Ahmed El Shenawy',
  'علي فرج': 'Ali Farag',
  'هشام شعبان': 'Hesham Shaaban',
  'محمد ديدا': 'Mohamed Dida',
  'عبد الرحمن خالق الدح': 'Abdelrahman El Dah',
  'ماريو برنارد': 'Mario Bernard',
  'محمد أسعد': 'Mohamed Asaad',
  'علاء البدرى': 'Alaa El Badry',
  'فتحي مبروك': 'Fathy Mabrouk',
  'ايريك جوزيف': 'Eric Joseph',
  'حسين حلمى': 'Hussein Helmy',
  'محمد فتحي': 'Mohamed Fathy',
  'محمد حسام': 'Mohamed Hossam',
  'سليمان عبد ربه': 'Soliman Abd Rabo',
  'محمود مسعود': 'Mahmoud Masoud',
  'محمد جمال ميدو': 'Mohamed Gamal Mido',
};

const CLUB_DEFS = [
  // EGY1 (All 20)
  { id: 'fc27-743', name: 'Al Ahly FC', shortName: 'Al Ahly', code: 'AHL', tmId: 7, league: 'Egyptian Premier League', pColor: '#CC0000', sColor: '#FFFFFF', stadium: 'Cairo International Stadium', style: 'Relentless Attacking Press', ovr: 79, wikiKey: 'Al Ahly SC', rank: 83, pts: 1650, mgr: ['Hussein Ammouta', 'Morocco', '2026-07-01', '1969-10-24'] },
  { id: 'fc27-744', name: 'Pyramids FC', shortName: 'Pyramids', code: 'PYR', tmId: 44664, league: 'Egyptian Premier League', pColor: '#1D4ED8', sColor: '#FFFFFF', stadium: '30 June Stadium', style: 'Positional Control & Press', ovr: 80, wikiKey: 'Pyramids FC', rank: 66, pts: 1679, mgr: ['Rhulani Mokwena', 'South Africa', '2026-07-17', '1987-01-08'] },
  { id: 'fc27-745', name: 'Zamalek SC', shortName: 'Zamalek', code: 'ZAM', tmId: 664, league: 'Egyptian Premier League', pColor: '#FFFFFF', sColor: '#D90429', stadium: 'Cairo International Stadium', style: 'Technical Wing Play', ovr: 77, wikiKey: 'Zamalek SC', rank: 145, pts: 1580, mgr: ['Motamed Gamal', 'Egypt', '2026-07-29', '1973-08-02'] },
  { id: 'fc27-746', name: 'Ceramica Cleopatra FC', shortName: 'Ceramica', code: 'CER', tmId: 57439, league: 'Egyptian Premier League', pColor: '#880000', sColor: '#000000', stadium: 'Osman Ahmed Osman Stadium', style: 'High-Tempo Transition', ovr: 75, wikiKey: 'Ceramica Cleopatra FC', rank: 260, pts: 1510, mgr: ['Ali Maher', 'Egypt', '2025-02-24', '1973-12-03'] },
  { id: 'fc27-747', name: 'Al Masry SC', shortName: 'Al Masry', code: 'MAS', tmId: 9094, league: 'Egyptian Premier League', pColor: '#00924F', sColor: '#FFFFFF', stadium: 'Suez Stadium', style: 'Structured Counter & Press', ovr: 75, wikiKey: 'Al Masry SC', rank: 295, pts: 1495, mgr: ['Nabil Kouki', 'Tunisia', '2025-07-01', '1970-03-09'] },
  { id: 'fc27-748', name: 'National Bank of Egypt SC', shortName: 'Bank El Ahly', code: 'NBE', tmId: 62448, league: 'Egyptian Premier League', pColor: '#F97316', sColor: '#1E293B', stadium: 'Cairo International Stadium', style: 'Organized Midfield Block', ovr: 73, wikiKey: 'National Bank of Egypt SC', rank: 420, pts: 1450, mgr: ['Ayman El Ramady', 'Egypt', '2025-08-31', '1965-03-01'] },
  { id: 'fc27-749', name: 'ZED FC', shortName: 'ZED FC', code: 'ZED', tmId: 47010, league: 'Egyptian Premier League', pColor: '#0F172A', sColor: '#10B981', stadium: 'Cairo International Stadium', style: 'Progressive Build-Up', ovr: 73, wikiKey: 'ZED FC', rank: 450, pts: 1435, mgr: ['Mohamed Shawky', 'Egypt', '2025-07-01', '1981-10-05'] },
  { id: 'fc27-750', name: 'ENPPI SC', shortName: 'ENPPI', code: 'ENP', tmId: 9218, league: 'Egyptian Premier League', pColor: '#0369A1', sColor: '#0F172A', stadium: 'Petrosport Stadium', style: 'Youth-Driven Direct Play', ovr: 72, wikiKey: 'ENPPI SC', rank: 520, pts: 1410, mgr: ['Mohamed Barakat', 'Egypt', '2026-05-16', '1976-11-20'] },
  { id: 'fc27-751', name: 'Wadi Degla SC', shortName: 'Wadi Degla', code: 'WDG', tmId: 18234, league: 'Egyptian Premier League', pColor: '#EAB308', sColor: '#111827', stadium: 'Petrosport Stadium', style: 'Possession & Width', ovr: 71, wikiKey: 'Wadi Degla SC', rank: 610, pts: 1385, mgr: ['Mostafa Shebeita', 'Egypt', '2026-09-20', '1986-05-10'] },
  { id: 'fc27-752', name: 'Ittihad Alexandria SC', shortName: 'Ittihad Alex', code: 'ITH', tmId: 3963, league: 'Egyptian Premier League', pColor: '#166534', sColor: '#FFFFFF', stadium: 'Alexandria Stadium', style: 'Direct Wing Counter', ovr: 72, wikiKey: 'Al Ittihad Alexandria Club', rank: 560, pts: 1395, mgr: ['Hamza El Gamal', 'Egypt', '2025-07-01', '1970-03-02'] },
  { id: 'fc27-753', name: 'Al Mokawloon Al Arab SC', shortName: 'Al Mokawloon', code: 'MOK', tmId: 3369, league: 'Egyptian Premier League', pColor: '#EAB308', sColor: '#18181B', stadium: 'Osman Ahmed Osman Stadium', style: 'Compact Block & Counter', ovr: 71, wikiKey: 'Al Mokawloon Al Arab SC', rank: 640, pts: 1375, mgr: ['Samy Komsan', 'Egypt', '2025-10-05', '1976-03-06'] },
  { id: 'fc27-754', name: 'Smouha SC', shortName: 'Smouha', code: 'SMO', tmId: 23387, league: 'Egyptian Premier League', pColor: '#1D4ED8', sColor: '#FFFFFF', stadium: 'Borg El Arab Stadium', style: 'Balanced Counter-Attack', ovr: 72, manualKey: 'fc27-754', rank: 540, pts: 1400, mgr: ['Ahmed Abdelaziz', 'Egypt', '2025-07-01', '1978-10-23'] },
  { id: 'fc27-755', name: 'Petrojet SC', shortName: 'Petrojet', code: 'PET', tmId: 10957, league: 'Egyptian Premier League', pColor: '#041A49', sColor: '#DC2626', stadium: 'Cairo Military Academy Stadium', style: 'Vertical Transition', ovr: 72, wikiKey: 'Petrojet SC', rank: 580, pts: 1390, mgr: ['Sayed Eid', 'Egypt', '2022-11-25', '1969-06-27'] },
  { id: 'fc27-756', name: 'Modern Sport FC', shortName: 'Modern Sport', code: 'MOD', tmId: 68770, league: 'Egyptian Premier League', pColor: '#B91C1C', sColor: '#111827', stadium: 'Al Salam Stadium', style: 'Structured Mid-Block', ovr: 73, wikiKey: 'Modern Sport FC', rank: 480, pts: 1425, mgr: ['Mohamed Amine Benhachem', 'Morocco', '2025-07-01', '1975-06-20'] },
  { id: 'fc27-757', name: 'Ghazl El Mahalla SC', shortName: 'Ghazl Mahalla', code: 'GMH', tmId: 13446, league: 'Egyptian Premier League', pColor: '#0EA5E9', sColor: '#0F172A', stadium: 'Ghazl El Mahalla Stadium', style: 'Physical Defensive Shape', ovr: 70, wikiKey: 'Ghazl El Mahalla SC', rank: 720, pts: 1355, mgr: ['Khaled Galal', 'Egypt', '2025-07-01', '1967-04-12'] },
  { id: 'fc27-758', name: 'El Qanah FC', shortName: 'El Qanah', code: 'QAN', tmId: 24297, league: 'Egyptian Premier League', pColor: '#1D4ED8', sColor: '#FACC15', stadium: 'Suez Canal Stadium', style: 'Disciplined Counter', ovr: 69, wikiKey: 'El Qanah FC', rank: 860, pts: 1320, mgr: ['Abdelnaser Mohamed', 'Egypt', '2024-12-20', '1970-10-01'] },
  { id: 'fc27-759', name: "Tala'ea El Gaish SC", shortName: 'El Gaish', code: 'TGS', tmId: 9219, league: 'Egyptian Premier League', pColor: '#DC2626', sColor: '#111827', stadium: 'Gehaz El Reyada Stadium', style: 'Resilient Low-Block', ovr: 71, wikiKey: "Tala'ea El Gaish SC", rank: 670, pts: 1365, mgr: ['Gomaa Mashhour', 'Egypt', '2025-07-01', '1978-03-05'] },
  { id: 'fc27-760', name: 'El Gouna FC', shortName: 'El Gouna', code: 'GOU', tmId: 20572, league: 'Egyptian Premier League', pColor: '#0F172A', sColor: '#F59E0B', stadium: 'Khaled Bichara Stadium', style: 'Quick Break & Width', ovr: 70, wikiKey: 'El Gouna FC', rank: 760, pts: 1345, mgr: ['Alaa Abdelaal', 'Egypt', '2026-10-23', '1965-04-04'] },
  { id: 'fc27-761', name: 'Asyut Petroleum SC', shortName: 'Petrol Asyut', code: 'ASY', tmId: 16216, league: 'Egyptian Premier League', pColor: '#048341', sColor: '#FFFFFF', stadium: 'Asiut University Stadium', style: 'Pragmatic Mid-Block', ovr: 68, wikiKey: 'Asyut Petroleum SC', rank: 950, pts: 1300, mgr: ['Reda Shehata', 'Egypt', '2026-10-23', '1981-01-24'] },
  { id: 'fc27-762', name: 'Abou Qir Fertilizers SC', shortName: 'Abou Qir', code: 'ABQ', tmId: 39575, league: 'Egyptian Premier League', pColor: '#0284C7', sColor: '#FFFFFF', stadium: 'Alexandria Stadium', style: 'Compact & Direct', ovr: 68, manualKey: 'fc27-762', rank: 990, pts: 1290, mgr: ['Magdy Abdelaaty', 'Egypt', '2025-07-01', '1977-01-03'] },

  // EGY2 (Egyptian Second Division A — 15 Transfermarkt clubs with >= 11 verified players)
  { id: 'fc27-763', name: 'Ismaily SC', shortName: 'Ismaily', code: 'ISM', tmId: 3595, league: 'Egyptian Second Division A', pColor: '#FACC15', sColor: '#1D4ED8', stadium: 'Ismailia Stadium', style: 'Fluid Short Passing', ovr: 69, wikiKey: 'Ismaily SC', rank: 890, pts: 1315, mgr: ['Abdel Hamid Bassiouny', 'Egypt', '2026-08-31', '1972-03-12'] },
  { id: 'fc27-764', name: 'Pharco FC', shortName: 'Pharco', code: 'PHA', tmId: 47058, league: 'Egyptian Second Division A', pColor: '#EA580C', sColor: '#111827', stadium: 'Haras El Hodoud Stadium', style: 'Structured Mid-Block', ovr: 69, wikiKey: 'Pharco FC', rank: 910, pts: 1310, mgr: ['Tarek El Ashry', 'Egypt', '2025-07-01', '1964-11-24'] },
  { id: 'fc27-765', name: 'Haras El Hodoud SC', shortName: 'Haras Hodoud', code: 'HRS', tmId: 12093, league: 'Egyptian Second Division A', pColor: '#D2021D', sColor: '#111827', stadium: 'Haras El Hodoud Stadium', style: 'Disciplined Counter', ovr: 68, wikiKey: 'Haras El Hodoud SC', rank: 930, pts: 1305, mgr: ['Haytham Shaaban', 'Egypt', '2025-07-01', '1979-10-11'] },
  { id: 'fc27-766', name: 'Kahrabaa Ismailia SC', shortName: 'Kahrabaa Ism', code: 'KIS', tmId: 43316, league: 'Egyptian Second Division A', pColor: '#FACC15', sColor: '#1D4ED8', stadium: 'Kahrabaa Ismailia Stadium', style: 'High-Workrate Press', ovr: 67, wikiKey: 'Kahrabaa Ismailia SC', rank: 1080, pts: 1265, mgr: ['Koshary', 'Egypt', '2025-07-01', '1973-01-01'] },
  { id: 'fc27-767', name: 'El Dakhleya SC', shortName: 'El Dakhleya', code: 'DKH', tmId: 22707, league: 'Egyptian Second Division A', pColor: '#DC2626', sColor: '#1E293B', stadium: 'Police Academy Stadium', style: 'Compact Defensive Block', ovr: 66, wikiKey: 'El Dakhleya SC', rank: 1180, pts: 1240, mgr: ['Ahmed Eid Abdel Malek', 'Egypt', '2025-07-01', '1980-05-15'] },
  { id: 'fc27-768', name: 'Baladiyat El Mahalla SC', shortName: 'Baladiyat', code: 'BMH', tmId: 9093, league: 'Egyptian Second Division A', pColor: '#DC2626', sColor: '#FFFFFF', stadium: 'Ghazl El Mahalla Stadium', style: 'Direct Wing Transitions', ovr: 66, wikiKey: 'Baladiyat El Mahalla SC', rank: 1220, pts: 1230, mgr: ['Ahmed Abdelraouf', 'Egypt', '2025-08-01', '1986-04-12'] },
  { id: 'fc27-769', name: 'Tersana SC', shortName: 'Tersana', code: 'TER', tmId: 10765, league: 'Egyptian Second Division A', pColor: '#0032C2', sColor: '#FFFFFF', stadium: 'Mit Okba Stadium', style: 'Traditional Mid-Block', ovr: 66, wikiKey: 'Tersana SC', rank: 1250, pts: 1220, mgr: ['Hussein Shokry', 'Egypt', '2025-07-01', '1975-01-01'] },
  { id: 'fc27-770', name: 'Aswan SC', shortName: 'Aswan', code: 'ASW', tmId: 22507, league: 'Egyptian Second Division A', pColor: '#0032C2', sColor: '#FFFFFF', stadium: 'Aswan Stadium', style: 'Fast Counter-Attack', ovr: 65, wikiKey: 'Aswan SC', rank: 1290, pts: 1205, mgr: ['Mohamed Heshmat', 'Egypt', '2025-07-01', '1976-01-01'] },
  { id: 'fc27-771', name: 'We SC', shortName: 'We SC', code: 'WES', tmId: 13447, league: 'Egyptian Second Division A', pColor: '#7C3AED', sColor: '#FFFFFF', stadium: 'Telecom Egypt Club Stadium', style: 'Balanced Possession', ovr: 65, wikiKey: 'We SC', rank: 1320, pts: 1195, mgr: ['Aliyu Zubairu', 'Nigeria', '2025-07-01', '1964-03-02'] },
  { id: 'fc27-772', name: 'El Mansoura SC', shortName: 'El Mansoura', code: 'MAN', tmId: 19466, league: 'Egyptian Second Division A', pColor: '#FF5010', sColor: '#000000', stadium: 'El Mansoura Stadium', style: 'Direct Physical Play', ovr: 65, wikiKey: 'El Mansoura SC', rank: 1380, pts: 1180, mgr: ['Reda El Essawy', 'Egypt', '2025-07-01', '1965-05-21'] },
  { id: 'fc27-773', name: 'Suez SC', shortName: 'Suez SC', code: 'SUE', tmId: 24296, league: 'Egyptian Second Division A', pColor: '#094CA1', sColor: '#FFFFFF', stadium: 'Egyptian Army Stadium', style: 'Pragmatic Counter', ovr: 64, wikiKey: 'Suez SC', rank: 1440, pts: 1165, mgr: ['Mostafa Abdo', 'Egypt', '2025-07-01', '1977-01-01'] },
  { id: 'fc27-774', name: 'El Entag El Harby SC', shortName: 'El Entag', code: 'ENT', tmId: 23222, league: 'Egyptian Second Division A', pColor: '#FACC15', sColor: '#111827', stadium: 'Al Salam Stadium', style: 'Compact Mid-Block', ovr: 64, arWikiKey: 'نادي الإنتاج الحربي', rank: 1480, pts: 1155, mgr: ['Ahmed El Kass', 'Egypt', '2026-06-08', '1965-07-08'] },
  { id: 'fc27-775', name: 'Tanta SC', shortName: 'Tanta', code: 'TAN', tmId: 23223, league: 'Egyptian Second Division A', pColor: '#FFF713', sColor: '#083EED', stadium: 'Tanta Club Stadium', style: 'Defensive Counter', ovr: 64, arWikiKey: 'نادي طنطا', rank: 1520, pts: 1145, mgr: ['Hassan Mousa', 'Egypt', '2025-07-01', '1972-01-01'] },
  { id: 'fc27-776', name: 'Raya SC', shortName: 'Raya SC', code: 'RAY', tmId: 56037, league: 'Egyptian Second Division A', pColor: '#0F766E', sColor: '#FFFFFF', stadium: 'Haras El Hodoud Stadium', style: 'Structured Counter', ovr: 63, manualKey: 'fc27-776', rank: 1680, pts: 1110, mgr: ['Mohamed Halim', 'Egypt', '2025-07-01', '1977-01-01'] },
  { id: 'fc27-777', name: 'El Sekka El Hadid SC', shortName: 'El Sekka', code: 'SKH', tmId: 28198, league: 'Egyptian Second Division A', pColor: '#048341', sColor: '#FFFFFF', stadium: 'El Sekka El Hadid Stadium', style: 'Compact Block & Direct', ovr: 63, manualKey: 'fc27-777', rank: 1640, pts: 1120, mgr: ['Rabie Yassin', 'Egypt', '2025-07-01', '1960-09-07'] },
];

// Exclude players who belong on existing non-Egyptian FC27 clubs
const FORBIDDEN_OVERLAPS = new Set([
  'ibrahim adel',
  'ramy rabia',
  'hossam abdelmaguid',
  'selim telib',
  'trezeguet',
  'trézéguet',
  'mahmoud hassan',
  'hamza abdelkarim',
  'mostafa mohamed',
  'omar marmoush',
  'mohamed salah',
  'sam morsy',
  'haissem hassan',
  'omar fayed',
]);

// Keep loaned players ONLY at their current loan club!
const SEEN_QIDS = new Set();
// Pre-reserve QIDs for players explicitly placed at Ceramica Cleopatra / Petrojet / El Gouna etc. (loan destinations)
const PREFERRED_LOAN_DEST = {
  'karim el debes': 'Ceramica Cleopatra FC',
  'mohamed abdallah': 'Ceramica Cleopatra FC',
  'omar kamal': 'Ceramica Cleopatra FC',
  'ahmed abdin': 'Ceramica Cleopatra FC',
  'ammar hamdy': 'Petrojet SC',
  'ahmed refaat': 'El Gouna FC',
  'hossam ashraf': 'Smouha SC',
  'mohamed fakhri': 'Pharco FC',
  'mahmoud el zanfaly': 'Haras El Hodoud SC',
  'ali sulieman': 'Kahrabaa Ismailia SC',
  'mohamed hamdy': 'Pyramids FC',
};

const dobAdditions = {};
const compactTeams = [];

for (const club of CLUB_DEFS) {
  let rawList = [];
  if (club.manualKey) {
    rawList = MANUAL_SQUADS[club.manualKey].map(p => ({ ...p }));
  } else if (club.wikiKey) {
    rawList = (parsed.en[club.wikiKey] || []).map(p => {
      const qid = p.wikiTitle ? enToQid[p.wikiTitle] : null;
      const wd = qid ? wdData[qid] : null;
      return {
        name: cleanPlayerName(p.name),
        posDetail: mapWdPosition(wd?.posIds, p.pos),
        nat: normNat(p.nat),
        no: parseInt(p.no, 10) || 0,
        dob: validDob(wd?.dob),
        qid,
        other: p.other || '',
        isCaptain: /\bcaptain\b/i.test(p.other || '') && !/vice/i.test(p.other || ''),
        isViceCaptain: /vice-captain/i.test(p.other || ''),
      };
    });
  } else if (club.arWikiKey) {
    const arList = parsed.ar[club.arWikiKey] || [];
    // For Tanta SC, merge enwiki 9 + resolved/translit arwiki + verified TM 25/26 players
    const seenAr = new Set();
    if (club.id === 'fc27-775') {
      const tmExtra = [
        { name: 'Abdelrahman Qattawy', posDetail: 'GK', nat: 'Egypt', no: 22 },
        { name: 'Taha Ibrahim', posDetail: 'CB', nat: 'Egypt', no: 4 },
        { name: 'Ahmed El Kohy', posDetail: 'LB', nat: 'Egypt', no: 3 },
        { name: 'Fathi El Sayed', posDetail: 'RB', nat: 'Egypt', no: 2 },
        { name: 'Walid Ateya', posDetail: 'ST', nat: 'Egypt', no: 9 },
        { name: 'Abdallah Kamel', posDetail: 'LW', nat: 'Egypt', no: 11 },
        { name: 'Serge Alain Kore', posDetail: 'RW', nat: 'Ivory Coast', no: 7 },
        { name: 'Abdelrahman Abdelnabi', posDetail: 'CB', nat: 'Egypt', no: 15 },
      ];
      tmExtra.forEach(p => { seenAr.add(p.name.toLowerCase()); rawList.push(p); });
    }
    for (const p of arList) {
      const info = p.wikiTitle ? arToInfo[p.wikiTitle] : null;
      const wd = info?.qid ? wdData[info.qid] : null;
      let enName = info?.enTitle || wd?.label || AR_NAME_TRANSLIT[p.name] || '';
      enName = cleanPlayerName(enName);
      if (!enName || seenAr.has(enName.toLowerCase())) continue;
      seenAr.add(enName.toLowerCase());
      rawList.push({
        name: enName,
        posDetail: mapWdPosition(wd?.posIds, p.pos),
        nat: p.nat === 'أوغندا' ? 'Uganda' : p.nat === 'السنغال' ? 'Senegal' : p.nat === 'غانا' ? 'Ghana' : p.nat === 'كينيا' ? 'Kenya' : p.nat === 'الغابون' ? 'Gabon' : p.nat === 'موريتانيا' ? 'Mauritania' : p.nat === 'مالي' ? 'Mali' : p.nat === 'ليبيريا' ? 'Liberia' : p.nat === 'تونس' ? 'Tunisia' : 'Egypt',
        no: parseInt(p.no, 10) || 0,
        dob: validDob(wd?.dob),
        qid: info?.qid || null,
        other: '',
      });
    }
  }

  // Filter out empty, out-on-loan, forbidden foreign club overlaps, and preferred loan duplicates
  const ntEntries = NT_PLAYERS_BY_CLUB[club.id] || [];
  const ntAliases = new Set();
  for (const nt of ntEntries) {
    ntAliases.add(nt.name.toLowerCase());
    (nt.aliases || []).forEach(a => ntAliases.add(a.toLowerCase()));
  }

  const seenLocal = new Set();
  const filtered = [];
  for (const p of rawList) {
    if (!p.name) continue;
    if (/at \[\[|on loan at/i.test(p.other || '')) continue;
    const low = p.name.toLowerCase();
    if (FORBIDDEN_OVERLAPS.has(low)) continue;
    if (ntAliases.has(low)) continue; // will add exact unified NT entry
    if (PREFERRED_LOAN_DEST[low] && PREFERRED_LOAN_DEST[low] !== club.name) continue;
    if (p.qid && SEEN_QIDS.has(p.qid)) continue;
    if (seenLocal.has(low)) continue;
    if (p.qid) SEEN_QIDS.add(p.qid);
    seenLocal.add(low);
    // Avoid generic "Ewerton" collision with Académico
    if (low === 'ewerton' && club.name === 'Pyramids FC') {
      p.name = 'Ewerton da Silva';
    }
    filtered.push(p);
  }

  assignSpecificPositions(filtered);

  // Calibrate ratings so domestic Egyptian DEFs stay <= 74 (preserving 8-DEF NT callups) and Egyptian ATTs <= 72
  let capCandidate = null;
  let vcCandidate = null;
  const tuples = [];
  let seq = 1;
  const usedNos = new Set();

  // Add NT players first or preserve captain order after building list
  const ntTuples = ntEntries.map(nt => {
    const no = nt.no;
    usedNos.add(no);
    dobAdditions[nt.eaId] = nt.dob;
    return {
      isCap: Boolean(nt.isCaptain),
      isVc: Boolean(nt.isViceCaptain),
      tuple: [nt.eaId, nt.name, nt.posDetail, nt.ovr, nt.nat, nt.age, ...nt.stats, no],
    };
  });

  // Cap squad cleanly at max 32 players so compact file stays lean
  const otherMax = Math.max(18, 30 - ntTuples.length);
  // Keep balanced GKs + DEFs + MIDs + ATTs when capping
  const capped = filtered.slice(0, otherMax);

  for (const p of capped) {
    const eaId = `egy-${club.id.replace('fc27-', '')}-${seq++}`;
    if (p.dob) dobAdditions[eaId] = p.dob;
    const isForeign = p.nat !== 'Egypt';
    let ovr = club.ovr - 1 + ((seq % 5) - 2);
    if (p.isCaptain) ovr = Math.max(ovr, club.ovr);
    if (!isForeign && ['CB', 'LB', 'RB', 'CDM'].includes(p.posDetail)) {
      ovr = Math.min(74, ovr);
    } else if (!isForeign && ['ST', 'LW', 'RW'].includes(p.posDetail)) {
      ovr = Math.min(72, ovr);
    } else if (!isForeign && p.posDetail === 'GK') {
      ovr = Math.min(77, ovr); // El Shenawy up to 77-78
    } else if (!isForeign) {
      ovr = Math.min(76, ovr);
    } else {
      ovr = Math.min(club.ovr + 1, ovr);
    }
    ovr = Math.max(58, Math.min(78, ovr));

    let no = p.no > 0 && p.no <= 99 && !usedNos.has(p.no) ? p.no : 0;
    if (!no) {
      for (let cand = 1; cand <= 99; cand++) {
        if (!usedNos.has(cand)) { no = cand; break; }
      }
    }
    usedNos.add(no);
    const age = ageFromDob(p.dob, 22 + (seq % 10));
    const stats = makeStats(p.posDetail, ovr);
    tuples.push({
      isCap: Boolean(p.isCaptain),
      isVc: Boolean(p.isViceCaptain),
      ovr,
      tuple: [eaId, p.name, p.posDetail, ovr, p.nat, age, ...stats, no],
    });
  }

  const all = [...ntTuples, ...tuples];
  // Put Captain at idx 0, Vice-Captain at idx 1
  const capIdx = all.findIndex(x => x.isCap);
  if (capIdx > 0) {
    const [cap] = all.splice(capIdx, 1);
    all.unshift(cap);
  }
  const vcIdx = all.findIndex((x, i) => i > 0 && x.isVc);
  if (vcIdx > 1) {
    const [vc] = all.splice(vcIdx, 1);
    all.splice(1, 0, vc);
  }

  compactTeams.push([
    club.id,
    club.name,
    club.shortName,
    club.code,
    'Egypt',
    club.league,
    'men',
    club.pColor,
    club.sColor,
    club.stadium,
    club.style,
    club.ovr,
    all.map(x => x.tuple),
  ]);
}

console.log('Generated clubs:', compactTeams.length);
let minSquad = 999, totalPlayers = 0;
for (const t of compactTeams) {
  const sq = t[12];
  const gks = sq.filter(p => p[2] === 'GK').length;
  const defs = sq.filter(p => ['CB','LB','RB'].includes(p[2])).length;
  const mids = sq.filter(p => ['CDM','CM','CAM','LM','RM'].includes(p[2])).length;
  const atts = sq.filter(p => ['ST','LW','RW'].includes(p[2])).length;
  if (sq.length < minSquad) minSquad = sq.length;
  totalPlayers += sq.length;
  console.log(`${t[0]} | ${t[1].padEnd(28)} | ${t[5].padEnd(26)} | n:${String(sq.length).padStart(2)} (GK:${gks} D:${defs} M:${mids} A:${atts}) | C:${sq[0][1]}`);
}
console.log('Total players:', totalPlayers, '| Min squad size:', minSquad, '| DOB entries:', Object.keys(dobAdditions).length);
fs.writeFileSync('/tmp/egypt_generated_bundle.json', JSON.stringify({ CLUB_DEFS, compactTeams, dobAdditions }));

import { CLUB_TEAMS_DATABASE, NATIONAL_TEAMS_DATABASE } from '../../../data/teamsDatabase';
import { getAllStadiums, StadiumRecord } from '../../../data/stadiumsDatabase';
import {
  FIFA_COUNTRY_METADATA,
  getCountryFlag,
  getCountryFlagUrl,
  getCountryMetadata,
  normalizeCountryName,
} from '../../../data/countryMetadata';
import { ConfederationType, GenderType } from '../../../types/matchCentre';

export type ContinentName =
  | 'Europe'
  | 'South America'
  | 'North & Central America'
  | 'Africa'
  | 'Asia'
  | 'Oceania';

export type ContinentFilter = 'Global' | ContinentName;

export interface ContinentPreset {
  id: ContinentFilter;
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  zoom: number;
  description: string;
}

export const CONTINENT_PRESETS: ContinentPreset[] = [
  {
    id: 'Global',
    label: 'All Continents (Global)',
    shortLabel: 'Global',
    lat: 24,
    lng: 12,
    zoom: 2,
    description: 'Complete global football map across all six FIFA confederations.',
  },
  {
    id: 'Europe',
    label: 'Europe',
    shortLabel: 'Europe',
    lat: 48.8,
    lng: 10.5,
    zoom: 4,
    description: 'Home of Premier League, LALIGA, Serie A, Bundesliga, Ligue 1, and UEFA Champions League.',
  },
  {
    id: 'South America',
    label: 'South America',
    shortLabel: 'S. America',
    lat: -18.5,
    lng: -60.0,
    zoom: 3,
    description: 'CONMEBOL heartlands spanning Brazil, Argentina, Uruguay, Colombia, Chile, and Andean football.',
  },
  {
    id: 'North & Central America',
    label: 'North & Central America',
    shortLabel: 'N. America',
    lat: 34.0,
    lng: -92.0,
    zoom: 3,
    description: 'CONCACAF leagues, Liga MX, MLS, NWSL, and Caribbean national associations.',
  },
  {
    id: 'Africa',
    label: 'Africa',
    shortLabel: 'Africa',
    lat: 6.5,
    lng: 18.0,
    zoom: 3,
    description: 'CAF member nations and powerhouse clubs from North, West, East, and Southern Africa.',
  },
  {
    id: 'Asia',
    label: 'Asia',
    shortLabel: 'Asia',
    lat: 30.0,
    lng: 96.0,
    zoom: 3,
    description: 'AFC nations and clubs across East Asia, the Middle East, South Asia, and Southeast Asia.',
  },
  {
    id: 'Oceania',
    label: 'Oceania',
    shortLabel: 'Oceania',
    lat: -26.0,
    lng: 146.0,
    zoom: 4,
    description: 'Australia, New Zealand, and Pacific Island associations across Oceania.',
  },
];

// Accurate capital/football hub coordinates for countries worldwide
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; city: string }> = {
  // Europe
  Albania: { lat: 41.3275, lng: 19.8187, city: 'Tirana' },
  Andorra: { lat: 42.5063, lng: 1.5218, city: 'Andorra la Vella' },
  Armenia: { lat: 40.1792, lng: 44.4991, city: 'Yerevan' },
  Austria: { lat: 48.2082, lng: 16.3738, city: 'Vienna' },
  Azerbaijan: { lat: 40.4093, lng: 49.8671, city: 'Baku' },
  Belarus: { lat: 53.9006, lng: 27.559, city: 'Minsk' },
  Belgium: { lat: 50.8503, lng: 4.3517, city: 'Brussels' },
  'Bosnia & Herzegovina': { lat: 43.8563, lng: 18.4131, city: 'Sarajevo' },
  Bulgaria: { lat: 42.6977, lng: 23.3219, city: 'Sofia' },
  Croatia: { lat: 45.815, lng: 15.9819, city: 'Zagreb' },
  Cyprus: { lat: 35.1856, lng: 33.3823, city: 'Nicosia' },
  'Czech Republic': { lat: 50.0755, lng: 14.4378, city: 'Prague' },
  Denmark: { lat: 55.6761, lng: 12.5683, city: 'Copenhagen' },
  England: { lat: 51.556, lng: -0.2795, city: 'London' },
  Estonia: { lat: 59.437, lng: 24.7536, city: 'Tallinn' },
  'Faroe Islands': { lat: 62.0079, lng: -6.791, city: 'Tórshavn' },
  Finland: { lat: 60.1699, lng: 24.9384, city: 'Helsinki' },
  France: { lat: 48.9245, lng: 2.3601, city: 'Paris' },
  Georgia: { lat: 41.7151, lng: 44.8271, city: 'Tbilisi' },
  Germany: { lat: 52.5147, lng: 13.2395, city: 'Berlin' },
  Gibraltar: { lat: 36.1408, lng: -5.3536, city: 'Gibraltar' },
  Greece: { lat: 37.9838, lng: 23.7275, city: 'Athens' },
  Hungary: { lat: 47.5031, lng: 19.0981, city: 'Budapest' },
  Iceland: { lat: 64.1466, lng: -21.9426, city: 'Reykjavík' },
  Israel: { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv' },
  Italy: { lat: 41.9341, lng: 12.4547, city: 'Rome' },
  Kazakhstan: { lat: 51.1082, lng: 71.4026, city: 'Astana' },
  Kosovo: { lat: 42.6629, lng: 21.1655, city: 'Pristina' },
  Latvia: { lat: 56.9496, lng: 24.1052, city: 'Riga' },
  Liechtenstein: { lat: 47.141, lng: 9.5209, city: 'Vaduz' },
  Lithuania: { lat: 54.8985, lng: 23.9036, city: 'Kaunas' },
  Luxembourg: { lat: 49.6116, lng: 6.1319, city: 'Luxembourg City' },
  Malta: { lat: 35.8989, lng: 14.415, city: 'Attard' },
  Moldova: { lat: 47.0105, lng: 28.8638, city: 'Chișinău' },
  Monaco: { lat: 43.7276, lng: 7.4156, city: 'Fontvieille' },
  Montenegro: { lat: 42.4304, lng: 19.2594, city: 'Podgorica' },
  Netherlands: { lat: 52.3144, lng: 4.9419, city: 'Amsterdam' },
  'North Macedonia': { lat: 42.0057, lng: 21.4254, city: 'Skopje' },
  'Northern Ireland': { lat: 54.5827, lng: -5.9553, city: 'Belfast' },
  Norway: { lat: 59.949, lng: 10.734, city: 'Oslo' },
  Poland: { lat: 52.2395, lng: 21.0458, city: 'Warsaw' },
  Portugal: { lat: 38.7089, lng: -9.2608, city: 'Lisbon' },
  'Republic of Ireland': { lat: 53.3352, lng: -6.2285, city: 'Dublin' },
  Romania: { lat: 44.4372, lng: 26.1525, city: 'Bucharest' },
  Russia: { lat: 55.7158, lng: 37.5537, city: 'Moscow' },
  'San Marino': { lat: 43.9424, lng: 12.4578, city: 'Serravalle' },
  Scotland: { lat: 55.8258, lng: -4.252, city: 'Glasgow' },
  Serbia: { lat: 44.7832, lng: 20.4549, city: 'Belgrade' },
  Slovakia: { lat: 48.1636, lng: 17.1367, city: 'Bratislava' },
  Slovenia: { lat: 46.0804, lng: 14.5243, city: 'Ljubljana' },
  Spain: { lat: 40.4531, lng: -3.6883, city: 'Madrid' },
  Sweden: { lat: 59.3728, lng: 18.0003, city: 'Stockholm' },
  Switzerland: { lat: 47.5417, lng: 7.6201, city: 'Basel' },
  Türkiye: { lat: 41.0745, lng: 28.7657, city: 'Istanbul' },
  Ukraine: { lat: 50.4334, lng: 30.5219, city: 'Kyiv' },
  Wales: { lat: 51.4728, lng: -3.2031, city: 'Cardiff' },

  // South America
  Argentina: { lat: -34.5453, lng: -58.4498, city: 'Buenos Aires' },
  Bolivia: { lat: -16.4994, lng: -68.1227, city: 'La Paz' },
  Brazil: { lat: -22.9121, lng: -43.2302, city: 'Rio de Janeiro' },
  Chile: { lat: -33.4647, lng: -70.6107, city: 'Santiago' },
  Colombia: { lat: 10.9269, lng: -74.8006, city: 'Barranquilla' },
  Ecuador: { lat: -0.1077, lng: -78.4892, city: 'Quito' },
  Paraguay: { lat: -25.2921, lng: -57.6574, city: 'Asunción' },
  Peru: { lat: -12.0672, lng: -77.0338, city: 'Lima' },
  Uruguay: { lat: -34.8944, lng: -56.1528, city: 'Montevideo' },
  Venezuela: { lat: 9.754, lng: -63.1753, city: 'Maturín' },

  // North & Central America
  Anguilla: { lat: 18.2206, lng: -63.0686, city: 'The Valley' },
  'Antigua and Barbuda': { lat: 17.1056, lng: -61.7872, city: "St. John's" },
  Aruba: { lat: 12.5211, lng: -70.027, city: 'Oranjestad' },
  Bahamas: { lat: 25.0343, lng: -77.3596, city: 'Nassau' },
  Barbados: { lat: 13.0975, lng: -59.5892, city: 'Bridgetown' },
  Belize: { lat: 17.251, lng: -88.759, city: 'Belmopan' },
  Bermuda: { lat: 32.3078, lng: -64.7505, city: 'Hamilton' },
  'British Virgin Islands': { lat: 18.4207, lng: -64.64, city: 'Road Town' },
  Canada: { lat: 43.6332, lng: -79.4186, city: 'Toronto' },
  'Cayman Islands': { lat: 19.2869, lng: -81.3674, city: 'George Town' },
  'Costa Rica': { lat: 9.9364, lng: -84.1078, city: 'San José' },
  Cuba: { lat: 23.1136, lng: -82.3666, city: 'Havana' },
  Curaçao: { lat: 12.1696, lng: -68.99, city: 'Willemstad' },
  Dominica: { lat: 15.3017, lng: -61.3881, city: 'Roseau' },
  'Dominican Republic': { lat: 18.4861, lng: -69.9312, city: 'Santo Domingo' },
  'El Salvador': { lat: 13.6811, lng: -89.2225, city: 'San Salvador' },
  Grenada: { lat: 12.0561, lng: -61.7488, city: "St. George's" },
  Guatemala: { lat: 14.6033, lng: -90.5117, city: 'Guatemala City' },
  Guyana: { lat: 6.8013, lng: -58.1551, city: 'Georgetown' },
  Haiti: { lat: 18.5392, lng: -72.335, city: 'Port-au-Prince' },
  Honduras: { lat: 14.0723, lng: -87.1921, city: 'Tegucigalpa' },
  Jamaica: { lat: 18.0019, lng: -76.7717, city: 'Kingston' },
  Mexico: { lat: 19.3029, lng: -99.1505, city: 'Mexico City' },
  Montserrat: { lat: 16.7425, lng: -62.1874, city: 'Brades' },
  Nicaragua: { lat: 12.115, lng: -86.2362, city: 'Managua' },
  Panama: { lat: 9.0352, lng: -79.4705, city: 'Panama City' },
  'Puerto Rico': { lat: 18.393, lng: -66.1536, city: 'Bayamón' },
  'Saint Kitts and Nevis': { lat: 17.3026, lng: -62.7177, city: 'Basseterre' },
  'Saint Lucia': { lat: 14.0101, lng: -60.9875, city: 'Castries' },
  'Saint Vincent and the Grenadines': { lat: 13.1579, lng: -61.2248, city: 'Kingstown' },
  Suriname: { lat: 5.852, lng: -55.2038, city: 'Paramaribo' },
  'Trinidad and Tobago': { lat: 10.6606, lng: -61.533, city: 'Port of Spain' },
  'Turks and Caicos Islands': { lat: 21.78, lng: -72.22, city: 'Providenciales' },
  'United States': { lat: 40.8128, lng: -74.0742, city: 'New York / NJ' },
  'US Virgin Islands': { lat: 17.7246, lng: -64.7963, city: 'Christiansted' },

  // Africa
  Algeria: { lat: 36.7599, lng: 2.9956, city: 'Algiers' },
  Angola: { lat: -8.9708, lng: 13.2842, city: 'Luanda' },
  Benin: { lat: 6.3849, lng: 2.3879, city: 'Cotonou' },
  Botswana: { lat: -24.6571, lng: 25.9329, city: 'Gaborone' },
  'Burkina Faso': { lat: 12.3686, lng: -1.5327, city: 'Ouagadougou' },
  Burundi: { lat: -3.3822, lng: 29.3644, city: 'Bujumbura' },
  Cameroon: { lat: 3.9511, lng: 11.5401, city: 'Yaoundé' },
  'Cape Verde': { lat: 14.9177, lng: -23.5092, city: 'Praia' },
  'Central African Republic': { lat: 4.3667, lng: 18.5667, city: 'Bangui' },
  Chad: { lat: 12.1348, lng: 15.0557, city: "N'Djamena" },
  Comoros: { lat: -11.7172, lng: 43.2473, city: 'Moroni' },
  Congo: { lat: -4.2634, lng: 15.2429, city: 'Brazzaville' },
  'DR Congo': { lat: -4.3276, lng: 15.3136, city: 'Kinshasa' },
  Djibouti: { lat: 11.5721, lng: 43.1456, city: 'Djibouti City' },
  Egypt: { lat: 30.0691, lng: 31.3123, city: 'Cairo' },
  'Equatorial Guinea': { lat: 3.7504, lng: 8.7371, city: 'Malabo' },
  Eritrea: { lat: 15.3229, lng: 38.9251, city: 'Asmara' },
  Eswatini: { lat: -26.445, lng: 31.2089, city: 'Lobamba' },
  Ethiopia: { lat: 9.013, lng: 38.758, city: 'Addis Ababa' },
  Gabon: { lat: 0.5206, lng: 9.3917, city: 'Libreville' },
  Gambia: { lat: 13.4675, lng: -16.6808, city: 'Bakau' },
  Ghana: { lat: 5.5514, lng: -0.1914, city: 'Accra' },
  Guinea: { lat: 9.6412, lng: -13.5784, city: 'Conakry' },
  'Guinea-Bissau': { lat: 11.8636, lng: -15.5984, city: 'Bissau' },
  'Ivory Coast': { lat: 5.4792, lng: -4.075, city: 'Abidjan' },
  Kenya: { lat: -1.2297, lng: 36.8907, city: 'Nairobi' },
  Lesotho: { lat: -29.3167, lng: 27.4833, city: 'Maseru' },
  Liberia: { lat: 6.2907, lng: -10.7605, city: 'Monrovia' },
  Libya: { lat: 32.8872, lng: 13.1913, city: 'Tripoli' },
  Madagascar: { lat: -18.9211, lng: 47.5266, city: 'Antananarivo' },
  Malawi: { lat: -13.9626, lng: 33.7741, city: 'Lilongwe' },
  Mali: { lat: 12.6059, lng: -7.9212, city: 'Bamako' },
  Mauritania: { lat: 18.0735, lng: -15.9582, city: 'Nouakchott' },
  Mauritius: { lat: -20.2367, lng: 57.4981, city: 'Saint-Pierre' },
  Morocco: { lat: 33.9597, lng: -6.8891, city: 'Rabat' },
  Mozambique: { lat: -25.9255, lng: 32.5679, city: 'Maputo' },
  Namibia: { lat: -22.5877, lng: 17.0715, city: 'Windhoek' },
  Niger: { lat: 13.5116, lng: 2.1254, city: 'Niamey' },
  Nigeria: { lat: 5.0061, lng: 7.8842, city: 'Uyo / Abuja' },
  Rwanda: { lat: -1.9536, lng: 30.1149, city: 'Kigali' },
  'São Tomé and Príncipe': { lat: 0.3365, lng: 6.7273, city: 'São Tomé' },
  Senegal: { lat: 14.7253, lng: -17.2022, city: 'Dakar' },
  Seychelles: { lat: -4.6232, lng: 55.4524, city: 'Victoria' },
  'Sierra Leone': { lat: 8.4657, lng: -13.2317, city: 'Freetown' },
  Somalia: { lat: 2.0469, lng: 45.3182, city: 'Mogadishu' },
  'South Africa': { lat: -26.2349, lng: 27.9824, city: 'Johannesburg' },
  'South Sudan': { lat: 4.8594, lng: 31.5713, city: 'Juba' },
  Sudan: { lat: 15.6508, lng: 32.5177, city: 'Omdurman' },
  Tanzania: { lat: -6.8533, lng: 39.2738, city: 'Dar es Salaam' },
  Togo: { lat: 6.1725, lng: 1.2314, city: 'Lomé' },
  Tunisia: { lat: 36.7478, lng: 10.2728, city: 'Tunis' },
  Uganda: { lat: 0.3476, lng: 32.6594, city: 'Kampala' },
  Zambia: { lat: -15.3712, lng: 28.2732, city: 'Lusaka' },
  Zimbabwe: { lat: -17.8252, lng: 31.0335, city: 'Harare' },

  // Asia
  Afghanistan: { lat: 34.5553, lng: 69.2075, city: 'Kabul' },
  Bahrain: { lat: 26.1539, lng: 50.5439, city: 'Riffa' },
  Bangladesh: { lat: 23.729, lng: 90.4126, city: 'Dhaka' },
  Bhutan: { lat: 27.4728, lng: 89.6393, city: 'Thimphu' },
  'Brunei Darussalam': { lat: 4.9292, lng: 114.9453, city: 'Bandar Seri Begawan' },
  Cambodia: { lat: 11.6789, lng: 104.8897, city: 'Phnom Penh' },
  'China PR': { lat: 39.9296, lng: 116.4472, city: 'Beijing' },
  'Chinese Taipei': { lat: 25.0493, lng: 121.5504, city: 'Taipei' },
  Guam: { lat: 13.4443, lng: 144.7937, city: 'Hagåtña' },
  'Hong Kong': { lat: 22.327, lng: 114.205, city: 'Hong Kong' },
  India: { lat: 22.5689, lng: 88.4092, city: 'Kolkata' },
  Indonesia: { lat: -6.2186, lng: 106.8024, city: 'Jakarta' },
  Iran: { lat: 35.7244, lng: 51.2756, city: 'Tehran' },
  Iraq: { lat: 30.4397, lng: 47.7689, city: 'Basra' },
  Japan: { lat: 35.6778, lng: 139.7144, city: 'Tokyo' },
  Jordan: { lat: 31.9844, lng: 35.9019, city: 'Amman' },
  Kuwait: { lat: 29.2708, lng: 47.9089, city: 'Kuwait City' },
  Kyrgyzstan: { lat: 42.8746, lng: 74.5698, city: 'Bishkek' },
  Laos: { lat: 17.9757, lng: 102.6331, city: 'Vientiane' },
  Lebanon: { lat: 33.8669, lng: 35.4958, city: 'Beirut' },
  Macau: { lat: 22.1558, lng: 113.5533, city: 'Macau' },
  Malaysia: { lat: 3.0544, lng: 101.6914, city: 'Kuala Lumpur' },
  Maldives: { lat: 4.1755, lng: 73.5093, city: 'Malé' },
  Mongolia: { lat: 47.8864, lng: 106.9057, city: 'Ulaanbaatar' },
  Myanmar: { lat: 16.8206, lng: 96.1856, city: 'Yangon' },
  Nepal: { lat: 27.6947, lng: 85.3147, city: 'Kathmandu' },
  'North Korea': { lat: 39.0496, lng: 125.7753, city: 'Pyongyang' },
  Oman: { lat: 23.588, lng: 58.3829, city: 'Muscat' },
  Pakistan: { lat: 33.6844, lng: 73.0479, city: 'Islamabad' },
  Palestine: { lat: 31.8528, lng: 35.2356, city: 'Al-Ram' },
  Philippines: { lat: 14.5633, lng: 120.9922, city: 'Manila' },
  Qatar: { lat: 25.4208, lng: 51.4903, city: 'Doha / Lusail' },
  'Saudi Arabia': { lat: 24.7875, lng: 46.8397, city: 'Riyadh' },
  Singapore: { lat: 1.3042, lng: 103.8744, city: 'Singapore' },
  'South Korea': { lat: 37.5683, lng: 126.8972, city: 'Seoul' },
  'Sri Lanka': { lat: 6.9271, lng: 79.8612, city: 'Colombo' },
  Syria: { lat: 36.2021, lng: 37.1343, city: 'Aleppo' },
  Tajikistan: { lat: 38.5794, lng: 68.7791, city: 'Dushanbe' },
  Thailand: { lat: 13.7556, lng: 100.6222, city: 'Bangkok' },
  'Timor-Leste': { lat: -8.5569, lng: 125.5603, city: 'Dili' },
  Turkmenistan: { lat: 37.9601, lng: 58.3261, city: 'Ashgabat' },
  'United Arab Emirates': { lat: 24.4158, lng: 54.4581, city: 'Abu Dhabi' },
  Uzbekistan: { lat: 41.2806, lng: 69.2119, city: 'Tashkent' },
  Vietnam: { lat: 21.0206, lng: 105.7639, city: 'Hanoi' },
  Yemen: { lat: 15.3694, lng: 44.191, city: "Sana'a" },

  // Oceania
  'American Samoa': { lat: -14.3272, lng: -170.7203, city: 'Pago Pago' },
  Australia: { lat: -33.8471, lng: 151.0634, city: 'Sydney' },
  'Cook Islands': { lat: -21.2367, lng: -159.7777, city: 'Avarua' },
  Fiji: { lat: -18.1416, lng: 178.4419, city: 'Suva' },
  'New Caledonia': { lat: -22.2758, lng: 166.458, city: 'Nouméa' },
  'New Zealand': { lat: -36.8748, lng: 174.7448, city: 'Auckland' },
  'Papua New Guinea': { lat: -9.4438, lng: 147.1803, city: 'Port Moresby' },
  Samoa: { lat: -13.8333, lng: -171.7667, city: 'Apia' },
  'Solomon Islands': { lat: -9.4333, lng: 159.95, city: 'Honiara' },
  Tahiti: { lat: -17.535, lng: -149.5696, city: 'Papeete' },
  Tonga: { lat: -21.1394, lng: -175.2049, city: "Nuku'alofa" },
  Vanuatu: { lat: -17.7333, lng: 168.3167, city: 'Port Vila' },
};

export function getContinentForCountry(
  countryName: string,
  confederation?: ConfederationType
): ContinentName {
  const canonical = normalizeCountryName(countryName);
  if (canonical === 'Australia') return 'Oceania';
  if (
    canonical === 'Guyana' ||
    canonical === 'Suriname' ||
    canonical === 'Argentina' ||
    canonical === 'Brazil' ||
    canonical === 'Bolivia' ||
    canonical === 'Chile' ||
    canonical === 'Colombia' ||
    canonical === 'Ecuador' ||
    canonical === 'Paraguay' ||
    canonical === 'Peru' ||
    canonical === 'Uruguay' ||
    canonical === 'Venezuela'
  ) {
    return 'South America';
  }
  const metaConfed = confederation || getCountryMetadata(canonical)?.confederation;
  switch (metaConfed) {
    case 'UEFA':
      return 'Europe';
    case 'CONMEBOL':
      return 'South America';
    case 'CONCACAF':
      return 'North & Central America';
    case 'CAF':
      return 'Africa';
    case 'AFC':
      return 'Asia';
    case 'OFC':
      return 'Oceania';
    default:
      return 'Europe';
  }
}

export function getCountryCoordinateInfo(countryName: string): {
  lat: number;
  lng: number;
  city: string;
} {
  const canonical = normalizeCountryName(countryName);
  if (COUNTRY_COORDINATES[canonical]) return COUNTRY_COORDINATES[canonical];
  if (COUNTRY_COORDINATES[countryName]) return COUNTRY_COORDINATES[countryName];
  return { lat: 48.8566, lng: 2.3522, city: canonical || 'Football Hub' };
}

export interface WorldLocationItem {
  id: string;
  teamId?: string;
  name: string;
  shortName?: string;
  type: 'club' | 'national' | 'stadium';
  subType?: GenderType;
  country: string;
  countryCode: string;
  continent: ContinentName;
  city: string;
  lat: number;
  lng: number;
  crestUrl?: string;
  fallbackCrestUrl?: string;
  flagEmoji: string;
  flagUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  capacity?: number;
  yearOpened?: number;
  surface?: string;
  isVerifiedStadium?: boolean;
  confederation: ConfederationType;
  league?: string;
  stadiumName?: string;
  homeTeams?: Array<{ id: string; name: string; gender: GenderType; crestUrl?: string }>;
  description?: string;
  imageUrl?: string;
  mapsSearchUrl?: string;
  streetViewUrl?: string;
}

export interface WorldCountrySummary {
  country: string;
  code: string;
  flagEmoji: string;
  flagUrl: string | null;
  continent: ContinentName;
  confederation: ConfederationType;
  coordinates: { lat: number; lng: number; city: string };
  nationalStadiumName: string;
  mensNationalTeam?: WorldLocationItem;
  womensNationalTeam?: WorldLocationItem;
  clubs: WorldLocationItem[];
  stadiums: WorldLocationItem[];
  domesticLeagues: string[];
  domesticCups: string[];
}

export interface WorldCompetitionItem {
  id: string;
  name: string;
  type: 'league' | 'cup' | 'continental' | 'international';
  gender: GenderType;
  region: string;
  continent: ContinentFilter;
  confederation?: ConfederationType;
  country?: string;
  description: string;
  lat: number;
  lng: number;
  participatingTeams: Array<{ id: string; name: string; country: string; crestUrl?: string }>;
}

const FLAGSHIP_CUPS_BY_COUNTRY: Record<string, string[]> = {
  England: ['FA Cup', 'EFL Cup', "Women's FA Cup"],
  Spain: ['Copa del Rey', 'Supercopa de España', 'Copa de la Reina'],
  Germany: ['DFB-Pokal', 'DFL-Supercup', 'DFB-Pokal Frauen'],
  Italy: ['Coppa Italia', 'Supercoppa Italiana', 'Coppa Italia Femminile'],
  France: ['Coupe de France', 'Trophée des Champions', 'Coupe de France Féminine'],
  Portugal: ['Taça de Portugal', 'Taça da Liga'],
  Netherlands: ['KNVB Cup', 'Johan Cruyff Shield'],
  Scotland: ['Scottish Cup', 'Scottish League Cup'],
  Brazil: ['Copa do Brasil', 'Supercopa do Brasil'],
  Argentina: ['Copa Argentina', 'Trofeo de Campeones'],
  'United States': ['U.S. Open Cup', 'NWSL Challenge Cup'],
  Mexico: ['Campeón de Campeones'],
  Japan: ["Emperor's Cup", 'J.League Cup'],
  'Saudi Arabia': ["King's Cup"],
  Türkiye: ['Turkish Cup'],
  Belgium: ['Belgian Cup'],
  Austria: ['Austrian Cup'],
  Switzerland: ['Swiss Cup'],
};

const CORE_COMPETITIONS: Array<Omit<WorldCompetitionItem, 'participatingTeams'>> = [
  {
    id: 'comp-fifa-world-cup',
    name: 'FIFA World Cup',
    type: 'international',
    gender: 'men',
    region: 'Global (North America 2026)',
    continent: 'Global',
    description:
      'Flagship quadrennial international men’s tournament uniting member nations across all six FIFA confederations.',
    lat: 40.8128,
    lng: -74.0742,
  },
  {
    id: 'comp-fifa-womens-world-cup',
    name: "FIFA Women's World Cup",
    type: 'international',
    gender: 'women',
    region: 'Global',
    continent: 'Global',
    description:
      'Premier international tournament contested by senior women’s national teams worldwide.',
    lat: -22.9121,
    lng: -43.2302,
  },
  {
    id: 'comp-uefa-euro',
    name: 'UEFA European Championship',
    type: 'international',
    gender: 'men',
    region: 'Europe',
    continent: 'Europe',
    confederation: 'UEFA',
    description: 'Quadrennial championship contested by senior men’s UEFA national teams.',
    lat: 52.5147,
    lng: 13.2395,
  },
  {
    id: 'comp-copa-america',
    name: 'CONMEBOL Copa América',
    type: 'international',
    gender: 'men',
    region: 'South America',
    continent: 'South America',
    confederation: 'CONMEBOL',
    description: 'Oldest still-running international football tournament uniting South American nations.',
    lat: -34.5453,
    lng: -58.4498,
  },
  {
    id: 'comp-afcon',
    name: 'CAF Africa Cup of Nations',
    type: 'international',
    gender: 'men',
    region: 'Africa',
    continent: 'Africa',
    confederation: 'CAF',
    description: 'Biennial flagship international men’s championship organized by CAF.',
    lat: 33.9597,
    lng: -6.8891,
  },
  {
    id: 'comp-asian-cup',
    name: 'AFC Asian Cup',
    type: 'international',
    gender: 'men',
    region: 'Asia',
    continent: 'Asia',
    confederation: 'AFC',
    description: 'Continental international championship contested by Asian Football Confederation nations.',
    lat: 25.4208,
    lng: 51.4903,
  },
  {
    id: 'comp-ucl',
    name: 'UEFA Champions League',
    type: 'continental',
    gender: 'men',
    region: 'Europe',
    continent: 'Europe',
    confederation: 'UEFA',
    description: 'Europe’s elite annual continental club competition organized by UEFA.',
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    id: 'comp-uel',
    name: 'UEFA Europa League',
    type: 'continental',
    gender: 'men',
    region: 'Europe',
    continent: 'Europe',
    confederation: 'UEFA',
    description: 'Second-tier continental club tournament across European domestic associations.',
    lat: 47.4979,
    lng: 19.0402,
  },
  {
    id: 'comp-uwcl',
    name: "UEFA Women's Champions League",
    type: 'continental',
    gender: 'women',
    region: 'Europe',
    continent: 'Europe',
    confederation: 'UEFA',
    description: 'Premier annual women’s club competition contested across Europe.',
    lat: 59.9139,
    lng: 10.7522,
  },
  {
    id: 'comp-libertadores',
    name: 'CONMEBOL Copa Libertadores',
    type: 'continental',
    gender: 'men',
    region: 'South America',
    continent: 'South America',
    confederation: 'CONMEBOL',
    description: 'South America’s highest continental club honour organized annually by CONMEBOL.',
    lat: -23.5505,
    lng: -46.6333,
  },
  {
    id: 'comp-concacaf-champions',
    name: 'CONCACAF Champions Cup',
    type: 'continental',
    gender: 'men',
    region: 'North & Central America',
    continent: 'North & Central America',
    confederation: 'CONCACAF',
    description: 'Premier annual continental club competition across North America, Central America, and the Caribbean.',
    lat: 19.4326,
    lng: -99.1332,
  },
  {
    id: 'comp-caf-cl',
    name: 'CAF Champions League',
    type: 'continental',
    gender: 'men',
    region: 'Africa',
    continent: 'Africa',
    confederation: 'CAF',
    description: 'Africa’s premier annual continental club football championship.',
    lat: 30.0444,
    lng: 31.2357,
  },
  {
    id: 'comp-afc-cl',
    name: 'AFC Champions League Elite',
    type: 'continental',
    gender: 'men',
    region: 'Asia',
    continent: 'Asia',
    confederation: 'AFC',
    description: 'Top-tier Asian continental club competition uniting East and West zones.',
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: 'comp-fa-cup',
    name: 'The FA Cup',
    type: 'cup',
    gender: 'men',
    region: 'England',
    continent: 'Europe',
    confederation: 'UEFA',
    country: 'England',
    description: 'The oldest national football cup competition in the world (est. 1871).',
    lat: 51.556,
    lng: -0.2795,
  },
  {
    id: 'comp-copa-del-rey',
    name: 'Copa del Rey',
    type: 'cup',
    gender: 'men',
    region: 'Spain',
    continent: 'Europe',
    confederation: 'UEFA',
    country: 'Spain',
    description: 'Annual knockout cup tournament in Spanish football.',
    lat: 37.4173,
    lng: -6.0046,
  },
  {
    id: 'comp-dfb-pokal',
    name: 'DFB-Pokal',
    type: 'cup',
    gender: 'men',
    region: 'Germany',
    continent: 'Europe',
    confederation: 'UEFA',
    country: 'Germany',
    description: 'German knockout cup competition culminating in the Berlin final.',
    lat: 52.5147,
    lng: 13.2395,
  },
  {
    id: 'comp-coppa-italia',
    name: 'Coppa Italia',
    type: 'cup',
    gender: 'men',
    region: 'Italy',
    continent: 'Europe',
    confederation: 'UEFA',
    country: 'Italy',
    description: 'Premier domestic knockout cup competition in Italian football.',
    lat: 41.9341,
    lng: 12.4547,
  },
  {
    id: 'comp-coupe-de-france',
    name: 'Coupe de France',
    type: 'cup',
    gender: 'men',
    region: 'France',
    continent: 'Europe',
    confederation: 'UEFA',
    country: 'France',
    description: 'All-inclusive French national knockout football competition.',
    lat: 48.9245,
    lng: 2.3601,
  },
];

let _cachedLocations: WorldLocationItem[] | null = null;
let _cachedCountries: WorldCountrySummary[] | null = null;
let _cachedCompetitions: WorldCompetitionItem[] | null = null;

function buildWorldCache() {
  if (_cachedLocations && _cachedCountries && _cachedCompetitions) return;

  const stadiumRecords = getAllStadiums();
  const stadiumByClubId: Record<string, StadiumRecord> = {};
  for (const s of stadiumRecords) {
    stadiumByClubId[s.clubId] = s;
  }

  const locations: WorldLocationItem[] = [];
  const countriesMap: Record<string, WorldCountrySummary> = {};

  const ensureCountrySummary = (rawCountry: string): WorldCountrySummary => {
    const canonical = normalizeCountryName(rawCountry || 'International');
    if (countriesMap[canonical]) return countriesMap[canonical];

    const meta = getCountryMetadata(canonical);
    const confederation = meta?.confederation || 'UEFA';
    const continent = getContinentForCountry(canonical, confederation);
    const coords = getCountryCoordinateInfo(canonical);

    const summary: WorldCountrySummary = {
      country: canonical,
      code: meta?.fifaCode || canonical.slice(0, 3).toUpperCase(),
      flagEmoji: meta?.flag || getCountryFlag(canonical),
      flagUrl: getCountryFlagUrl(canonical, 160),
      continent,
      confederation,
      coordinates: coords,
      nationalStadiumName: meta?.stadium || `${canonical} National Stadium`,
      clubs: [],
      stadiums: [],
      domesticLeagues: [],
      domesticCups: FLAGSHIP_CUPS_BY_COUNTRY[canonical] ? [...FLAGSHIP_CUPS_BY_COUNTRY[canonical]] : [],
    };
    countriesMap[canonical] = summary;
    return summary;
  };

  // Seed all FIFA countries first so national teams without active DB entries or clubs are still represented cleanly
  for (const meta of FIFA_COUNTRY_METADATA) {
    ensureCountrySummary(meta.canonicalName);
  }

  // Track stadium groups by canonical stadium name + city so multi-club stadiums (e.g. San Siro, Olímpico, Women's/Men's) combine cleanly
  const stadiumBuckets: Record<
    string,
    {
      name: string;
      city: string;
      country: string;
      countryCode: string;
      continent: ContinentName;
      confederation: ConfederationType;
      flagEmoji: string;
      lat: number;
      lng: number;
      capacity: number;
      yearOpened?: number;
      surface?: string;
      isVerifiedStadium: boolean;
      imageUrl: string;
      description: string;
      mapsSearchUrl: string;
      streetViewUrl: string;
      homeTeams: Array<{ id: string; name: string; gender: GenderType; crestUrl?: string }>;
    }
  > = {};

  // 1. Clubs from CLUB_TEAMS_DATABASE paired with verified/hub stadium data
  CLUB_TEAMS_DATABASE.forEach((club, idx) => {
    const stadiumRec = stadiumByClubId[club.id];
    const countrySummary = ensureCountrySummary(stadiumRec?.country || club.country);
    const lat = stadiumRec ? stadiumRec.coordinates.lat : countrySummary.coordinates.lat + ((idx % 5) - 2) * 0.12;
    const lng = stadiumRec ? stadiumRec.coordinates.lng : countrySummary.coordinates.lng + ((idx % 5) - 2) * 0.12;
    const city = stadiumRec?.city || countrySummary.coordinates.city;

    const clubItem: WorldLocationItem = {
      id: club.id,
      teamId: club.id,
      name: club.name,
      shortName: club.shortName,
      type: 'club',
      subType: club.gender,
      country: countrySummary.country,
      countryCode: countrySummary.code,
      continent: countrySummary.continent,
      city,
      lat,
      lng,
      crestUrl: stadiumRec?.clubCrestUrl || club.crestUrl,
      fallbackCrestUrl: stadiumRec?.fallbackCrestUrl,
      flagEmoji: countrySummary.flagEmoji,
      flagUrl: countrySummary.flagUrl,
      primaryColor: club.primaryColor,
      secondaryColor: club.secondaryColor,
      capacity: club.stadiumCapacity || stadiumRec?.capacity,
      isVerifiedStadium: Boolean(stadiumRec?.isVerifiedStadium),
      confederation: countrySummary.confederation,
      league: club.league,
      stadiumName: stadiumRec?.name || club.stadium,
      imageUrl: stadiumRec?.imageUrl,
      description: stadiumRec?.description || `${club.name} competes in ${club.league} (${countrySummary.country}).`,
      mapsSearchUrl: stadiumRec?.mapsSearchUrl,
      streetViewUrl: stadiumRec?.streetViewUrl,
    };

    locations.push(clubItem);
    countrySummary.clubs.push(clubItem);

    if (club.league && !countrySummary.domesticLeagues.includes(club.league)) {
      countrySummary.domesticLeagues.push(club.league);
    }

    if (stadiumRec) {
      const bucketKey = `${stadiumRec.name.toLowerCase()}::${countrySummary.country.toLowerCase()}`;
      if (!stadiumBuckets[bucketKey]) {
        stadiumBuckets[bucketKey] = {
          name: stadiumRec.name,
          city: stadiumRec.city,
          country: countrySummary.country,
          countryCode: countrySummary.code,
          continent: countrySummary.continent,
          confederation: countrySummary.confederation,
          flagEmoji: countrySummary.flagEmoji,
          lat: stadiumRec.coordinates.lat,
          lng: stadiumRec.coordinates.lng,
          capacity: stadiumRec.capacity,
          yearOpened: stadiumRec.yearOpened,
          surface: stadiumRec.surface,
          isVerifiedStadium: stadiumRec.isVerifiedStadium,
          imageUrl: stadiumRec.imageUrl,
          description: stadiumRec.description,
          mapsSearchUrl: stadiumRec.mapsSearchUrl,
          streetViewUrl: stadiumRec.streetViewUrl,
          homeTeams: [],
        };
      }
      stadiumBuckets[bucketKey].homeTeams.push({
        id: club.id,
        name: club.name,
        gender: club.gender,
        crestUrl: clubItem.crestUrl,
      });
    }
  });

  // 2. Deduplicated Stadium Locations
  Object.values(stadiumBuckets).forEach((bucket, idx) => {
    const stadiumItem: WorldLocationItem = {
      id: `stadium-venue-${idx}-${bucket.countryCode.toLowerCase()}`,
      teamId: bucket.homeTeams[0]?.id,
      name: bucket.name,
      type: 'stadium',
      country: bucket.country,
      countryCode: bucket.countryCode,
      continent: bucket.continent,
      city: bucket.city,
      lat: bucket.lat,
      lng: bucket.lng,
      crestUrl: bucket.homeTeams[0]?.crestUrl,
      flagEmoji: bucket.flagEmoji,
      capacity: bucket.capacity,
      yearOpened: bucket.yearOpened,
      surface: bucket.surface,
      isVerifiedStadium: bucket.isVerifiedStadium,
      confederation: bucket.confederation,
      stadiumName: bucket.name,
      homeTeams: bucket.homeTeams,
      imageUrl: bucket.imageUrl,
      description: bucket.description,
      mapsSearchUrl: bucket.mapsSearchUrl,
      streetViewUrl: bucket.streetViewUrl,
    };
    locations.push(stadiumItem);
    const countrySummary = countriesMap[bucket.country];
    if (countrySummary) {
      countrySummary.stadiums.push(stadiumItem);
    }
  });

  // 3. National Teams from NATIONAL_TEAMS_DATABASE
  NATIONAL_TEAMS_DATABASE.forEach((nt) => {
    const countrySummary = ensureCountrySummary(nt.country);
    const offset = nt.gender === 'women' ? 0.08 : 0;
    const ntItem: WorldLocationItem = {
      id: nt.id,
      teamId: nt.id,
      name: nt.name,
      shortName: nt.shortName,
      type: 'national',
      subType: nt.gender,
      country: countrySummary.country,
      countryCode: countrySummary.code,
      continent: countrySummary.continent,
      city: countrySummary.coordinates.city,
      lat: countrySummary.coordinates.lat + offset,
      lng: countrySummary.coordinates.lng + offset,
      crestUrl: nt.crestUrl,
      flagEmoji: nt.flag || countrySummary.flagEmoji,
      flagUrl: countrySummary.flagUrl,
      primaryColor: nt.primaryColor,
      secondaryColor: nt.secondaryColor,
      capacity: nt.stadiumCapacity,
      confederation: nt.confederation || countrySummary.confederation,
      stadiumName: nt.stadium || countrySummary.nationalStadiumName,
      description: `${nt.name} represents ${countrySummary.country} (${nt.confederation || countrySummary.confederation}). Home ground: ${nt.stadium || countrySummary.nationalStadiumName}.`,
    };
    locations.push(ntItem);
    if (nt.gender === 'women') {
      countrySummary.womensNationalTeam = ntItem;
    } else {
      countrySummary.mensNationalTeam = ntItem;
    }
  });

  // 4. Build Competitions Directory (Core + Dynamic Domestic Leagues from Database)
  const competitions: WorldCompetitionItem[] = [];
  const leagueGroups: Record<
    string,
    {
      name: string;
      gender: GenderType;
      country: string;
      continent: ContinentName;
      confederation: ConfederationType;
      lat: number;
      lng: number;
      teams: Array<{ id: string; name: string; country: string; crestUrl?: string }>;
    }
  > = {};

  for (const clubItem of locations) {
    if (clubItem.type !== 'club' || !clubItem.league) continue;
    const key = `${clubItem.league.toLowerCase()}::${clubItem.subType || 'men'}`;
    if (!leagueGroups[key]) {
      const cInfo = getCountryCoordinateInfo(clubItem.country);
      leagueGroups[key] = {
        name: clubItem.league,
        gender: clubItem.subType || 'men',
        country: clubItem.country,
        continent: clubItem.continent,
        confederation: clubItem.confederation,
        lat: cInfo.lat,
        lng: cInfo.lng,
        teams: [],
      };
    }
    leagueGroups[key].teams.push({
      id: clubItem.id,
      name: clubItem.name,
      country: clubItem.country,
      crestUrl: clubItem.crestUrl,
    });
  }

  // Enrich Core International / Continental / Cup competitions with real database teams
  for (const core of CORE_COMPETITIONS) {
    let participatingTeams: WorldCompetitionItem['participatingTeams'] = [];
    if (core.type === 'international') {
      participatingTeams = locations
        .filter(
          (l) =>
            l.type === 'national' &&
            l.subType === core.gender &&
            (!core.confederation || l.confederation === core.confederation)
        )
        .slice(0, 24)
        .map((t) => ({ id: t.id, name: t.name, country: t.country, crestUrl: t.crestUrl }));
    } else if (core.type === 'continental') {
      participatingTeams = locations
        .filter(
          (l) =>
            l.type === 'club' &&
            l.subType === core.gender &&
            (!core.confederation || l.confederation === core.confederation)
        )
        .slice(0, 24)
        .map((t) => ({ id: t.id, name: t.name, country: t.country, crestUrl: t.crestUrl }));
    } else if (core.country) {
      participatingTeams = locations
        .filter((l) => l.type === 'club' && l.subType === core.gender && l.country === core.country)
        .slice(0, 20)
        .map((t) => ({ id: t.id, name: t.name, country: t.country, crestUrl: t.crestUrl }));
    }

    competitions.push({
      ...core,
      participatingTeams,
    });
  }

  // Add all Domestic Leagues present in the club database
  Object.values(leagueGroups)
    .sort((a, b) => b.teams.length - a.teams.length || a.name.localeCompare(b.name))
    .forEach((lg, idx) => {
      competitions.push({
        id: `league-${idx}-${lg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: lg.name,
        type: 'league',
        gender: lg.gender,
        region: lg.country,
        country: lg.country,
        continent: lg.continent,
        confederation: lg.confederation,
        description: `Domestic ${lg.gender === 'women' ? "women's" : "men's"} league in ${lg.country} featuring ${lg.teams.length} registered DodaEona F.C. clubs.`,
        lat: lg.lat,
        lng: lg.lng,
        participatingTeams: lg.teams,
      });
    });

  _cachedLocations = locations;
  _cachedCountries = Object.values(countriesMap).sort((a, b) => {
    const scoreA = a.clubs.length * 3 + (a.mensNationalTeam ? 1 : 0);
    const scoreB = b.clubs.length * 3 + (b.mensNationalTeam ? 1 : 0);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.country.localeCompare(b.country);
  });
  _cachedCompetitions = competitions;
}

export function getAllWorldLocations(): WorldLocationItem[] {
  buildWorldCache();
  return _cachedLocations || [];
}

export function getAllWorldCountries(): WorldCountrySummary[] {
  buildWorldCache();
  return _cachedCountries || [];
}

export function getAllWorldCompetitions(): WorldCompetitionItem[] {
  buildWorldCache();
  return _cachedCompetitions || [];
}

export function getCountrySummaryByName(countryName: string): WorldCountrySummary | null {
  buildWorldCache();
  const normalized = normalizeCountryName(countryName);
  return (_cachedCountries || []).find((c) => c.country === normalized) || null;
}

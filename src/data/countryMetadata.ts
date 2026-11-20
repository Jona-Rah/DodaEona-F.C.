import { ConfederationType } from '../types/matchCentre';

export interface CountryMetadata {
  canonicalName: string;
  fifaCode: string;
  flag: string;
  confederation: ConfederationType;
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  aliases?: string[];
}

export const FIFA_COUNTRY_METADATA: CountryMetadata[] = [
  // ======================== UEFA (55) ========================
  { canonicalName: 'Albania', fifaCode: 'ALB', flag: '🇦🇱', confederation: 'UEFA', primaryColor: '#E41E20', secondaryColor: '#111827', stadium: 'Arena Kombëtare' },
  { canonicalName: 'Andorra', fifaCode: 'AND', flag: '🇦🇩', confederation: 'UEFA', primaryColor: '#10358B', secondaryColor: '#FEDF00', stadium: 'Estadi Nacional' },
  { canonicalName: 'Armenia', fifaCode: 'ARM', flag: '🇦🇲', confederation: 'UEFA', primaryColor: '#D90012', secondaryColor: '#0033A0', stadium: 'Vazgen Sargsyan Republican Stadium' },
  { canonicalName: 'Austria', fifaCode: 'AUT', flag: '🇦🇹', confederation: 'UEFA', primaryColor: '#ED2939', secondaryColor: '#FFFFFF', stadium: 'Ernst-Happel-Stadion' },
  { canonicalName: 'Azerbaijan', fifaCode: 'AZE', flag: '🇦🇿', confederation: 'UEFA', primaryColor: '#00B5E2', secondaryColor: '#EF3340', stadium: 'Baku Olympic Stadium' },
  { canonicalName: 'Belarus', fifaCode: 'BLR', flag: '🇧🇾', confederation: 'UEFA', primaryColor: '#C8313E', secondaryColor: '#1A7B3B', stadium: 'Dinamo Stadium' },
  { canonicalName: 'Belgium', fifaCode: 'BEL', flag: '🇧🇪', confederation: 'UEFA', primaryColor: '#C8102E', secondaryColor: '#FFD100', stadium: 'King Baudouin Stadium' },
  { canonicalName: 'Bosnia & Herzegovina', fifaCode: 'BIH', flag: '🇧🇦', confederation: 'UEFA', primaryColor: '#002F6C', secondaryColor: '#FECB00', stadium: 'Bilino Polje', aliases: ['Bosnia Herzegovina', 'Bosnia and Herzegovina'] },
  { canonicalName: 'Bulgaria', fifaCode: 'BUL', flag: '🇧🇬', confederation: 'UEFA', primaryColor: '#FFFFFF', secondaryColor: '#00966E', stadium: 'Vasil Levski National Stadium' },
  { canonicalName: 'Croatia', fifaCode: 'CRO', flag: '🇭🇷', confederation: 'UEFA', primaryColor: '#D81E05', secondaryColor: '#171796', stadium: 'Stadion Maksimir' },
  { canonicalName: 'Cyprus', fifaCode: 'CYP', flag: '🇨🇾', confederation: 'UEFA', primaryColor: '#0055A4', secondaryColor: '#FFFFFF', stadium: 'GSP Stadium' },
  { canonicalName: 'Czech Republic', fifaCode: 'CZE', flag: '🇨🇿', confederation: 'UEFA', primaryColor: '#C8102E', secondaryColor: '#11457E', stadium: 'Fortuna Arena', aliases: ['Czechia'] },
  { canonicalName: 'Denmark', fifaCode: 'DEN', flag: '🇩🇰', confederation: 'UEFA', primaryColor: '#C60C30', secondaryColor: '#FFFFFF', stadium: 'Parken Stadium' },
  { canonicalName: 'England', fifaCode: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', primaryColor: '#FFFFFF', secondaryColor: '#002366', stadium: 'Wembley Stadium' },
  { canonicalName: 'Estonia', fifaCode: 'EST', flag: '🇪🇪', confederation: 'UEFA', primaryColor: '#0072CE', secondaryColor: '#111827', stadium: 'A. Le Coq Arena' },
  { canonicalName: 'Faroe Islands', fifaCode: 'FRO', flag: '🇫🇴', confederation: 'UEFA', primaryColor: '#FFFFFF', secondaryColor: '#0065BD', stadium: 'Tórsvøllur' },
  { canonicalName: 'Finland', fifaCode: 'FIN', flag: '🇫🇮', confederation: 'UEFA', primaryColor: '#FFFFFF', secondaryColor: '#003580', stadium: 'Helsinki Olympic Stadium' },
  { canonicalName: 'France', fifaCode: 'FRA', flag: '🇫🇷', confederation: 'UEFA', primaryColor: '#002654', secondaryColor: '#ED2939', stadium: 'Stade de France' },
  { canonicalName: 'Georgia', fifaCode: 'GEO', flag: '🇬🇪', confederation: 'UEFA', primaryColor: '#FFFFFF', secondaryColor: '#DA291C', stadium: 'Boris Paichadze Dinamo Arena' },
  { canonicalName: 'Germany', fifaCode: 'GER', flag: '🇩🇪', confederation: 'UEFA', primaryColor: '#111827', secondaryColor: '#FFCC00', stadium: 'Olympiastadion Berlin' },
  { canonicalName: 'Gibraltar', fifaCode: 'GIB', flag: '🇬🇮', confederation: 'UEFA', primaryColor: '#DA291C', secondaryColor: '#FFFFFF', stadium: 'Victoria Stadium' },
  { canonicalName: 'Greece', fifaCode: 'GRE', flag: '🇬🇷', confederation: 'UEFA', primaryColor: '#0D5EAF', secondaryColor: '#FFFFFF', stadium: 'OPAP Arena' },
  { canonicalName: 'Hungary', fifaCode: 'HUN', flag: '🇭🇺', confederation: 'UEFA', primaryColor: '#CD2A3E', secondaryColor: '#436F4D', stadium: 'Puskás Aréna' },
  { canonicalName: 'Iceland', fifaCode: 'ISL', flag: '🇮🇸', confederation: 'UEFA', primaryColor: '#02529C', secondaryColor: '#DC1E35', stadium: 'Laugardalsvöllur' },
  { canonicalName: 'Israel', fifaCode: 'ISR', flag: '🇮🇱', confederation: 'UEFA', primaryColor: '#0038B8', secondaryColor: '#FFFFFF', stadium: 'Bloomfield Stadium' },
  { canonicalName: 'Italy', fifaCode: 'ITA', flag: '🇮🇹', confederation: 'UEFA', primaryColor: '#0066B2', secondaryColor: '#008C45', stadium: 'Stadio Olimpico' },
  { canonicalName: 'Kazakhstan', fifaCode: 'KAZ', flag: '🇰🇿', confederation: 'UEFA', primaryColor: '#00AFCA', secondaryColor: '#FEC50C', stadium: 'Astana Arena' },
  { canonicalName: 'Kosovo', fifaCode: 'KOS', flag: '🇽🇰', confederation: 'UEFA', primaryColor: '#244AA5', secondaryColor: '#D0A650', stadium: 'Fadil Vokrri Stadium' },
  { canonicalName: 'Latvia', fifaCode: 'LVA', flag: '🇱🇻', confederation: 'UEFA', primaryColor: '#9E3039', secondaryColor: '#FFFFFF', stadium: 'Daugava Stadium' },
  { canonicalName: 'Liechtenstein', fifaCode: 'LIE', flag: '🇱🇮', confederation: 'UEFA', primaryColor: '#002B7F', secondaryColor: '#CE1126', stadium: 'Rheinpark Stadion' },
  { canonicalName: 'Lithuania', fifaCode: 'LTU', flag: '🇱🇹', confederation: 'UEFA', primaryColor: '#FDB913', secondaryColor: '#006A44', stadium: 'Darius and Girėnas Stadium' },
  { canonicalName: 'Luxembourg', fifaCode: 'LUX', flag: '🇱🇺', confederation: 'UEFA', primaryColor: '#00A1DE', secondaryColor: '#ED2939', stadium: 'Stade de Luxembourg', aliases: ['Luxemburg'] },
  { canonicalName: 'Malta', fifaCode: 'MLT', flag: '🇲🇹', confederation: 'UEFA', primaryColor: '#CF142B', secondaryColor: '#FFFFFF', stadium: 'National Stadium, Ta\' Qali' },
  { canonicalName: 'Moldova', fifaCode: 'MDA', flag: '🇲🇩', confederation: 'UEFA', primaryColor: '#0046AE', secondaryColor: '#FFD200', stadium: 'Zimbru Stadium' },
  { canonicalName: 'Montenegro', fifaCode: 'MNE', flag: '🇲🇪', confederation: 'UEFA', primaryColor: '#C40308', secondaryColor: '#D4AF37', stadium: 'Podgorica City Stadium' },
  { canonicalName: 'Netherlands', fifaCode: 'NED', flag: '🇳🇱', confederation: 'UEFA', primaryColor: '#F36C21', secondaryColor: '#111827', stadium: 'Johan Cruyff Arena', aliases: ['Holland'] },
  { canonicalName: 'North Macedonia', fifaCode: 'MKD', flag: '🇲🇰', confederation: 'UEFA', primaryColor: '#D20000', secondaryColor: '#FFE600', stadium: 'Toše Proeski Arena', aliases: ['FYR Macedonia', 'Macedonia'] },
  { canonicalName: 'Northern Ireland', fifaCode: 'NIR', flag: '🇬🇧', confederation: 'UEFA', primaryColor: '#007A3D', secondaryColor: '#FFFFFF', stadium: 'Windsor Park' },
  { canonicalName: 'Norway', fifaCode: 'NOR', flag: '🇳🇴', confederation: 'UEFA', primaryColor: '#BA0C2F', secondaryColor: '#00205B', stadium: 'Ullevaal Stadion' },
  { canonicalName: 'Poland', fifaCode: 'POL', flag: '🇵🇱', confederation: 'UEFA', primaryColor: '#DC143C', secondaryColor: '#FFFFFF', stadium: 'PGE Narodowy' },
  { canonicalName: 'Portugal', fifaCode: 'POR', flag: '🇵🇹', confederation: 'UEFA', primaryColor: '#C8102E', secondaryColor: '#006600', stadium: 'Estádio Nacional' },
  { canonicalName: 'Republic of Ireland', fifaCode: 'IRL', flag: '🇮🇪', confederation: 'UEFA', primaryColor: '#169B62', secondaryColor: '#FF883E', stadium: 'Aviva Stadium', aliases: ['Ireland'] },
  { canonicalName: 'Romania', fifaCode: 'ROU', flag: '🇷🇴', confederation: 'UEFA', primaryColor: '#FCD116', secondaryColor: '#002B7F', stadium: 'Arena Națională' },
  { canonicalName: 'Russia', fifaCode: 'RUS', flag: '🇷🇺', confederation: 'UEFA', primaryColor: '#9E1B32', secondaryColor: '#0039A6', stadium: 'Luzhniki Stadium' },
  { canonicalName: 'San Marino', fifaCode: 'SMR', flag: '🇸🇲', confederation: 'UEFA', primaryColor: '#5EB6E4', secondaryColor: '#FFFFFF', stadium: 'San Marino Stadium' },
  { canonicalName: 'Scotland', fifaCode: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA', primaryColor: '#003580', secondaryColor: '#FFFFFF', stadium: 'Hampden Park', aliases: ['Scottland'] },
  { canonicalName: 'Serbia', fifaCode: 'SRB', flag: '🇷🇸', confederation: 'UEFA', primaryColor: '#C6363C', secondaryColor: '#0C4076', stadium: 'Rajko Mitić Stadium' },
  { canonicalName: 'Slovakia', fifaCode: 'SVK', flag: '🇸🇰', confederation: 'UEFA', primaryColor: '#0B4EA2', secondaryColor: '#EE1C25', stadium: 'Tehelné pole' },
  { canonicalName: 'Slovenia', fifaCode: 'SVN', flag: '🇸🇮', confederation: 'UEFA', primaryColor: '#005DA4', secondaryColor: '#FFFFFF', stadium: 'Stožice Stadium' },
  { canonicalName: 'Spain', fifaCode: 'ESP', flag: '🇪🇸', confederation: 'UEFA', primaryColor: '#AA151B', secondaryColor: '#F1BF00', stadium: 'Estadio Santiago Bernabéu' },
  { canonicalName: 'Sweden', fifaCode: 'SWE', flag: '🇸🇪', confederation: 'UEFA', primaryColor: '#FECC02', secondaryColor: '#006AA7', stadium: 'Strawberry Arena' },
  { canonicalName: 'Switzerland', fifaCode: 'SUI', flag: '🇨🇭', confederation: 'UEFA', primaryColor: '#DA291C', secondaryColor: '#FFFFFF', stadium: 'St. Jakob-Park' },
  { canonicalName: 'Türkiye', fifaCode: 'TUR', flag: '🇹🇷', confederation: 'UEFA', primaryColor: '#E30A17', secondaryColor: '#FFFFFF', stadium: 'Atatürk Olympic Stadium', aliases: ['Turkey', 'Turkiye'] },
  { canonicalName: 'Ukraine', fifaCode: 'UKR', flag: '🇺🇦', confederation: 'UEFA', primaryColor: '#FFD700', secondaryColor: '#005BBB', stadium: 'NSC Olimpiyskiy' },
  { canonicalName: 'Wales', fifaCode: 'WAL', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', confederation: 'UEFA', primaryColor: '#C8102E', secondaryColor: '#00B140', stadium: 'Cardiff City Stadium' },

  // ======================== CONMEBOL (10) ========================
  { canonicalName: 'Argentina', fifaCode: 'ARG', flag: '🇦🇷', confederation: 'CONMEBOL', primaryColor: '#75AADB', secondaryColor: '#FFFFFF', stadium: 'Estadio Monumental' },
  { canonicalName: 'Bolivia', fifaCode: 'BOL', flag: '🇧🇴', confederation: 'CONMEBOL', primaryColor: '#007A33', secondaryColor: '#F9E300', stadium: 'Estadio Hernando Siles' },
  { canonicalName: 'Brazil', fifaCode: 'BRA', flag: '🇧🇷', confederation: 'CONMEBOL', primaryColor: '#FFDF00', secondaryColor: '#009C3B', stadium: 'Maracanã' },
  { canonicalName: 'Chile', fifaCode: 'CHI', flag: '🇨🇱', confederation: 'CONMEBOL', primaryColor: '#D52B1E', secondaryColor: '#0039A6', stadium: 'Estadio Nacional Julio Martínez Prádanos' },
  { canonicalName: 'Colombia', fifaCode: 'COL', flag: '🇨🇴', confederation: 'CONMEBOL', primaryColor: '#FCD116', secondaryColor: '#003893', stadium: 'Estadio Metropolitano Roberto Meléndez' },
  { canonicalName: 'Ecuador', fifaCode: 'ECU', flag: '🇪🇨', confederation: 'CONMEBOL', primaryColor: '#FFD100', secondaryColor: '#034EA2', stadium: 'Estadio Rodrigo Paz Delgado' },
  { canonicalName: 'Paraguay', fifaCode: 'PAR', flag: '🇵🇾', confederation: 'CONMEBOL', primaryColor: '#D52B1E', secondaryColor: '#0038A8', stadium: 'Estadio Defensores del Chaco' },
  { canonicalName: 'Peru', fifaCode: 'PER', flag: '🇵🇪', confederation: 'CONMEBOL', primaryColor: '#D91023', secondaryColor: '#FFFFFF', stadium: 'Estadio Nacional del Perú' },
  { canonicalName: 'Uruguay', fifaCode: 'URU', flag: '🇺🇾', confederation: 'CONMEBOL', primaryColor: '#5EB6E4', secondaryColor: '#111827', stadium: 'Estadio Centenario' },
  { canonicalName: 'Venezuela', fifaCode: 'VEN', flag: '🇻🇪', confederation: 'CONMEBOL', primaryColor: '#6F1D3A', secondaryColor: '#FCD116', stadium: 'Estadio Monumental de Maturín' },

  // ======================== CONCACAF (35 FIFA + Curaçao/French Guiana) ========================
  { canonicalName: 'Antigua and Barbuda', fifaCode: 'ATG', flag: '🇦🇬', confederation: 'CONCACAF', primaryColor: '#CE1126', secondaryColor: '#FCD116', stadium: 'Sir Vivian Richards Stadium', aliases: ['Antigua & Barbuda'] },
  { canonicalName: 'Aruba', fifaCode: 'ARU', flag: '🇦🇼', confederation: 'CONCACAF', primaryColor: '#418FDE', secondaryColor: '#FFD100', stadium: 'Trinidad Stadium' },
  { canonicalName: 'Bahamas', fifaCode: 'BAH', flag: '🇧🇸', confederation: 'CONCACAF', primaryColor: '#00778B', secondaryColor: '#FFC72C', stadium: 'Thomas Robinson Stadium' },
  { canonicalName: 'Barbados', fifaCode: 'BRB', flag: '🇧🇧', confederation: 'CONCACAF', primaryColor: '#00267F', secondaryColor: '#FFC726', stadium: 'Wildey Turf' },
  { canonicalName: 'Belize', fifaCode: 'BLZ', flag: '🇧🇿', confederation: 'CONCACAF', primaryColor: '#171696', secondaryColor: '#D90F19', stadium: 'FFB Stadium' },
  { canonicalName: 'Bermuda', fifaCode: 'BER', flag: '🇧🇲', confederation: 'CONCACAF', primaryColor: '#CF142B', secondaryColor: '#00247D', stadium: 'Bermuda National Stadium' },
  { canonicalName: 'British Virgin Islands', fifaCode: 'VGB', flag: '🇻🇬', confederation: 'CONCACAF', primaryColor: '#00247D', secondaryColor: '#009A44', stadium: 'A. O. Shirley Recreation Ground' },
  { canonicalName: 'Canada', fifaCode: 'CAN', flag: '🇨🇦', confederation: 'CONCACAF', primaryColor: '#D80621', secondaryColor: '#FFFFFF', stadium: 'BMO Field' },
  { canonicalName: 'Cayman Islands', fifaCode: 'CAY', flag: '🇰🇾', confederation: 'CONCACAF', primaryColor: '#00247D', secondaryColor: '#CF142B', stadium: 'Truman Bodden Sports Complex' },
  { canonicalName: 'Costa Rica', fifaCode: 'CRC', flag: '🇨🇷', confederation: 'CONCACAF', primaryColor: '#CE1126', secondaryColor: '#002B7F', stadium: 'Estadio Nacional de Costa Rica' },
  { canonicalName: 'Cuba', fifaCode: 'CUB', flag: '🇨🇺', confederation: 'CONCACAF', primaryColor: '#002A8F', secondaryColor: '#CF142B', stadium: 'Estadio Pedro Marrero' },
  { canonicalName: 'Curaçao', fifaCode: 'CUW', flag: '🇨🇼', confederation: 'CONCACAF', primaryColor: '#002B7F', secondaryColor: '#F9E814', stadium: 'Ergilio Hato Stadium', aliases: ['Curacao', 'Netherlands Antilles'] },
  { canonicalName: 'Dominica', fifaCode: 'DMA', flag: '🇩🇲', confederation: 'CONCACAF', primaryColor: '#006B3F', secondaryColor: '#FCD116', stadium: 'Windsor Park' },
  { canonicalName: 'Dominican Republic', fifaCode: 'DOM', flag: '🇩🇴', confederation: 'CONCACAF', primaryColor: '#002D62', secondaryColor: '#CE1126', stadium: 'Estadio Olímpico Félix Sánchez' },
  { canonicalName: 'El Salvador', fifaCode: 'SLV', flag: '🇸🇻', confederation: 'CONCACAF', primaryColor: '#0F47AF', secondaryColor: '#FFFFFF', stadium: 'Estadio Cuscatlán' },
  { canonicalName: 'Grenada', fifaCode: 'GRN', flag: '🇬🇩', confederation: 'CONCACAF', primaryColor: '#CE1126', secondaryColor: '#007A5E', stadium: 'Kirani James Athletic Stadium' },
  { canonicalName: 'Guatemala', fifaCode: 'GUA', flag: '🇬🇹', confederation: 'CONCACAF', primaryColor: '#4997D0', secondaryColor: '#FFFFFF', stadium: 'Estadio Doroteo Guamuch Flores' },
  { canonicalName: 'Guyana', fifaCode: 'GUY', flag: '🇬🇾', confederation: 'CONCACAF', primaryColor: '#FCD116', secondaryColor: '#009E49', stadium: 'Synthetic Track and Field Facility' },
  { canonicalName: 'Haiti', fifaCode: 'HAI', flag: '🇭🇹', confederation: 'CONCACAF', primaryColor: '#00209F', secondaryColor: '#D21034', stadium: 'Stade Sylvio Cator' },
  { canonicalName: 'Honduras', fifaCode: 'HON', flag: '🇭🇳', confederation: 'CONCACAF', primaryColor: '#0073CF', secondaryColor: '#FFFFFF', stadium: 'Estadio Nacional Chelato Uclés' },
  { canonicalName: 'Jamaica', fifaCode: 'JAM', flag: '🇯🇲', confederation: 'CONCACAF', primaryColor: '#FED100', secondaryColor: '#009B3A', stadium: 'Independence Park' },
  { canonicalName: 'Mexico', fifaCode: 'MEX', flag: '🇲🇽', confederation: 'CONCACAF', primaryColor: '#006847', secondaryColor: '#CE1126', stadium: 'Estadio Azteca' },
  { canonicalName: 'Montserrat', fifaCode: 'MSR', flag: '🇲🇸', confederation: 'CONCACAF', primaryColor: '#00247D', secondaryColor: '#009A44', stadium: 'Blakes Estate Stadium' },
  { canonicalName: 'Nicaragua', fifaCode: 'NCA', flag: '🇳🇮', confederation: 'CONCACAF', primaryColor: '#0067C6', secondaryColor: '#FFFFFF', stadium: 'Estadio Nacional de Fútbol' },
  { canonicalName: 'Panama', fifaCode: 'PAN', flag: '🇵🇦', confederation: 'CONCACAF', primaryColor: '#D21034', secondaryColor: '#005293', stadium: 'Estadio Rommel Fernández' },
  { canonicalName: 'Puerto Rico', fifaCode: 'PUR', flag: '🇵🇷', confederation: 'CONCACAF', primaryColor: '#ED0000', secondaryColor: '#0050F0', stadium: 'Estadio Juan Ramón Loubriel' },
  { canonicalName: 'Saint Kitts and Nevis', fifaCode: 'SKN', flag: '🇰🇳', confederation: 'CONCACAF', primaryColor: '#009E49', secondaryColor: '#CE1126', stadium: 'Warner Park', aliases: ['St Kitts Nevis', 'St. Kitts and Nevis'] },
  { canonicalName: 'Saint Lucia', fifaCode: 'LCA', flag: '🇱🇨', confederation: 'CONCACAF', primaryColor: '#66CCFF', secondaryColor: '#FCD116', stadium: 'Daren Sammy Cricket Ground', aliases: ['St Lucia', 'St. Lucia'] },
  { canonicalName: 'Saint Vincent and the Grenadines', fifaCode: 'VIN', flag: '🇻🇨', confederation: 'CONCACAF', primaryColor: '#0072C6', secondaryColor: '#FCD116', stadium: 'Arnos Vale Stadium' },
  { canonicalName: 'Suriname', fifaCode: 'SUR', flag: '🇸🇷', confederation: 'CONCACAF', primaryColor: '#377E3F', secondaryColor: '#B40A2D', stadium: 'Dr. Ir. Franklin Essed Stadion' },
  { canonicalName: 'Trinidad and Tobago', fifaCode: 'TRI', flag: '🇹🇹', confederation: 'CONCACAF', primaryColor: '#DA1A35', secondaryColor: '#111827', stadium: 'Hasely Crawford Stadium', aliases: ['Trinidad & Tobago'] },
  { canonicalName: 'Turks and Caicos Islands', fifaCode: 'TCA', flag: '🇹🇨', confederation: 'CONCACAF', primaryColor: '#00247D', secondaryColor: '#FFD100', stadium: 'TCIFA National Academy' },
  { canonicalName: 'United States', fifaCode: 'USA', flag: '🇺🇸', confederation: 'CONCACAF', primaryColor: '#002868', secondaryColor: '#BF0A30', stadium: 'MetLife Stadium', aliases: ['USA', 'U.S.A.', 'USWNT', 'USMNT'] },
  { canonicalName: 'US Virgin Islands', fifaCode: 'VIR', flag: '🇻🇮', confederation: 'CONCACAF', primaryColor: '#002868', secondaryColor: '#FCD116', stadium: 'Bethlehem Soccer Stadium' },
  { canonicalName: 'Anguilla', fifaCode: 'AIA', flag: '🇦🇮', confederation: 'CONCACAF', primaryColor: '#00247D', secondaryColor: '#FF9900', stadium: 'Raymond E. Guishard Technical Centre' },

  // ======================== CAF (54) ========================
  { canonicalName: 'Algeria', fifaCode: 'ALG', flag: '🇩🇿', confederation: 'CAF', primaryColor: '#006233', secondaryColor: '#FFFFFF', stadium: 'Stade du 5 Juillet' },
  { canonicalName: 'Angola', fifaCode: 'ANG', flag: '🇦🇴', confederation: 'CAF', primaryColor: '#CC092F', secondaryColor: '#111827', stadium: 'Estádio 11 de Novembro' },
  { canonicalName: 'Benin', fifaCode: 'BEN', flag: '🇧🇯', confederation: 'CAF', primaryColor: '#FCD116', secondaryColor: '#008751', stadium: 'Stade de l\'Amitié' },
  { canonicalName: 'Botswana', fifaCode: 'BOT', flag: '🇧🇼', confederation: 'CAF', primaryColor: '#75AADB', secondaryColor: '#111827', stadium: 'Botswana National Stadium' },
  { canonicalName: 'Burkina Faso', fifaCode: 'BFA', flag: '🇧🇫', confederation: 'CAF', primaryColor: '#009E49', secondaryColor: '#EF2B2D', stadium: 'Stade du 4 Août' },
  { canonicalName: 'Burundi', fifaCode: 'BDI', flag: '🇧🇮', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#1EB53A', stadium: 'Intwari Stadium' },
  { canonicalName: 'Cameroon', fifaCode: 'CMR', flag: '🇨🇲', confederation: 'CAF', primaryColor: '#007A5E', secondaryColor: '#FCD116', stadium: 'Olembe Stadium' },
  { canonicalName: 'Cape Verde', fifaCode: 'CPV', flag: '🇨🇻', confederation: 'CAF', primaryColor: '#003893', secondaryColor: '#CF2027', stadium: 'Estádio Nacional de Cabo Verde', aliases: ['Cape Verde Islands', 'Cabo Verde'] },
  { canonicalName: 'Central African Republic', fifaCode: 'CTA', flag: '🇨🇫', confederation: 'CAF', primaryColor: '#003082', secondaryColor: '#FFCE00', stadium: 'Barthélemy Boganda Stadium', aliases: ['CAR'] },
  { canonicalName: 'Chad', fifaCode: 'CHA', flag: '🇹🇩', confederation: 'CAF', primaryColor: '#002664', secondaryColor: '#FECB00', stadium: 'Stade Omnisports Idriss Mahamat Ouya' },
  { canonicalName: 'Comoros', fifaCode: 'COM', flag: '🇰🇲', confederation: 'CAF', primaryColor: '#3D8E33', secondaryColor: '#FFC61E', stadium: 'Stade Omnisports de Malouzini' },
  { canonicalName: 'Congo', fifaCode: 'CGO', flag: '🇨🇬', confederation: 'CAF', primaryColor: '#009543', secondaryColor: '#FBDE4A', stadium: 'Stade Alphonse Massemba-Débat', aliases: ['Republic of the Congo'] },
  { canonicalName: 'DR Congo', fifaCode: 'COD', flag: '🇨🇩', confederation: 'CAF', primaryColor: '#007FFF', secondaryColor: '#CE1021', stadium: 'Stade des Martyrs', aliases: ['Congo DR', 'Democratic Republic of the Congo'] },
  { canonicalName: 'Djibouti', fifaCode: 'DJI', flag: '🇩🇯', confederation: 'CAF', primaryColor: '#6AB2E7', secondaryColor: '#12AD2B', stadium: 'El Hadj Hassan Gouled Aptidon Stadium' },
  { canonicalName: 'Egypt', fifaCode: 'EGY', flag: '🇪🇬', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#111827', stadium: 'Cairo International Stadium' },
  { canonicalName: 'Equatorial Guinea', fifaCode: 'EQG', flag: '🇬🇶', confederation: 'CAF', primaryColor: '#E32118', secondaryColor: '#3E9A00', stadium: 'Estadio de Malabo' },
  { canonicalName: 'Eritrea', fifaCode: 'ERI', flag: '🇪🇷', confederation: 'CAF', primaryColor: '#EA0437', secondaryColor: '#4189DD', stadium: 'Cicero Stadium' },
  { canonicalName: 'Eswatini', fifaCode: 'SWZ', flag: '🇸🇿', confederation: 'CAF', primaryColor: '#3E5EB9', secondaryColor: '#FFD900', stadium: 'Somhlolo National Stadium' },
  { canonicalName: 'Ethiopia', fifaCode: 'ETH', flag: '🇪🇹', confederation: 'CAF', primaryColor: '#078930', secondaryColor: '#FCDD09', stadium: 'Addis Ababa Stadium' },
  { canonicalName: 'Gabon', fifaCode: 'GAB', flag: '🇬🇦', confederation: 'CAF', primaryColor: '#FCD116', secondaryColor: '#009E60', stadium: 'Stade d\'Angondjé' },
  { canonicalName: 'Gambia', fifaCode: 'GAM', flag: '🇬🇲', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#0C1C8C', stadium: 'Independence Stadium', aliases: ['The Gambia'] },
  { canonicalName: 'Ghana', fifaCode: 'GHA', flag: '🇬🇭', confederation: 'CAF', primaryColor: '#FFFFFF', secondaryColor: '#111827', stadium: 'Accra Sports Stadium' },
  { canonicalName: 'Guinea', fifaCode: 'GUI', flag: '🇬🇳', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#FCD116', stadium: 'Stade Général Lansana Conté' },
  { canonicalName: 'Guinea-Bissau', fifaCode: 'GNB', flag: '🇬🇼', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#FCD116', stadium: 'Estádio 24 de Setembro', aliases: ['Guinea Bissau'] },
  { canonicalName: 'Ivory Coast', fifaCode: 'CIV', flag: '🇨🇮', confederation: 'CAF', primaryColor: '#F77F00', secondaryColor: '#009E60', stadium: 'Alassane Ouattara Stadium', aliases: ["Côte d'Ivoire", 'Cote dIvoire'] },
  { canonicalName: 'Kenya', fifaCode: 'KEN', flag: '🇰🇪', confederation: 'CAF', primaryColor: '#BB0000', secondaryColor: '#006600', stadium: 'Moi International Sports Centre' },
  { canonicalName: 'Lesotho', fifaCode: 'LES', flag: '🇱🇸', confederation: 'CAF', primaryColor: '#00209F', secondaryColor: '#009543', stadium: 'Setsoto Stadium' },
  { canonicalName: 'Liberia', fifaCode: 'LBR', flag: '🇱🇷', confederation: 'CAF', primaryColor: '#002868', secondaryColor: '#BF0A30', stadium: 'Samuel Kanyon Doe Sports Complex' },
  { canonicalName: 'Libya', fifaCode: 'LBY', flag: '🇱🇾', confederation: 'CAF', primaryColor: '#239E46', secondaryColor: '#E70013', stadium: 'Tripoli International Stadium' },
  { canonicalName: 'Madagascar', fifaCode: 'MAD', flag: '🇲🇬', confederation: 'CAF', primaryColor: '#FC3D32', secondaryColor: '#007E3A', stadium: 'Mahamasina Municipal Stadium' },
  { canonicalName: 'Malawi', fifaCode: 'MWI', flag: '🇲🇼', confederation: 'CAF', primaryColor: '#CE1126', secondaryColor: '#339E35', stadium: 'Bingu National Stadium' },
  { canonicalName: 'Mali', fifaCode: 'MLI', flag: '🇲🇱', confederation: 'CAF', primaryColor: '#14B53A', secondaryColor: '#FCD116', stadium: 'Stade du 26 Mars' },
  { canonicalName: 'Mauritania', fifaCode: 'MTN', flag: '🇲🇷', confederation: 'CAF', primaryColor: '#006233', secondaryColor: '#FFC400', stadium: 'Stade Cheikha Ould Boïdiya' },
  { canonicalName: 'Mauritius', fifaCode: 'MRI', flag: '🇲🇺', confederation: 'CAF', primaryColor: '#EA2839', secondaryColor: '#1A206D', stadium: 'Côte d\'Or National Sports Complex' },
  { canonicalName: 'Morocco', fifaCode: 'MAR', flag: '🇲🇦', confederation: 'CAF', primaryColor: '#C1272D', secondaryColor: '#006233', stadium: 'Prince Moulay Abdellah Stadium' },
  { canonicalName: 'Mozambique', fifaCode: 'MOZ', flag: '🇲🇿', confederation: 'CAF', primaryColor: '#D21034', secondaryColor: '#FCE100', stadium: 'Estádio do Zimpeto' },
  { canonicalName: 'Namibia', fifaCode: 'NAM', flag: '🇳🇦', confederation: 'CAF', primaryColor: '#003580', secondaryColor: '#D21034', stadium: 'Independence Stadium' },
  { canonicalName: 'Niger', fifaCode: 'NIG', flag: '🇳🇪', confederation: 'CAF', primaryColor: '#E05206', secondaryColor: '#0DB02B', stadium: 'Stade Général Seyni Kountché' },
  { canonicalName: 'Nigeria', fifaCode: 'NGA', flag: '🇳🇬', confederation: 'CAF', primaryColor: '#008751', secondaryColor: '#FFFFFF', stadium: 'Godswill Akpabio International Stadium' },
  { canonicalName: 'Rwanda', fifaCode: 'RWA', flag: '🇷🇼', confederation: 'CAF', primaryColor: '#00A1DE', secondaryColor: '#FAD201', stadium: 'Amahoro Stadium' },
  { canonicalName: 'São Tomé and Príncipe', fifaCode: 'STP', flag: '🇸🇹', confederation: 'CAF', primaryColor: '#12AD2B', secondaryColor: '#FFCE00', stadium: 'Estádio Nacional 12 de Julho' },
  { canonicalName: 'Senegal', fifaCode: 'SEN', flag: '🇸🇳', confederation: 'CAF', primaryColor: '#00853F', secondaryColor: '#FDEF42', stadium: 'Diamniadio Olympic Stadium' },
  { canonicalName: 'Seychelles', fifaCode: 'SEY', flag: '🇸🇨', confederation: 'CAF', primaryColor: '#D62828', secondaryColor: '#003F87', stadium: 'Stade Linité' },
  { canonicalName: 'Sierra Leone', fifaCode: 'SLE', flag: '🇸🇱', confederation: 'CAF', primaryColor: '#1EB53A', secondaryColor: '#0072C6', stadium: 'National Stadium, Freetown' },
  { canonicalName: 'Somalia', fifaCode: 'SOM', flag: '🇸🇴', confederation: 'CAF', primaryColor: '#4189DD', secondaryColor: '#FFFFFF', stadium: 'Mogadishu Stadium' },
  { canonicalName: 'South Africa', fifaCode: 'RSA', flag: '🇿🇦', confederation: 'CAF', primaryColor: '#FFB81C', secondaryColor: '#007A4D', stadium: 'FNB Stadium' },
  { canonicalName: 'South Sudan', fifaCode: 'SSD', flag: '🇸🇸', confederation: 'CAF', primaryColor: '#0F47AF', secondaryColor: '#DA121A', stadium: 'Juba Stadium' },
  { canonicalName: 'Sudan', fifaCode: 'SDN', flag: '🇸🇩', confederation: 'CAF', primaryColor: '#D21034', secondaryColor: '#007229', stadium: 'Al-Hilal Stadium' },
  { canonicalName: 'Tanzania', fifaCode: 'TAN', flag: '🇹🇿', confederation: 'CAF', primaryColor: '#00A3DD', secondaryColor: '#1EB53A', stadium: 'Benjamin Mkapa Stadium' },
  { canonicalName: 'Togo', fifaCode: 'TOG', flag: '🇹🇬', confederation: 'CAF', primaryColor: '#FFCE00', secondaryColor: '#006A4E', stadium: 'Stade de Kégué' },
  { canonicalName: 'Tunisia', fifaCode: 'TUN', flag: '🇹🇳', confederation: 'CAF', primaryColor: '#E70013', secondaryColor: '#FFFFFF', stadium: 'Hammadi Agrebi Stadium' },
  { canonicalName: 'Uganda', fifaCode: 'UGA', flag: '🇺🇬', confederation: 'CAF', primaryColor: '#D90000', secondaryColor: '#FCDC04', stadium: 'Mandela National Stadium' },
  { canonicalName: 'Zambia', fifaCode: 'ZAM', flag: '🇿🇲', confederation: 'CAF', primaryColor: '#198A00', secondaryColor: '#EF7D00', stadium: 'National Heroes Stadium' },
  { canonicalName: 'Zimbabwe', fifaCode: 'ZIM', flag: '🇿🇼', confederation: 'CAF', primaryColor: '#FCE300', secondaryColor: '#006400', stadium: 'National Sports Stadium' },

  // ======================== AFC (46) ========================
  { canonicalName: 'Afghanistan', fifaCode: 'AFG', flag: '🇦🇫', confederation: 'AFC', primaryColor: '#D32011', secondaryColor: '#007A36', stadium: 'Ghazi Stadium' },
  { canonicalName: 'Australia', fifaCode: 'AUS', flag: '🇦🇺', confederation: 'AFC', primaryColor: '#FFCD00', secondaryColor: '#00843D', stadium: 'Stadium Australia' },
  { canonicalName: 'Bahrain', fifaCode: 'BHR', flag: '🇧🇭', confederation: 'AFC', primaryColor: '#DA291C', secondaryColor: '#FFFFFF', stadium: 'Bahrain National Stadium' },
  { canonicalName: 'Bangladesh', fifaCode: 'BAN', flag: '🇧🇩', confederation: 'AFC', primaryColor: '#006A4E', secondaryColor: '#F42A41', stadium: 'Bangabandhu National Stadium' },
  { canonicalName: 'Bhutan', fifaCode: 'BHU', flag: '🇧🇹', confederation: 'AFC', primaryColor: '#FF4E12', secondaryColor: '#FFD520', stadium: 'Changlimithang Stadium' },
  { canonicalName: 'Brunei Darussalam', fifaCode: 'BRU', flag: '🇧🇳', confederation: 'AFC', primaryColor: '#F7E017', secondaryColor: '#111827', stadium: 'Hassanal Bolkiah National Stadium', aliases: ['Brunei'] },
  { canonicalName: 'Cambodia', fifaCode: 'CAM', flag: '🇰🇭', confederation: 'AFC', primaryColor: '#032EA1', secondaryColor: '#E00025', stadium: 'Morodok Techo National Stadium' },
  { canonicalName: 'China PR', fifaCode: 'CHN', flag: '🇨🇳', confederation: 'AFC', primaryColor: '#DE2910', secondaryColor: '#FFDE00', stadium: 'Workers Stadium', aliases: ['China'] },
  { canonicalName: 'Chinese Taipei', fifaCode: 'TPE', flag: '🇹🇼', confederation: 'AFC', primaryColor: '#000095', secondaryColor: '#FE0000', stadium: 'Taipei Municipal Stadium', aliases: ['Taiwan'] },
  { canonicalName: 'Guam', fifaCode: 'GUM', flag: '🇬🇺', confederation: 'AFC', primaryColor: '#00247D', secondaryColor: '#DA121A', stadium: 'GFA National Training Center' },
  { canonicalName: 'Hong Kong', fifaCode: 'HKG', flag: '🇭🇰', confederation: 'AFC', primaryColor: '#DE2910', secondaryColor: '#FFFFFF', stadium: 'Kai Tak Sports Park' },
  { canonicalName: 'India', fifaCode: 'IND', flag: '🇮🇳', confederation: 'AFC', primaryColor: '#0077C8', secondaryColor: '#FF9933', stadium: 'Salt Lake Stadium' },
  { canonicalName: 'Indonesia', fifaCode: 'IDN', flag: '🇮🇩', confederation: 'AFC', primaryColor: '#CE1126', secondaryColor: '#FFFFFF', stadium: 'Gelora Bung Karno Stadium' },
  { canonicalName: 'Iran', fifaCode: 'IRN', flag: '🇮🇷', confederation: 'AFC', primaryColor: '#FFFFFF', secondaryColor: '#239F40', stadium: 'Azadi Stadium', aliases: ['IR Iran'] },
  { canonicalName: 'Iraq', fifaCode: 'IRQ', flag: '🇮🇶', confederation: 'AFC', primaryColor: '#007A3D', secondaryColor: '#FFFFFF', stadium: 'Basra International Stadium' },
  { canonicalName: 'Japan', fifaCode: 'JPN', flag: '🇯🇵', confederation: 'AFC', primaryColor: '#001E62', secondaryColor: '#BC002D', stadium: 'Japan National Stadium' },
  { canonicalName: 'Jordan', fifaCode: 'JOR', flag: '🇯🇴', confederation: 'AFC', primaryColor: '#CE1126', secondaryColor: '#007A3D', stadium: 'Amman International Stadium' },
  { canonicalName: 'North Korea', fifaCode: 'PRK', flag: '🇰🇵', confederation: 'AFC', primaryColor: '#024FA2', secondaryColor: '#ED1C27', stadium: 'Rungrado 1st of May Stadium', aliases: ['Korea DPR'] },
  { canonicalName: 'South Korea', fifaCode: 'KOR', flag: '🇰🇷', confederation: 'AFC', primaryColor: '#CD2E3A', secondaryColor: '#0047A0', stadium: 'Seoul World Cup Stadium', aliases: ['Korea Republic', 'Korea, South'] },
  { canonicalName: 'Kuwait', fifaCode: 'KUW', flag: '🇰🇼', confederation: 'AFC', primaryColor: '#007A3D', secondaryColor: '#004B87', stadium: 'Jaber Al-Ahmad International Stadium' },
  { canonicalName: 'Kyrgyzstan', fifaCode: 'KGZ', flag: '🇰🇬', confederation: 'AFC', primaryColor: '#E8112D', secondaryColor: '#FFEF00', stadium: 'Dolen Omurzakov Stadium', aliases: ['Kyrgyz Republic'] },
  { canonicalName: 'Laos', fifaCode: 'LAO', flag: '🇱🇦', confederation: 'AFC', primaryColor: '#CE1126', secondaryColor: '#002868', stadium: 'New Laos National Stadium' },
  { canonicalName: 'Lebanon', fifaCode: 'LBN', flag: '🇱🇧', confederation: 'AFC', primaryColor: '#EE161F', secondaryColor: '#00A651', stadium: 'Camille Chamoun Sports City Stadium' },
  { canonicalName: 'Macau', fifaCode: 'MAC', flag: '🇲🇴', confederation: 'AFC', primaryColor: '#00785E', secondaryColor: '#FFDE00', stadium: 'Estádio Campo Desportivo' },
  { canonicalName: 'Malaysia', fifaCode: 'MAS', flag: '🇲🇾', confederation: 'AFC', primaryColor: '#FFD100', secondaryColor: '#111827', stadium: 'Bukit Jalil National Stadium' },
  { canonicalName: 'Maldives', fifaCode: 'MDV', flag: '🇲🇻', confederation: 'AFC', primaryColor: '#D21034', secondaryColor: '#007E3A', stadium: 'National Football Stadium, Malé' },
  { canonicalName: 'Mongolia', fifaCode: 'MGL', flag: '🇲🇳', confederation: 'AFC', primaryColor: '#DA2032', secondaryColor: '#0066B3', stadium: 'MFF Football Centre' },
  { canonicalName: 'Myanmar', fifaCode: 'MYA', flag: '🇲🇲', confederation: 'AFC', primaryColor: '#EA2839', secondaryColor: '#FECB00', stadium: 'Thuwunna Stadium' },
  { canonicalName: 'Nepal', fifaCode: 'NEP', flag: '🇳🇵', confederation: 'AFC', primaryColor: '#DC143C', secondaryColor: '#003893', stadium: 'Dasharath Rangasala' },
  { canonicalName: 'Oman', fifaCode: 'OMA', flag: '🇴🇲', confederation: 'AFC', primaryColor: '#DB161B', secondaryColor: '#008000', stadium: 'Sultan Qaboos Sports Complex' },
  { canonicalName: 'Pakistan', fifaCode: 'PAK', flag: '🇵🇰', confederation: 'AFC', primaryColor: '#01411C', secondaryColor: '#FFFFFF', stadium: 'Jinnah Sports Stadium' },
  { canonicalName: 'Palestine', fifaCode: 'PLE', flag: '🇵🇸', confederation: 'AFC', primaryColor: '#007A3D', secondaryColor: '#CE1126', stadium: 'Faisal Al-Husseini International Stadium', aliases: ['Palestinian Authority'] },
  { canonicalName: 'Philippines', fifaCode: 'PHI', flag: '🇵🇭', confederation: 'AFC', primaryColor: '#0038A8', secondaryColor: '#CE1126', stadium: 'Rizal Memorial Stadium' },
  { canonicalName: 'Qatar', fifaCode: 'QAT', flag: '🇶🇦', confederation: 'AFC', primaryColor: '#8D1B3D', secondaryColor: '#FFFFFF', stadium: 'Lusail Stadium' },
  { canonicalName: 'Saudi Arabia', fifaCode: 'KSA', flag: '🇸🇦', confederation: 'AFC', primaryColor: '#006C35', secondaryColor: '#FFFFFF', stadium: 'King Fahd Sports City Stadium' },
  { canonicalName: 'Singapore', fifaCode: 'SGP', flag: '🇸🇬', confederation: 'AFC', primaryColor: '#EF3340', secondaryColor: '#FFFFFF', stadium: 'National Stadium, Singapore' },
  { canonicalName: 'Sri Lanka', fifaCode: 'SRI', flag: '🇱🇰', confederation: 'AFC', primaryColor: '#8D153A', secondaryColor: '#FFBE29', stadium: 'Sugathadasa Stadium' },
  { canonicalName: 'Syria', fifaCode: 'SYR', flag: '🇸🇾', confederation: 'AFC', primaryColor: '#CE1126', secondaryColor: '#111827', stadium: 'Aleppo International Stadium' },
  { canonicalName: 'Tajikistan', fifaCode: 'TJK', flag: '🇹🇯', confederation: 'AFC', primaryColor: '#CC0000', secondaryColor: '#006600', stadium: 'Pamir Stadium' },
  { canonicalName: 'Thailand', fifaCode: 'THA', flag: '🇹🇭', confederation: 'AFC', primaryColor: '#00247D', secondaryColor: '#A51931', stadium: 'Rajamangala Stadium' },
  { canonicalName: 'Timor-Leste', fifaCode: 'TLS', flag: '🇹🇱', confederation: 'AFC', primaryColor: '#DC241F', secondaryColor: '#FFC726', stadium: 'National Stadium, Dili' },
  { canonicalName: 'Turkmenistan', fifaCode: 'TKM', flag: '🇹🇲', confederation: 'AFC', primaryColor: '#00843D', secondaryColor: '#FFFFFF', stadium: 'Ashgabat Stadium' },
  { canonicalName: 'United Arab Emirates', fifaCode: 'UAE', flag: '🇦🇪', confederation: 'AFC', primaryColor: '#FFFFFF', secondaryColor: '#FF0000', stadium: 'Zayed Sports City Stadium', aliases: ['UAE'] },
  { canonicalName: 'Uzbekistan', fifaCode: 'UZB', flag: '🇺🇿', confederation: 'AFC', primaryColor: '#0099B5', secondaryColor: '#1EB53A', stadium: 'Milliy Stadium' },
  { canonicalName: 'Vietnam', fifaCode: 'VIE', flag: '🇻🇳', confederation: 'AFC', primaryColor: '#DA251D', secondaryColor: '#FFCD00', stadium: 'Mỹ Đình National Stadium' },
  { canonicalName: 'Yemen', fifaCode: 'YEM', flag: '🇾🇪', confederation: 'AFC', primaryColor: '#CE1126', secondaryColor: '#111827', stadium: 'Althawra Sports City Stadium' },

  // ======================== OFC (11 + New Caledonia) ========================
  { canonicalName: 'American Samoa', fifaCode: 'ASA', flag: '🇦🇸', confederation: 'OFC', primaryColor: '#00205B', secondaryColor: '#BF0D3E', stadium: 'Pago Park Soccer Stadium' },
  { canonicalName: 'Cook Islands', fifaCode: 'COK', flag: '🇨🇰', confederation: 'OFC', primaryColor: '#017A3E', secondaryColor: '#00247D', stadium: 'BCI Stadium' },
  { canonicalName: 'Fiji', fifaCode: 'FIJ', flag: '🇫🇯', confederation: 'OFC', primaryColor: '#FFFFFF', secondaryColor: '#68BFE5', stadium: 'HFC Bank Stadium' },
  { canonicalName: 'New Caledonia', fifaCode: 'NCL', flag: '🇳🇨', confederation: 'OFC', primaryColor: '#7A7A7A', secondaryColor: '#003580', stadium: 'Stade Numa-Daly' },
  { canonicalName: 'New Zealand', fifaCode: 'NZL', flag: '🇳🇿', confederation: 'OFC', primaryColor: '#111827', secondaryColor: '#FFFFFF', stadium: 'Eden Park' },
  { canonicalName: 'Papua New Guinea', fifaCode: 'PNG', flag: '🇵🇬', confederation: 'OFC', primaryColor: '#CE1126', secondaryColor: '#FCD116', stadium: 'Sir John Guise Stadium' },
  { canonicalName: 'Samoa', fifaCode: 'SAM', flag: '🇼🇸', confederation: 'OFC', primaryColor: '#002B7F', secondaryColor: '#CE1126', stadium: 'National Soccer Stadium, Apia' },
  { canonicalName: 'Solomon Islands', fifaCode: 'SOL', flag: '🇸🇧', confederation: 'OFC', primaryColor: '#0051BA', secondaryColor: '#215B33', stadium: 'National Stadium, Honiara' },
  { canonicalName: 'Tahiti', fifaCode: 'TAH', flag: '🇵🇫', confederation: 'OFC', primaryColor: '#CE1126', secondaryColor: '#FFFFFF', stadium: 'Stade Pater' },
  { canonicalName: 'Tonga', fifaCode: 'TGA', flag: '🇹🇴', confederation: 'OFC', primaryColor: '#C10000', secondaryColor: '#FFFFFF', stadium: 'Loto-Tonga Soka Centre' },
  { canonicalName: 'Vanuatu', fifaCode: 'VAN', flag: '🇻🇺', confederation: 'OFC', primaryColor: '#FDCE12', secondaryColor: '#009543', stadium: 'Port Vila Municipal Stadium' },
];

const FIFA_TO_ISO_CODE: Record<string, string> = {
  // UEFA
  ALB: 'al', AND: 'ad', ARM: 'am', AUT: 'at', AZE: 'az', BLR: 'by', BEL: 'be', BIH: 'ba',
  BUL: 'bg', CRO: 'hr', CYP: 'cy', CZE: 'cz', DEN: 'dk', ENG: 'gb-eng', EST: 'ee', FRO: 'fo',
  FIN: 'fi', FRA: 'fr', GEO: 'ge', GER: 'de', GIB: 'gi', GRE: 'gr', HUN: 'hu', ISL: 'is',
  ISR: 'il', ITA: 'it', KAZ: 'kz', KOS: 'xk', LVA: 'lv', LIE: 'li', LTU: 'lt', LUX: 'lu',
  MLT: 'mt', MDA: 'md', MNE: 'me', NED: 'nl', MKD: 'mk', NIR: 'gb-nir', NOR: 'no', POL: 'pl',
  POR: 'pt', IRL: 'ie', ROU: 'ro', RUS: 'ru', SMR: 'sm', SCO: 'gb-sct', SRB: 'rs', SVK: 'sk',
  SVN: 'si', ESP: 'es', SWE: 'se', SUI: 'ch', TUR: 'tr', UKR: 'ua', WAL: 'gb-wls',
  // CONMEBOL
  ARG: 'ar', BOL: 'bo', BRA: 'br', CHI: 'cl', COL: 'co', ECU: 'ec', PAR: 'py', PER: 'pe',
  URU: 'uy', VEN: 've',
  // CONCACAF
  ATG: 'ag', ARU: 'aw', BAH: 'bs', BRB: 'bb', BLZ: 'bz', BER: 'bm', VGB: 'vg', CAN: 'ca',
  CAY: 'ky', CRC: 'cr', CUB: 'cu', CUW: 'cw', DMA: 'dm', DOM: 'do', SLV: 'sv', GRN: 'gd',
  GUA: 'gt', GUY: 'gy', HAI: 'ht', HON: 'hn', JAM: 'jm', MEX: 'mx', MSR: 'ms', NCA: 'ni',
  PAN: 'pa', PUR: 'pr', SKN: 'kn', LCA: 'lc', VIN: 'vc', SUR: 'sr', TRI: 'tt', TCA: 'tc',
  USA: 'us', VIR: 'vi', AIA: 'ai',
  // CAF
  ALG: 'dz', ANG: 'ao', BEN: 'bj', BOT: 'bw', BFA: 'bf', BDI: 'bi', CMR: 'cm', CPV: 'cv',
  CTA: 'cf', CHA: 'td', COM: 'km', CGO: 'cg', COD: 'cd', DJI: 'dj', EGY: 'eg', EQG: 'gq',
  ERI: 'er', SWZ: 'sz', ETH: 'et', GAB: 'ga', GAM: 'gm', GHA: 'gh', GUI: 'gn', GNB: 'gw',
  CIV: 'ci', KEN: 'ke', LES: 'ls', LBR: 'lr', LBY: 'ly', MAD: 'mg', MWI: 'mw', MLI: 'ml',
  MTN: 'mr', MRI: 'mu', MAR: 'ma', MOZ: 'mz', NAM: 'na', NIG: 'ne', NGA: 'ng', RWA: 'rw',
  STP: 'st', SEN: 'sn', SEY: 'sc', SLE: 'sl', SOM: 'so', RSA: 'za', SSD: 'ss', SDN: 'sd',
  TAN: 'tz', TOG: 'tg', TUN: 'tn', UGA: 'ug', ZAM: 'zm', ZIM: 'zw',
  // AFC
  AFG: 'af', AUS: 'au', BHR: 'bh', BAN: 'bd', BHU: 'bt', BRU: 'bn', CAM: 'kh', CHN: 'cn',
  TPE: 'tw', GUM: 'gu', HKG: 'hk', IND: 'in', IDN: 'id', IRN: 'ir', IRQ: 'iq', JPN: 'jp',
  JOR: 'jo', PRK: 'kp', KOR: 'kr', KUW: 'kw', KGZ: 'kg', LAO: 'la', LBN: 'lb', MAC: 'mo',
  MAS: 'my', MDV: 'mv', MGL: 'mn', MYA: 'mm', NEP: 'np', OMA: 'om', PAK: 'pk', PLE: 'ps',
  PHI: 'ph', QAT: 'qa', KSA: 'sa', SGP: 'sg', SRI: 'lk', SYR: 'sy', TJK: 'tj', THA: 'th',
  TLS: 'tl', TKM: 'tm', UAE: 'ae', UZB: 'uz', VIE: 'vn', YEM: 'ye',
  // OFC
  ASA: 'as', COK: 'ck', FIJ: 'fj', NCL: 'nc', NZL: 'nz', PNG: 'pg', SAM: 'ws', SOL: 'sb',
  TAH: 'pf', TGA: 'to', VAN: 'vu',
};

const COUNTRY_LOOKUP = new Map<string, CountryMetadata>();

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '');
}

for (const entry of FIFA_COUNTRY_METADATA) {
  COUNTRY_LOOKUP.set(normalizeKey(entry.canonicalName), entry);
  COUNTRY_LOOKUP.set(normalizeKey(entry.fifaCode), entry);
  for (const alias of entry.aliases || []) {
    COUNTRY_LOOKUP.set(normalizeKey(alias), entry);
  }
}

export function getCountryMetadata(countryName?: string): CountryMetadata | null {
  if (!countryName) return null;
  return COUNTRY_LOOKUP.get(normalizeKey(countryName)) || null;
}

export function normalizeCountryName(countryName: string): string {
  const found = getCountryMetadata(countryName);
  return found ? found.canonicalName : countryName.trim();
}

export function getCountryFlag(countryName?: string): string {
  const found = getCountryMetadata(countryName);
  return found?.flag || '🏳️';
}

export function getCountryCode(countryName?: string): string {
  const found = getCountryMetadata(countryName);
  if (found) return found.fifaCode;
  return (countryName || 'INT').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'INT';
}

export function getCountryIsoCode(countryOrCode?: string): string | null {
  if (!countryOrCode) return null;
  const found = getCountryMetadata(countryOrCode);
  if (found && FIFA_TO_ISO_CODE[found.fifaCode]) {
    return FIFA_TO_ISO_CODE[found.fifaCode];
  }
  const upper = countryOrCode.trim().toUpperCase();
  if (FIFA_TO_ISO_CODE[upper]) {
    return FIFA_TO_ISO_CODE[upper];
  }
  return null;
}

export function getCountryFlagUrl(countryOrCode?: string, width: 80 | 160 | 320 = 160): string | null {
  const iso = getCountryIsoCode(countryOrCode);
  return iso ? `https://flagcdn.com/w${width}/${iso}.png` : null;
}

export function createNationalFlagSvgDataUrl(
  fifaCode: string,
  primaryColor: string,
  secondaryColor: string,
  flagEmoji: string
): string {
  const safeCode = (fifaCode || 'INT').slice(0, 3).toUpperCase();
  const p = /^#[0-9A-Fa-f]{3,8}$/.test(primaryColor) ? primaryColor : '#0E2439';
  const s = /^#[0-9A-Fa-f]{3,8}$/.test(secondaryColor) ? secondaryColor : '#1E3A5F';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" fill="none"><defs><linearGradient id="fg" x1="0" y1="0" x2="120" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${p}"/><stop offset="100%" stop-color="${s}"/></linearGradient></defs><rect x="2" y="2" width="116" height="76" rx="10" fill="url(#fg)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/><rect x="2" y="28" width="116" height="24" fill="rgba(5,10,18,0.55)"/><text x="60" y="45" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,-apple-system,sans-serif" font-weight="400" font-size="16" letter-spacing="2">${flagEmoji} ${safeCode}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getCountrySlug(countryName: string): string {
  return normalizeCountryName(countryName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

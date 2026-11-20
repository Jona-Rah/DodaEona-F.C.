import type { Team } from '../types/matchCentre';
import {
  Manager,
  ManagerAppointment,
  ManagerAppointmentRole,
  ManagerPhilosophy,
  serializePhilosophyJson,
} from '../types/manager';
import { normalizeCountryName } from './countryMetadata';
import { getVerifiedManagerDob } from './verifiedManagerDobs';

export type CompactNationalManagerTuple = readonly [
  teamId: string,
  managerName: string,
  nationality: string,
  role: ManagerAppointmentRole,
  startDate: string,
  notes?: string,
];

const DEFAULT_NOTE = 'Verified national team managerial appointment for the 2026 international cycle.';

// 422 FIFA national team managers across all 6 confederations (211 Men + 211 Women)
export const NATIONAL_MANAGER_TUPLES: CompactNationalManagerTuple[] = [
  // =========================================================================
  // UEFA [MEN] (55)
  // =========================================================================
  ["nat-men-france", "Zinedine Zidane", "France", "head-coach", "2026-07-28"],
  ["nat-men-spain", "Luis de la Fuente", "Spain", "head-coach", "2022-12-08"],
  ["nat-men-england", "Thomas Tuchel", "Germany", "head-coach", "2025-01-01"],
  ["nat-men-belgium", "Mark van Bommel", "Netherlands", "head-coach", "2026-07-24"],
  ["nat-men-netherlands", "Xavi Hernández", "Spain", "head-coach", "2026-08-12"],
  ["nat-men-portugal", "Jorge Jesus", "Portugal", "head-coach", "2026-07-10"],
  ["nat-men-italy", "Roberto Mancini", "Italy", "head-coach", "2026-07-28"],
  ["nat-men-germany", "Jürgen Klopp", "Germany", "head-coach", "2026-07-24"],
  ["nat-men-croatia", "Slaven Bilić", "Croatia", "head-coach", "2026-07-13"],
  ["nat-men-switzerland", "Murat Yakin", "Switzerland", "head-coach", "2021-08-09"],
  ["nat-men-denmark", "Brian Riemer", "Denmark", "head-coach", "2024-10-24"],
  ["nat-men-ukraine", "Andrea Maldera", "Italy", "head-coach", "2026-05-18"],
  ["nat-men-austria", "Ralf Rangnick", "Germany", "head-coach", "2022-05-24"],
  ["nat-men-turkiye", "Sergen Yalçın", "Türkiye", "head-coach", "2026-10-20"],
  ["nat-men-poland", "Jan Urban", "Poland", "head-coach", "2025-07-16"],
  ["nat-men-sweden", "Graham Potter", "England", "head-coach", "2025-10-20"],
  ["nat-men-wales", "Craig Bellamy", "Wales", "head-coach", "2024-07-09"],
  ["nat-men-hungary", "Marco Rossi", "Italy", "head-coach", "2018-06-19"],
  ["nat-men-serbia", "Veljko Paunović", "Serbia", "head-coach", "2025-10-30"],
  ["nat-men-scotland", "Sébastien Pocognoli", "Belgium", "head-coach", "2026-08-16"],
  ["nat-men-norway", "Ståle Solbakken", "Norway", "head-coach", "2020-12-07"],
  ["nat-men-greece", "Ivan Jovanović", "Serbia", "head-coach", "2024-06-11"],
  ["nat-men-czech-republic", "Santi Denia", "Spain", "head-coach", "2026-07-31"],
  ["nat-men-republic-of-ireland", "Heimir Hallgrímsson", "Iceland", "head-coach", "2024-07-10"],
  ["nat-men-slovakia", "Vladimír Weiss", "Slovakia", "head-coach", "2026-05-12"],
  ["nat-men-bosnia-herzegovina", "Sergej Barbarez", "Bosnia & Herzegovina", "head-coach", "2024-04-19"],
  ["nat-men-georgia", "Ramaz Svanadze", "Georgia", "head-coach", "2026-09-26"],
  ["nat-men-kosovo", "Franco Foda", "Germany", "head-coach", "2024-02-17"],
  ["nat-men-romania", "Gheorghe Hagi", "Romania", "head-coach", "2026-04-20"],
  ["nat-men-armenia", "Yeghishe Melikyan", "Armenia", "head-coach", "2025-08-06"],
  ["nat-men-latvia", "Paolo Nicolato", "Italy", "head-coach", "2024-02-05"],
  ["nat-men-montenegro", "Mirko Vučinić", "Montenegro", "head-coach", "2025-09-19"],
  ["nat-men-russia", "Valery Karpin", "Russia", "head-coach", "2021-07-26"],
  ["nat-men-slovenia", "Boštjan Cesar", "Slovenia", "head-coach", "2026-01-21"],
  ["nat-men-albania", "Rolando Maran", "Italy", "head-coach", "2026-05-19"],
  ["nat-men-israel", "Ran Ben Shimon", "Israel", "head-coach", "2024-05-23"],
  ["nat-men-luxembourg", "Jeff Strasser", "Luxembourg", "head-coach", "2025-08-19"],
  ["nat-men-bulgaria", "Atanas Ribarski", "Bulgaria", "caretaker", "2026-09-29"],
  ["nat-men-finland", "Jacob Friis", "Denmark", "head-coach", "2025-01-20"],
  ["nat-men-north-macedonia", "Goce Sedloski", "North Macedonia", "head-coach", "2025-12-22"],
  ["nat-men-northern-ireland", "Michael O'Neill", "Northern Ireland", "head-coach", "2022-12-07"],
  ["nat-men-andorra", "Koldo Álvarez", "Andorra", "head-coach", "2010-02-02"],
  ["nat-men-estonia", "Jürgen Henn", "Estonia", "head-coach", "2024-05-15"],
  ["nat-men-iceland", "Arnar Gunnlaugsson", "Iceland", "head-coach", "2025-01-16"],
  ["nat-men-lithuania", "Mindaugas Čepas", "Lithuania", "head-coach", "2026-10-21"],
  ["nat-men-azerbaijan", "Aykhan Abbasov", "Azerbaijan", "head-coach", "2025-09-30"],
  ["nat-men-kazakhstan", "John van 't Schip", "Netherlands", "head-coach", "2026-08-07"],
  ["nat-men-malta", "Emilio De Leo", "Italy", "head-coach", "2025-01-13"],
  ["nat-men-belarus", "Viktor Goncharenko", "Belarus", "head-coach", "2026-01-06"],
  ["nat-men-cyprus", "Akis Mantzios", "Greece", "head-coach", "2025-01-09"],
  ["nat-men-moldova", "Lilian Popescu", "Moldova", "head-coach", "2025-09-16"],
  ["nat-men-faroe-islands", "Eyðun Klakstein", "Faroe Islands", "head-coach", "2025-02-17"],
  ["nat-men-gibraltar", "Scott Wiseman", "Gibraltar", "head-coach", "2025-02-26"],
  ["nat-men-liechtenstein", "Konrad Fünfstück", "Germany", "head-coach", "2023-06-01"],
  ["nat-men-san-marino", "Roberto Cevoli", "Italy", "head-coach", "2023-12-15"],

  // =========================================================================
  // UEFA [WOMEN] (55)
  // =========================================================================
  ["nat-women-spain", "Sonia Bermúdez", "Spain", "head-coach", "2025-08-11"],
  ["nat-women-germany", "Christian Wück", "Germany", "head-coach", "2024-03-08"],
  ["nat-women-england", "Sarina Wiegman", "Netherlands", "head-coach", "2020-08-14"],
  ["nat-women-sweden", "Tony Gustavsson", "Sweden", "head-coach", "2025-02-06"],
  ["nat-women-netherlands", "Arjan Veurink", "Netherlands", "head-coach", "2025-04-15"],
  ["nat-women-france", "Laurent Bonadei", "France", "head-coach", "2024-08-23"],
  ["nat-women-denmark", "Jakob Michelsen", "Denmark", "head-coach", "2025-06-04"],
  ["nat-women-italy", "Andrea Soncin", "Italy", "head-coach", "2023-09-08"],
  ["nat-women-iceland", "Þorsteinn Halldórsson", "Iceland", "head-coach", "2021-01-28"],
  ["nat-women-norway", "Gemma Grainger", "England", "head-coach", "2024-01-10"],
  ["nat-women-austria", "Alexander Schriebl", "Austria", "head-coach", "2025-01-21"],
  ["nat-women-belgium", "Elísabet Gunnarsdóttir", "Iceland", "head-coach", "2025-01-20"],
  ["nat-women-portugal", "Francisco Neto", "Portugal", "head-coach", "2014-02-25"],
  ["nat-women-switzerland", "Rafel Navarro", "Spain", "head-coach", "2025-11-04"],
  ["nat-women-scotland", "Melissa Andreatta", "Australia", "head-coach", "2025-04-09"],
  ["nat-women-republic-of-ireland", "Carla Ward", "England", "head-coach", "2025-01-15"],
  ["nat-women-serbia", "Lidija Stojkanović", "Serbia", "head-coach", "2024-12-17"],
  ["nat-women-bosnia-herzegovina", "Selver Hodžić", "Bosnia & Herzegovina", "head-coach", "2024-03-16"],
  ["nat-women-slovenia", "Saša Kolman", "Slovenia", "head-coach", "2023-09-15"],
  ["nat-women-poland", "Nina Patalon", "Poland", "head-coach", "2021-04-29"],
  ["nat-women-kosovo", "Sami Sermaxhaj", "Kosovo", "head-coach", "2024-10-21"],
  ["nat-women-czech-republic", "Jitka Klimková", "Czech Republic", "head-coach", "2025-01-21"],
  ["nat-women-finland", "Marko Saloranta", "Finland", "head-coach", "2022-11-25"],
  ["nat-women-greece", "Vassileios Spertos", "Greece", "head-coach", "2025-11-03"],
  ["nat-women-hungary", "Alexandra Szarvas", "Hungary", "head-coach", "2024-03-21"],
  ["nat-women-israel", "Menahem Koretzki", "Israel", "head-coach", "2026-02-08"],
  ["nat-women-ukraine", "Iya Andrushchak", "Ukraine", "head-coach", "2026-02-09"],
  ["nat-women-azerbaijan", "Siyasat Asgarov", "Azerbaijan", "head-coach", "2019-10-04"],
  ["nat-women-slovakia", "Peter Kopúň", "Slovakia", "head-coach", "2018-06-27"],
  ["nat-women-turkiye", "Necla Güngör", "Türkiye", "head-coach", "2020-01-01"],
  ["nat-women-wales", "Rhian Wilkinson", "Canada", "head-coach", "2024-02-27"],
  ["nat-women-montenegro", "Mirko Marić", "Montenegro", "head-coach", "2017-12-25"],
  ["nat-women-andorra", "Albert Panadero", "Spain", "head-coach", "2024-01-12"],
  ["nat-women-croatia", "Nenad Gračan", "Croatia", "head-coach", "2021-11-15"],
  ["nat-women-albania", "Armir Grimaj", "Albania", "head-coach", "2016-04-22"],
  ["nat-women-armenia", "Mariam Stepanyan", "Armenia", "head-coach", "2026-03-16"],
  ["nat-women-belarus", "Viachaslau Hryharau", "Belarus", "head-coach", "2025-08-22"],
  ["nat-women-bulgaria", "Kaloyan Petkov", "Bulgaria", "head-coach", "2026-01-30"],
  ["nat-women-cyprus", "Renos Demetriades", "Cyprus", "head-coach", "2024-10-17"],
  ["nat-women-estonia", "Aleksandra Ševoldajeva", "Estonia", "head-coach", "2024-11-04"],
  ["nat-women-faroe-islands", "Pætur Clementsen", "Faroe Islands", "head-coach", "2025-06-04"],
  ["nat-women-georgia", "Iris Antman", "Israel", "head-coach", "2023-04-10"],
  ["nat-women-gibraltar", "Stella Gotal", "Croatia", "head-coach", "2025-09-03"],
  ["nat-women-kazakhstan", "Begaim Kirgizbaeva", "Kazakhstan", "head-coach", "2026-02-24"],
  ["nat-women-latvia", "Liene Vāciete", "Latvia", "head-coach", "2025-01-17"],
  ["nat-women-liechtenstein", "Adrienne Krysl", "Switzerland", "head-coach", "2023-06-27"],
  ["nat-women-lithuania", "Tomas Ražanauskas", "Lithuania", "head-coach", "2025-01-13"],
  ["nat-women-luxembourg", "Cristina Correia", "Luxembourg", "head-coach", "2026-03-24"],
  ["nat-women-malta", "Manuela Tesse", "Italy", "head-coach", "2022-12-15"],
  ["nat-women-moldova", "Ghenadie Puşcă", "Moldova", "head-coach", "2024-03-01"],
  ["nat-women-north-macedonia", "Aleksandar Andov", "North Macedonia", "head-coach", "2024-03-19"],
  ["nat-women-northern-ireland", "Michael McArdle", "Scotland", "head-coach", "2026-03-09"],
  ["nat-women-romania", "Massimo Pedrazzini", "Italy", "head-coach", "2024-03-15"],
  ["nat-women-russia", "Yuri Krasnozhan", "Russia", "head-coach", "2020-12-30"],
  ["nat-women-san-marino", "Giulia Domenichetti", "Italy", "head-coach", "2026-04-08"],

  // =========================================================================
  // CONMEBOL [MEN] (10)
  // =========================================================================
  ["nat-men-argentina", "Lionel Scaloni", "Argentina", "head-coach", "2018-08-03"],
  ["nat-men-brazil", "Carlo Ancelotti", "Italy", "head-coach", "2025-05-26"],
  ["nat-men-colombia", "Néstor Lorenzo", "Argentina", "head-coach", "2022-06-02"],
  ["nat-men-uruguay", "Diego Forlán", "Uruguay", "caretaker", "2026-07-12"],
  ["nat-men-ecuador", "Marcelo Gallardo", "Argentina", "head-coach", "2026-09-13"],
  ["nat-men-chile", "Nicolás Córdova", "Chile", "caretaker", "2025-07-04"],
  ["nat-men-paraguay", "Gustavo Alfaro", "Argentina", "head-coach", "2024-08-16"],
  ["nat-men-venezuela", "Oswaldo Vizcarrondo", "Venezuela", "head-coach", "2026-01-20"],
  ["nat-men-peru", "Mano Menezes", "Brazil", "head-coach", "2026-01-29"],
  ["nat-men-bolivia", "Óscar Villegas", "Bolivia", "head-coach", "2024-07-20"],

  // =========================================================================
  // CONMEBOL [WOMEN] (10)
  // =========================================================================
  ["nat-women-brazil", "Arthur Elias", "Brazil", "head-coach", "2023-09-01"],
  ["nat-women-colombia", "Ángelo Marsiglia", "Colombia", "head-coach", "2023-10-01"],
  ["nat-women-argentina", "Germán Portanova", "Argentina", "head-coach", "2021-07-01"],
  ["nat-women-chile", "Luis Mena", "Chile", "head-coach", "2023-05-16"],
  ["nat-women-uruguay", "Ariel Longo", "Uruguay", "head-coach", "2016-01-01"],
  ["nat-women-venezuela", "Ricardo Belli", "Brazil", "head-coach", "2025-01-01"],
  ["nat-women-ecuador", "Eva Espejo", "Mexico", "head-coach", "2026-05-25"],
  ["nat-women-bolivia", "Rosana Gómez", "Argentina", "head-coach", "2025-01-01"],
  ["nat-women-paraguay", "Fábio Fukumoto", "Brazil", "head-coach", "2025-06-01"],
  ["nat-women-peru", "Antonio Spinelli", "Argentina", "head-coach", "2024-01-01"],

  // =========================================================================
  // CONCACAF [MEN] (35)
  // =========================================================================
  ["nat-men-united-states", "Mauricio Pochettino", "Argentina", "head-coach", "2024-09-10", "Managing USMNT through Nov 2026 Nations League transition alongside Man Utd"],
  ["nat-men-mexico", "Rafael Márquez", "Mexico", "head-coach", "2026-07-08"],
  ["nat-men-canada", "Jesse Marsch", "United States", "head-coach", "2024-05-13"],
  ["nat-men-costa-rica", "Bryan Ruiz", "Costa Rica", "head-coach", "2026-10-22"],
  ["nat-men-jamaica", "Rudolph Speid", "Jamaica", "caretaker", "2025-11-20"],
  ["nat-men-dominican-republic", "Marcelo Neveleff", "Argentina", "head-coach", "2023-01-23"],
  ["nat-men-panama", "Thomas Christiansen", "Spain", "head-coach", "2020-07-23"],
  ["nat-men-el-salvador", "Hernán Darío Gómez", "Colombia", "head-coach", "2025-02-24"],
  ["nat-men-haiti", "David Badía", "Spain", "head-coach", "2026-08-23"],
  ["nat-men-honduras", "José Francisco Molina", "Spain", "head-coach", "2026-02-27"],
  ["nat-men-saint-lucia", "Rajesh Latchoo", "Trinidad and Tobago", "head-coach", "2026-09-21"],
  ["nat-men-suriname", "Henk Fraser", "Netherlands", "head-coach", "2026-07-28"],
  ["nat-men-trinidad-and-tobago", "Derek King", "Trinidad and Tobago", "head-coach", "2026-05-04"],
  ["nat-men-curacao", "Dick Advocaat", "Netherlands", "head-coach", "2026-05-11"],
  ["nat-men-cuba", "Pedro Pereira", "Cuba", "head-coach", "2025-11-03"],
  ["nat-men-guatemala", "Luis Fernando Tena", "Mexico", "head-coach", "2021-12-09"],
  ["nat-men-guyana", "Marco Bonofiglio", "Canada", "head-coach", "2026-07-10"],
  ["nat-men-barbados", "Kent Hall", "Barbados", "caretaker", "2023-11-06"],
  ["nat-men-antigua-and-barbuda", "Jacques Passy", "Mexico", "head-coach", "2025-04-04"],
  ["nat-men-grenada", "Stern John", "Trinidad and Tobago", "head-coach", "2026-08-18"],
  ["nat-men-saint-kitts-and-nevis", "Marcelo Serrano", "Brazil", "head-coach", "2026-02-06"],
  ["nat-men-anguilla", "Ewan Gunter", "England", "head-coach", "2026-09-16"],
  ["nat-men-aruba", "Marvic Bermúdez", "Aruba", "head-coach", "2022-03-02"],
  ["nat-men-bahamas", "Gifton Noel-Williams", "England", "head-coach", "2026-07-01"],
  ["nat-men-belize", "Martín Dall'Orso", "Peru", "head-coach", "2026-08-28"],
  ["nat-men-bermuda", "John Barry Nusum", "Bermuda", "head-coach", "2026-08-07"],
  ["nat-men-british-virgin-islands", "David Pérez", "Spain", "head-coach", "2025-03-01"],
  ["nat-men-cayman-islands", "Colin Rowe", "Cayman Islands", "caretaker", "2025-05-27"],
  ["nat-men-dominica", "Kurt Herd", "Scotland", "head-coach", "2026-01-19"],
  ["nat-men-montserrat", "Gabriel Calderón", "Spain", "head-coach", "2026-07-30"],
  ["nat-men-nicaragua", "Juan Cruz Real", "Argentina", "head-coach", "2026-04-24"],
  ["nat-men-puerto-rico", "Víctor Nicolás Lonchuk", "Argentina", "caretaker", "2026-11-12"],
  ["nat-men-saint-vincent-and-the-grenadines", "Michael Findlay", "Canada", "head-coach", "2026-08-03"],
  ["nat-men-turks-and-caicos-islands", "Aaron Lawrence", "Jamaica", "head-coach", "2024-02-01"],
  ["nat-men-us-virgin-islands", "Terrence Jones", "US Virgin Islands", "head-coach", "2019-10-07"],

  // =========================================================================
  // CONCACAF [WOMEN] (35)
  // =========================================================================
  ["nat-women-united-states", "Emma Hayes", "England", "head-coach", "2024-05-18"],
  ["nat-women-canada", "Casey Stoney", "England", "head-coach", "2025-01-13"],
  ["nat-women-jamaica", "Hubert Busby Jr.", "Canada", "head-coach", "2024-05-24"],
  ["nat-women-guatemala", "Karla Maya", "Mexico", "head-coach", "2024-01-01"],
  ["nat-women-haiti", "Pia Sundhage", "Sweden", "head-coach", "2026-01-01"],
  ["nat-women-mexico", "Pedro López", "Spain", "head-coach", "2022-09-15"],
  ["nat-women-suriname", "Mark de Vries", "Netherlands", "head-coach", "2025-01-01"],
  ["nat-women-costa-rica", "Lindsay Camila", "Brazil", "head-coach", "2025-11-01"],
  ["nat-women-panama", "Toña Is", "Spain", "head-coach", "2024-10-16"],
  ["nat-women-saint-kitts-and-nevis", "Earl Jones", "Saint Kitts and Nevis", "head-coach", "2024-01-01"],
  ["nat-women-anguilla", "Ben Gooden", "England", "head-coach", "2024-01-01"],
  ["nat-women-antigua-and-barbuda", "Astel Joseph", "Antigua and Barbuda", "head-coach", "2024-01-01"],
  ["nat-women-aruba", "Arjan van der Laan", "Netherlands", "head-coach", "2024-01-01"],
  ["nat-women-bahamas", "Ricqea Bain", "Bahamas", "head-coach", "2024-01-01"],
  ["nat-women-barbados", "Kerry Trotman", "Barbados", "head-coach", "2024-01-01"],
  ["nat-women-belize", "Wayne Casimiro", "Belize", "head-coach", "2024-01-01"],
  ["nat-women-bermuda", "Karl Roberts", "Bermuda", "interim", "2025-06-01"],
  ["nat-women-british-virgin-islands", "James Baird", "Scotland", "head-coach", "2024-01-01"],
  ["nat-women-cayman-islands", "Michael Johnson", "Cayman Islands", "head-coach", "2024-01-01"],
  ["nat-women-cuba", "Elizabeth Cuff", "Cuba", "head-coach", "2024-01-01"],
  ["nat-women-curacao", "Johan van Heertum", "Netherlands", "head-coach", "2024-01-01"],
  ["nat-women-dominica", "Rosilia Registe", "Dominica", "interim", "2024-01-01"],
  ["nat-women-dominican-republic", "Henry Parra", "Colombia", "head-coach", "2024-01-01"],
  ["nat-women-el-salvador", "Eric Acuña", "El Salvador", "head-coach", "2021-01-01"],
  ["nat-women-grenada", "Melanie Thomas", "United States", "head-coach", "2024-01-01"],
  ["nat-women-guyana", "Omar Khan", "Guyana", "head-coach", "2024-01-01"],
  ["nat-women-honduras", "Mario Abadía", "Colombia", "head-coach", "2024-01-01"],
  ["nat-women-montserrat", "Gabriel Calderón Pellegrino", "Spain", "interim", "2026-07-30", "MFA Technical Director overseeing women and youth development pathways"],
  ["nat-women-nicaragua", "Jaime Ruiz", "Nicaragua", "head-coach", "2024-01-01"],
  ["nat-women-puerto-rico", "Nat González", "United States", "head-coach", "2021-12-01"],
  ["nat-women-saint-lucia", "Francis McDonald", "Saint Lucia", "head-coach", "2024-01-01"],
  ["nat-women-saint-vincent-and-the-grenadines", "Alnif Williams", "Saint Vincent and the Grenadines", "head-coach", "2024-01-01"],
  ["nat-women-trinidad-and-tobago", "Damian Briggs", "England", "head-coach", "2025-01-01"],
  ["nat-women-turks-and-caicos-islands", "Yunelsis Rodríguez", "Cuba", "head-coach", "2024-01-01"],
  ["nat-women-us-virgin-islands", "Katie Quinlan", "England", "head-coach", "2026-06-01"],

  // =========================================================================
  // CAF [MEN] (54)
  // =========================================================================
  ["nat-men-morocco", "Mohamed Ouahbi", "Morocco", "head-coach", "2026-03-05"],
  ["nat-men-senegal", "Patrick Vieira", "France", "head-coach", "2026-08-18"],
  ["nat-men-egypt", "Ali Maher", "Egypt", "head-coach", "2026-11-07"],
  ["nat-men-nigeria", "Éric Chelle", "Mali", "head-coach", "2025-01-07"],
  ["nat-men-algeria", "Brahim Hemdani", "Algeria", "head-coach", "2026-09-05"],
  ["nat-men-ivory-coast", "Hervé Renard", "France", "head-coach", "2026-08-04"],
  ["nat-men-cameroon", "David Pagou", "Cameroon", "head-coach", "2025-12-01"],
  ["nat-men-ghana", "Kim Björkegren", "Sweden", "caretaker", "2026-10-17"],
  ["nat-men-mozambique", "Chiquinho Conde", "Mozambique", "head-coach", "2021-10-27"],
  ["nat-men-dr-congo", "Sébastien Desabre", "France", "head-coach", "2022-08-08"],
  ["nat-men-gabon", "Sébastien Migné", "France", "head-coach", "2026-07-15"],
  ["nat-men-liberia", "Mohammed Adil Erradi", "Belgium", "head-coach", "2026-05-19"],
  ["nat-men-libya", "Youssoupha Dabo", "Senegal", "head-coach", "2026-07-15"],
  ["nat-men-mali", "Anthony da Silva", "Portugal", "head-coach", "2026-06-05"],
  ["nat-men-mauritania", "Aritz López Garai", "Spain", "head-coach", "2024-11-24"],
  ["nat-men-benin", "Gernot Rohr", "Germany", "head-coach", "2023-02-28"],
  ["nat-men-burundi", "Patrick Sangwa", "Belgium", "head-coach", "2024-10-29"],
  ["nat-men-central-african-republic", "Abdelaziz Karkache", "Morocco", "head-coach", "2026-11-06"],
  ["nat-men-chad", "Raoul Savoy", "Switzerland", "head-coach", "2025-08-01"],
  ["nat-men-comoros", "Hubert Velud", "France", "head-coach", "2026-03-07"],
  ["nat-men-niger", "Nabil Neghiz", "Algeria", "head-coach", "2026-09-11"],
  ["nat-men-togo", "Patrice Neveu", "France", "head-coach", "2026-02-19"],
  ["nat-men-tunisia", "Mouin Chaâbani", "Tunisia", "head-coach", "2026-07-17"],
  ["nat-men-angola", "Aliou Cissé", "Senegal", "head-coach", "2026-04-08"],
  ["nat-men-burkina-faso", "Amir Abdou", "Comoros", "head-coach", "2026-02-28"],
  ["nat-men-cape-verde", "Humberto Bettencourt", "Cape Verde", "head-coach", "2026-08-19"],
  ["nat-men-equatorial-guinea", "Vincenzo Alberto Annese", "Italy", "head-coach", "2026-08-26"],
  ["nat-men-guinea", "Paulo Duarte", "Portugal", "head-coach", "2025-08-11"],
  ["nat-men-guinea-bissau", "Emiliano Té", "Guinea-Bissau", "head-coach", "2025-08-01"],
  ["nat-men-madagascar", "Corentin Martins", "France", "head-coach", "2025-01-30"],
  ["nat-men-tanzania", "Miguel Ángel Gamondi", "Argentina", "head-coach", "2025-11-04"],
  ["nat-men-zambia", "George Lwandamina", "Zambia", "caretaker", "2026-03-06"],
  ["nat-men-gambia", "Johnny McKinstry", "Northern Ireland", "head-coach", "2024-05-22"],
  ["nat-men-south-africa", "Pitso Mosimane", "South Africa", "head-coach", "2026-08-08"],
  ["nat-men-zimbabwe", "Ramón Catalá", "Spain", "head-coach", "2026-08-20"],
  ["nat-men-congo", "Claude Le Roy", "France", "head-coach", "2026-06-09"],
  ["nat-men-eritrea", "Hesham Yakan", "Egypt", "head-coach", "2026-03-09"],
  ["nat-men-uganda", "Paul Put", "Belgium", "head-coach", "2023-11-02"],
  ["nat-men-kenya", "Benni McCarthy", "South Africa", "head-coach", "2025-03-03"],
  ["nat-men-sierra-leone", "Didier Gomes Da Rosa", "France", "head-coach", "2026-06-05"],
  ["nat-men-malawi", "Kalisto Pasuwa", "Zimbabwe", "head-coach", "2025-02-12"],
  ["nat-men-namibia", "Collin Benjamin", "Namibia", "head-coach", "2022-06-15"],
  ["nat-men-somalia", "Yusuf Ali Nur", "Somalia", "head-coach", "2025-03-12"],
  ["nat-men-botswana", "Thaloba Nthaga", "Botswana", "caretaker", "2026-09-12"],
  ["nat-men-djibouti", "Mohamed Meraneh Hassan", "Djibouti", "caretaker", "2026-01-27"],
  ["nat-men-eswatini", "Dominic Kunene", "Eswatini", "caretaker", "2026-10-31"],
  ["nat-men-ethiopia", "Yohannes Sahle", "Ethiopia", "head-coach", "2026-01-05"],
  ["nat-men-lesotho", "Bob Mafoso", "Lesotho", "head-coach", "2026-02-09"],
  ["nat-men-mauritius", "Rui Pedro", "Portugal", "head-coach", "2026-04-23", "Co-manager alongside Daniel Ramsamy"],
  ["nat-men-rwanda", "Stephen Constantine", "England", "head-coach", "2026-03-12"],
  ["nat-men-sao-tome-and-principe", "Ricardo Monsanto", "Portugal", "head-coach", "2024-03-01"],
  ["nat-men-seychelles", "Vivian Bothe", "Seychelles", "head-coach", "2026-03-01"],
  ["nat-men-south-sudan", "Christian Nsengi-Biembe", "DR Congo", "head-coach", "2026-08-11"],
  ["nat-men-sudan", "James Kwesi Appiah", "Ghana", "head-coach", "2023-09-20"],

  // =========================================================================
  // CAF [WOMEN] (54)
  // =========================================================================
  ["nat-women-nigeria", "Justine Madugu", "Nigeria", "head-coach", "2024-09-26"],
  ["nat-women-zambia", "Nora Häuptle", "Switzerland", "head-coach", "2025-01-04"],
  ["nat-women-malawi", "Lovemore Fazili", "Malawi", "head-coach", "2022-08-19"],
  ["nat-women-mali", "Birama Konaté", "Mali", "head-coach", "2025-08-27"],
  ["nat-women-ivory-coast", "Reynald Pedros", "France", "head-coach", "2025-01-21"],
  ["nat-women-cameroon", "Alain Djeumfa", "Cameroon", "head-coach", "2025-12-09"],
  ["nat-women-dr-congo", "Mihayo Kazembe", "DR Congo", "head-coach", "2025-10-16"],
  ["nat-women-gambia", "Mariama Sowe", "Gambia", "head-coach", "2025-01-26"],
  ["nat-women-senegal", "Serigne Cissé", "Senegal", "head-coach", "2019-12-11"],
  ["nat-women-algeria", "Farid Benstiti", "France", "head-coach", "2022-12-28"],
  ["nat-women-morocco", "Jorge Vilda", "Spain", "head-coach", "2023-10-12"],
  ["nat-women-south-africa", "Desiree Ellis", "South Africa", "head-coach", "2016-10-13"],
  ["nat-women-angola", "Afonso Paxe", "Angola", "head-coach", "2026-02-13"],
  ["nat-women-benin", "Abdoulaye Ouzérou", "Benin", "head-coach", "2025-01-01"],
  ["nat-women-botswana", "Gaolethoo Nkutlwisang", "Botswana", "head-coach", "2026-02-14"],
  ["nat-women-burkina-faso", "Pascal Sawadogo", "Burkina Faso", "head-coach", "2021-09-14"],
  ["nat-women-burundi", "Olivier Niyungeko", "Burundi", "head-coach", "2025-01-01"],
  ["nat-women-cape-verde", "Silvéria Nédio", "Cape Verde", "head-coach", "2018-10-23"],
  ["nat-women-central-african-republic", "Étienne Momokoamas", "Central African Republic", "head-coach", "2025-01-01"],
  ["nat-women-chad", "André Mahamat", "Chad", "head-coach", "2025-01-01"],
  ["nat-women-comoros", "Youssouf Abdallah", "Comoros", "head-coach", "2026-02-11"],
  ["nat-women-congo", "Berjona Mbemba", "Congo", "head-coach", "2019-09-20"],
  ["nat-women-djibouti", "Jonas Komla", "Togo", "head-coach", "2025-01-06"],
  ["nat-women-egypt", "Mohamed Kamal", "Egypt", "head-coach", "2026-02-18"],
  ["nat-women-equatorial-guinea", "Guillermo Ganet", "Spain", "head-coach", "2025-01-14"],
  ["nat-women-eritrea", "Mekonnen Zewdie", "Eritrea", "head-coach", "2025-01-01"],
  ["nat-women-eswatini", "Bongani Makhukhula", "Eswatini", "head-coach", "2025-01-01"],
  ["nat-women-ethiopia", "Yosef Gebrewold", "Ethiopia", "head-coach", "2025-01-17"],
  ["nat-women-gabon", "Tristan Mombo", "Gabon", "head-coach", "2016-04-13"],
  ["nat-women-ghana", "Kim Björkegren", "Sweden", "head-coach", "2025-01-14"],
  ["nat-women-guinea", "Kaman Camara", "Guinea", "head-coach", "2025-01-01"],
  ["nat-women-guinea-bissau", "Domingos Na Fatcha", "Guinea-Bissau", "head-coach", "2025-01-01"],
  ["nat-women-kenya", "Beldine Odemba", "Kenya", "head-coach", "2023-09-02"],
  ["nat-women-lesotho", "Shalane Lehohla", "Lesotho", "head-coach", "2025-01-01"],
  ["nat-women-liberia", "Selam Kebede", "Ethiopia", "head-coach", "2023-07-26"],
  ["nat-women-libya", "Naji Ajbara", "Libya", "head-coach", "2025-01-01"],
  ["nat-women-madagascar", "Émile Randriamirado", "Madagascar", "head-coach", "2025-01-01"],
  ["nat-women-mauritania", "Jordi Arimany", "Spain", "head-coach", "2023-11-06"],
  ["nat-women-mauritius", "Kersley Levrai", "Mauritius", "head-coach", "2023-04-18"],
  ["nat-women-mozambique", "Luís Fumo", "Mozambique", "head-coach", "2025-05-03"],
  ["nat-women-namibia", "Lucky Kakuva", "Namibia", "head-coach", "2025-09-24"],
  ["nat-women-niger", "Ali Mamadou", "Niger", "head-coach", "2025-01-01"],
  ["nat-women-rwanda", "André Mbungo", "Uganda", "head-coach", "2025-03-02"],
  ["nat-women-sao-tome-and-principe", "Regina Trindade", "Portugal", "head-coach", "2025-01-01"],
  ["nat-women-seychelles", "Chris Yip-Au", "Singapore", "head-coach", "2023-09-22"],
  ["nat-women-sierra-leone", "Hassan Mansaray", "Sierra Leone", "head-coach", "2021-10-24"],
  ["nat-women-somalia", "Mahad Hagi Dadir Amin Ali", "Somalia", "head-coach", "2025-06-01", "Ocean Starlets women national program head coach"],
  ["nat-women-south-sudan", "Simon Yor", "South Sudan", "head-coach", "2025-02-18"],
  ["nat-women-sudan", "Farouk Jabra", "Sudan", "head-coach", "2021-05-25"],
  ["nat-women-tanzania", "Bakari Shime", "Tanzania", "head-coach", "2018-05-04"],
  ["nat-women-togo", "Kaï Tomety", "Togo", "head-coach", "2018-01-08"],
  ["nat-women-tunisia", "Walid Garoum", "Tunisia", "head-coach", "2026-03-10"],
  ["nat-women-uganda", "Sheryl Botes", "South Africa", "head-coach", "2023-11-15"],
  ["nat-women-zimbabwe", "Sithethelelwe Sibanda", "Zimbabwe", "head-coach", "2024-09-23"],

  // =========================================================================
  // AFC [MEN] (46)
  // =========================================================================
  ["nat-men-japan", "Hajime Moriyasu", "Japan", "head-coach", "2018-07-26"],
  ["nat-men-iran", "Amir Ghalenoei", "Iran", "head-coach", "2023-03-13"],
  ["nat-men-south-korea", "Robert Moreno", "Spain", "caretaker", "2026-09-01"],
  ["nat-men-australia", "Tony Popovic", "Australia", "head-coach", "2024-09-26"],
  ["nat-men-uzbekistan", "Fabio Cannavaro", "Italy", "head-coach", "2025-10-06"],
  ["nat-men-india", "Khalid Jamil", "India", "head-coach", "2025-08-13"],
  ["nat-men-pakistan", "Nolberto Solano", "Peru", "head-coach", "2025-07-21"],
  ["nat-men-united-arab-emirates", "Zlatko Dalić", "Croatia", "head-coach", "2026-08-12"],
  ["nat-men-indonesia", "John Herdman", "England", "head-coach", "2026-01-03"],
  ["nat-men-saudi-arabia", "Georgios Donis", "Greece", "head-coach", "2026-04-23"],
  ["nat-men-chinese-taipei", "Matt Ross", "Australia", "head-coach", "2025-10-23"],
  ["nat-men-jordan", "Ezzaki Badou", "Morocco", "head-coach", "2026-07-19"],
  ["nat-men-thailand", "Anthony Hudson", "England", "head-coach", "2025-10-22"],
  ["nat-men-hong-kong", "Roberto Losada", "Spain", "head-coach", "2026-06-05"],
  ["nat-men-iraq", "Graham Arnold", "Australia", "head-coach", "2025-05-09"],
  ["nat-men-syria", "José Lana", "Spain", "head-coach", "2024-08-22"],
  ["nat-men-china-pr", "Shao Jiayi", "China PR", "head-coach", "2025-11-05"],
  ["nat-men-lebanon", "Madjid Bougherra", "Algeria", "head-coach", "2026-01-28"],
  ["nat-men-palestine", "Ihab Abu Jazar", "Palestine", "head-coach", "2024-12-03"],
  ["nat-men-philippines", "Carles Cuadrat", "Spain", "head-coach", "2025-07-24"],
  ["nat-men-afghanistan", "José Antonio Nogueira", "Brazil", "head-coach", "2026-02-01"],
  ["nat-men-bahrain", "Félix Sánchez", "Spain", "head-coach", "2026-10-12"],
  ["nat-men-bangladesh", "Thomas Dooley", "United States", "head-coach", "2026-05-21"],
  ["nat-men-bhutan", "Gary Phillips", "Australia", "head-coach", "2026-08-16"],
  ["nat-men-brunei-darussalam", "Ali Mustafa", "Brunei Darussalam", "head-coach", "2026-05-01"],
  ["nat-men-cambodia", "Koji Gyotoku", "Japan", "head-coach", "2025-03-09"],
  ["nat-men-guam", "Ross Awa", "Guam", "head-coach", "2023-07-01"],
  ["nat-men-kuwait", "Hélio Sousa", "Portugal", "head-coach", "2025-07-31"],
  ["nat-men-kyrgyzstan", "Urmat Abdukaimov", "Kyrgyzstan", "head-coach", "2026-08-25"],
  ["nat-men-laos", "Vladica Grujic", "Serbia", "head-coach", "2025-01-01"],
  ["nat-men-macau", "Emmanuel Noruega", "Macau", "caretaker", "2026-01-01"],
  ["nat-men-malaysia", "Tan Cheng Hoe", "Malaysia", "caretaker", "2026-06-25"],
  ["nat-men-maldives", "István Urbányi", "Hungary", "head-coach", "2026-01-07"],
  ["nat-men-mongolia", "Marco Ragini", "San Marino", "head-coach", "2026-05-16"],
  ["nat-men-myanmar", "Joern Andersen", "Norway", "head-coach", "2026-07-08"],
  ["nat-men-nepal", "Guglielmo Arena", "Italy", "interim", "2026-03-01", "2026 cycle head coach (ANFA transition period)"],
  ["nat-men-north-korea", "Sin Yong-nam", "North Korea", "head-coach", "2023-01-01"],
  ["nat-men-oman", "Tarik Sektioui", "Morocco", "head-coach", "2026-03-22"],
  ["nat-men-qatar", "Julen Lopetegui", "Spain", "head-coach", "2025-05-01"],
  ["nat-men-singapore", "Gavin Lee", "Singapore", "head-coach", "2025-06-24"],
  ["nat-men-sri-lanka", "Abdullah Al Mutairi", "Kuwait", "head-coach", "2024-11-04"],
  ["nat-men-tajikistan", "Igor Angelovski", "North Macedonia", "head-coach", "2026-04-30"],
  ["nat-men-timor-leste", "Zé Pedro", "Portugal", "head-coach", "2025-08-28"],
  ["nat-men-turkmenistan", "Rovshen Meredov", "Turkmenistan", "head-coach", "2025-05-26"],
  ["nat-men-vietnam", "Kim Sang-sik", "South Korea", "head-coach", "2024-05-03"],
  ["nat-men-yemen", "Noureddine Ould Ali", "Algeria", "head-coach", "2024-02-01"],

  // =========================================================================
  // AFC [WOMEN] (46)
  // =========================================================================
  ["nat-women-japan", "Michihisa Kano", "Japan", "interim", "2026-04-02"],
  ["nat-women-north-korea", "Ri Song-ho", "North Korea", "head-coach", "2025-01-01"],
  ["nat-women-australia", "Joe Montemurro", "Australia", "head-coach", "2025-06-02"],
  ["nat-women-china-pr", "Ante Milicic", "Australia", "head-coach", "2024-03-11"],
  ["nat-women-south-korea", "Shin Sang-woo", "South Korea", "head-coach", "2024-10-11"],
  ["nat-women-philippines", "Mark Torcaso", "Australia", "head-coach", "2023-08-23"],
  ["nat-women-afghanistan", "Pauline Hamill", "Scotland", "head-coach", "2025-05-01", "Head coach of FIFA-recognized Afghan Women United selection"],
  ["nat-women-bahrain", "Adnan Hussain", "Bahrain", "head-coach", "2025-01-01"],
  ["nat-women-bangladesh", "Peter Butler", "England", "head-coach", "2025-01-01"],
  ["nat-women-bhutan", "Kim Tae-in", "South Korea", "head-coach", "2025-01-01"],
  ["nat-women-brunei-darussalam", "Fábio Magrão", "Brazil", "interim", "2025-01-15", "FABD Technical Director overseeing women and youth football pathways"],
  ["nat-women-cambodia", "Koji Gyotoku", "Japan", "head-coach", "2025-01-01"],
  ["nat-women-chinese-taipei", "Prasobchoke Chokemor", "Thailand", "head-coach", "2025-01-01"],
  ["nat-women-guam", "Kimberly Sherman", "Guam", "head-coach", "2024-12-01"],
  ["nat-women-hong-kong", "José Ricardo Rambo", "Brazil", "head-coach", "2025-01-01"],
  ["nat-women-india", "Crispin Chettri", "India", "head-coach", "2026-04-07"],
  ["nat-women-indonesia", "Satoru Mochizuki", "Japan", "head-coach", "2026-04-08"],
  ["nat-women-iran", "Marziyeh Jafari", "Iran", "head-coach", "2025-04-23"],
  ["nat-women-iraq", "Abdul-Wahab Abu Al-Hail", "Iraq", "head-coach", "2025-01-01"],
  ["nat-women-jordan", "David Nascimento", "Portugal", "head-coach", "2025-01-01"],
  ["nat-women-kuwait", "Shahrzad Mozafar", "Iran", "head-coach", "2019-01-01", "Kuwait FA women national futsal and development head coach"],
  ["nat-women-kyrgyzstan", "Nematjan Zakirov", "Kyrgyzstan", "head-coach", "2025-01-01"],
  ["nat-women-laos", "Jong Song-chon", "South Korea", "head-coach", "2025-01-01"],
  ["nat-women-lebanon", "Wael Gharzeddine", "Lebanon", "head-coach", "2025-01-01"],
  ["nat-women-macau", "Meng Jun", "South Korea", "head-coach", "2025-01-01"],
  ["nat-women-malaysia", "Soleen Al-Zoubi", "Jordan", "interim", "2026-10-15", "FAM Women Football Technical Director overseeing senior side post-Cornelli"],
  ["nat-women-maldives", "Mohamed Athif", "Maldives", "head-coach", "2025-01-01"],
  ["nat-women-mongolia", "Sandagdorjiin Erdenebat", "Mongolia", "head-coach", "2025-01-01"],
  ["nat-women-myanmar", "Byun Sung-hwan", "South Korea", "head-coach", "2025-01-01"],
  ["nat-women-nepal", "Nabin Neupane", "Nepal", "head-coach", "2025-01-01"],
  ["nat-women-oman", "Rasheed Jabar", "Oman", "head-coach", "2025-01-01"],
  ["nat-women-pakistan", "Adeel Rizki", "Pakistan", "head-coach", "2025-01-01"],
  ["nat-women-palestine", "Ahmed Sharf", "Palestine", "head-coach", "2025-01-01"],
  ["nat-women-qatar", "Fedha Al-Abdullah", "Qatar", "head-coach", "2021-11-10", "Most recent official QFA senior women head coach"],
  ["nat-women-saudi-arabia", "Lluís Cortés", "Spain", "head-coach", "2025-01-01"],
  ["nat-women-singapore", "Karim Bencherifa", "Morocco", "head-coach", "2025-01-01"],
  ["nat-women-sri-lanka", "Abdullah Al Mutairi", "Kuwait", "head-coach", "2025-01-01"],
  ["nat-women-syria", "Salim Jablawi", "Syria", "head-coach", "2025-01-01"],
  ["nat-women-tajikistan", "Mubin Ergashev", "Tajikistan", "head-coach", "2025-01-01"],
  ["nat-women-thailand", "Natipong Sritong-In", "Thailand", "head-coach", "2025-01-01"],
  ["nat-women-timor-leste", "Emral Bustamam", "Indonesia", "head-coach", "2025-01-01"],
  ["nat-women-turkmenistan", "Boris Borowik", "Turkmenistan", "head-coach", "2025-01-01"],
  ["nat-women-united-arab-emirates", "Vera Pauw", "Netherlands", "head-coach", "2025-01-01"],
  ["nat-women-uzbekistan", "Kotryna Kulbytė", "Lithuania", "head-coach", "2025-01-01"],
  ["nat-women-vietnam", "Hoàng Văn Phúc", "Vietnam", "head-coach", "2026-05-01"],
  ["nat-women-yemen", "Noureddine Ould Ali", "Algeria", "interim", "2024-02-01", "YFA Technical Director overseeing national football development programs"],

  // =========================================================================
  // OFC [MEN] (11)
  // =========================================================================
  ["nat-men-new-zealand", "Darren Bazeley", "England", "head-coach", "2023-07-01"],
  ["nat-men-new-caledonia", "Félix Tagawa", "Tahiti", "head-coach", "2026-08-06"],
  ["nat-men-vanuatu", "Richard Iwai", "Vanuatu", "head-coach", "2025-01-01"],
  ["nat-men-american-samoa", "Diego Gómez", "Spain", "head-coach", "2026-03-09"],
  ["nat-men-cook-islands", "Rhys Ruka", "New Zealand", "head-coach", "2026-08-13"],
  ["nat-men-fiji", "Stéphane Auvray", "France", "head-coach", "2025-10-20"],
  ["nat-men-papua-new-guinea", "David Muta", "Papua New Guinea", "interim", "2026-10-15", "Interim head coach following passing of Bob Morris (Oct 2026)"],
  ["nat-men-samoa", "Jess Ibrom", "New Zealand", "head-coach", "2024-04-01"],
  ["nat-men-solomon-islands", "Ben Cahn", "England", "caretaker", "2026-03-22"],
  ["nat-men-tahiti", "Joël Fréchet", "France", "head-coach", "2025-12-25"],
  ["nat-men-tonga", "Timote Moleni", "Tonga", "head-coach", "2025-01-01"],

  // =========================================================================
  // OFC [WOMEN] (11)
  // =========================================================================
  ["nat-women-new-zealand", "Michael Mayne", "New Zealand", "head-coach", "2025-01-01"],
  ["nat-women-american-samoa", "Amanda Cromwell", "United States", "head-coach", "2025-01-01"],
  ["nat-women-cook-islands", "Rhys Ruka", "New Zealand", "head-coach", "2025-01-01"],
  ["nat-women-fiji", "Nicola Demaine", "England", "head-coach", "2025-01-01"],
  ["nat-women-new-caledonia", "Christelle Wahnawe", "New Caledonia", "head-coach", "2025-01-01"],
  ["nat-women-papua-new-guinea", "Eric Komeng", "Papua New Guinea", "head-coach", "2025-01-01"],
  ["nat-women-samoa", "Juan Chang Urrea", "New Zealand", "head-coach", "2025-01-01"],
  ["nat-women-solomon-islands", "Daniel Barrett", "Australia", "head-coach", "2025-01-01"],
  ["nat-women-tahiti", "Xavier Samin", "Tahiti", "head-coach", "2025-01-01"],
  ["nat-women-tonga", "Mafi Mosese", "Tonga", "head-coach", "2025-01-01"],
  ["nat-women-vanuatu", "Emerson Alcântara", "Brazil", "head-coach", "2025-01-01"],

];

const NATIONAL_MANAGER_MAP = new Map<string, CompactNationalManagerTuple>(
  NATIONAL_MANAGER_TUPLES.map((tuple) => [tuple[0], tuple])
);

export function getSeededNationalManagerMeta(teamId: string): {
  managerName: string;
  nationality: string;
  role: ManagerAppointmentRole;
  startDate: string;
  notes: string;
} | null {
  const tuple = NATIONAL_MANAGER_MAP.get(teamId);
  if (!tuple) return null;
  return {
    managerName: tuple[1],
    nationality: normalizeCountryName(tuple[2]),
    role: tuple[3],
    startDate: tuple[4],
    notes: tuple[5] || DEFAULT_NOTE,
  };
}

function slugifyManagerName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildPhilosophyForStyle(style: string, formation: string): ManagerPhilosophy {
  const lower = (style || '').toLowerCase();
  const isPossession = lower.includes('possession') || lower.includes('control');
  const isHighPress = lower.includes('press');
  const isCounter = lower.includes('counter') || lower.includes('compact');

  return {
    possession_passing: isPossession
      ? 'Controlled progressive build-up tailored for tournament qualification and knockout phases.'
      : 'Balanced vertical circulation prioritizing midfield compactness and wide outlets.',
    pressing: isHighPress
      ? 'Coordinated high pressing traps to regain possession inside the opponent half.'
      : 'Disciplined mid-block pressing triggers calibrated to international opposition.',
    defensive_structure: isCounter
      ? 'Compact defensive block protecting central zones before rapid transition breaks.'
      : 'Organized rest-defence shape anchored around a structured back line.',
    attacking_approach: `Operates primarily from a ${formation || '4-3-3'} international framework with wide progression.`,
    tactical_flexibility: 'Adapts match strategy across home qualifiers, away fixtures, and tournament knockout ties.',
    possession_index: isPossession ? 72 : isCounter ? 46 : 58,
    pressing_index: isHighPress ? 76 : isCounter ? 54 : 64,
    defensive_line_index: isHighPress || isPossession ? 66 : isCounter ? 44 : 56,
    attacking_boldness_index: isPossession || isHighPress ? 72 : isCounter ? 56 : 62,
    flexibility_index: formation.startsWith('3-') || formation.startsWith('5-') ? 72 : 66,
  };
}

export function buildSeededNationalManagers(
  nationalTeams: Team[],
  existingManagers: Manager[] = []
): {
  managers: Manager[];
  appointments: ManagerAppointment[];
} {
  const managers: Manager[] = [];
  const appointments: ManagerAppointment[] = [];
  const usedManagerIds = new Set<string>(existingManagers.map((m) => m.id));
  const existingByIdentity = new Map<string, Manager>();
  for (const m of existingManagers) {
    const key = m.name.trim().toLowerCase() + "::" + normalizeCountryName(m.nationality || "").toLowerCase();
    if (!existingByIdentity.has(key)) existingByIdentity.set(key, m);
  }
  const seededTimestamp = '2026-11-14T00:00:00.000Z';

  for (const team of nationalTeams) {
    const tuple = NATIONAL_MANAGER_MAP.get(team.id);
    if (!tuple) continue;

    const [, name, rawNationality, role, startDate, customNotes] = tuple;
    const nationality = normalizeCountryName(rawNationality);
    const identityKey = name.trim().toLowerCase() + "::" + nationality.toLowerCase();
    const matchedExisting = existingByIdentity.get(identityKey);

    let managerId: string;
    if (matchedExisting) {
      managerId = matchedExisting.id;
    } else {
      const baseSlug = slugifyManagerName(name) || team.id;
      managerId = `mgr-nat-${baseSlug}`;
      if (usedManagerIds.has(managerId)) {
        managerId = `mgr-nat-${baseSlug}-${team.id}`;
      }
      usedManagerIds.add(managerId);

      const formation = team.defaultFormation || '4-3-3';
      const style = team.playingStyle || 'Balanced International Control';
      const roleLabel =
        role === 'interim'
          ? 'Interim Manager'
          : role === 'caretaker'
          ? 'Caretaker Manager'
          : role === 'assistant'
          ? 'Assistant Manager'
          : 'Head Coach';
      const bio = `${roleLabel} of the ${team.name} national team (${team.confederation || 'FIFA'}), serving since ${startDate}.`;

      const manager: Manager = {
        id: managerId,
        name,
        nationality,
        date_of_birth: getVerifiedManagerDob(managerId, name, nationality),
        photo: '',
        preferred_formation: formation,
        tactical_style: style,
        philosophy_json: serializePhilosophyJson(buildPhilosophyForStyle(style, formation)),
        playing_background: '',
        bio,
        honours: [],
        status: 'active',
        verified: true,
        createdAt: seededTimestamp,
        updatedAt: seededTimestamp,
      };
      managers.push(manager);
      existingByIdentity.set(identityKey, manager);
    }

    const appointment: ManagerAppointment = {
      id: `appt-nat-${team.id}`,
      manager_id: managerId,
      manager_name: name,
      team_id: team.id,
      team_name: team.name,
      team_type: 'country',
      role,
      start_date: startDate,
      end_date: null,
      is_current: true,
      competitions: team.confederation ? [team.confederation] : [],
      honours: [],
      notes: customNotes || DEFAULT_NOTE,
      verified: true,
      createdAt: seededTimestamp,
      updatedAt: seededTimestamp,
    };
    appointments.push(appointment);
  }

  return { managers, appointments };
}

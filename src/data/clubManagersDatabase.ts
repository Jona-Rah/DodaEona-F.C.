import {
  Manager,
  ManagerAppointment,
  ManagerAppointmentRole,
  ManagerPhilosophy,
  serializePhilosophyJson,
} from '../types/manager';
import type { Team } from '../types/matchCentre';
import { normalizeCountryName } from './countryMetadata';
import { getVerifiedManagerDob } from './verifiedManagerDobs';

// [teamId, managerName, nationality, role, startDate, notes?]
export type CompactClubManagerTuple = [
  string,
  string,
  string,
  ManagerAppointmentRole,
  string,
  string?
];

const DEFAULT_NOTE = '2026/27 Transfermarkt / Soccerdonna club registry';

export const CLUB_MANAGER_TUPLES: CompactClubManagerTuple[] = [
  // =========================================================================
  // 1. BUNDESLIGA [MEN] (18)
  // =========================================================================
  ['fc27-5', 'Vincent Kompany', 'Belgium', 'head-coach', '2024-07-01'],
  ['fc27-24', 'Niko Kovač', 'Croatia', 'head-coach', '2025-02-02'],
  ['fc27-15', 'Carles Martínez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-48', 'Martín Demichelis', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-72', 'Sebastian Hoeneß', 'Germany', 'head-coach', '2023-04-03'],
  ['fc27-53', 'Julian Schuster', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-36', 'Christian Ilzer', 'Austria', 'head-coach', '2024-11-15'],
  ['fc27-124', 'Daniel Thioune', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-82', 'Urs Fischer', 'Switzerland', 'head-coach', '2025-12-01'],
  ['fc27-95', 'Adi Hütter', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-162', 'Manuel Baum', 'Germany', 'head-coach', '2025-11-01'],
  ['fc27-112', 'Merlin Polzin', 'Germany', 'head-coach', '2024-11-24'],
  ['fc27-293', 'Vincent Wagner', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-141', 'Mauro Lustrinelli', 'Switzerland', 'head-coach', '2026-07-01'],
  ['fc27-64', 'Jan-Moritz Lichte', 'Germany', 'caretaker', '2026-10-15'],
  ['fc27-187', 'René Wagner', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-215', 'Miron Muslić', 'Austria', 'head-coach', '2025-07-01'],
  ['fc27-254', 'Ralf Kettemann', 'Germany', 'head-coach', '2025-07-01'],

  // =========================================================================
  // 2. PREMIER LEAGUE [MEN] (20)
  // =========================================================================
  ['fc27-6', 'Mikel Arteta', 'Spain', 'head-coach', '2019-12-22'],
  ['fc27-2', 'Enzo Maresca', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-87', 'Fabian Hürzeler', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-32', 'Unai Emery', 'Spain', 'head-coach', '2022-11-01'],
  ['fc27-8', 'Andoni Iraola', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-76', 'Marco Rose', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-75', 'Keith Andrews', 'Republic of Ireland', 'head-coach', '2025-07-01'],
  ['fc27-43', 'Mauricio Pochettino', 'Argentina', 'head-coach', '2026-11-01'],
  ['fc27-28', 'Xabi Alonso', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-121', 'Daniel Farke', 'Germany', 'head-coach', '2023-07-04'],
  ['fc27-47', 'Oliver Glasner', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-105', 'David Moyes', 'Scotland', 'head-coach', '2025-01-11'],
  ['fc27-46', 'Matthias Jaissle', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-45', 'Roberto De Zerbi', 'Italy', 'head-coach', '2026-03-31'],
  ['fc27-138', 'Álvaro Arbeloa', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-58', 'Pierre Sage', 'France', 'head-coach', '2026-07-01'],
  ['fc27-34', 'Régis Le Bris', 'France', 'head-coach', '2024-07-01'],
  ['fc27-161', 'Sergej Jakirović', 'Bosnia & Herzegovina', 'head-coach', '2025-07-01'],
  ['fc27-186', 'Frank Lampard', 'England', 'head-coach', '2024-11-28'],
  ['fc27-137', "Gary O'Neil", 'England', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 3. LIGUE 1 MCDONALD'S [MEN] (18)
  // =========================================================================
  ['fc27-10', 'Luis Enrique', 'Spain', 'head-coach', '2023-07-05'],
  ['fc27-39', 'Davide Ancelotti', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-88', 'Carlos Vicens', 'Spain', 'head-coach', '2026-11-05'],
  ['fc27-80', 'Filipe Luís', 'Brazil', 'head-coach', '2026-07-01'],
  ['fc27-84', 'Bruno Génésio', 'France', 'head-coach', '2026-07-01'],
  ['fc27-21', 'Franck Haise', 'France', 'head-coach', '2025-10-01'],
  ['fc27-26', 'Yannick Cahuzac', 'France', 'head-coach', '2026-07-01'],
  ['fc27-99', 'Liam Rosenior', 'England', 'head-coach', '2026-07-01'],
  ['fc27-67', 'Hugo Oliveira', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-149', 'Jens Berthel Askou', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-258', 'Julien Lachuer', 'France', 'head-coach', '2026-07-01'],
  ['fc27-114', 'Olivier Pantaloni', 'France', 'head-coach', '2026-07-01'],
  ['fc27-131', 'Alexandre Dujeux', 'France', 'head-coach', '2026-07-01'],
  ['fc27-169', 'Will Still', 'Belgium', 'head-coach', '2026-07-01'],
  ['fc27-226', 'Jaïr Karam', 'France', 'interim', '2026-10-01'],
  ['fc27-198', 'Stéphane Gilli', 'France', 'head-coach', '2026-07-01'],
  ['fc27-324', 'Patrick Videira', 'France', 'head-coach', '2024-07-01'],
  ['fc27-289', 'Stéphane Dumont', 'France', 'head-coach', '2024-08-12'],

  // =========================================================================
  // 4. LALIGA EA SPORTS [MEN] (20)
  // =========================================================================
  ['fc27-4', 'Hansi Flick', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-1', 'José Mourinho', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-17', 'Diego Simeone', 'Argentina', 'head-coach', '2011-12-23'],
  ['fc27-86', 'Manuel Pellegrini', 'Chile', 'head-coach', '2020-08-01'],
  ['fc27-74', 'Iñigo Pérez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-60', 'Pellegrino Matarazzo', 'United States', 'head-coach', '2026-07-01'],
  ['fc27-56', 'Edin Terzić', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-38', 'Beñat San José', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-125', 'Luis García Plaza', 'Spain', 'head-coach', '2026-03-24'],
  ['fc27-52', 'Claudio Giráldez', 'Spain', 'head-coach', '2024-03-12'],
  ['fc27-94', 'Javier Aguirre', 'Mexico', 'head-coach', '2026-09-23'],
  ['fc27-189', 'Luís Castro', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-145', 'Quique Sánchez Flores', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-166', 'Martín Anselmi', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-142', 'José Bordalás', 'Spain', 'head-coach', '2023-04-29'],
  ['fc27-111', 'Eder Sarabia', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-63', 'Jagoba Arrasate', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-81', 'Antonio Hidalgo', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-221', 'José Alberto López', 'Spain', 'head-coach', '2022-12-13'],
  ['fc27-249', 'Juanfran Funes', 'Spain', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 5. SERIE A ENILIVE [MEN] (20)
  // =========================================================================
  ['fc27-12', 'Cristian Chivu', 'Romania', 'head-coach', '2025-06-09'],
  ['fc27-35', 'Cesc Fàbregas', 'Spain', 'head-coach', '2024-07-19'],
  ['fc27-44', 'Gian Piero Gasperini', 'Italy', 'head-coach', '2025-06-06'],
  ['fc27-61', 'Gennaro Gattuso', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-30', 'Rúben Amorim', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-25', 'Luciano Spalletti', 'Italy', 'head-coach', '2025-10-30'],
  ['fc27-29', 'Massimiliano Allegri', 'Italy', 'head-coach', '2026-07-03'],
  ['fc27-79', 'Raffaele Palladino', 'Italy', 'head-coach', '2026-09-15'],
  ['fc27-37', 'Maurizio Sarri', 'Italy', 'head-coach', '2026-06-15'],
  ['fc27-92', 'Paolo Vanoli', 'Italy', 'head-coach', '2026-09-20'],
  ['fc27-223', 'Massimiliano Alvini', 'Italy', 'head-coach', '2025-07-01'],
  ['fc27-93', 'Ignazio Abate', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-250', 'Daniele De Rossi', 'Italy', 'head-coach', '2025-11-01'],
  ['fc27-144', 'Fabio Pisacane', 'Italy', 'head-coach', '2025-07-01'],
  ['fc27-193', 'Alberto Gilardino', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-110', 'Alberto Aquilani', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-126', 'Paolo Zanetti', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-284', 'Eusebio Di Francesco', 'Italy', 'head-coach', '2025-07-01'],
  ['fc27-167', 'Davide Nicola', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-192', 'Ivan Jurić', 'Croatia', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 6. LIGA PORTUGAL [MEN] (18)
  // =========================================================================
  ['fc27-50', 'Marco Silva', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-49', 'Paulo Fonseca', 'Portugal', 'head-coach', '2026-11-04'],
  ['fc27-57', 'Francesco Farioli', 'Italy', 'head-coach', '2025-07-06'],
  ['fc27-97', 'Franclim Carvalho', 'Portugal', 'head-coach', '2026-10-20'],
  ['fc27-119', 'Ricardo Silva', 'Portugal', 'caretaker', '2026-10-01'],
  ['fc27-135', 'Vítor Severino', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-209', 'Luís Pinto', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-402', 'Petit', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-274', 'Vasco Botelho da Costa', 'Portugal', 'head-coach', '2025-07-01'],
  ['fc27-470', 'Bruno Pinheiro', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-210', 'Tiago Margarido', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-239', 'Sérgio Ferreira', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-182', 'Sérgio Raimundo', 'Portugal', 'caretaker', '2026-10-01'],
  ['fc27-299', 'Filipe Coelho', 'Portugal', 'head-coach', '2026-07-01', 'Filipe Emanuel Curto Coelho (b. 1985)'],
  ['fc27-158', 'Vasco Seabra', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-362', 'João Henriques', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-433', 'Mitchell van der Gaag', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-332', 'Pepa', 'Portugal', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 7. 1A PRO LEAGUE [MEN] (18)
  // =========================================================================
  ['fc27-130', 'Ivan Leko', 'Croatia', 'head-coach', '2025-12-08'],
  ['fc27-154', 'David Hubert', 'Belgium', 'head-coach', '2025-10-13'],
  ['fc27-173', 'Jess Thorup', 'Denmark', 'head-coach', '2026-07-14'],
  ['fc27-174', 'Vítor Bruno', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-199', 'Rik De Mil', 'Belgium', 'head-coach', '2025-12-10'],
  ['fc27-330', 'Frédéric De Meyer', 'Belgium', 'head-coach', '2026-07-01'],
  ['fc27-236', 'Vincent Euvrard', 'Belgium', 'head-coach', '2025-07-01'],
  ['fc27-359', 'Issame Charaï', 'Morocco', 'head-coach', '2025-07-01'],
  ['fc27-464', 'Marvin Compper', 'Germany', 'head-coach', '2026-08-03'],
  ['fc27-266', 'Frederik Vanderbiest', 'Belgium', 'head-coach', '2025-07-01'],
  ['fc27-535', 'Lee Johnson', 'England', 'head-coach', '2025-07-01'],
  ['fc27-273', 'Timmy Simons', 'Belgium', 'head-coach', '2026-07-01'],
  ['fc27-360', 'Pedro Caixinha', 'Portugal', 'head-coach', '2026-11-02'],
  ['fc27-432', 'Michael Beale', 'England', 'head-coach', '2026-07-01'],
  ['fc27-496', 'Sven Vandenbroeck', 'Belgium', 'head-coach', '2026-11-12'],
  ['fc27-466', 'Tim Bakens', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-297', 'Daniel Beichler', 'Austria', 'head-coach', '2026-10-07'],
  ['fc27-399', 'Mario Kohnen', 'Germany', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 8. LIGA F [WOMEN] (16)
  // =========================================================================
  ['fc27-3', 'Pere Romeu', 'Spain', 'head-coach', '2024-07-01'],
  ['fc27-16', 'David González', 'Spain', 'head-coach', '2026-07-01', 'David González Sanz'],
  ['fc27-19', 'Pau Quesada', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-22', 'Marc Ballester', 'Spain', 'head-coach', '2025-07-21'],
  ['fc27-41', 'Gorka Álvarez', 'Spain', 'head-coach', '2026-09-01'],
  ['fc27-55', 'Víctor Martín', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-68', 'Yerai Martín', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-101', 'David Losada', 'Spain', 'head-coach', '2024-07-01'],
  ['fc27-116', 'Sara Monforte', 'Spain', 'head-coach', '2024-07-01'],
  ['fc27-159', 'Alberto Rodríguez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-183', 'José Luis Sánchez Vera', 'Spain', 'head-coach', '2026-01-15'],
  ['fc27-211', 'Santi García', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-275', 'Adrián Martín', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-301', 'Cristian Toro', 'Argentina', 'head-coach', '2024-07-01'],
  ['fc27-367', 'Iñaki Goikoetxea', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-408', 'Andrea Esteban', 'Spain', 'head-coach', '2023-07-01'],

  // =========================================================================
  // 9. EREDIVISIE [MEN] (18)
  // =========================================================================
  ['fc27-89', 'Peter Bosz', 'Netherlands', 'head-coach', '2023-07-01'],
  ['fc27-106', 'Míchel Sánchez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-96', 'Giovanni van Bronckhorst', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-228', 'John van den Brom', 'Netherlands', 'head-coach', '2025-07-01'],
  ['fc27-146', 'Leeroy Echteld', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-197', 'Robin Veldman', 'Netherlands', 'head-coach', '2025-03-21'],
  ['fc27-168', 'Dick Schreuder', 'Netherlands', 'head-coach', '2025-07-01'],
  ['fc27-172', 'Anthony Correia', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-364', 'Dick Lukkien', 'Netherlands', 'head-coach', '2023-07-01'],
  ['fc27-296', 'Joseph Oosting', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-270', 'Danny Buijs', 'Netherlands', 'head-coach', '2023-07-01'],
  ['fc27-469', 'Henk Brugge', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-405', 'Rogier Meijer', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-329', 'Alex Pastoor', 'Netherlands', 'head-coach', '2026-11-01'],
  ['fc27-406', 'Ruben den Uil', 'Netherlands', 'head-coach', '2024-07-01'],
  ['fc27-537', 'Johan Plat', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-439', 'Maurice Steijn', 'Netherlands', 'head-coach', '2026-11-01'],
  ['fc27-503', 'Jürgen Streppel', 'Netherlands', 'head-coach', '2026-10-01'],

  // =========================================================================
  // 10. TRENDYOL SÜPER LİG [MEN] (18)
  // =========================================================================
  ['fc27-71', 'Okan Buruk', 'Türkiye', 'head-coach', '2022-06-23'],
  ['fc27-70', 'Emre Belözoğlu', 'Türkiye', 'head-coach', '2026-11-05'],
  ['fc27-120', 'Thomas Reis', 'Germany', 'head-coach', '2026-09-15'],
  ['fc27-104', 'Vincenzo Italiano', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-152', 'Nuri Şahin', 'Türkiye', 'head-coach', '2025-09-15'],
  ['fc27-234', 'Stanimir Stoilov', 'Bulgaria', 'head-coach', '2023-11-21'],
  ['fc27-202', 'Alfred Schreuder', 'Netherlands', 'head-coach', '2026-11-01'],
  ['fc27-263', 'Nenad Bjelica', 'Croatia', 'head-coach', '2026-10-01'],
  ['fc27-457', 'Recep Uçar', 'Türkiye', 'head-coach', '2025-07-01'],
  ['fc27-493', 'Uğur Uçar', 'Türkiye', 'head-coach', '2026-07-01'],
  ['fc27-325', 'Besnik Hasi', 'Albania', 'head-coach', '2026-07-01'],
  ['fc27-176', 'Burak Yılmaz', 'Türkiye', 'head-coach', '2026-09-10'],
  ['fc27-295', 'İlhan Palut', 'Türkiye', 'head-coach', '2026-07-01'],
  ['fc27-357', 'Selçuk İnan', 'Türkiye', 'head-coach', '2025-07-01'],
  ['fc27-428', 'Serkan Özbalta', 'Türkiye', 'head-coach', '2026-07-01'],
  ['fc27-265', 'Bernd Storck', 'Germany', 'head-coach', '2026-10-09'],
  ['fc27-394', 'Orhan Ak', 'Türkiye', 'head-coach', '2026-09-15'],
  ['fc27-527', 'Mustafa Dalcı', 'Türkiye', 'head-coach', '2026-10-15'],

  // =========================================================================
  // 11. ARKEMA PREMIÈRE LIGUE [WOMEN] (12)
  // =========================================================================
  ['fc27-7', 'Jonatan Giráldez', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-20', 'Paulo César', 'Brazil', 'head-coach', '2025-07-01'],
  ['fc27-27', 'Sandrine Soubeyrand', 'France', 'head-coach', '2018-10-10'],
  ['fc27-42', 'Nicolas Chabot', 'France', 'head-coach', '2026-05-15'],
  ['fc27-69', 'Antoine Ponroy', 'France', 'head-coach', '2026-07-01'],
  ['fc27-102', 'Vincent Nogueira', 'France', 'head-coach', '2021-07-01'],
  ['fc27-136', 'Patrice Lair', 'France', 'head-coach', '2026-07-01'],
  ['fc27-184', 'Pierre-Alain Picard', 'France', 'head-coach', '2026-07-01'],
  ['fc27-240', 'Roland Jamelot', 'France', 'head-coach', '2023-07-01'],
  ['fc27-276', 'Antoine Gérard', 'France', 'head-coach', '2020-07-01'],
  ['fc27-335', 'Maxime Di Liberto', 'France', 'head-coach', '2024-07-01'],
  ['fc27-409', 'Loïc Fiévet', 'France', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 12. 3. LIGA [MEN] (20)
  // =========================================================================
  ['fc27-723', 'Nico Willig', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-650', 'Stefan Kleineheismann', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-614', 'Alexander Ende', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-667', 'Achim Beierlorzer', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-613', 'Dietmar Hirsch', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-638', 'André Breitenreiter', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-635', 'Jochen Seitz', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-651', 'Argirios Giannikis', 'Greece', 'head-coach', '2026-07-01'],
  ['fc27-664', 'Uwe Koschinat', 'Germany', 'head-coach', '2024-12-12'],
  ['fc27-666', 'Rui Mota', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-679', 'Mersad Selimbegović', 'Bosnia & Herzegovina', 'head-coach', '2026-07-01'],
  ['fc27-678', 'Thomas Wörle', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-689', 'Sascha Hildmann', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-692', 'Samir Ferchichi', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-690', 'Marian Wilhelm', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-703', 'Matthias Mink', 'Germany', 'head-coach', '2024-01-23'],
  ['fc27-704', 'Michael Schiele', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-712', 'Pascal Reinhardt', 'Germany', 'head-coach', '2023-07-01'],
  ['fc27-714', 'Lucas Beniermann', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-724', 'Orest Shala', 'Germany', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 13. BARCLAYS WOMEN'S SUPER LEAGUE (14)
  // =========================================================================
  ['fc27-9', 'Sonia Bompastor', 'France', 'head-coach', '2024-07-01'],
  ['fc27-11', 'Renée Slegers', 'Netherlands', 'head-coach', '2024-10-15'],
  ['fc27-13', 'Andrée Jeglertz', 'Sweden', 'head-coach', '2025-07-01'],
  ['fc27-23', 'Eder Maestre', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-31', 'Eva Olid', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-65', 'Gareth Taylor', 'Wales', 'head-coach', '2025-07-01'],
  ['fc27-83', 'Brian Sørensen', 'Denmark', 'caretaker', '2026-10-01'],
  ['fc27-98', 'Martin Ho', 'England', 'head-coach', '2025-07-01'],
  ['fc27-115', 'Rita Guarino', 'Italy', 'head-coach', '2025-12-01'],
  ['fc27-147', 'Arturo Ruiz', 'Spain', 'head-coach', '2026-09-01'],
  ['fc27-170', 'Scott Phelan', 'England', 'head-coach', '2026-07-01'],
  ['fc27-205', 'Jo Potter', 'England', 'head-coach', '2025-07-01'],
  ['fc27-256', 'Amy Merricks', 'England', 'head-coach', '2023-04-01'],
  ['fc27-302', 'Karen Hills', 'England', 'head-coach', '2021-03-08'],

  // =========================================================================
  // 14. ELITESERIEN [MEN] (16)
  // =========================================================================
  ['fc27-247', 'Kjetil Knutsen', 'Norway', 'head-coach', '2018-01-01'],
  ['fc27-283', 'Morten Jensen', 'Norway', 'head-coach', '2021-01-01'],
  ['fc27-316', 'Sindre Tjelmeland', 'Norway', 'head-coach', '2026-01-01'],
  ['fc27-398', 'Freyr Alexandersson', 'Iceland', 'head-coach', '2026-07-01'],
  ['fc27-354', 'Eirik Horneland', 'Norway', 'head-coach', '2026-07-01'],
  ['fc27-507', 'Jørgen Vik', 'Norway', 'head-coach', '2024-01-08'],
  ['fc27-435', 'Johannes Moesgaard', 'Norway', 'head-coach', '2026-01-01'],
  ['fc27-561', 'Casper Røjkjær', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-468', 'Hans Erik Ødegaard', 'Norway', 'head-coach', '2025-01-01'],
  ['fc27-505', 'Even Sel', 'Norway', 'head-coach', '2026-01-01'],
  ['fc27-627', 'Andreas Tegström', 'Sweden', 'head-coach', '2024-01-01'],
  ['fc27-536', 'Jørgen Isnes', 'Norway', 'head-coach', '2026-07-01'],
  ['fc27-605', 'Thomas Myhre', 'Norway', 'head-coach', '2025-07-01'],
  ['fc27-644', 'Amund Skiri', 'Norway', 'head-coach', '2023-08-26'],
  ['fc27-660', 'Kjetil Rekdal', 'Norway', 'head-coach', '2024-06-30'],
  ['fc27-583', 'Azar Karadas', 'Norway', 'head-coach', '2024-02-08'],

  // =========================================================================
  // 15. ROSHN SAUDI LEAGUE [MEN] (18)
  // =========================================================================
  ['fc27-73', 'Simone Inzaghi', 'Italy', 'head-coach', '2025-06-05'],
  ['fc27-91', 'Ange Postecoglou', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-127', 'Marino Pušić', 'Netherlands', 'head-coach', '2026-07-01'],
  ['fc27-109', 'Brendan Rodgers', 'Northern Ireland', 'head-coach', '2025-12-01'],
  ['fc27-113', 'Jens Wissing', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-229', 'Thomas Letsch', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-355', 'Arthur Papas', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-203', 'Christophe Galtier', 'France', 'head-coach', '2025-07-01'],
  ['fc27-456', 'Giovanni Solinas', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-397', 'Khaled Al Atwi', 'Saudi Arabia', 'head-coach', '2026-07-01'],
  ['fc27-177', 'Bruno Lage', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-264', 'José Gomes', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-573', 'Des Buckingham', 'England', 'head-coach', '2025-07-01'],
  ['fc27-490', 'Maurício Dulac', 'Brazil', 'head-coach', '2026-07-01'],
  ['fc27-549', 'Jalel Kadri', 'Tunisia', 'head-coach', '2025-07-01'],
  ['fc27-429', 'Teo Pirija', 'Croatia', 'caretaker', '2026-10-01'],
  ['fc27-326', 'Vuk Rašović', 'Serbia', 'head-coach', '2026-09-21'],
  ['fc27-521', 'Fábio Carille', 'Brazil', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 16. HELLAS LIGA [MEN] (4)
  // =========================================================================
  ['fc27-160', 'Imanol Alguacil', 'Spain', 'head-coach', '2026-09-15'],
  ['fc27-241', 'Marko Nikolić', 'Serbia', 'head-coach', '2025-07-01'],
  ['fc27-213', 'Jacob Neestrup', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-303', 'Alessio Lisci', 'Italy', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 17. CONMEBOL LIBERTADORES [MEN] (20)
  // =========================================================================
  ['fc27-103', 'Joaquín Papa', 'Uruguay', 'head-coach', '2026-01-01'],
  ['fc27-117', 'Gustavo Álvarez', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-272', 'Alejandro Restrepo', 'Colombia', 'head-coach', '2026-05-01'],
  ['fc27-180', 'Daniel Carreño', 'Uruguay', 'head-coach', '2026-08-01'],
  ['fc27-134', 'Diego Aguirre', 'Uruguay', 'head-coach', '2023-11-21'],
  ['fc27-118', 'Pablo Repetto', 'Uruguay', 'head-coach', '2026-01-01'],
  ['fc27-511', 'Pablo Godoy', 'Bolivia', 'caretaker', '2026-09-01'],
  ['fc27-157', 'Gustavo Costas', 'Argentina', 'head-coach', '2026-08-01'],
  ['fc27-331', 'Daniel Garnero', 'Argentina', 'head-coach', '2025-06-12'],
  ['fc27-473', 'Hernán Caputto', 'Chile', 'head-coach', '2026-01-01'],
  ['fc27-237', 'Luis Amaranto Perea', 'Colombia', 'head-coach', '2026-07-01'],
  ['fc27-300', 'Luis Fernando Suárez', 'Colombia', 'head-coach', '2026-09-01'],
  ['fc27-208', 'Pablo Trobbiani', 'Argentina', 'caretaker', '2026-08-01'],
  ['fc27-269', 'Roberto Mosquera', 'Peru', 'head-coach', '2026-06-01'],
  ['fc27-181', 'Sebastián Viera', 'Uruguay', 'head-coach', '2026-09-01'],
  ['fc27-361', 'Nelson Valdez', 'Paraguay', 'head-coach', '2026-07-01'],
  ['fc27-404', 'Javier Rabanal', 'Spain', 'head-coach', '2026-06-01'],
  ['fc27-471', 'Mariano Rodríguez', 'Venezuela', 'head-coach', '2026-10-01'],
  ['fc27-363', 'Fabián Bustos', 'Argentina', 'head-coach', '2026-09-01'],
  ['fc27-437', 'Luis De Oliveira', 'Venezuela', 'caretaker', '2026-08-01'],

  // =========================================================================
  // 18. LIGA PROFESIONAL DE FÚTBOL [MEN] (30)
  // =========================================================================
  ['fc27-122', 'Rodolfo Arruabarrena', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-150', 'Jorge Almirón', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-294', 'Nicolás Diez', 'Argentina', 'head-coach', '2025-01-01'],
  ['fc27-108', 'Leonardo Ponzio', 'Argentina', 'head-coach', '2026-09-18'],
  ['fc27-171', 'Alfredo Berti', 'Argentina', 'head-coach', '2024-08-27'],
  ['fc27-201', 'Román Martínez', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-424', 'Diego Flores', 'Argentina', 'head-coach', '2026-02-12'],
  ['fc27-255', 'Ricardo Zielinski', 'Argentina', 'head-coach', '2025-02-11'],
  ['fc27-196', 'Guillermo Barros Schelotto', 'Argentina', 'head-coach', '2025-03-19'],
  ['fc27-393', 'Ariel Pereyra', 'Argentina', 'head-coach', '2026-05-01'],
  ['fc27-129', 'Alexander Medina', 'Uruguay', 'head-coach', '2026-02-23'],
  ['fc27-292', 'Jádson Viera', 'Uruguay', 'head-coach', '2026-08-18'],
  ['fc27-260', 'Julio Vaccari', 'Argentina', 'head-coach', '2026-05-27'],
  ['fc27-391', 'Damián Ayude', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-320', 'Diego Martínez', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-153', 'Sebastián Romero', 'Argentina', 'caretaker', '2026-09-15'],
  ['fc27-352', 'Leonardo Madelón', 'Argentina', 'head-coach', '2025-04-29'],
  ['fc27-350', 'Diego Dabove', 'Argentina', 'head-coach', '2025-01-02'],
  ['fc27-231', 'Martín Palermo', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-497', 'Frank Darío Kudelka', 'Argentina', 'head-coach', '2026-03-01'],
  ['fc27-175', 'Rubén Insúa', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-461', 'Darío Franco', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-459', 'Facundo Sava', 'Argentina', 'head-coach', '2025-07-01'],
  ['fc27-230', 'Omar De Felippe', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-426', 'Julio César Falcioni', 'Argentina', 'head-coach', '2026-03-01'],
  ['fc27-533', 'Pedro Troglio', 'Argentina', 'head-coach', '2025-04-08'],
  ['fc27-500', 'Sebastián Domínguez', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-534', 'Guillermo Duró', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-322', 'Javier Sanguinetti', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-559', 'Rubén Forestello', 'Argentina', 'head-coach', '2026-01-01'],

  // =========================================================================
  // 19. GOOGLE PIXEL FRAUEN-BUNDESLIGA [WOMEN] (14)
  // =========================================================================
  ['fc27-14', 'José Barcala', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-18', 'Stephan Lerch', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-40', 'Niko Arnautis', 'Germany', 'head-coach', '2017-09-28'],
  ['fc27-54', 'Roberto Pätzold', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-85', 'Fritzy Kromp', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-100', 'Britta Carlson', 'Germany', 'head-coach', '2025-01-06'],
  ['fc27-132', 'Heiko Gerber', 'Germany', 'head-coach', '2022-07-01'],
  ['fc27-151', 'Eva-Maria Virsinger', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-194', 'Jonas Stephan', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-224', 'Thomas Oostendorp', 'Netherlands', 'head-coach', '2025-07-01'],
  ['fc27-285', 'Marco Konrad', 'Germany', 'head-coach', '2025-07-01'],
  ['fc27-319', 'Rodolfo Cardoso', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-382', 'Takashi Yamashita', 'Japan', 'head-coach', '2023-07-01'],
  ['fc27-417', 'Omar Adlani', 'Germany', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 20. EFL CHAMPIONSHIP [MEN] (24)
  // =========================================================================
  ['fc27-212', 'Scott Parker', 'England', 'head-coach', '2026-11-04'],
  ['fc27-214', 'César Peixoto', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-479', 'Mark Robins', 'England', 'head-coach', '2025-01-01'],
  ['fc27-306', 'Vítor Matos', 'Portugal', 'head-coach', '2025-11-01'],
  ['fc27-307', 'Chris Davies', 'England', 'head-coach', '2024-07-01'],
  ['fc27-243', 'Nicky Hayen', 'Belgium', 'head-coach', '2026-07-01'],
  ['fc27-540', 'James Morrison', 'Scotland', 'caretaker', '2026-04-01'],
  ['fc27-541', 'Steven Schumacher', 'England', 'head-coach', '2025-01-30'],
  ['fc27-568', 'Brian Barry-Murphy', 'Republic of Ireland', 'head-coach', '2025-07-01'],
  ['fc27-444', 'Tony Mowbray', 'England', 'head-coach', '2026-07-01'],
  ['fc27-410', 'Julien Stéphan', 'France', 'head-coach', '2025-07-01'],
  ['fc27-277', 'Kim Hellberg', 'Sweden', 'head-coach', '2025-11-01'],
  ['fc27-513', 'John Mousinho', 'England', 'head-coach', '2023-01-20'],
  ['fc27-478', 'Alessio Dionisi', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-369', 'Philippe Clement', 'Belgium', 'head-coach', '2025-11-01'],
  ['fc27-279', 'Tonda Eckert', 'Germany', 'head-coach', '2025-11-01'],
  ['fc27-244', 'Alex Neil', 'Scotland', 'head-coach', '2024-12-30'],
  ['fc27-338', 'John Eustace', 'England', 'head-coach', '2025-02-13'],
  ['fc27-336', 'Phil Parkinson', 'England', 'head-coach', '2021-07-01'],
  ['fc27-371', 'Chris Wilder', 'England', 'head-coach', '2025-09-01'],
  ['fc27-412', 'Michael Skubala', 'England', 'head-coach', '2026-07-01'],
  ['fc27-443', 'Graham Alexander', 'Scotland', 'head-coach', '2026-09-01'],
  ['fc27-514', 'Nathan Jones', 'Wales', 'head-coach', '2024-02-04'],
  ['fc27-567', 'Tom Shaw', 'England', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 21. LALIGA HYPERMOTION [MEN] (22)
  // =========================================================================
  ['fc27-606', 'Ion Ansotegi', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-308', 'Luis García', 'Spain', 'head-coach', '2026-07-01', 'Former Espanyol coach at RCD Mallorca'],
  ['fc27-278', 'Quique Álvarez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-372', 'Luis Carrión', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-518', 'Imanol Idiakez', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-548', 'Jokin Aranbarri', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-339', 'Albert Sánchez', 'Spain', 'head-coach', '2026-10-29'],
  ['fc27-304', 'Xavier García Pimienta', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-519', 'Álvaro Cervera', 'Spain', 'head-coach', '2024-12-23'],
  ['fc27-415', 'Pacheta', 'Spain', 'head-coach', '2025-05-14'],
  ['fc27-449', 'Iván Ania', 'Spain', 'head-coach', '2023-07-01'],
  ['fc27-341', 'Julián Calero', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-377', 'Nicolás Larcamón', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-416', 'Pablo Hernández', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-447', 'Sergio Francisco', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-482', 'Joseba Etxeberria', 'Spain', 'head-coach', '2026-10-04'],
  ['fc27-486', 'Fran Escribá', 'Spain', 'head-coach', '2026-02-15'],
  ['fc27-546', 'Sergio Lobera', 'Spain', 'head-coach', '2026-11-08'],
  ['fc27-577', 'Ferran Costa', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-578', 'Carles Manso', 'Spain', 'head-coach', '2025-11-23'],
  ['fc27-604', 'Javier Calleja', 'Spain', 'head-coach', '2026-09-16'],
  ['fc27-626', 'Fredi Álvarez', 'Spain', 'head-coach', '2024-03-12'],

  // =========================================================================
  // 22-28. SMALL / SINGLE EUROPEAN & GLOBAL LEAGUES (11)
  // =========================================================================
  ['fc27-305', 'Arda Turan', 'Türkiye', 'head-coach', '2025-07-01'],
  ['fc27-216', 'Maciej Kędziorek', 'Poland', 'caretaker', '2026-10-01'],
  ['fc27-185', 'Jindřich Trpišovský', 'Czech Republic', 'head-coach', '2017-12-22'],
  ['fc27-310', 'Brian Priske', 'Denmark', 'head-coach', '2025-07-01'],
  ['fc27-246', 'Radoslav Kováč', 'Czech Republic', 'head-coach', '2026-07-01'],
  ['fc27-373', 'Balázs Borbély', 'Slovakia', 'head-coach', '2026-07-01'],
  ['fc27-225', 'Jerko Leko', 'Croatia', 'head-coach', '2026-07-01'],
  ['fc27-386', 'Gonzalo García', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-148', 'Rogério Ceni', 'Brazil', 'head-coach', '2023-09-09'],
  ['fc27-512', 'Igor Jovićević', 'Croatia', 'head-coach', '2024-09-26'],

  // =========================================================================
  // 29. SCOTTISH PREMIERSHIP [MEN] (12)
  // =========================================================================
  ['fc27-139', "Martin O'Neill", 'Northern Ireland', 'head-coach', '2026-07-01'],
  ['fc27-164', 'Derek McInnes', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-238', 'Wouter Vrancken', 'Belgium', 'head-coach', '2026-07-01'],
  ['fc27-271', 'Marink Reedijk', 'Netherlands', 'head-coach', '2026-09-15'],
  ['fc27-438', 'Alfred Johansson', 'Sweden', 'head-coach', '2026-07-01'],
  ['fc27-608', 'John McGlynn', 'Scotland', 'head-coach', '2022-05-04'],
  ['fc27-333', 'Jim Goodwin', 'Republic of Ireland', 'head-coach', '2023-03-01'],
  ['fc27-472', 'Steven Pressley', 'Scotland', 'head-coach', '2025-07-01'],
  ['fc27-539', 'Neil McCann', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-365', 'Stephen Robinson', 'Northern Ireland', 'head-coach', '2026-03-15'],
  ['fc27-566', 'Craig McLeish', 'Scotland', 'head-coach', '2026-06-15'],
  ['fc27-630', 'Simo Valakari', 'Finland', 'head-coach', '2024-10-01'],

  // =========================================================================
  // 30. 3F SUPERLIGA [MEN] (12)
  // =========================================================================
  ['fc27-195', 'Mike Tullberg', 'Denmark', 'head-coach', '2025-09-01'],
  ['fc27-253', 'Bo Svensson', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-323', 'Jens Olsen', 'Denmark', 'head-coach', '2024-07-01'],
  ['fc27-227', 'Jakob Poulsen', 'Denmark', 'head-coach', '2025-07-01'],
  ['fc27-392', 'Thomas Nørgaard', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-465', 'Nickolai Lund', 'Denmark', 'head-coach', '2025-07-01'],
  ['fc27-562', 'Morten Dahm Kjærgaard', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-351', 'Rasmus Bertelsen', 'Denmark', 'head-coach', '2023-03-23'],
  ['fc27-506', 'Simon Poulsen', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-610', 'Niki Zimling', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-586', 'Mikkel Jespersen', 'Denmark', 'head-coach', '2026-07-01'],
  ['fc27-427', 'Thomas Thomasberg', 'Denmark', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 31. CONMEBOL SUDAMERICANA [MEN] (20)
  // =========================================================================
  ['fc27-441', 'Guillermo Sanguinetti', 'Uruguay', 'head-coach', '2025-07-01'],
  ['fc27-251', 'Pablo Sánchez', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-268', 'David González', 'Colombia', 'head-coach', '2025-07-01', 'David González Giraldo'],
  ['fc27-298', 'Alberto Gamero', 'Colombia', 'head-coach', '2026-01-01'],
  ['fc27-334', 'Marcelo Méndez', 'Uruguay', 'head-coach', '2026-01-01'],
  ['fc27-366', 'Horacio Melgarejo', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-368', 'Guillermo Farré', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-475', 'Lucas Bovaglio', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-565', 'Patricio Graff', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-538', 'Daniel Farías', 'Venezuela', 'head-coach', '2026-01-01'],
  ['fc27-407', 'Jorge Cazulo', 'Uruguay', 'head-coach', '2026-01-01'],
  ['fc27-585', 'Federico Urciuoli', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-476', 'Jorge González', 'Paraguay', 'head-coach', '2024-07-09'],
  ['fc27-629', 'Eduardo Saragó', 'Venezuela', 'head-coach', '2025-07-01'],
  ['fc27-607', 'Noel Sanvicente', 'Venezuela', 'head-coach', '2026-01-01'],
  ['fc27-563', 'Cristian Paulucci', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-217', 'Tite', 'Brazil', 'head-coach', '2026-07-01'],
  ['fc27-510', 'Sergio Blanco', 'Uruguay', 'head-coach', '2026-01-01'],
  ['fc27-628', 'Andrés Yllana', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-646', 'Juan Pablo Grass', 'Bolivia', 'caretaker', '2026-09-01'],

  // =========================================================================
  // 32. ÖSTERREICHISCHE FUSSBALL-BUNDESLIGA [MEN] (12)
  // =========================================================================
  ['fc27-200', 'Danny Röhl', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-235', 'Dietmar Kühbauer', 'Austria', 'head-coach', '2025-10-01'],
  ['fc27-267', 'Fabio Ingolitsch', 'Austria', 'head-coach', '2025-12-01'],
  ['fc27-328', 'Johannes Hoff Thorup', 'Denmark', 'head-coach', '2025-12-01'],
  ['fc27-358', 'Maximilian Uhlig', 'Austria', 'caretaker', '2026-10-15'],
  ['fc27-509', 'Markus Schopp', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-474', 'Manfred Schmid', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-401', 'Mario Despotović', 'Croatia', 'head-coach', '2026-07-01'],
  ['fc27-584', 'Philipp Semlic', 'Austria', 'head-coach', '2024-07-01'],
  ['fc27-440', 'Gerald Scheiblehner', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-564', 'Ognjen Zarić', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-609', 'Markus Mader', 'Austria', 'head-coach', '2025-07-01'],

  // =========================================================================
  // 33. ALLSVENSKAN [MEN] (16)
  // =========================================================================
  ['fc27-356', 'Henrik Rydström', 'Sweden', 'head-coach', '2026-06-15'],
  ['fc27-434', 'Ábel Lőrincz', 'Hungary', 'caretaker', '2026-11-01'],
  ['fc27-531', 'Andreas Brännström', 'Sweden', 'head-coach', '2026-07-01'],
  ['fc27-327', 'Gaute Helstrup', 'Norway', 'head-coach', '2026-07-01'],
  ['fc27-436', 'Andreas Engelmark', 'Sweden', 'head-coach', '2025-01-01'],
  ['fc27-400', 'Björn Hamberg', 'Sweden', 'head-coach', '2026-01-01'],
  ['fc27-499', 'Jens Gustafsson', 'Sweden', 'head-coach', '2025-01-01'],
  ['fc27-467', 'José Riveiro', 'Spain', 'head-coach', '2026-01-01'],
  ['fc27-556', 'Fredrik Holmberg', 'Sweden', 'head-coach', '2022-01-01'],
  ['fc27-581', 'Joachim Björklund', 'Sweden', 'head-coach', '2026-01-01'],
  ['fc27-643', 'Alexander Rubin', 'Sweden', 'head-coach', '2026-01-01'],
  ['fc27-601', 'Ulf Kristiansson', 'Sweden', 'head-coach', '2025-01-01'],
  ['fc27-672', 'Toni Koskela', 'Finland', 'head-coach', '2025-01-01'],
  ['fc27-658', 'Andreas Holmberg', 'Sweden', 'head-coach', '2024-01-01'],
  ['fc27-625', 'Henok Goitom', 'Eritrea', 'head-coach', '2025-07-01'],
  ['fc27-622', 'Stuart Baxter', 'Scotland', 'head-coach', '2026-01-01'],

  // =========================================================================
  // 34-35. UAE & AZERBAIJAN (2)
  // =========================================================================
  ['fc27-378', 'Vladimir Ivić', 'Serbia', 'head-coach', '2025-02-04'],
  ['fc27-411', 'Qurban Qurbanov', 'Azerbaijan', 'head-coach', '2008-08-01'],

  // =========================================================================
  // 36. BUNDESLIGA 2 [MEN] (18)
  // =========================================================================
  ['fc27-242', 'Tobias Strobl', 'Germany', 'head-coach', '2026-06-15'],
  ['fc27-287', 'Frank Schmidt', 'Germany', 'head-coach', '2007-09-17'],
  ['fc27-451', 'Oliver Kirch', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-421', 'Stefan Leitl', 'Germany', 'head-coach', '2025-02-18'],
  ['fc27-570', 'Mitch Kniat', 'Germany', 'head-coach', '2026-11-01'],
  ['fc27-312', 'Uwe Rösler', 'Germany', 'head-coach', '2025-10-01'],
  ['fc27-516', 'Lars Kornetka', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-343', 'Marcel Rapp', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-286', 'Sandro Wagner', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-349', 'Torsten Lieberknecht', 'Germany', 'head-coach', '2025-04-22'],
  ['fc27-572', 'Heiko Vogel', 'Germany', 'head-coach', '2025-12-01'],
  ['fc27-388', 'Miroslav Klose', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-418', 'Florian Kohfeldt', 'Germany', 'head-coach', '2024-09-07'],
  ['fc27-450', 'Petrik Sander', 'Germany', 'head-coach', '2025-10-01'],
  ['fc27-484', 'Claus-Dieter Wollitz', 'Germany', 'head-coach', '2021-07-01'],
  ['fc27-517', 'Thomas Stamm', 'Switzerland', 'head-coach', '2024-07-01'],
  ['fc27-545', 'Maximilian Senft', 'Austria', 'head-coach', '2026-07-01'],
  ['fc27-592', 'Timo Schultz', 'Germany', 'head-coach', '2025-07-01'],

  // =========================================================================
  // 37. CREDIT SUISSE SUPER LEAGUE [MEN] (11)
  // =========================================================================
  ['fc27-261', 'Mattia Croci-Torti', 'Switzerland', 'head-coach', '2021-09-01'],
  ['fc27-222', 'Gerardo Seoane', 'Switzerland', 'head-coach', '2025-10-31'],
  ['fc27-431', 'Enrico Maaßen', 'Germany', 'head-coach', '2024-07-01'],
  ['fc27-321', 'Jocelyn Gourvennec', 'France', 'head-coach', '2025-08-11'],
  ['fc27-396', 'Didier Tholot', 'France', 'head-coach', '2023-07-01'],
  ['fc27-353', 'Slaviša Jokanović', 'Serbia', 'head-coach', '2026-07-01'],
  ['fc27-558', 'Gian-Luca Privitelli', 'Switzerland', 'head-coach', '2026-07-01'],
  ['fc27-501', 'Jörg Portmann', 'Switzerland', 'head-coach', '2026-07-01'],
  ['fc27-599', 'Marcel Koller', 'Switzerland', 'head-coach', '2026-07-01'],
  ['fc27-529', 'Ludovic Magnin', 'Switzerland', 'head-coach', '2026-07-01'],
  ['fc27-620', 'Olaf Janßen', 'Germany', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 38. PKO BANK POLSKI EKSTRAKLASA [MEN] (18)
  // =========================================================================
  ['fc27-337', 'Niels Frederiksen', 'Denmark', 'head-coach', '2024-07-01'],
  ['fc27-515', 'Marek Papszun', 'Poland', 'head-coach', '2025-12-19'],
  ['fc27-414', 'Michal Gašparík', 'Slovakia', 'head-coach', '2025-07-01'],
  ['fc27-480', 'Adrian Siemieniec', 'Poland', 'head-coach', '2023-04-04'],
  ['fc27-542', 'Óscar García', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-654', 'Daniel Myśliwiec', 'Poland', 'head-coach', '2025-10-01'],
  ['fc27-481', 'Rafał Górak', 'Poland', 'head-coach', '2019-06-03'],
  ['fc27-653', 'Leszek Ojrzyński', 'Poland', 'head-coach', '2025-03-13'],
  ['fc27-446', 'Aleksandar Vuković', 'Serbia', 'head-coach', '2026-11-01'],
  ['fc27-544', 'Robert Kolendowicz', 'Poland', 'head-coach', '2026-07-01'],
  ['fc27-591', 'Mariusz Misiura', 'Poland', 'head-coach', '2026-07-01'],
  ['fc27-639', 'Mariusz Jop', 'Poland', 'head-coach', '2024-09-24'],
  ['fc27-370', 'Mateusz Stolarski', 'Poland', 'head-coach', '2026-07-01'],
  ['fc27-569', 'John Carver', 'England', 'head-coach', '2026-07-01'],
  ['fc27-669', 'Toni Golem', 'Croatia', 'head-coach', '2026-07-01'],
  ['fc27-616', 'Adam Majewski', 'Poland', 'head-coach', '2026-07-01'],
  ['fc27-590', 'Željko Kopić', 'Croatia', 'head-coach', '2026-07-01'],
  ['fc27-379', 'Dawid Szwarga', 'Poland', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 39. SSE AIRTRICITY MEN'S PREMIER DIVISION [MEN] (7)
  // =========================================================================
  ['fc27-698', 'Stephen Bradley', 'Republic of Ireland', 'head-coach', '2016-07-04'],
  ['fc27-717', 'Stephen Kenny', 'Republic of Ireland', 'head-coach', '2024-05-16'],
  ['fc27-708', 'Mark Connolly', 'Scotland', 'caretaker', '2026-08-15'],
  ['fc27-734', 'John Russell', 'Republic of Ireland', 'head-coach', '2026-07-01'],
  ['fc27-739', 'Ciarán Kilduff', 'Republic of Ireland', 'head-coach', '2025-01-01'],
  ['fc27-684', 'John Caulfield', 'Republic of Ireland', 'head-coach', '2020-08-21'],
  ['fc27-729', 'Alan Reynolds', 'Republic of Ireland', 'head-coach', '2024-03-27'],

  // =========================================================================
  // 40. EFL LEAGUE ONE [MEN] (24)
  // =========================================================================
  ['fc27-718', 'Gary Caldwell', 'Scotland', 'head-coach', '2026-02-15'],
  ['fc27-589', 'Russell Martin', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-647', 'Ian Evatt', 'England', 'head-coach', '2025-10-21'],
  ['fc27-632', 'Jack Wilshere', 'England', 'head-coach', '2025-10-01'],
  ['fc27-634', 'Leam Richardson', 'England', 'head-coach', '2025-10-01'],
  ['fc27-633', 'Martin Drury', 'England', 'head-coach', '2026-07-01'],
  ['fc27-588', 'Dave Challinor', 'England', 'head-coach', '2026-07-01'],
  ['fc27-611', 'Paul Warne', 'England', 'head-coach', '2025-04-15'],
  ['fc27-612', 'Aaron Ramsey', 'Wales', 'head-coach', '2026-07-01'],
  ['fc27-648', 'Richie Wellens', 'England', 'head-coach', '2022-03-09'],
  ['fc27-662', 'Michael Duff', 'Northern Ireland', 'head-coach', '2026-07-01'],
  ['fc27-661', 'Jim McNulty', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-663', 'Tom Hounsell', 'England', 'head-coach', '2026-07-01'],
  ['fc27-676', 'Johnnie Jackson', 'England', 'head-coach', '2022-05-16'],
  ['fc27-674', 'Neil Harris', 'England', 'head-coach', '2025-02-19'],
  ['fc27-673', 'Tom Cleverley', 'England', 'head-coach', '2025-06-13'],
  ['fc27-685', 'Grant McCann', 'Northern Ireland', 'head-coach', '2023-05-12'],
  ['fc27-688', 'Martin Paterson', 'Northern Ireland', 'head-coach', '2025-07-01'],
  ['fc27-697', 'Byron Webster', 'England', 'caretaker', '2026-10-01'],
  ['fc27-694', 'Nigel Clough', 'England', 'head-coach', '2020-11-06'],
  ['fc27-695', 'Alex Revell', 'England', 'head-coach', '2024-05-09'],
  ['fc27-706', 'Daniel Stendel', 'Germany', 'head-coach', '2026-07-01'],
  ['fc27-707', 'Robbie Savage', 'Wales', 'head-coach', '2026-07-01'],
  ['fc27-719', 'Gary Bowyer', 'England', 'head-coach', '2024-12-17'],

  // =========================================================================
  // 41. THAILAND LEAGUE [MEN] (1)
  // =========================================================================
  ['fc27-631', 'Raúl Caneda', 'Spain', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 42. MAJOR LEAGUE SOCCER [MEN] (30)
  // =========================================================================
  ['fc27-128', 'Kily González', 'Argentina', 'head-coach', '2026-09-01'],
  ['fc27-233', 'B.J. Callaghan', 'United States', 'head-coach', '2024-07-03'],
  ['fc27-155', 'Jesper Sørensen', 'Denmark', 'head-coach', '2025-01-14'],
  ['fc27-133', 'Xavi Tamarit', 'Spain', 'caretaker', '2026-10-15'],
  ['fc27-207', 'Ryan Richter', 'United States', 'caretaker', '2026-05-15'],
  ['fc27-178', 'Laurent Courtois', 'France', 'head-coach', '2026-05-15'],
  ['fc27-232', 'Brian Schmetzer', 'United States', 'head-coach', '2016-07-26'],
  ['fc27-318', 'Pat Noonan', 'United States', 'head-coach', '2021-12-14'],
  ['fc27-179', 'Pascal Jansen', 'Netherlands', 'head-coach', '2025-01-06'],
  ['fc27-206', 'Martín Perelman', 'Argentina', 'caretaker', '2026-03-15'],
  ['fc27-448', 'Eric Quill', 'United States', 'head-coach', '2024-11-20'],
  ['fc27-387', 'Cameron Knowles', 'New Zealand', 'head-coach', '2026-01-01'],
  ['fc27-156', 'Gregg Berhalter', 'United States', 'head-coach', '2024-10-08'],
  ['fc27-317', 'Greg Vanney', 'United States', 'head-coach', '2021-01-05'],
  ['fc27-257', 'Martí Cifuentes', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-347', 'Ben Olsen', 'United States', 'head-coach', '2022-11-08'],
  ['fc27-419', 'Pablo Mastroeni', 'United States', 'head-coach', '2021-08-27'],
  ['fc27-290', 'Marko Mitrović', 'Serbia', 'head-coach', '2025-11-01'],
  ['fc27-488', 'Michael Bradley', 'United States', 'head-coach', '2025-12-15'],
  ['fc27-525', 'Matt Wells', 'England', 'head-coach', '2025-12-22'],
  ['fc27-291', 'Robin Fraser', 'United States', 'interim', '2025-01-10', '2026 MLS season head coach (transition Nov 2026)'],
  ['fc27-385', 'Tata Martino', 'Argentina', 'head-coach', '2025-11-06'],
  ['fc27-552', 'Philippe Eullaffroy', 'France', 'caretaker', '2026-09-01'],
  ['fc27-522', 'René Weiler', 'Switzerland', 'head-coach', '2025-07-16'],
  ['fc27-259', 'Mikey Varas', 'United States', 'head-coach', '2024-09-16'],
  ['fc27-348', 'Bruce Arena', 'United States', 'head-coach', '2024-11-07'],
  ['fc27-420', 'Dean Smith', 'England', 'head-coach', '2023-12-12'],
  ['fc27-452', 'Yoann Damet', 'France', 'head-coach', '2025-12-16'],
  ['fc27-487', 'Davy Arnaud', 'United States', 'caretaker', '2026-09-01'],
  ['fc27-555', 'Raphaël Wicky', 'Switzerland', 'interim', '2026-01-05', '2026 MLS season head coach (transition Nov 2026)'],

  // =========================================================================
  // 43. CHINESE SUPER LEAGUE [MEN] (16)
  // =========================================================================
  ['fc27-574', 'Kevin Muscat', 'Australia', 'head-coach', '2023-12-17'],
  ['fc27-524', 'Tian Tang', 'China PR', 'head-coach', '2026-01-01'],
  ['fc27-550', 'Vladan Milojević', 'Serbia', 'head-coach', '2026-07-01'],
  ['fc27-460', 'Ross Aloisi', 'Australia', 'head-coach', '2025-12-01'],
  ['fc27-617', 'Guoxu Li', 'China PR', 'head-coach', '2023-12-01'],
  ['fc27-649', 'Jordi Vinyals', 'Spain', 'head-coach', '2026-01-01'],
  ['fc27-637', 'Zhuoxiang Deng', 'China PR', 'head-coach', '2025-04-12'],
  ['fc27-701', 'Milan Ristić', 'Serbia', 'head-coach', '2026-01-01'],
  ['fc27-494', 'John Aloisi', 'Australia', 'head-coach', '2026-01-06'],
  ['fc27-523', 'Nick Montgomery', 'Scotland', 'head-coach', '2026-01-08'],
  ['fc27-595', 'Daniel Ramos', 'Portugal', 'head-coach', '2025-04-29'],
  ['fc27-618', 'Zhi Zheng', 'China PR', 'head-coach', '2026-01-01'],
  ['fc27-665', 'Robbie Neilson', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-677', 'Jianye Liu', 'China PR', 'head-coach', '2026-01-01'],
  ['fc27-675', 'Genwei Yu', 'China PR', 'head-coach', '2021-03-26'],
  ['fc27-686', 'Seo Jung-won', 'South Korea', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 44. SERIE BKT [MEN] (20)
  // =========================================================================
  ['fc27-554', 'Matteo Andreoletti', 'Italy', 'head-coach', '2026-09-30'],
  ['fc27-342', 'Fabio Pecchia', 'Italy', 'head-coach', '2026-09-02'],
  ['fc27-313', 'Marco Baroni', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-526', 'Alessandro Monticciolo', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-311', "Luca D'Angelo", 'Italy', 'head-coach', '2026-10-22'],
  ['fc27-280', 'Filippo Inzaghi', 'Italy', 'head-coach', '2025-06-17'],
  ['fc27-345', 'Paolo Bianco', 'Italy', 'head-coach', '2026-06-22'],
  ['fc27-492', 'Alessandro Diamanti', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-381', 'Daniele Galloppa', 'Italy', 'head-coach', '2026-06-13'],
  ['fc27-380', 'Antonio Nicola Calabro', 'Italy', 'head-coach', '2026-06-13'],
  ['fc27-425', 'Fabio Gallo', 'Italy', 'head-coach', '2025-07-01'],
  ['fc27-455', 'Michele Mignani', 'Italy', 'head-coach', '2026-10-25'],
  ['fc27-458', 'Davide Possanzini', 'Italy', 'head-coach', '2026-06-24'],
  ['fc27-495', 'Alessandro Nesta', 'Italy', 'head-coach', '2026-06-08'],
  ['fc27-551', 'Francesco Tomei', 'Italy', 'head-coach', '2025-07-03'],
  ['fc27-575', 'Andrea Chiappella', 'Italy', 'head-coach', '2025-07-03'],
  ['fc27-579', 'Cristian Bucchi', 'Italy', 'head-coach', '2025-07-01'],
  ['fc27-596', 'Guido Pagliuca', 'Italy', 'head-coach', '2026-09-30'],
  ['fc27-600', 'Francesco Modesto', 'Italy', 'head-coach', '2025-12-15'],
  ['fc27-624', 'Pietro De Giorgio', 'Italy', 'head-coach', '2026-07-03'],

  // =========================================================================
  // 45. SUPERLIGA [MEN - ROMANIA] (16)
  // =========================================================================
  ['fc27-619', 'Marius Șumudică', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-597', 'Ovidiu Sabău', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-598', 'Adrian Mihalcea', 'Romania', 'head-coach', '2025-07-01'],
  ['fc27-640', 'Ovidiu Burcă', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-693', 'Rui Duarte', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-580', 'Marius Croitoru', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-671', 'Florin Pîrvu', 'Romania', 'head-coach', '2025-07-01'],
  ['fc27-670', 'Valentin Suciu', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-413', 'Laurențiu Reghecampf', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-445', 'Filipe Coelho', 'Portugal', 'head-coach', '2025-11-11', 'Filipe Amaral Rino Coelho (b. 1980)'],
  ['fc27-483', 'Nuno Campos', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-485', 'Cristiano Bergodi', 'Italy', 'head-coach', '2026-07-01'],
  ['fc27-520', 'Bogdan Andone', 'Romania', 'head-coach', '2024-09-23'],
  ['fc27-547', 'Daniel Pancu', 'Romania', 'head-coach', '2026-07-01'],
  ['fc27-657', 'Ricardo Sousa', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-681', 'Florin Maxim', 'Romania', 'head-coach', '2021-07-01'],

  // =========================================================================
  // 46. LIGUE 2 BKT [MEN] (17)
  // =========================================================================
  ['fc27-390', 'Nicolas Usaï', 'France', 'head-coach', '2026-07-01'],
  ['fc27-340', 'Grégory Poirier', 'France', 'head-coach', '2026-08-25'],
  ['fc27-623', 'David Guion', 'France', 'head-coach', '2026-07-01'],
  ['fc27-430', 'Oswald Tanchot', 'France', 'head-coach', '2026-07-01'],
  ['fc27-375', 'Ian Cathro', 'Scotland', 'head-coach', '2026-07-01'],
  ['fc27-528', 'Sylvain Ripoll', 'France', 'head-coach', '2024-07-01'],
  ['fc27-602', 'Olivier Frapolli', 'France', 'head-coach', '2026-07-01'],
  ['fc27-645', 'Fabien Dagneaux', 'France', 'head-coach', '2023-07-01'],
  ['fc27-530', 'Zoumana Camara', 'France', 'head-coach', '2025-04-08'],
  ['fc27-462', 'Grégory Proment', 'France', 'head-coach', '2026-09-28'],
  ['fc27-463', 'Damien Perrinelle', 'France', 'head-coach', '2026-07-01'],
  ['fc27-498', 'Thierry Debès', 'France', 'head-coach', '2026-07-01'],
  ['fc27-557', 'Laurent Guyot', 'France', 'head-coach', '2021-07-01'],
  ['fc27-582', 'Didier Santini', 'France', 'head-coach', '2022-11-28'],
  ['fc27-603', 'David Vignes', 'France', 'head-coach', '2026-07-01'],
  ['fc27-642', 'Vincent Hognon', 'France', 'head-coach', '2025-07-01'],
  ['fc27-659', 'Pierre Webó', 'Cameroon', 'caretaker', '2026-10-01'],

  // =========================================================================
  // 47. K LEAGUE 1 [MEN] (12)
  // =========================================================================
  ['fc27-346', 'Gi-dong Kim', 'South Korea', 'head-coach', '2024-01-01'],
  ['fc27-453', 'Kyung-ho Chung', 'South Korea', 'head-coach', '2025-01-01'],
  ['fc27-491', 'Jong-hwan Yoon', 'South Korea', 'head-coach', '2025-01-01'],
  ['fc27-576', 'Seung-jin Joo', 'South Korea', 'head-coach', '2026-01-01'],
  ['fc27-553', 'Sérgio Costa', 'Portugal', 'head-coach', '2026-01-01'],
  ['fc27-593', 'Tae-ha Park', 'South Korea', 'head-coach', '2024-01-01'],
  ['fc27-615', 'Byeong-hoon Ryu', 'South Korea', 'head-coach', '2024-01-01'],
  ['fc27-656', 'Jeong-kyu Lee', 'South Korea', 'head-coach', '2026-01-01'],
  ['fc27-636', 'Young-min Lee', 'South Korea', 'head-coach', '2021-01-01'],
  ['fc27-314', 'Sun-hong Hwang', 'South Korea', 'head-coach', '2024-06-03'],
  ['fc27-389', 'Jung-yong Chung', 'South Korea', 'head-coach', '2026-01-01'],
  ['fc27-423', 'Hyun-seok Kim', 'South Korea', 'head-coach', '2026-01-01'],

  // =========================================================================
  // 48. FINNLIIGA [MEN] (1)
  // =========================================================================
  ['fc27-716', 'Joonas Rantanen', 'Finland', 'head-coach', '2026-01-01'],

  // =========================================================================
  // 49. NATIONAL WOMEN'S SOCCER LEAGUE (NWSL) [WOMEN] (16)
  // =========================================================================
  ['fc27-33', 'Adrián González', 'Spain', 'head-coach', '2025-07-01'],
  ['fc27-51', 'Juan Carlos Amorós', 'Spain', 'head-coach', '2022-11-01'],
  ['fc27-59', 'Chris Armas', 'United States', 'head-coach', '2026-01-01'],
  ['fc27-78', 'Robert Vilahamn', 'Sweden', 'head-coach', '2026-01-01'],
  ['fc27-77', 'Jonas Eidevall', 'Sweden', 'head-coach', '2025-01-07'],
  ['fc27-90', 'Karina Báez', 'Mexico', 'interim', '2026-08-01'],
  ['fc27-107', 'Yolanda Thomas', 'United States', 'head-coach', '2026-11-01'],
  ['fc27-123', 'Nick Cushing', 'England', 'head-coach', '2026-01-01'],
  ['fc27-143', 'Jaime Frias', 'United States', 'interim', '2026-09-01'],
  ['fc27-165', 'Bev Yanez', 'United States', 'head-coach', '2023-11-30'],
  ['fc27-188', 'Jimmy Coenraets', 'Belgium', 'head-coach', '2024-10-24'],
  ['fc27-218', 'Leif Gunnar Smerud', 'Norway', 'interim', '2026-06-01'],
  ['fc27-219', 'Laura Harvey', 'England', 'head-coach', '2021-07-15'],
  ['fc27-245', 'Filipa Patão', 'Portugal', 'head-coach', '2025-07-01'],
  ['fc27-281', 'Emma Coates', 'England', 'head-coach', '2026-01-01'],
  ['fc27-309', 'Mak Lind', 'Sweden', 'head-coach', '2026-01-01'],

  // =========================================================================
  // 50. CALCIO A FEMMINILE [WOMEN] (2)
  // =========================================================================
  ['fc27-66', 'Gianpiero Piovani', 'Italy', 'head-coach', '2026-07-04'],
  ['fc27-62', 'Isaac Guerrero', 'Spain', 'head-coach', '2026-07-03'],

  // =========================================================================
  // 51. ISUZU UTE A-LEAGUE [MEN] (12)
  // =========================================================================
  ['fc27-652', 'Aurelio Vidmar', 'Australia', 'head-coach', '2023-11-01'],
  ['fc27-641', 'Patrick Kisnorbo', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-621', 'Airton Andrioli', 'Australia', 'head-coach', '2025-07-01'],
  ['fc27-713', 'John Hutchinson', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-594', 'Sasa Ognenovski', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-655', 'Mark Milligan', 'Australia', 'head-coach', '2025-07-01'],
  ['fc27-691', 'Michael Valkanis', 'Australia', 'head-coach', '2025-07-01'],
  ['fc27-543', 'Adam Griffiths', 'Australia', 'head-coach', '2025-10-01'],
  ['fc27-571', 'Ufuk Talay', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-668', 'Pedro Moreira', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-680', 'Giovanni Savarese', 'Venezuela', 'head-coach', '2026-07-01'],
  ['fc27-702', 'Chris Greenacre', 'England', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 52. INDIAN SUPER LEAGUE [MEN] (6)
  // =========================================================================
  ['fc27-705', 'Pep Muñoz', 'Spain', 'head-coach', '2026-07-01'],
  ['fc27-725', 'Gouramangi Singh', 'India', 'head-coach', '2026-07-01'],
  ['fc27-715', 'T. G. Purushothaman', 'India', 'head-coach', '2026-07-01'],
  ['fc27-740', 'Ashley Westwood', 'England', 'head-coach', '2026-07-01'],
  ['fc27-735', 'Juan Pedro Benali', 'Spain', 'head-coach', '2023-05-22'],
  ['fc27-730', 'Panagiotis Dilmperis', 'Greece', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 53-62. ADDITIONAL EUROPEAN / GLOBAL WOMEN & MEN'S CLUBS (14)
  // =========================================================================
  ['fc27-204', 'Corina Dekker', 'Netherlands', 'head-coach', '2025-07-01'],
  ['fc27-376', 'Anouk Bruil', 'Netherlands', 'head-coach', '2025-07-01'],
  ['fc27-262', 'Elena Sadiku', 'Sweden', 'head-coach', '2026-01-01'],
  ['fc27-477', 'Joel Kjetselberg', 'Sweden', 'head-coach', '2026-01-15'],
  ['fc27-252', 'Ivan Baptista', 'Portugal', 'head-coach', '2025-07-09'],
  ['fc27-403', 'Laura Kaminski', 'England', 'head-coach', '2026-01-08'],
  ['fc27-395', 'Jiří Vágner', 'Czech Republic', 'head-coach', '2025-07-01'],
  ['fc27-374', 'Henning Berg', 'Norway', 'head-coach', '2025-07-01'],
  ['fc27-587', 'Nikolaos Papadopoulos', 'Greece', 'head-coach', '2026-07-01'],
  ['fc27-508', 'Martina Voss-Tecklenburg', 'Germany', 'head-coach', '2026-10-01'],
  ['fc27-489', 'Leanne Ross', 'Scotland', 'head-coach', '2022-12-19'],
  ['fc27-442', 'Lucas González Vélez', 'Colombia', 'head-coach', '2026-06-27'],
  ['fc27-687', 'Ian Jeffs', 'England', 'head-coach', '2025-11-05'],

  // =========================================================================
  // 63. EFL LEAGUE TWO [MEN] (22)
  // =========================================================================
  ['fc27-682', 'Danny Cowley', 'England', 'head-coach', '2024-01-04'],
  ['fc27-683', 'Peter Cklamovski', 'Australia', 'head-coach', '2026-07-01'],
  ['fc27-699', 'Paul Cook', 'England', 'head-coach', '2022-02-10'],
  ['fc27-696', 'Jon Brady', 'Australia', 'head-coach', '2026-01-06'],
  ['fc27-700', 'Ian Holloway', 'England', 'head-coach', '2024-10-25'],
  ['fc27-709', 'Steve Cotterill', 'England', 'head-coach', '2025-09-30'],
  ['fc27-711', 'Chris Hogg', 'England', 'head-coach', '2026-07-01'],
  ['fc27-710', 'Micky Mellon', 'Scotland', 'head-coach', '2023-10-13'],
  ['fc27-722', 'Ian Watson', 'England', 'head-coach', '2026-07-01'],
  ['fc27-721', 'Alex Bruce', 'Northern Ireland', 'head-coach', '2026-07-01'],
  ['fc27-720', 'Lee Grant', 'England', 'head-coach', '2026-07-01'],
  ['fc27-727', 'Kevin Blackwell', 'England', 'caretaker', '2026-10-01'],
  ['fc27-728', 'David Artell', 'Gibraltar', 'head-coach', '2023-11-27'],
  ['fc27-726', 'Darrell Clarke', 'England', 'head-coach', '2026-07-01'],
  ['fc27-733', 'Dean Brennan', 'Republic of Ireland', 'head-coach', '2021-09-14'],
  ['fc27-732', 'Lee Bell', 'England', 'head-coach', '2022-11-04'],
  ['fc27-731', 'Gareth Ainsworth', 'England', 'head-coach', '2025-03-25'],
  ['fc27-738', 'John Doolan', 'England', 'head-coach', '2024-03-04'],
  ['fc27-736', 'Steve Evans', 'Scotland', 'head-coach', '2025-12-16'],
  ['fc27-737', 'Scott Lindsey', 'England', 'head-coach', '2026-07-01'],
  ['fc27-742', 'Matt Taylor', 'England', 'head-coach', '2026-02-01'],
  ['fc27-741', 'Matt Lawlor', 'England', 'head-coach', '2026-01-25'],

  // =========================================================================
  // 64. LIGA BBVA MX [MEN] (18)
  // =========================================================================
  ['fc27-140', 'Antonio Mohamed', 'Argentina', 'head-coach', '2024-12-11'],
  ['fc27-163', 'Guillermo Almada', 'Uruguay', 'head-coach', '2026-07-01'],
  ['fc27-190', 'Víctor Manuel Vucetich', 'Mexico', 'head-coach', '2026-08-01'],
  ['fc27-191', 'Matías Almeyda', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-220', 'Joel Huiqui', 'Mexico', 'head-coach', '2026-04-01'],
  ['fc27-248', 'Gabriel Milito', 'Argentina', 'head-coach', '2025-05-26'],
  ['fc27-282', 'Esteban Solari', 'Argentina', 'head-coach', '2026-07-01'],
  ['fc27-288', 'Hernán Crespo', 'Argentina', 'head-coach', '2026-07-17'],
  ['fc27-315', 'Benjamín Mora', 'Mexico', 'head-coach', '2026-07-01'],
  ['fc27-344', 'Tomás Campos', 'Mexico', 'interim', '2026-09-01'],
  ['fc27-383', 'Javier Gandolfi', 'Argentina', 'head-coach', '2026-01-01'],
  ['fc27-384', 'Sebastián Abreu', 'Uruguay', 'head-coach', '2025-04-30'],
  ['fc27-422', 'Diego Mejía', 'Mexico', 'head-coach', '2026-07-01'],
  ['fc27-454', 'Renato Paiva', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-502', 'Esteban González', 'Chile', 'head-coach', '2026-01-01'],
  ['fc27-504', 'Juan Reynoso', 'Peru', 'head-coach', '2026-07-01'],
  ['fc27-532', 'Gerardo Espinoza', 'Mexico', 'head-coach', '2026-01-01'],
  ['fc27-560', 'Miguel Herrera', 'Mexico', 'head-coach', '2026-07-01'],

  // =========================================================================
  // 65. EGYPTIAN PREMIER LEAGUE [MEN] (20)
  // =========================================================================
  ['fc27-743', 'Hussein Ammouta', 'Morocco', 'head-coach', '2026-07-01'],
  ['fc27-744', 'Rulani Mokwena', 'South Africa', 'head-coach', '2026-07-17'],
  ['fc27-745', 'Motamed Gamal', 'Egypt', 'head-coach', '2026-07-29'],
  ['fc27-746', 'Ali Maher', 'Egypt', 'head-coach', '2025-02-01'],
  ['fc27-747', 'Nabil Kouki', 'Tunisia', 'head-coach', '2026-10-25'],
  ['fc27-748', 'Ayman El Ramady', 'Egypt', 'head-coach', '2025-08-31'],
  ['fc27-749', 'Mohamed Shawky', 'Egypt', 'head-coach', '2025-07-01'],
  ['fc27-750', 'Mohamed Barakat', 'Egypt', 'head-coach', '2026-05-01'],
  ['fc27-751', 'Mostafa Shebeita', 'Egypt', 'head-coach', '2026-09-20'],
  ['fc27-752', 'Hamza El Gamal', 'Egypt', 'head-coach', '2026-07-01'],
  ['fc27-753', 'Samy Komsan', 'Egypt', 'head-coach', '2025-10-05'],
  ['fc27-754', 'Ahmed Abdelaziz', 'Egypt', 'head-coach', '2026-07-01'],
  ['fc27-755', 'Sayed Eid', 'Egypt', 'head-coach', '2023-07-01'],
  ['fc27-756', 'Mohamed Amine Benhachem', 'Morocco', 'head-coach', '2026-07-01'],
  ['fc27-757', 'Khaled Galal', 'Egypt', 'head-coach', '2026-09-01'],
  ['fc27-758', 'Abdelnaser Mohamed', 'Egypt', 'head-coach', '2025-07-01'],
  ['fc27-759', 'Gomaa Mashhour', 'Egypt', 'head-coach', '2025-07-01'],
  ['fc27-760', 'Alaa Abdelaal', 'Egypt', 'head-coach', '2026-10-01'],
  ['fc27-761', 'Ahmed Abdelmaksoud', 'Egypt', 'head-coach', '2025-07-01'],
  ['fc27-762', 'Haytham Shaaban', 'Egypt', 'head-coach', '2026-10-15'],

  // =========================================================================
  // 66. LIGA DO BRASIL [MEN] (18 new + Bahia fc27-148 & Botafogo fc27-217)
  // =========================================================================
  ['fc27-763', 'Leonardo Jardim', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-764', 'Abel Ferreira', 'Portugal', 'head-coach', '2020-11-04'],
  ['fc27-765', 'Artur Jorge', 'Portugal', 'head-coach', '2026-07-01'],
  ['fc27-766', 'Marcão', 'Brazil', 'head-coach', '2026-10-01'],
  ['fc27-767', 'Dorival Júnior', 'Brazil', 'head-coach', '2026-05-15'],
  ['fc27-768', 'Eduardo Domínguez', 'Argentina', 'head-coach', '2026-02-27'],
  ['fc27-769', 'Cuca', 'Brazil', 'head-coach', '2026-03-19'],
  ['fc27-770', 'Clarence Seedorf', 'Netherlands', 'head-coach', '2026-10-01'],
  ['fc27-771', 'Pedro Emanuel', 'Portugal', 'head-coach', '2026-07-10'],
  ['fc27-772', 'Renato Gaúcho', 'Brazil', 'head-coach', '2026-09-14'],
  ['fc27-773', 'Eduardo Baptista', 'Brazil', 'head-coach', '2026-09-24'],
  ['fc27-774', 'Vagner Mancini', 'Brazil', 'head-coach', '2025-10-30'],
  ['fc27-775', 'Rafael Guanaes', 'Brazil', 'head-coach', '2025-03-18'],
  ['fc27-776', 'Odair Hellmann', 'Brazil', 'head-coach', '2026-01-01'],
  ['fc27-777', 'Cleber dos Santos', 'Brazil', 'head-coach', '2026-11-05'],
  ['fc27-778', 'Guila Bossle', 'Brazil', 'head-coach', '2026-10-25'],
  ['fc27-779', 'Rafael Lacerda', 'Brazil', 'head-coach', '2026-05-01'],
  ['fc27-780', 'Thiago Carpini', 'Brazil', 'head-coach', '2026-09-16'],
];

const CLUB_MANAGER_MAP = new Map<string, CompactClubManagerTuple>(
  CLUB_MANAGER_TUPLES.map((tuple) => [tuple[0], tuple])
);

export function getSeededClubManagerMeta(teamId: string): {
  managerName: string;
  nationality: string;
  role: ManagerAppointmentRole;
  startDate: string;
  notes: string;
} | null {
  const tuple = CLUB_MANAGER_MAP.get(teamId);
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

function buildPhilosophyForStyle(
  style: string,
  formation: string
): ManagerPhilosophy {
  const lower = (style || '').toLowerCase();
  const isPossession =
    lower.includes('possession') ||
    lower.includes('positional') ||
    lower.includes('tiki') ||
    lower.includes('fluid') ||
    lower.includes('total') ||
    lower.includes('control');
  const isHighPress =
    lower.includes('press') ||
    lower.includes('gegenpress') ||
    lower.includes('intensity') ||
    lower.includes('relentless');
  const isCounter =
    lower.includes('counter') ||
    lower.includes('direct') ||
    lower.includes('transition') ||
    lower.includes('compact') ||
    lower.includes('defensive');

  const possessionIdx = isPossession ? 76 : isCounter ? 44 : 60;
  const pressingIdx = isHighPress ? 80 : isCounter ? 54 : 66;
  const defLineIdx = isHighPress || isPossession ? 70 : isCounter ? 42 : 56;
  const attackIdx = isPossession || isHighPress ? 74 : isCounter ? 58 : 64;
  const flexIdx = formation.startsWith('3-') || formation.startsWith('5-') ? 72 : 64;

  return {
    possession_passing: isPossession
      ? 'Progressive short-passing build-up creating numerical superiority through midfield.'
      : 'Measured vertical circulation balancing retention with early forward progression.',
    pressing: isHighPress
      ? 'Coordinated high-block pressing traps aimed at winning possession in advanced zones.'
      : 'Structured mid-block triggers designed to protect central passing lanes.',
    defensive_structure: isCounter
      ? 'Compact two-bank defensive block limiting space between the lines before rapid transition.'
      : 'Proactive rest-defence structure anchored around a disciplined defensive line.',
    attacking_approach: `Operates primarily from a ${formation || '4-3-3'} base with half-space rotations and wide overloads.`,
    tactical_flexibility: 'Adapts in-game shape between build-up and out-of-possession phases based on opponent structure.',
    possession_index: possessionIdx,
    pressing_index: pressingIdx,
    defensive_line_index: defLineIdx,
    attacking_boldness_index: attackIdx,
    flexibility_index: flexIdx,
  };
}

export function buildSeededClubManagers(clubTeams: Team[]): {
  managers: Manager[];
  appointments: ManagerAppointment[];
} {
  const managers: Manager[] = [];
  const appointments: ManagerAppointment[] = [];
  const usedManagerIds = new Set<string>();
  const seededTimestamp = '2026-11-14T00:00:00.000Z';

  for (const team of clubTeams) {
    const tuple = CLUB_MANAGER_MAP.get(team.id);
    if (!tuple) continue;

    const [, name, rawNationality, role, startDate, customNotes] = tuple;
    const nationality = normalizeCountryName(rawNationality);
    const baseSlug = slugifyManagerName(name) || team.id;
    let managerId = `mgr-tm-${baseSlug}`;
    if (usedManagerIds.has(managerId)) {
      managerId = `mgr-tm-${baseSlug}-${team.id}`;
    }
    usedManagerIds.add(managerId);

    const formation = team.defaultFormation || '4-3-3';
    const style = team.playingStyle || 'Balanced Tactical';
    const roleLabel =
      role === 'interim'
        ? 'Interim Manager'
        : role === 'caretaker'
        ? 'Caretaker Manager'
        : role === 'assistant'
        ? 'Assistant Manager'
        : 'Head Coach';

    const bio = `${roleLabel} of ${team.name}${team.league ? ` (${team.league})` : ''}, serving since ${startDate}.`;

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

    const appointment: ManagerAppointment = {
      id: `appt-tm-${team.id}`,
      manager_id: managerId,
      manager_name: name,
      team_id: team.id,
      team_name: team.name,
      team_type: 'club',
      role,
      start_date: startDate,
      end_date: null,
      is_current: true,
      competitions: team.league ? [team.league] : [],
      honours: [],
      notes: customNotes || DEFAULT_NOTE,
      verified: true,
      createdAt: seededTimestamp,
      updatedAt: seededTimestamp,
    };

    managers.push(manager);
    appointments.push(appointment);
  }

  return { managers, appointments };
}

/**
 * Curated EA FC27 / football nickname & known-as display name resolution.
 * Preserves each player's full legal/civil name in `fullName` (displayed on Player Profile)
 * while supplying their recognized football nickname / known-as display name across Match Centre.
 */

export const VERIFIED_EA_PLAYER_NICKNAMES: Record<string, string> = {
  // ---- Top verified CSV & curated mononyms / iconic nicknames ----
  '251854': 'Pedri', // Pedro González López
  '264240': 'Gavi', // Pablo Martín Páez Gavira
  '231866': 'Rodri', // Rodrigo Hernández Cascante
  '238794': 'Vini Jr.', // Vinícius José de Oliveira Júnior
  '255253': 'Vitinha', // Vítor Machado Ferreira
  '233419': 'Raphinha', // Raphael Dias Belloli
  '243812': 'Rodrygo', // Rodrygo Silva de Goes
  '272505': 'Endrick', // Endrick Felipe Moreira de Sousa
  '207865': 'Marquinhos', // Marcos Aoás Corrêa
  '239580': 'Bremer', // Gleison Bremer Silva Nascimento
  '212831': 'Alisson', // Alisson Ramses Becker
  '210257': 'Ederson', // Ederson Santana de Moraes
  '200145': 'Casemiro', // Carlos Henrique Venancio Casimiro
  '209499': 'Fabinho', // Fábio Henrique Tavares
  '226893': 'Debinha', // Débora C. de Oliveira
  '241023': 'Ludmila', // Ludmila da Silva
  '226890': 'Marta', // Marta Vieira da Silva
  '267234': 'Kerolin', // Kerolin Nicoli Israel Ferraz
  '273136': 'Lorena', // Lorena da Silva Leite
  '274780': 'Luany', // Luany Vitória da Silva Rosa
  '272084': 'Lauren', // Lauren Eduarda Leal Costa
  '83494': 'Rayan', // Rayan Vitor Simplício Rocha
  '73398': 'Rômulo', // Rômulo José Cardoso da Cruz
  '226096': 'Rômulo', // Rômulo José Pacheco da Silva
  '243830': 'Mailson', // Mailson Tenório dos Santos
  '266866': 'Éderson', // Éderson José dos Santos
  '76687': 'Estêvão', // Estêvão Willian Almeida
  '73562': 'Bento', // Bento Matheus Krepski
  '255475': 'Antony', // Antony Matheus dos Santos
  '239482': 'Galeno', // Wenderson Nascimento Galeno
  '223334': 'Joelinton', // Joelinton Apolinário de Lira
  '80170': 'Wesley', // Wesley Vinícius França Lima
  '232381': 'Wesley', // Wesley Moraes Ferreira da Silva
  '67379273': 'Savinho', // Sávio Moreira de Oliveira
  '234112': 'Dodô', // Domilson Cordeiro dos Santos
  '234505': 'Evander', // Evander da Silva Ferreira
  '256612': 'Evanilson', // F. Evanilson de Lima Barbosa
  '231943': 'Richarlison', // Richarlison de Andrade
  '277537': 'Natan', // Natan Bernardo de Souza
  '278016': 'Murillo', // Murillo Costa dos Santos
  '279709': 'Beraldo', // Lucas Lopes Beraldo
  '247257': 'Ibañez', // Roger Ibañez da Silva
  '263781': 'Vanderson', // Vanderson de Oliveira Campos
  '234819': 'Guilherme', // Guilherme A. Vieira dos Santos
  '253175': 'Luana', // Luana Bertolucci Paixão
  '275927': 'Nycole', // Nycole Raysla Silva Sobrinho
  '188803': 'Taison', // Taison Barcellos Freda
  '263815': 'Abner', // Abner Vinícius da Silva Santos
  '272829': 'Ângelo', // Ângelo Gabriel Borges Damaceno
  '244661': 'Vitinho', // Victor da Silva
  '255472': 'Pedrinho', // Pedro Victor Delmino da Silva
  '230601': 'Cryzan', // Cryzan Queiroz Barcelos
  '225475': 'Hernani', // Hernani Azevedo Júnior
  '236420': 'Kady', // Kady Iuri Borges Malinowski
  '270983': 'Clayton', // Clayton Fernandes Silva
  '76803': 'Emersonn', // Emersonn Correia da Silva
  '85893': 'Joaquim', // Joaquim Pereira Silva
  '220581': 'Rafael', // Rafael Rogério da Silva
  '88261': 'Bruninho', // Bruno Braga Ramos
  '267199': 'Angelina', // Angelina Alonso Costantino
  '227421': 'Rafaelle', // Rafaelle Leone Carvalho Souza
  '274753': 'Tarciane', // Tarciane Karen dos Santos de Lima
  '271742': 'Gio Queiroz', // Giovana Queiroz Costa
  '80028': 'Duda Sampaio', // Maria Eduarda Rodrigues Silva
  '241509': 'Mauro Júnior', // Mauro Jaqueson J. Ferreira Santos
  '258885': 'Luiz Júnior', // Luiz Lúcio Reis Júnior
  '81947': 'Luciano Juba', // Luciano da Silva Junior
  '232580': 'Gabriel Magalhães', // Gabriel dos S. Magalhães
  '240130': 'Éder Militão', // Éder Gabriel Militão
  '247851': 'Bruno Guimarães', // Bruno Guimarães Moura
  '240243': 'Matheus Cunha', // Matheus Santos Carneiro da Cunha
  '252042': 'João Pedro', // João Pedro Junqueira de Jesus
  '273463': 'João Gomes', // João Victor Gomes da Silva
  '273018': 'Andrey Santos', // Andrey N. dos Santos
  '50583214': 'Gabriel Martinelli', // Gabriel Teodoro Martinelli Silva
  '50562314': 'Gabriel Jesus', // Gabriel Fernando de Jesus
  '236499': 'Douglas Luiz', // Douglas Luiz Soares de Paulo
  '277797': 'Marcos Leonardo', // Marcos Leonardo Santos Almeida
  '258648': 'Carlos Augusto', // Carlos Augusto Zopolato Neves
  '270571': 'Gabriel Sara', // Gabriel Davi Gomes Sara
  '271400': 'Igor Paixão', // Igor Guilherme Barbosa da Paixão
  '232440': 'Caio Henrique', // Caio Henrique Oliveira Silva
  '259075': 'Yan Couto', // Yan Bueno Couto
  '234439': 'Raphael Veiga', // Raphael Cavalcante Veiga
  '238422': 'Gabi Nunes', // Gabriela Nunes da Silva
  '50570070': 'Gabi Nunes', // Gabriela Nunes da Silva
  '212462': 'Alex Telles', // Alex Nicolao Telles
  '210736': 'Emerson Palmieri', // Emerson Palmieri dos Santos
  '50551341': 'Diego Carlos', // Diego Carlos Santos Silva
  '273106': 'Danilo', // Danilo Santos de Oliveira
  '50418277': 'André Henrique', // André Henrique da Silva Martins
  '256632': 'Luis Henrique', // Luis Henrique Tomaz de Lima
  '79402': 'Igor Jesus', // Igor Jesus Maciel da Cruz
  '77033': 'William Gomes', // William Gomes C. Santos
  '251217': 'Jean Lucas', // Jean Lucas de Souza Oliveira
  '50562318': 'Lucas Perri', // Lucas Estella Perri
  '264337': 'Rodrigo Muniz', // Rodrigo Muniz Carvalho
  '181019': 'Éverton Ribeiro', // Éverton Augusto de Barros Ribeiro
  '195093': 'Willian José', // Willian José da Silva
  '79629': 'Jair Cunha', // Jair Paula da Cunha Filho
  '246186': 'Arthur Cabral', // Arthur Mendonça Cabral
  '79270': 'Alisson Santos', // Alisson de Almeida Santos
  '230664': 'Eduardo Bauermann', // Eduardo Gabriel Santos Bauermann
  '198635': 'Wellington Silva', // Wellington Alves da Silva
  '255471': 'Vítor Carvalho', // Vítor Carvalho Vieira
  '274187': 'Gabriel Pereira', // Gabriel Pereira Magalhães
  '271132': 'Gabriel Silva', // Gabriel Silva Vieira
  '277068': 'Lucas Pires', // Lucas Pires Silva
  '211625': 'Rodrigo Dourado', // Rodrigo Dourado Cunha
  '262929': 'Vinícius Souza', // Vinicius de Souza Costa
  '50573233': 'Igor Julio', // Igor Julio dos Santos de Paulo
  '267674': 'Amanda Gutierres', // Amanda Gutierres d.Santos
  '274759': 'Vitória Silva', // Vitória Ferreira Silva
  '74866': 'André', // André Trindade
  '79771': 'Rayan Lucas', // Rayan Lucas Marques de Souza
  '255578': 'Júnior Santos', // José Antonio Dos Santos Júnior
  '81732': 'Pedro Felipe', // Pedro Felipe de Jesus Gomes

  // ---- Portugal & Lusophone ----
  '20801': 'Cristiano Ronaldo', // C. Ronaldo dos Santos Aveiro
  '212198': 'Bruno Fernandes', // Bruno Miguel Borges Fernandes
  '239818': 'Rúben Dias', // Rúben Santos Gato Alves Dias
  '218667': 'Bernardo Silva', // Bernardo Mota Carvalho e Silva
  '252145': 'Nuno Mendes', // Nuno Alexandre Tavares Mendes
  '272834': 'João Neves', // João Pedro Gonçalves Neves
  '234577': 'Diogo Costa', // Diogo Meireles Costa
  '224293': 'Rúben Neves', // Rúben Diogo da Silva Neves
  '210514': 'João Cancelo', // João Pedro Cavaco Cancelo
  '242444': 'João Félix', // João Félix Sequeira
  '50573369': 'Rafael Leão', // Rafael da Conceição Leão
  '50561039': 'João Palhinha', // João Maria Palhinha Gonçalves
  '238616': 'Pedro Neto', // Pedro Lomba Neto
  '227928': 'Nélson Semedo', // Nélson Cabral Semedo
  '234574': 'Diogo Dalot', // José Diogo Dalot Teixeira
  '210411': 'Otávio', // Otávio Edmilson da Silva Monteiro
  '216547': 'Rafa Silva', // Rafael A. Ferreira Silva
  '261855': 'Kika Nazareth', // Francisca Ramos Nazareth Sousa
  '234570': 'Jota', // João Pedro Neves Filipe
  '234569': 'Florentino', // Florentino Morris Luís
  '243686': 'Chiquinho', // Francisco L. Lima Silva Machado
  '235172': 'Rúben Vinagre', // Rúben Nascimento Vinagre
  '244778': 'Trincão', // Francisco Trincão
  '270039': 'Diego Moreira', // Diego Manuel J. da Silva Moreira
  '50583540': 'Beto', // Norberto Gomes Betuncal
  '236045': 'Reinildo', // Reinildo Isnard Mandava
  '266097': 'Geny Catamo', // Geny Cipriano Catamo
  '253124': 'Matheus Nunes', // Matheus Luiz Nunes
  '213516': 'Ricardo Horta', // Ricardo Jorge da Luz Horta
  '200888': 'Danilo Pereira', // Danilo Luís Hélio Pereira
  '67349814': 'Pedro Gonçalves', // Pedro António Pereira Gonçalves
  '210385': 'Rui Silva', // Rui Tiago Dantas da Silva
  '256903': 'Gonçalo Ramos', // Gonçalo Matias Ramos
  '257179': 'Gonçalo Inácio', // Gonçalo Bernardo Inácio
  '224411': 'Gonçalo Guedes', // Gonçalo Manuel Ganchinho Guedes
  '270857': 'Mateus Fernandes', // Mateus Gonçalo Espanha Fernandes
  '261848': 'Inês Pereira', // Inês Teixeira Pereira
  '261843': 'Andreia Jacinto', // Andreia de Jesus Jacinto
  '252037': 'Fábio Silva', // Fábio Daniel Soares Silva
  '50588606': 'Fábio Vieira', // Fábio Daniel Ferreira Vieira
  '227055': 'Gelson Martins', // Gelson Dany Batalha Martins
  '50414596': 'Flávio Gonçalves', // Flávio Ferreira Gonçalves

  // ---- Spain & Spanish-speaking ----
  '193747': 'Koke', // Jorge Resurrección
  '197781': 'Isco', // Francisco Román Alarcón Suárez
  '236479': 'Mapi León', // María Pilar León Cebrián
  '237289': 'Patri Guijarro', // Patricia Guijarro Gutiérrez
  '237288': 'Mariona Caldentey', // María Francesca Caldentey Oliver
  '268942': 'Cata Coll', // Catalina Thomas Coll Lluch
  '271446': 'Vicky López', // Victoria López Serrano Felix
  '227201': 'Vicky Losada', // María Victoria Losada Gómez
  '258789': 'Misa Rodríguez', // María Isabel Rodríguez Rivero
  '227204': 'Lola Gallardo', // Dolores Gallardo Núñez
  '259372': 'Athenea', // Athenea del Castillo
  '269404': 'Salma Paralluelo', // Salma Celeste Paralluelo Ayingono
  '259334': 'Nerea Eizagirre', // Nerea Eizagirre Lasa
  '277643': 'Lamine Yamal', // Lamine Yamal Nasraoui Ebana
  '227203': 'Alexia Putellas', // Alexia Putellas Segura
  '241667': 'Aitana Bonmatí', // Aitana Bonmatí Conca
  '262531': 'Claudia Pina', // Claudia Pina Medina
  '253436': 'Ona Batlle', // Ona Batlle Pascual
  '239231': 'Marc Cucurella', // Marc Cucurella Saseta
  '278046': 'Pau Cubarsí', // Pau Cubarsí Paredes
  '277179': 'Fermín López', // Fermín López Marín
  '263578': 'Alejandro Balde', // Alejandro Balde Martínez
  '253004': 'Ansu Fati', // Anssumane Fati
  '256516': 'Nico Williams', // Nicholas Williams Arthuer
  '244260': 'Dani Olmo', // Daniel Olmo Carvajal
  '248550': 'Dani Vivian', // Daniel Vivian Moreno
  '257279': 'Álex Baena', // Alejandro Baena Rodríguez
  '210035': 'Álex Grimaldo', // Alejandro Grimaldo García
  '227127': 'Álex Remiro', // Alejandro Remiro Gargallo
  '225201': 'Álex Berenguer', // Alejandro Berenguer Remiro
  '278928': 'Álex Jiménez', // Alejandro Jiménez Sánchez
  '217036': 'Álex Moreno', // Alexandre Moreno Lopera
  '277581': 'Samu Aghehowa', // Samuel Omorodion Aghehowa
  '220651': 'Angeliño', // José Ángel Esmoris Tasende
  '243576': 'Pedro Porro', // Pedro Antonio Porro Sauceda
  '246606': 'Fran García', // Francisco José García Torres
  '235997': 'Fran Beltrán', // Francisco José Beltrán Peinado
  '264174': 'Juanlu Sánchez', // Juan Luis Sánchez Velasco
  '271755': 'Kike Salas', // Enrique Jesús Salas Valiente
  '230786': 'Pepelu', // José Luis García Vayá
  '264492': 'Yeremay', // Yeremay Hernández Cubas
  '266436': 'Javi Guerra', // Javier Guerra Moreno
  '231591': 'Javi Galán', // Javier Galán Gil
  '244622': 'Javi Puado', // Javier Puado Díaz
  '211688': 'José Gayà', // José Luis Gayà Peña
  '252327': 'Manu Sánchez', // Manuel Sánchez de la Peña
  '200724': 'Nacho Fernández', // José Ignacio Fernández Iglesias
  '206585': 'Kepa', // Kepa Arrizabalaga
  '193080': 'De Gea', // David De Gea Quintana
  '67310017': 'Morata', // Álvaro Borja Morata Martín
  '252794': 'Adrián Bernabé', // Adrián Bernabé García
  '71387': 'Dani Budesca', // Daniel Budesca López
  '235574': 'Iñaki Peña', // Ignacio Peña Sotorres
  '232498': 'Isi Palazón', // Isaac Palazón Camacho
  '241464': 'Pau Torres', // Pau Francisco Torres
  '258729': 'Gabri Veiga', // Gabriel Veiga Novas
  '50586717': 'Nico González', // Nicolás González Iglesias
  '50560437': 'Robert Sánchez', // Robert Lynch Sánchez
  '259377': 'Yeremy Pino', // Yeremy Jesús Pino Santos
  '235781': 'Santi Comesaña', // Santiago Comesaña Veiga
  '258371': 'Pep Chavarría', // Josep María Chavarría Pérez
  '241985': 'Pep Biel', // Pep Biel Mas Jaume
  '228805': 'Raíllo', // Antonio José Raíllo Arenas
  '234826': 'Toni Martínez', // Antonio Martínez López
  '243559': 'Jorge de Frutos', // Jorge de Frutos Sebastián
  '268889': 'Álvaro Carreras', // Álvaro Fernández Carreras
  '246287': 'Ángela Sosa', // Ángela Sosa Martín
  '272094': 'Fiamma Benítez', // Fiamma Benítez Ianuzzi
  '276887': 'Isa Corte', // Isabel Corte Peláez
  '272056': 'Inma Gabarro', // Inma Gabarro Romero
  '272049': 'Ornella Vignola', // Ornella María Vignola Cabot
  '277375': 'Iván Cédric', // Iván Cédric Bikoue
  '265650': 'Saúl Coco', // Saúl Basilio Coco Bassey Oubiña
  '220253': 'Munir', // Munir El Haddadi

  // ---- Latin America & International ----
  '277846': 'Nico Paz', // Nicolás Paz Martínez
  '237034': 'Cucho Hernández', // Juan Camilo Hernández Suárez
  '259516': 'Johnny Cardoso', // João Lucas de Souza Cardoso
  '226376': 'Kaku', // Alejandro Romero Gamarra
  '262330': 'Catarina Macario', // Catarina Cantanhede Macario
  '250723': 'Manu Koné', // Kouadio Manu Koné
  '222492': 'Leroy Sané', // Leroy Aziz Sané
  '200104': 'Son Heung-Min', // Heung Min Son
  '239138': 'Jeong Woo-Yeong', // Woo Yeong Jeong
  '264002': 'Lucas Monzón', // Lucas Gabriel Monzón Lemos
  '255434': 'Julio Enciso', // Julio César Enciso
  '237712': 'Taty Castellanos', // Taty Castellanos
  '245158': 'Luis Suárez', // Luis Javier Suárez
  '230142': 'Mikel Oyarzabal', // Mikel Oyarzabal Ugarte
  '225193': 'Mikel Merino', // Mikel Merino Zazón
  '226271': 'Fabián Ruiz', // Fabián Ruiz Peña
  '230869': 'Unai Simón', // Unai Simón Mendibil
  '220901': 'David Raya', // David Raya Martín
  '245037': 'Eric García', // Eric García Martret
  '226161': 'Marcos Llorente', // Marcos Llorente Moreno
  '248148': 'Martín Zubimendi', // Martín Zubimendi Ibáñez
  '241461': 'Ferran Torres', // Ferran Torres García
  '228813': 'Aleix García', // Aleix García Serrano
  '272449': 'Pablo Barrios', // Pablo Barrios Rivas
  '262457': 'Olga Carmona', // Olga Carmona García
  '204525': 'Iñigo Martínez', // Iñigo Martínez Berridi
  '244675': 'Oihan Sancet', // Oihan Sancet Tirapu
  '220834': 'Marco Asensio', // Marco Asensio Willemsen
  '264388': 'Alberto Moleiro', // Alberto Moleiro González
  '227776': 'Sandra Paños', // Sandra Paños Garcia
  '253435': 'Laia Aleixandri', // Laia Aleixandri López
  '266039': 'Marc Pubill', // Marc Pubill Pagès
  '268804': 'Mario Gila', // Mario Gila Fuentes
  '242201': 'Luis Milla', // Luis Milla Manzanares
  '216447': 'Álvaro García', // Álvaro García Rivera
  '229668': 'Mario Hermoso', // Mario Hermoso Canseco
  '192629': 'Iago Aspas', // Iago Aspas Juncal
  '208093': 'Gerard Moreno', // Gerard Moreno Balagueró
  '226456': 'Pablo Fornals', // Pablo Fornals Malla
  '261865': 'Miguel Gutiérrez', // Miguel Gutiérrez Ortega
  '224179': 'Borja Iglesias', // Borja Iglesias Quintás
  '227950': 'Yeray Álvarez', // Yeray Álvarez López
  '259694': 'Óscar Mingueza', // Óscar Mingueza García
  '215590': 'Ayoze Pérez', // Ayoze Pérez Gutiérrez
  '270728': 'Carlos Romero', // Carlos Romero Serrano
  '223952': 'David Soria', // David Soria Solís
  '192638': 'Marcos Alonso', // Marcos Alonso Mendoza
  '224003': 'Sergio Herrera', // Sergio Herrera Pirón
  '262402': 'Sergi Cardona', // Sergi Cardona Bermúdez
  '198141': 'Marc Bartra', // Marc Bartra Aregall
  '212602': 'Diego Llorente', // Diego Javier Llorente Ríos
  '210930': 'Carles Gil', // Carles Gil Pareja
  '75605': 'Raúl Asencio', // Raúl Asencio del Rosario
  '74463': 'Marc Bernal', // Marc Bernal Casas
  '264846': 'Cristhian Mosquera', // Cristhian Mosquera Ibargüen
  '231184': 'Gorka Guruzeta', // Gorka Guruzeta Rodríguez
  '259524': 'Aitor Paredes', // Aitor Paredes Casamichana
  '277225': 'Jon Martín', // Jon Martín Vicente
  '241811': 'Sergio Gómez', // Sergio Gómez Martín
  '50604248': 'Marc Casadó', // Marc Casadó Torras
  '235945': 'Marc Roca', // Marc Roca Junqué
  '245597': 'Víctor Gómez', // Víctor Gómez Perea
  '261987': 'Antonio Blanco', // Antonio Blanco Conde
  '235944': 'Brais Méndez', // Brais Méndez Portela
  '208777': 'Óliver Torres', // Óliver Torres Muñoz
  '202648': 'Sergi Darder', // Sergi Darder Moll
  '273906': 'Renato Veiga', // Renato Palma Veiga
  '255566': 'Samu Costa', // Samuel Almeida Costa
  '266096': 'Tomás Araújo', // Tomás Lemos Araújo
  '252144': 'Eduardo Quaresma', // Eduardo Filipe Quaresma

  // ---- Club Moves Verified from Free Agency ----
  '221639': 'Mariano', // Mariano Díaz (D. Alavés)
  '202477': 'Bouna Sarr', // Bouna Sarr (FC Metz)
  '280011': 'Brandon Williams', // Brandon Williams (Rotherham Utd)
  '226078': 'Trezeguet', // Mahmoud Hassan (Al Riyadh / Egypt)

  // ---- Free Agents ----
  'fa-1': 'Sergio Ramos',
  'fa-3': 'Wissam Ben Yedder',
  'fa-4': 'Dele Alli',
  'fa-5': 'Anthony Martial',
  'fa-12': 'Timothy Fosu-Mensah',
  'fa-13': 'Christian Eriksen',
};

const IBERIAN_LATAM_NATIONS = new Set([
  'Spain',
  'Portugal',
  'Brazil',
  'Argentina',
  'Colombia',
  'Uruguay',
  'Mexico',
  'Chile',
  'Peru',
  'Paraguay',
  'Ecuador',
  'Venezuela',
  'Bolivia',
  'Costa Rica',
  'Panama',
  'Honduras',
  'Guatemala',
  'El Salvador',
  'Cuba',
  'Dominican Republic',
  'Angola',
  'Mozambique',
  'Guinea-Bissau',
  'Cape Verde Islands',
  'Cabo Verde',
  'Equatorial Guinea',
  'São Tomé and Príncipe',
  'Andorra',
]);

const COMPOUND_GIVEN_PREFIXES = new Set([
  'josé',
  'juan',
  'luis',
  'carlos',
  'miguel',
  'pedro',
  'pablo',
  'fran',
  'francisco',
  'antonio',
  'manuel',
  'javier',
  'jesús',
  'ángel',
  'maría',
  'maria',
  'ana',
  'lucía',
  'rosa',
  'joão',
  'diogo',
  'tiago',
  'bruno',
  'nuno',
  'rúben',
  'gonçalo',
  'henrique',
  'gabriel',
  'lucas',
  'matheus',
  'rafael',
  'gustavo',
  'daniel',
  'rodrigo',
  'victor',
  'víctor',
  'marcos',
  'sergio',
  'andrés',
  'david',
  'jorge',
  'álvaro',
  'raúl',
  'óscar',
  'diego',
  'adrián',
  'alejandro',
  'fernando',
  'eduardo',
  'roberto',
  'ricardo',
]);

const SURNAME_PARTICLES = new Set([
  'de',
  'del',
  'da',
  'do',
  'dos',
  'das',
  'e',
  'y',
  'la',
  'las',
  'los',
  'van',
  'von',
  'den',
  'der',
  'ten',
  'ter',
  'el',
  'al',
]);

/**
 * Derives a clean football display name / nickname for Iberian & Latin American
 * multi-word civil names when not already explicitly mapped in VERIFIED_EA_PLAYER_NICKNAMES.
 * For non-Iberian names (Dutch "Virgil van Dijk", Norwegian "Caroline Graham Hansen", etc.),
 * preserves the full name untouched unless an explicit curated EA-ID nickname exists.
 */
function deriveDisplayNickname(rawFullName: string, nation?: string): string {
  const cleaned = rawFullName.trim().replace(/\s+/g, ' ');
  const tokens = cleaned.split(' ');
  if (tokens.length <= 2) {
    return cleaned;
  }

  const normalizedNation = (nation || '').trim();
  if (!IBERIAN_LATAM_NATIONS.has(normalizedNation)) {
    return cleaned;
  }

  // Strip trailing patronymic/maternal compound in Spanish/Portuguese/Brazilian multi-word names:
  // Pattern 1: "Fabián Ruiz Peña" (3 words, no particles) -> "Fabián Ruiz"
  // Pattern 2: "João Pedro Cavaco Cancelo" (4 words, no particles) -> keep "First Second/Paternal" cleanly
  // Pattern 3: Contains Portuguese/Spanish particle ("de", "da", "dos", "del", "e"):
  //   - e.g. "Gabriel Teodoro Martinelli Silva" or "Rodrigo Hernández Cascante"
  //   - If token[0] + "de/da/del" + token[2], keep e.g. "Jorge de Frutos" / "Athenea del Castillo"
  const lowerTokens = tokens.map((t) => t.toLowerCase());

  if (tokens.length === 3) {
    // e.g. "Athenea del Castillo" or "Carlos de Pena"
    if (SURNAME_PARTICLES.has(lowerTokens[1])) {
      return cleaned;
    }
    // e.g. "José María Giménez" / "Juan Camilo Hernández" / "Luis Javier Suárez"
    if (COMPOUND_GIVEN_PREFIXES.has(lowerTokens[0]) && normalizedNation !== 'Brazil') {
      // Wait: "Pedro González López" -> 1st + 2nd ("Pedro González"), "Fermín López Marín" -> "Fermín López"
      // Both give tokens[0] + tokens[1] unless tokens[1] is clearly a 2nd given name like "María"/"Luís"/"Carlos"/"José"/"Ignacio"
      const commonSecondGiven = new Set([
        'maría',
        'maria',
        'josé',
        'jose',
        'luis',
        'luís',
        'carlos',
        'camilo',
        'javier',
        'antonio',
        'manuel',
        'francisco',
        'jesús',
        'jesus',
        'ángel',
        'angel',
        'miguel',
        'augusto',
        'henrique',
        'fernando',
        'gabriel',
        'eduardo',
        'rafael',
        'alexandre',
        'daniel',
        'david',
        'pedro',
        'paulo',
        'felipe',
        'matias',
        'bernardo',
        'tomás',
        'thomas',
        'ignacio',
        'alberto',
        'pilar',
        'francesca',
        'victoria',
        'isabel',
        'césar',
        'andrés',
        'adrián',
        'alejandro',
        'borja',
        'enrique',
        'román',
        'vitor',
        'víctor',
        'tiago',
        'diogo',
        'simón',
        'mateo',
        'nicolás',
      ]);
      if (commonSecondGiven.has(lowerTokens[1])) {
        return `${tokens[0]} ${tokens[2]}`;
      }
    }
    return `${tokens[0]} ${tokens[1]}`;
  }

  // 4+ tokens in Iberian/LatAm names:
  // Remove particles at the end or keep First + main surname
  const contentTokens = tokens.filter((t, i) => !(i > 0 && SURNAME_PARTICLES.has(t.toLowerCase())));
  if (contentTokens.length <= 2) {
    return contentTokens.join(' ');
  }

  // If 4+ non-particle tokens (e.g. "Lamine Yamal Nasraoui Ebana", "Rúben Diogo da Silva Neves"):
  // Usually [First, MiddleOrFirstSurname, Paternal, Maternal]
  // For Spain/Catalan: First + FirstSurname when 2 given names aren't obvious, or First + Paternal (token[2])
  // Wait: "Juan Luis Sánchez Velasco" -> 2nd token "Luis" is middle name -> token[0] + token[2];
  // whereas "Lamine Yamal Nasraoui Ebana" -> "Lamine Yamal" is tokens[0] + tokens[1].
  const commonMiddleNames = new Set([
    'josé',
    'jose',
    'luis',
    'luís',
    'maría',
    'maria',
    'carlos',
    'antonio',
    'manuel',
    'francisco',
    'javier',
    'jesús',
    'jesus',
    'ángel',
    'angel',
    'miguel',
    'henrique',
    'alexandre',
    'fernando',
    'augusto',
    'gabriel',
    'eduardo',
    'rafael',
    'pedro',
    'paulo',
    'felipe',
    'diogo',
    'tiago',
    'daniel',
    'david',
    'borges',
    'dos',
    'da',
    'do',
    'césar',
    'tomás',
    'thomas',
    'pilar',
    'francesca',
    'victoria',
    'isabel',
    'ignacio',
    'alberto',
    'román',
    'celeste',
    'borja',
    'enrique',
    'meireles',
    'tavares',
    'lomba',
    'cavaco',
    'pereira',
    'da',
    'conceição',
    'teodoro',
    'matheus',
    'vitor',
    'víctor',
    'vinícius',
    'filipe',
    'palma',
    'soares',
    'daniel',
    'esmoris',
    'bueno',
    'cavalcante',
    'lopes',
    'martín',
    'rodríguez',
    'garcía',
    'gonzález',
    'silva',
    'santos',
  ]);

  if (commonMiddleNames.has(contentTokens[1].toLowerCase()) && contentTokens.length >= 3) {
    return `${contentTokens[0]} ${contentTokens[2]}`;
  }

  return `${contentTokens[0]} ${contentTokens[1]}`;
}

/**
 * Computes crisp 1-word pitch/pill label from a display nickname.
 */
export function makePitchShortName(displayName: string): string {
  const cleaned = displayName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const parts = cleaned.split(' ');
  if (parts.length <= 1) return cleaned;
  // Keep iconic suffixes or short compound names intact (e.g. "Vini Jr.", "Ansu Fati", "Mapi León", "De Gea", "Kika Nazareth")
  if (cleaned.length <= 12) return cleaned;
  const last = parts[parts.length - 1];
  const prev = parts[parts.length - 2];
  if (SURNAME_PARTICLES.has(prev.toLowerCase())) {
    return `${prev} ${last}`;
  }
  if (/^(jr\.?|sr\.?|ii|iii|filho|neto|júnior)$/i.test(last) && parts.length >= 2) {
    return `${parts[parts.length - 2]} ${last}`;
  }
  return last;
}

export interface ResolvedPlayerNames {
  displayName: string;
  nickname: string;
  shortName: string;
  fullName: string;
}

export function resolvePlayerNames(
  eaOrPlayerId: string | number,
  rawFullName: string,
  nation?: string
): ResolvedPlayerNames {
  const fullName = rawFullName.trim().replace(/\s+/g, ' ');
  const key = String(eaOrPlayerId || '').trim();
  const curated = VERIFIED_EA_PLAYER_NICKNAMES[key];
  const nickname = curated || deriveDisplayNickname(fullName, nation);
  const shortName = makePitchShortName(nickname);
  return {
    displayName: nickname,
    nickname,
    shortName,
    fullName,
  };
}

const fs = require('fs');

const path = 'data/pitanja.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const byId = new Map(data.map(q => [q.id, q]));

function set(id, answer, explanation, options) {
  const q = byId.get(id);
  if (!q) throw new Error(`Missing question ${id}`);
  if (options) q.opcije = options;
  q.tacan_odgovor = answer;
  q.objasnjenje = explanation;
  q.ai_generated = true;
}

set(13, byId.get(13).opcije[3],
  'Standardna ATX napajanja daju glavne jednosmerne napone +3,3 V, +5 V i +12 V. Napon +10 V nije standardni izlaz ATX napajanja.');

set(18, byId.get(18).opcije[1],
  'Speccy prikaz pokazuje SSD od 256 GB i HDD od 2 TB. Ostale kombinacije ne odgovaraju prikazanim kapacitetima.');

set(23, byId.get(23).opcije[2],
  'CPU-Z prikazuje ukupno 8 GB memorije raspoređene u dva modula. Zato je tačno da računar ima dva memorijska modula, svaki po 4 GB.');

set(24, byId.get(24).opcije[2],
  'Pošto računar ima dva memorijska slota i cilj je ukupno 12 GB RAM-a, jedan postojeći modul treba zameniti modulom od 4 GB. Kombinacije sa 6 GB ili jednim modulom od 12 GB nisu standardno rešenje.');

set(26, [byId.get(26).opcije[0], byId.get(26).opcije[1]],
  'Za virtuelne mašine najvažniji su RAM, procesor i brz disk. Konfiguracija sa 128 GB RAM-a je najjača, a i5 sa 16 GB RAM-a i SSD-om je razuman minimum za laboratoriju. Opcije sa 4 GB RAM-a nisu dovoljne za savremene virtuelne mašine.');

set(27, [byId.get(27).opcije[1], byId.get(27).opcije[2], byId.get(27).opcije[4]],
  'Kompatibilni su DDR4 moduli od 1600 MHz, 2133 MHz i 2400 MHz. DDR3L moduli se odbacuju jer matična ploča podržava DDR4-SDRAM za ovu konfiguraciju.');

set(35, [byId.get(35).opcije[0], byId.get(35).opcije[3], byId.get(35).opcije[6], byId.get(35).opcije[7]],
  'PCI-E je serijska magistrala, podržava više staza za prenos podataka i radi u punom dupleksu. U ponuđenim tvrdnjama tačan je i navod za početni takt/standard PCI-E 1.0 od 2,5 GHz.');

set(41,
  'Slot 1: modul 8 GB; Slot 2: modul 4 GB; Slot 3: modul 8 GB; Slot 4: modul 4 GB. Ukupno: 8 + 4 + 8 + 4 = 24 GB.',
  'Za dvokanalni režim slotovi 1 i 3 čine jedan kanal, a slotovi 2 i 4 drugi kanal. U isti kanal treba staviti module istog kapaciteta i frekvencije, pa raspored 8 GB + 8 GB u jednom kanalu i 4 GB + 4 GB u drugom daje ukupno 24 GB.');

set(42,
  '10 Gbps - 3; 3,938 GB/s (~4 GB) - 4; 7,877 GB/s (~8 GB) - X; 500 MB/s - 1; 5 Gbps - X; 600 MB/s - 2',
  'USB 3.2 Gen2 radi na 10 Gbps, PCI-E 3.0 sa četiri staze daje oko 3,938 GB/s, PCI-E 2.0 po jednoj stazi oko 500 MB/s, a SATA 3.0 oko 600 MB/s. Ponudjene brzine 7,877 GB/s i 5 Gbps ne odgovaraju navedenim standardima.');

set(60, byId.get(60).opcije[3],
  'Dual boot nije posebna karakteristika UEFI firmware-a, već se podešava preko boot loadera i operativnih sistema. UEFI donosi grafički interfejs, brže podizanje i podršku za diskove veće od 2 TB.');

set(79, byId.get(79).opcije[2],
  'U računarskom računanju 1 GB = 1024 MB. Zato je 32 GB = 32 × 1024 MB = 32768 MB.');

set(83, byId.get(83).opcije[5],
  'Potrebna je čvrsta kvota od 2 GB za svakog korisnika. Čvrsta kvota blokira dalji upis kada korisnik pređe limit, dok meka kvota samo upozorava.');

set(95, byId.get(95).opcije[2],
  'Podrazumevana veličina NTFS klastera je 4 KB za ovaj slučaj. Fajl od 25 KB zauzima 7 klastera, jer se zauzeće zaokružuje naviše: 7 × 4 KB = 28 KB.');

set(105, 'na Disk1 3 GB, na Disk2 3 GB, na Disk3 3 GB',
  'Kod RAID-5 volumena sa tri diska koristan prostor je zbir dva udela, dok se jedan udeo koristi za parnost. Ako je korisniku vidljivo oko 6 GB, svaki disk učestvuje sa po 3 GB.',
  [
    'na Disk1 2 GB, na Disk2 2 GB, na Disk3 2 GB',
    'na Disk1 3 GB, na Disk2 3 GB, na Disk3 3 GB',
    'na Disk1 6 GB, na Disk2 6 GB, na Disk3 6 GB',
  ]);

set(111, [byId.get(111).opcije[0], byId.get(111).opcije[6]],
  'UEFI ima kraće vreme startovanja u odnosu na klasični BIOS i, uz GPT, podržava diskove veće od 2,2 TB.');

set(134,
  'Ukupan koristan prostor je 2000 GB (2 TB). Prostor za parnost je 500 GB.',
  'RAID-5 koristi kapacitet jednog diska za distribuiranu parnost. Kod 5 diskova od po 500 GB ukupan sirovi kapacitet je 2500 GB, parnost zauzima 500 GB, a za podatke ostaje 2000 GB.');

set(139, '10 GB',
  'Striped volume sabira prostor sa diskova. Ako su u volumenu dva dela od po 5 GB, korisniku je vidljivo ukupno 10 GB.');

set(149,
  '1. Inicijalizovati diskove; 2. Konvertovati diskove u dinamičke; 3. Kreirati volumen tipa Mirrored. X: promeniti Disk 1 u Offline; X: promeniti Disk 2 u Offline; X: kreirati Striped volumen.',
  'Konfiguracija otporna na otkaz je Mirrored volume (RAID 1), jer čuva iste podatke na oba diska. Striped volume povećava performanse, ali nema zaštitu od otkaza diska.');

set(166, byId.get(166).opcije[0],
  'Mikrotalasna rerna radi u opsegu oko 2,4 GHz, istom opsegu koji koriste mnoge WiFi mreže. Zato može da izazove smetnje baš u kantini dok drugde mreža radi normalno.');

set(189, [byId.get(189).opcije[1], byId.get(189).opcije[3]],
  'Značajan broj page fault grešaka i kada aplikacija nije pokrenuta ukazuje da sistemu nedostaje RAM. Dodavanje RAM memorije rešava osnovni problem, a povećanje page file-a na 3 GB je dopunska mera.');

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log('repaired numeric damage');

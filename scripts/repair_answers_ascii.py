import json
from pathlib import Path

path = Path("data/pitanja.json")
data = json.loads(path.read_text(encoding="utf-8"))


def q_by_id(qid):
    return next(q for q in data if q["id"] == qid)


def opt(qid, n):
    return q_by_id(qid)["opcije"][n - 1]


updates = {
    23: (opt(23, 3), "CPU-Z prikazuje ukupno 8GB memorije, a SPD kartice pokazuju dva slota sa modulima od po 4GB. Zato je tacno da racunar ima dva memorijska modula, svaki po 4GB."),
    39: ("procesor - 2; VGA - 4; PCIexpress - 5; SATA konektori - 6; konektor za napajanje - 1; DVI - 3", "Na slici je procesorsko podnozje oznaceno brojem 2, VGA port brojem 4, PCI Express slot brojem 5, SATA konektori brojem 6, ATX konektor napajanja brojem 1, a DVI port brojem 3."),
    40: ("DVI - 6; konektori za maticnu plocu - 5; VGA - 2; GPU sa hladnjakom - 3; HDMI - 4; VRAM - 1", "DVI je veliki beli konektor oznacen brojem 6, VGA je plavi konektor broj 2, HDMI je manji digitalni konektor broj 4, PCI-E konektor za maticnu plocu je broj 5, hladnjak prekriva GPU i oznacen je brojem 3, a memorijski cipovi su broj 1."),
    42: ("10 Gbps - 3; 3,938 GB/s (~4 GB) - 4; 7,877 GB/s (~8 GB) - X; 500 MB/s - 1; 5 Gbps - X; 600 MB/s - 2", "USB 3.2 Gen2 radi na 10 Gbps, PCI-E 3.0 sa cetiri staze daje oko 3,938 GB/s, PCI-E 2.0 po jednoj stazi oko 500 MB/s, a SATA 3.0 oko 600 MB/s. Ponudjene brzine 7,877 GB/s i 5 Gbps ne odgovaraju navedenim standardima."),
    45: ("Kodiranje - 3; Kvantizacija - 2; Odmeravanje - 1", "A/D konverzija ide redom: odmeravanje signala, zatim kvantizacija izmerenih vrednosti, pa kodiranje u binarni oblik."),
    47: ("Maticna ploca - X; Obavlja operacije koristeci instrukcije - 3; Operativna memorija - 4; Severni most - 1; Juzni most - 2", "Blok 3 je procesor jer izvrsava instrukcije. Blok 4 je operativna memorija, blok 1 je severni most, a blok 2 juzni most. Maticna ploca kao celina nije posebno oznacena, pa se upisuje X."),
    50: ("Unutrasnja magistrala - 4; Spoljasnja brza magistrala - 1, 2, 5; Spoljasnja sporija magistrala - 3, 6", "Magistrala 4 je veza procesora sa cipsetom i spada u unutrasnju magistralu. Brze spoljasnje magistrale su ka RAM-u, PCI Express-u i AGP-u, a sporije su ka PCI i periferijama preko juznog mosta."),
    51: ("procesor - 2; AGP slot - 3; PCI slot - 1", "Na blok semi je procesor donji levi element oznacen brojem 2, AGP slot je oznacen brojem 3, a PCI slot brojem 1."),
    70: (opt(70, 2), "Ukljucena je kvota sa limitom 450MB i nivoom upozorenja 400MB, ali nije ukljucena zabrana upisa posle prekoracenja limita. Zato korisnik dobija upozorenje kada predje 400MB, ali nije blokiran na 450MB."),
    77: (opt(77, 4), "Na slici su slova C: i D: vec zauzeta sistemskom particijom i CD/DVD uredjajem. Novoj particiji se moze dodeliti bilo koje drugo slobodno slovo engleskog alfabeta."),
    87: (opt(87, 1), "Na Disk 0 nema nealociranog prostora; sav prostor je vec u postojecim particijama. Da bi se napravila nova particija, najpre treba smanjiti postojeci volumen C i osloboditi prostor."),
    90: (opt(90, 4), "Adapter je podesen da IP dobija automatski, ali posto DHCP server ne postoji, Windows koristi podesavanja sa kartice Alternate Configuration. Tamo je uneta adresa 172.30.30.5."),
    93: (opt(93, 1), "PC1 je u mrezi 10.10.100.0/24 i kao podrazumevani prolaz dobija 10.10.100.101, dok je interfejs rutera na slici 10.10.10.10/24. Adresa ruterovog LAN interfejsa mora biti u istoj mrezi kao PC1."),
    103: (opt(103, 1), "Da bi racunar komunicirao samo u lokalnoj mrezi, treba ukloniti podrazumevani mrezni prolaz. Bez default gateway-a racunar moze da komunicira sa lokalnim adresama, ali ne i sa udaljenim mrezama."),
    105: (opt(105, 2), "Volumen podaci (K:) je RAID-5 volumen vidljiv kao oko 6GB korisnog prostora. Kod RAID-5 sa tri diska koristan prostor je (3-1) puta velicina udela, pa svaki disk ucestvuje sa 3GB."),
    106: (opt(106, 3), "Pri pristupu preko mreze efektivna dozvola je presek share i NTFS dozvola. Share dozvola za Everyone je Read, dok NTFS dozvoljava Modify grupi Nastavnici, pa Milan moze da otvori folder, ali ne moze da menja sadrzaj preko deljenja."),
    107: (opt(107, 1), "Adrese PC1 i PC2 su u istoj /25 mrezi i kablovi rade, jer je ping sa PC1 ka PC2 uspesan. Ako ping u suprotnom smeru istice, najverovatnije firewall na PC1 blokira dolazne ICMP pakete."),
    121: ([opt(121, 3), opt(121, 5)], "Za korisnika PC1\\Profesor prikazan je quota limit 100KB i status Above Limit, sto znaci da je kvota podesena i da je korisnik prekoracio dozvoljeni limit. U ovoj konfiguraciji korisniku se ne dozvoljava nastavak upisa preko limita kvote."),
    122: ([opt(122, 1), opt(122, 5)], "Listing prikazuje Wireless LAN adapter Wi-Fi, pa je rec o bezicnom adapteru. DHCP je ukljucen, gateway i DHCP server su isti uredjaj, a prisustvo link-local IPv6 adrese pokazuje da je TCP/IPv6 protokol omogucen."),
    124: ([opt(124, 1), opt(124, 2)], "Na disku postoji EFI System Partition, sto ukazuje na UEFI boot. C: particija je oznacena kao BitLocker Encrypted, pa se koristi enkripcija. Prikazan je jedan disk od oko 476GB, ne dva diska niti SSD od 256GB."),
    129: ("Event Viewer", "Prikaz Summary of Administrative Events pripada Windows alatu Event Viewer, koji prikazuje kriticne dogadjaje, greske, upozorenja i informativne zapise iz sistemskih logova."),
    131: ("Power buttons and lid -> Lid close action", "Zahtev se odnosi na ponasanje laptopa kada se poklopac zatvori. U Advanced settings to se podesava u grupi Power buttons and lid, preko opcije Lid close action, gde se bira Do nothing."),
    139: ("10 GB", "Volumen P je striped volume rasporedjen preko dva dinamicka diska, sa po 5GB na svakom disku. Kod striped volumena koristan kapacitet je zbir delova, pa je vidljivo 10GB."),
    140: ("Novo; Spreman; Zavrsen; Blokiran/cekanje", "Dijagram prikazuje uobicajena stanja procesa: nov proces prelazi u spreman, spreman proces dobija procesor i postaje RUN, iz RUN moze da zavrsi ili da predje u stanje cekanja/blokiranja, a iz cekanja se vraca u spreman."),
    143: ("zelena - 2; roze - 1; plava - 3; siva - X", "Po standardnom oznacavanju audio portova, zelena je line-out/zvucnici, roze je mikrofon, plava je line-in, a siva nije prikazana medju ova tri porta."),
    147: ("IP adresa - 1; DNS2 - 5; SM - 2; DG - 3; DNS1 - 4", "U IPv4 prozoru redom su polja za IP adresu, subnet mask i default gateway, a ispod njih preferred DNS i alternate DNS."),
    151: ("Optimizacija diska - 1; Sertifikati trenutnog korisnika - X; Upravljanje hardverom i drajverima - 2; Detalji o sistemu - 3", "dfrgui.exe pokrece Optimize Drives, devmgmt.msc Device Manager, a msinfo32.exe System Information. Za upravljanje sertifikatima trenutnog korisnika koristi se certmgr.msc, koji nije ponudjen, pa se upisuje X."),
    180: (opt(180, 3), "Krojaci su u vise organizacionih jedinica i u opisu naloga imaju vrednost krojac. Zato treba pretraziti ceo domen po polju description=krojac i sve pronadjene korisnike dodati u grupu Krojaci."),
    190: ([opt(190, 2), opt(190, 3)], "Dodati disk je prikazan kao Unknown i Not Initialized, pa ga najpre treba inicijalizovati. Nakon toga je potrebno kreirati i formatirati particiju da bi korisnik mogao da ga koristi."),
    220: (opt(220, 3), "Sortiranje je podeseno najpre po nazivu A to Z, a zatim po brojnom stanju od najmanjeg ka najvecem. Takav redosled redova prikazan je na Slici 5."),
    224: (opt(224, 1), "Razmera 1:100 znaci da 1cm na crtezu predstavlja 100cm u prirodi. Duzina 3,2m je 320cm, a 320cm / 100 = 3,2cm na crtezu."),
    225: (opt(225, 2), "U razmeri 1:50 dimenzije 14,5m x 10m postaju 29cm x 20cm. Taj format staje na A4 papir, narocito u polozenom polozaju."),
    227: (opt(227, 1), "Kada je taster otvoren, ulaz DIN je preko otpornika R povezan na GND. Otpornik tada deluje kao pull-down i obezbedjuje logicku 0."),
    228: (opt(228, 2), "Kada je taster otvoren, ulaz DIN je preko otpornika R povezan na VCC. Otpornik tada deluje kao pull-up i obezbedjuje logicku 1."),
    229: ([opt(229, 1), opt(229, 3), opt(229, 4), opt(229, 5)], "Projekat pojedinacne oblasti sadrzi opstu, tekstualnu, numericku i graficku dokumentaciju. Ostale ponudjene stavke nisu standardni delovi svakog pojedinacnog projekta oblasti."),
    230: ([opt(230, 2), opt(230, 4)], "Tekstualni deo projekta obuhvata tehnicki opis i tehnicke uslove. Osnove objekta su graficki deo, a proracuni pripadaju numerickoj dokumentaciji."),
    231: ([opt(231, 1), opt(231, 4)], "Idejno resenje prikazuje planiranu koncepciju, vrstu i namenu objekta. Detaljni crtezi u razmeri 1:50, seme i detalji karakteristicni su za kasnije faze projektovanja."),
    232: ([opt(232, 1), opt(232, 2), opt(232, 5), opt(232, 6)], "Za elektronsku tehnicku dokumentaciju koriste se formati kao sto su PDF, DWG, DWF i DWFx. DOT, PPT i rasterske slike poput PNG/JPG nisu osnovni formati elektronskog dokumenta u ovom kontekstu."),
    233: ([opt(233, 1), opt(233, 3)], "Osnovni elementi tehnickog crteza su okvir i zaglavlje, dok skica tehnickog crteza i radni zadatak ne spadaju u osnovne elemente samog tehnickog crteza."),
    234: ([opt(234, 1), opt(234, 3), opt(234, 5), opt(234, 6)], "U elektrotehnickoj dokumentaciji definisu se elektroenergetske, gromobranske, telekomunikacione i signalne instalacije. Ostale ponudjene stavke su vrste dokumentacije, ne vrste instalacija."),
    235: ([opt(235, 1), opt(235, 4)], "Korisnicko uputstvo je tekstualni dokument, pa se izradjuje u programima za obradu teksta kao sto su LibreOffice Writer i Microsoft Word."),
    236: ("Dimenzija prostorije je 233 x 202 cm; sirina vrata je 106 cm; sirina prozora je 122 cm; debljina zida je 5 cm.", "Unutrasnja sirina prostorije je 233cm. Unutrasnja visina je zbir segmenata 80cm i 122cm, dakle 202cm. Vrata su 106cm, prozor 122cm, a debljina zida je (243-233)/2 = 5cm."),
    237: ("10,005 V", "Srednja vrednost je ponderisana: (10*7 + 10,1*4 + 9,9*3 + 10,2*2 + 9,8*2 + 10,3*1 + 9,7*1) / 20 = 200,1 / 20 = 10,005 V."),
    238: ("9,6 V", "Ponderisana srednja vrednost je 10,1 V. Najvece odstupanje od 10,1 V ima merenje 9,6 V, jer je razlika 0,5 V."),
    239: ("Kotni broj - 4; Strelica - 3; Kotna linija - 2; Pomocna kotna linija - 1", "Broj 4 oznacava kotni broj, broj 3 pokazuje strelicu, broj 2 kotnu liniju, a broj 1 pomocnu kotnu liniju kojom se kota izvlaci od objekta."),
    240: ("841 x 1188 - 5; 297 x 420 - 2; 594 x 840 - 4; 420 x 594 - 3; 210 x 297 - 1", "Standardni A formati su: A0 841x1188, A1 594x840/841, A2 420x594, A3 297x420 i A4 210x297 mm. Prema tabeli redosled je 5, 2, 4, 3, 1."),
    241: ("Crtanje zaklonjenih kontura i ivica - 3; Osne linije, simetrale i putanje - 4; Konture i nezaklonjene ivice - 1; Kotne i pomocne linije, pokazne linije, linije srafure i konture zaokrenutih preseka - 2", "Isprekidana tanka linija se koristi za zaklonjene konture, crta-tacka-crta za ose i simetrale, puna debela za vidljive konture, a puna tanka za kotne, pomocne, pokazne i srafurne linije."),
    242: ("Zener dioda - 2; LE dioda - 3; Fotodioda - 1", "Zener dioda ima prelomljenu katodu, LED ima strelice koje izlaze iz diode, a fotodioda strelice koje padaju ka diodi."),
    243: ("Fototranzistor - 3; NPN tranzistor - 1; PNP tranzistor - 2", "Fototranzistor je oznacen svetlosnim strelicama. Kod bipolarnih tranzistora NPN ima strelicu emitera koja ide napolje, dok PNP ima strelicu ka unutra."),
    244: ("DC napajanje - 2; Baterija - 1; AC napajanje - 3", "Simbol sa + i - prikljuccima predstavlja DC napajanje, simbol sa dve razlicite ploce je baterija, a simbol sa talasom (~) predstavlja AC napajanje."),
    245: ("Izbor formata za prikazivanje sadrzaja - 5; Oznacavanje brojeva stranica - 2; Unutar References izabrati Table of Contents - 4; Postavljanje pokazivaca na mesto gde se predvidja sadrzaj - 3; Izbor i formatiranje naslova i podnaslova - 1", "Prvo se naslovi formatiraju stilovima, zatim se podese brojevi stranica, postavi kursor na mesto sadrzaja, iz References izabere Table of Contents i na kraju izabere format prikaza."),
    246: ("Spoljno uredjenje - 9; Arhitektura - 1; Konstrukcija i drugi gradjevinski projekti - 2; Pripremni radovi - 10; Hidrotehnicke instalacije - 3; Telekomunikacione i signalne instalacije - 5; Elektroenergetske instalacije - 4; Masinske instalacije - 6; Saobracaj i saobracajna signalizacija - 8; Tehnologija - 7", "Redosled sveski projekata je: arhitektura, konstrukcija, hidrotehnika, elektroenergetika, telekomunikacione i signalne, masinske, tehnologija, saobracaj, spoljno uredjenje i pripremni radovi."),
    247: ("idejni projekat - 3; projekat za gradjevinsku dozvolu - 4; idejno resenje - 2; projekat za izvodjenje - 5; generalni projekat - 1; projekat izvedenog stanja - 6", "Redosled izrade je: generalni projekat, idejno resenje, idejni projekat, projekat za gradjevinsku dozvolu, projekat za izvodjenje i projekat izvedenog stanja."),
    248: ("Izvor naizmenicnog napona - X; Baterija - 1; Potenciometar - 2; Fotodioda - X; LE dioda - 5; Uzemljenje - 3; Otpornik - 4", "Na semi su prikazani baterija, potenciometar, uzemljenje, otpornik i LED. Nema izvora naizmenicnog napona niti fotodiode, pa se za njih upisuje X."),
    249: ("E2 - 3; E3 - X; E4 - 4; E6 - 5", "Cena u redu dobija se mnozenjem kolicine i cene po komadu, pa je E2 = C2*D2, a E4 = C4*D4. Za E3 nije ponudjena formula C3*D3, dok je u E6 zbir E2:E4."),
    250: ("SUM(ABOVE) - 2; SUM(LEFT) - 3; SUM(BELOW) - 4; SUM(RIGHT) - 1", "Iznad oznacene celije su tri trojke, pa je SUM(ABOVE)=9. Levo su tri jedinice, ispod tri cetvorke, a desno tri dvojke."),
    251: ("Insertovati snimljenu sliku u Word dokument - 7; Startovati program Paint - 2; Selektovati deo slike u Paint-u - 4; Pritisnuti CTRL+V na tastaturi - 3; Crop selektovanog dela slike u Paint-u - 5; Print screen nacrtanog modela sistema sa mikroracunarom - 1; Snimiti obradjenu sliku u Paint-u - 6", "Redosled je: prvo napraviti Print Screen, otvoriti Paint, nalepiti sliku, selektovati potreban deo, crop-ovati, snimiti obradjenu sliku i zatim je umetnuti u Word dokument."),
}


for qid, (answer, explanation) in updates.items():
    item = q_by_id(qid)
    item["tacan_odgovor"] = answer
    item["objasnjenje"] = explanation
    item["ai_generated"] = True
    item["has_image"] = False

path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"repaired {len(updates)} answers")

# Testy na potencjalnych użytkownikach

- **użytkownik firmowy** 
- **użytkownik prywatny**

---

## 1. Cele testu

1. Czy po zalogowaniu użytkownik w kilka sekund rozumie gdzie iść dalej.
2. Czy pojęcia z apki są zrozumiałe.
   albo czy da się je zrozumieć z kontekstu.
3. Czy użytkownik znajduje funkcje tam, gdzie się ich spodziewa.
4. Czy operacje na plikach są oczywiste.
5. Czy funkcje administracyjne da się wykonać bez pomocy.


## 2. Przygotowanie

### Środowisko

- Wyłączenie aplikacji:
  ```bash
  docker compose down
  ```
- Uruchomienie aplikacji:
  ```bash
  docker compose up -d --build   # http://localhost:8080
  ```
- Konta (hasło wszędzie `123`): `admin` — administrator, `jan` i `ola` — zwykli użytkownicy, `kasia` — zablokowana.
- Na pulpicie przygotować pliki do wysłania: 2–3 zdjęcia `.jpg` i jeden `.pdf`.



## 3. Zasady prowadzenia sesji

1. **Myślenie na głos** -- prosimy uczestnika, żeby mówił, co widzi, czego szuka i czego się spodziewa.
2. **Nie podpowiadamy** -- Staramy się nie podpowiadać.
3. Na pytania odpowiadamy pytaniem: „A jak Pan/Pani myśli?”, „Czego by się Pan/Pani spodziewał(a)?”.
4. Przy blokadzie, postarać się z małą podpowiedzią.
5. Po każdym działaniu pytamy krótko o trudność (łatwe, średnie, trudne).



## 4. Scenariusz A — firma

### Pytania wstępne 

- Jak w firmie przechowujecie wspólne pliki? Kto nadaje dostęp?
- Czy robicie kopie zapasowe? Jak?
- Czy zastanawialiście się nad wprowadzeniem wspólnego systemu plików w firmie?


### Zadania, gdyby użytkownik nie wiedział, co robić, i losowo klikał
(zaczynamy jako `admin`)
| # | Treść zadania | Sukces | Co test |
|---|---|---|---|
| A1 | „Szef pyta, czy z serwerem wszystko w porządku.  Czy coś wymaga reakcji?” | Wskazanie awarii oraz ostrzeżeń z panelu głównego. | Czy rozumie kolory/statusy, licznik przy „Węzły”, alerty na Przeglądzie; czy odróżnia „awaria” od „ostrzeżenie” |
| A2 | „Do firmy dołączyła Marta. Załóż jej konto.” | Konto `marta` utworzone, hasło ustawione | Czy znajduje „Użytkownicy”; czy jasne jest to jak założyć konto. |
| A3 | „Marta ma móc sprawdzać dokumenty firmowe, ale nie może ich zmieniać.” | Nadanie *odczyt* do udziału „Dokumenty” | Czy rozumie słowo udział? Czy jasne jest jak nadać udział? |
| A4 | „Kasia zgłasza, że nie może się zalogować. Sprawdź dlaczego i jej pomóż.” | Odblokowanie konta `kasia` | Czy widzi status „Zablokowane”?  |
| A5 |  (nie jako admin -- jako jan preferowalnie odpowiednie ustawienia uprawnień) "Wrzuć fakturę z pulpitu do plików projektu, a potem spróbuj dodać ją też do zdjęć firmowych.” | Wysłanie PDF do „Projekty”; zauważenie, że w „Zdjęcia” Jan ma tylko odczyt | Czy widzi przycisk wysyłania i postęp? Czy wie, że nie ma prawa zapisu, zanim spróbuje? |


### Rozmowa końcowa — firma (po ankiecie)

- Co było najtrudniejsze? Co najłatwiejsze?
- Czy któreś słowo było niezrozumiałe?
- Czy czuł(a)by się Pan/Pani bezpiecznie, zostawiając firmowe dane na takim serwerze? Dlaczego?
- Czego brakuje, żeby wdrożyć to w Waszej firmie?
- Czy był moment, w którym Pan/Pani nie wiedział/wiedziała, gdzie co jest?
- Czy czegoś Pana/Pani zdaniem brakuje w interfejsie?
- Czy wprowadzilibyście to konkretne rozwiązanie?

---

## 5. Scenariusz B — użytkownik prywatny

### Pytania wstępne

- Gdzie trzymasz zdjęcia? Czy kiedyś straciłeś/straciłaś pliki?
- Czy słyszałeś/słyszałaś o czymś takim jak „NAS” albo „serwer domowy”?
- Czy płacisz za jakąś chmurę (Google, iCloud)? Starcza Ci miejsca?


### Zadania, gdyby użytkownik nie wiedział, co robić, i losowo klikał

Zaczynamy jako `ola`.

| # | Treść zadania | Sukces | Co test |
|---|---|---|---|
| B1 | „Wrzuć na serwer zdjęcia z ostatniego wyjazdu (są na pulpicie).” | Zdjęcia wysłane do udziału „Zdjęcia” | Czy wie, że trzeba wybrać udział? Przeciąga pliki czy używa przycisku? |
| B2 | „Zrób folder „Wakacje 2026” i przenieś do niego te zdjęcia.” | Folder utworzony, zdjęcia przeniesione | Czy znajdzie jak stworzyć folderu? Czy umie zaznaczyć kilka plików naraz? Czy okno „Przenieś do…” jest jasne? |
| B3 | „Obejrzyj jedno zdjęcie bez pobierania i zmień mu nazwę na „plaża.jpg”.” | Otwarcie podglądu i zmiana nazwy | Czy wie, że kliknięcie otwiera podgląd? Gdzie szuka zmiany nazwy? |
| B4 | „Spróbuj dodać coś do folderu z dokumentami.” | Zrozumienie, że ma tylko odczyt | Czy brak uprawnień jest czytelny? Czy komunikat nie straszy? |
| B5 | jako `admin`. „Teraz to Ty opiekujesz się serwerem. Czy Twoje zdjęcia są bezpieczne?” | Wskazanie awarii dysku i niedziałającego urządzenia | Czy osoba nietechniczna rozumie statusy bez słowa „węzeł”? Czy wie, co zrobić dalej? |
| B6 | „Załóż konto dla taty i pozwól mu oglądać zdjęcia.” | Konto utworzone, nadanie *odczyt* do „Zdjęcia” | Jak w A2–A3. Czy przejście Użytkownicy → Udziały jest naturalne? |


### Rozmowa końcowa — prywatny (po ankiecie)

- Czy Twój tata / Twoja mama poradziłby/poradziłaby sobie z tym panelem?
- Czy któreś słowo było niezrozumiałe? 
- Czego brakuje w porównaniu z Dyskiem Google (innym rozwiązaniem sieciowym)?
- Czy był moment, w którym nie wiedziałeś/wiedziałaś, gdzie co jest?
- Czy coś na ekranie było niepotrzebne albo tylko przeszkadzało?
- Co zmieniłbyś/zmieniłabyś jako pierwsze?
- Czy kupiłbyś/kupiłabyś coś takiego do domu?

---

## 6. Pomiary

### Po każdym zadaniu

> „Jak łatwe lub trudne było to zadanie?” — **1** (bardzo trudne) … **5** (bardzo łatwe)



### Na koniec dodatkowe pytania.

Skala 1–5 (zdecydowanie się nie zgadzam … zdecydowanie się zgadzam):

1. „Ten panel ma funkcje, których potrzebuję.”
2. „Ten panel jest łatwy w użyciu.”

# BW Food Consulting — 1026 stron miejskich

Niezależny od Landingi generator statycznych landing pages dla domeny `lp.technologzywnosci.pl`.

## Co generuje

- 1026 stron miejskich w formacie `/technolog-zywnosci-{miasto}`,
- stronę zbiorczą z wyszukiwarką i podziałem na 16 województw,
- `sitemap.xml`, `robots.txt`, dane strukturalne JSON-LD i manifest adresów,
- komplet metadanych SEO, linkowanie wewnętrzne i responsywny formularz kontaktowy,
- raport QA sprawdzający wszystkie strony, adresy, metadane i linki.

Lista miast pochodzi z oficjalnego wykazu KTS/TERYT GUS według stanu na 1 stycznia 2026 r. Obejmuje 302 gminy miejskie oraz 724 miasta w gminach miejsko-wiejskich.

## Bezpieczny tryb publikacji

Domyślny build działa w trybie `preview`:

- strony mają `noindex,follow`,
- `robots.txt` blokuje indeksowanie,
- domena produkcyjna pozostaje przy dotychczasowej usłudze do chwili zakończenia migracji.

Indeksowanie jest włączane wyłącznie przez jawne ustawienie:

```bash
PUBLISH_MODE=production npm run build
```

## Uruchomienie

Wymagany jest Node.js 22 lub nowszy. Generator nie ma zależności runtime.

```bash
npm test
npm run serve
```

Po zbudowaniu pliki znajdują się w katalogu `dist/`. Lokalny podgląd działa pod adresem wyświetlonym przez `npm run serve`.

## Kontrola jakości

`npm test` wykonuje pełny build i waliduje między innymi:

- dokładnie 1026 rekordów, plików i unikalnych identyfikatorów TERYT,
- dokładnie 1027 adresów w sitemapie: strona zbiorcza + 1026 miast,
- unikalne tytuły, opisy i canonicale,
- obecność H1, formularza, danych strukturalnych oraz wymaganych sekcji,
- brak placeholderów, zależności Landingi i niedziałających linków lokalnych,
- poprawne przełączanie między trybem podglądu i produkcji.

GitHub Actions dodatkowo wykonuje testy w przeglądarce oraz zrzuty wersji desktopowej i mobilnej.

## Migracja z Landingi

Domena `lp.technologzywnosci.pl` nie powinna być przełączana, dopóki nie zostaną zakończone:

1. porównanie obecnych 99 adresów z nowym manifestem,
2. przygotowanie przekierowań dla adresów, które nie mogą zostać zachowane,
3. wizualna akceptacja reprezentatywnej próby stron,
4. test formularza i analityki,
5. wdrożenie podglądowe z zablokowaną indeksacją,
6. finalny test sitemap, canonicali i odpowiedzi HTTP.

Dzięki temu przejście z Landingi nie powoduje przerwy w działaniu ani niepotrzebnej utraty istniejących sygnałów SEO.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');
const assetsDir = path.join(distDir, 'assets');

const BASE_URL = String(process.env.SITE_URL || 'https://lp.technologzywnosci.pl').replace(/\/$/, '');
const PUBLISH_MODE = process.env.PUBLISH_MODE === 'production' ? 'production' : 'preview';
const EXPECTED_CITY_COUNT = Number(process.env.EXPECTED_CITY_COUNT || 1026);
const BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const SOURCE_AS_OF = '2026-01-01';
const CONTACT_EMAIL = 'technolog.szukazlecenia@gmail.com';
const CONTACT_PHONE_DISPLAY = '+48 723 917 766';
const CONTACT_PHONE = '+48723917766';
const MAIN_SITE = 'https://technologszukazlecenia.pl';
const ROBOTS = PUBLISH_MODE === 'production' ? 'index,follow,max-image-preview:large' : 'noindex,follow';

const regions = {
  'dolnośląskie': {
    genitive: 'dolnośląskiego',
    note: 'Zakres można prowadzić etapowo: od oceny wykonalności, przez próby, po przygotowanie procesu do wdrożenia w zakładzie.',
  },
  'kujawsko-pomorskie': {
    genitive: 'kujawsko-pomorskiego',
    note: 'Współpraca może łączyć analizę zdalną, pracę recepturową oraz ustalone wcześniej próby i wizyty wdrożeniowe.',
  },
  'lubelskie': {
    genitive: 'lubelskiego',
    note: 'Punktem wyjścia jest realny park maszynowy, dostępne surowce i parametry, które da się kontrolować w codziennej produkcji.',
  },
  'lubuskie': {
    genitive: 'lubuskiego',
    note: 'Projekt jest porządkowany tak, aby decyzje recepturowe, procesowe i kosztowe były podejmowane na podstawie tych samych założeń.',
  },
  'łódzkie': {
    genitive: 'łódzkiego',
    note: 'Prace mogą obejmować zarówno rozwój nowego produktu, jak i usunięcie konkretnego problemu jakościowego lub produkcyjnego.',
  },
  'małopolskie': {
    genitive: 'małopolskiego',
    note: 'Najpierw definiujemy kryteria akceptacji, a następnie dobieramy recepturę i proces, które można obronić w skali produkcyjnej.',
  },
  'mazowieckie': {
    genitive: 'mazowieckiego',
    note: 'Model współpracy sprawdza się zarówno przy projektach producentów, jak i marek zlecających wytwarzanie na zewnątrz.',
  },
  'opolskie': {
    genitive: 'opolskiego',
    note: 'Każdy etap kończy się konkretną decyzją: kontynuujemy, korygujemy założenia albo zamykamy ryzyko przed kolejną próbą.',
  },
  'podkarpackie': {
    genitive: 'podkarpackiego',
    note: 'Technologia jest dopasowywana do rzeczywistych ograniczeń zakładu, zamiast opierać się wyłącznie na wyniku laboratoryjnym.',
  },
  'podlaskie': {
    genitive: 'podlaskiego',
    note: 'W projekcie porządkujemy surowce, parametry procesu, kryteria jakości i dokumenty potrzebne do powtarzalnego wytwarzania.',
  },
  'pomorskie': {
    genitive: 'pomorskiego',
    note: 'Prace można rozpocząć od krótkiego audytu założeń, aby przed próbami wskazać luki, koszty i ryzyka technologiczne.',
  },
  'śląskie': {
    genitive: 'śląskiego',
    note: 'Rozwiązanie powinno działać nie tylko w recepturze, ale również przy wydajności, zmianowości i kontroli jakości w zakładzie.',
  },
  'świętokrzyskie': {
    genitive: 'świętokrzyskiego',
    note: 'Dobrze zdefiniowany brief ogranicza liczbę przypadkowych prób i pozwala szybciej porównywać warianty produktu.',
  },
  'warmińsko-mazurskie': {
    genitive: 'warmińsko-mazurskiego',
    note: 'Projekt może objąć cały proces NPD albo wybrany problem: trwałość, teksturę, smak, wydajność, skalowanie lub dokumentację.',
  },
  'wielkopolskie': {
    genitive: 'wielkopolskiego',
    note: 'Wyniki prób są przekładane na parametry robocze, kryteria odbioru i materiały, z których może korzystać zespół produkcyjny.',
  },
  'zachodniopomorskie': {
    genitive: 'zachodniopomorskiego',
    note: 'Praca zdalna służy analizie i przygotowaniu prób, a obecność w zakładzie jest planowana wtedy, gdy wnosi wartość wdrożeniową.',
  },
};

const heroVariants = [
  'Pomagam uporządkować recepturę, surowce, proces i dokumentację tak, aby produkt można było świadomie przenieść od pomysłu do powtarzalnej produkcji.',
  'Łączę rozwój receptury z analizą procesu, kosztu i ograniczeń zakładu, dzięki czemu decyzje technologiczne nie kończą się na próbie laboratoryjnej.',
  'Wspieram producentów i marki spożywcze w projektach NPD, optymalizacji istniejących produktów oraz rozwiązywaniu problemów pojawiających się przy skalowaniu.',
  'Prowadzę prace technologiczne od briefu i oceny wykonalności, przez próby, aż do parametrów procesu i dokumentacji potrzebnej zespołowi produkcyjnemu.',
];

const problemIntroductions = [
  'Najwięcej kosztownych opóźnień powstaje pomiędzy dobrym pomysłem a stabilną produkcją. W tych miejscach potrzebna jest kontrola technologiczna.',
  'Projekt spożywczy rzadko wykłada się na samym pomyśle. Zwykle problemem jest przełożenie założeń na surowce, parametry i realia zakładu.',
  'Próba może wyglądać dobrze, a mimo to nie być gotowa do produkcji. Ryzyko pojawia się przy skali, zmienności surowców i braku kryteriów odbioru.',
  'Receptura, proces i dokumentacja muszą opisywać ten sam produkt. Rozbieżności między nimi szybko wracają jako reklamacje, straty albo przestoje.',
];

const processIntroductions = [
  'Zakres jest dzielony na etapy z jasnym wynikiem i decyzją, co robimy dalej. Dzięki temu wiadomo, za co odpowiada każda próba.',
  'Nie zaczynam od przypadkowego mieszania wariantów. Najpierw porządkujemy kryteria sukcesu, ograniczenia i dane wejściowe.',
  'Prace prowadzone są w krótkich, kontrolowanych cyklach: założenie, próba, pomiar, decyzja i aktualizacja dokumentacji.',
  'Proces dopasowuję do etapu projektu. Inaczej wygląda ratowanie produkcji, inaczej rozwój nowej receptury, a jeszcze inaczej transfer do producenta kontraktowego.',
];

const ctaVariants = [
  'Opisz produkt, etap prac i najważniejszy problem. Na tej podstawie można ustalić sensowny pierwszy krok.',
  'Prześlij założenia projektu oraz informacje o obecnych próbach. Odpowiedź zaczniemy od tego, co rzeczywiście wymaga sprawdzenia.',
  'Napisz, jaki rezultat chcesz osiągnąć i czym dysponuje zakład. To pozwoli oddzielić pracę recepturową od wdrożeniowej.',
  'Krótki, konkretny opis wystarczy na początek: produkt, skala, termin decyzji i obecna przeszkoda technologiczna.',
];

const scopeCards = [
  ['01', 'Ocena wykonalności', 'Weryfikacja briefu, ograniczeń prawnych i technologicznych, dostępnych surowców oraz realnego sposobu produkcji.'],
  ['02', 'Receptura i surowce', 'Dobór składników, proporcji, zamienników i krytycznych parametrów jakościowych z uwzględnieniem kosztu oraz dostępności.'],
  ['03', 'Proces i skalowanie', 'Przełożenie receptury na kolejność operacji, temperatury, czasy, mieszanie, obróbkę, chłodzenie i pakowanie.'],
  ['04', 'Próby i kryteria odbioru', 'Plan prób, porównanie wariantów, pomiary, ocena sensoryczna i jasno zapisane warunki akceptacji.'],
  ['05', 'Koszt i wydajność', 'Analiza food costu, uzysków, strat, punktów generujących koszt oraz możliwości uproszczenia procesu.'],
  ['06', 'Dokumentacja i etykieta', 'Karty technologiczne, specyfikacje, instrukcje, informacje do etykiety i uporządkowanie danych potrzebnych jakości oraz produkcji.'],
];

const faqsBase = [
  {
    q: (city) => `Czy obsługujesz projekty dla firm z miasta ${city}?`,
    a: (city, region) => `Tak. Projekty dla firm z miasta ${city} i województwa ${region.genitive} mogą być prowadzone w modelu zdalnym, hybrydowym lub z pracą w zakładzie — zależnie od rodzaju produktu i etapu wdrożenia.`,
  },
  {
    q: () => 'Na jakim etapie projektu można rozpocząć współpracę?',
    a: () => 'Zarówno na etapie pomysłu, jak i po pierwszych próbach, przy skalowaniu, transferze do producenta albo wtedy, gdy istniejąca produkcja nie daje stabilnego wyniku. Pierwszym krokiem jest ustalenie, co już wiadomo i czego brakuje do następnej decyzji.',
  },
  {
    q: () => 'Czy możesz poprawić istniejącą recepturę zamiast tworzyć produkt od początku?',
    a: () => 'Tak. Zakres może dotyczyć konkretnego problemu, na przykład tekstury, smaku, pienienia, rozwarstwiania, trwałości, wydajności, kosztu, procesu lub doboru surowców. Potrzebne są aktualna receptura, opis procesu i możliwie dokładny opis niepożądanego efektu.',
  },
  {
    q: () => 'Czy każda współpraca wymaga wizyty w zakładzie?',
    a: () => 'Nie. Analizę briefu, dokumentacji, receptur i wyników prób można prowadzić zdalnie. Wizyta ma sens wtedy, gdy trzeba zobaczyć linię, wykonać próbę produkcyjną, ustalić parametry albo zweryfikować źródło problemu na miejscu.',
  },
  {
    q: () => 'Jak ustalany jest koszt i zakres prac?',
    a: () => 'Po zapoznaniu się z krótkim opisem produktu, etapem projektu, oczekiwanym wynikiem i dostępnymi materiałami. Wtedy można zaproponować pracę godzinową, etapową albo zamknięty zakres — bez obiecywania wyniku, którego nie da się potwierdzić przed próbami.',
  },
  {
    q: () => 'Jakie materiały warto przygotować na początek?',
    a: () => 'Brief produktu, aktualną recepturę lub listę składników, opis procesu, dostępne specyfikacje surowców, zdjęcia lub nagrania prób, wyniki badań oraz informację o parku maszynowym. Braki można wskazać po pierwszym przeglądzie.',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeXml(value) {
  return escapeHtml(value);
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function hashContent(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function canonicalPath(city) {
  return `/technolog-zywnosci-${city.slug}`;
}

function pageUrl(city) {
  return `${BASE_URL}${canonicalPath(city)}`;
}

function plainText(value) {
  return String(value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function header({ hub = false } = {}) {
  const links = hub
    ? '<a href="#miasta">Miasta</a><a href="#zakres">Zakres</a><a href="#kontakt">Kontakt</a>'
    : '<a href="#zakres">Zakres</a><a href="#proces">Proces</a><a href="#doswiadczenie">Doświadczenie</a><a href="#faq">FAQ</a>';
  return `
  <a class="skip-link" href="#main">Przejdź do treści</a>
  <header class="site-header" data-header>
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="BW Food Consulting — lista miast">
        <span class="brand-mark" aria-hidden="true">BW</span>
        <span class="brand-text"><span>FOOD</span><span>CONSULTING</span></span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="Otwórz menu" data-nav-toggle><span></span></button>
      <nav class="site-nav" id="site-navigation" aria-label="Główna nawigacja" data-nav data-open="false">
        ${links}
        <a class="button button--small" href="#kontakt" data-track="header_contact">Opisz projekt</a>
      </nav>
    </div>
  </header>`;
}

function footer({ city = '' } = {}) {
  const context = city ? `Strona lokalna: ${escapeHtml(city)}` : 'Obsługa projektów w całej Polsce';
  return `
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <a class="brand" href="/" aria-label="BW Food Consulting — lista miast">
          <span class="brand-mark" aria-hidden="true">BW</span>
          <span class="brand-text"><span>FOOD</span><span>CONSULTING</span></span>
        </a>
        <div class="footer-meta">
          <span>© 2026 BW Food Consulting</span>
          <span>${context}</span>
          <span>Głowno, woj. łódzkie</span>
        </div>
      </div>
      <div class="footer-links">
        <a href="${MAIN_SITE}">Strona główna firmy</a>
        <a href="mailto:${CONTACT_EMAIL}">E-mail</a>
        <a href="tel:${CONTACT_PHONE}">Telefon</a>
        <a href="/">Wszystkie miasta</a>
      </div>
    </div>
  </footer>`;
}

function head({ title, description, canonical, cssAsset, jsAsset, schema, bodyClass = '', bodyAttributes = '' }) {
  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${ROBOTS}">
  <meta name="theme-color" content="#fff8ef">
  <meta name="format-detection" content="telephone=no">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <meta property="og:locale" content="pl_PL">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="BW Food Consulting">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="/assets/${cssAsset}">
  <script type="application/ld+json">${safeJson(schema)}</script>
  <script src="/assets/${jsAsset}" defer></script>
</head>
<body${bodyClass ? ` class="${escapeHtml(bodyClass)}"` : ''}${bodyAttributes ? ` ${bodyAttributes}` : ''}>`;
}

function contactSection(cityName = 'Polska') {
  return `
  <section class="section section--ink" id="kontakt">
    <div class="container contact-grid">
      <div data-reveal>
        <p class="eyebrow">Kontakt</p>
        <h2>Opisz projekt technologiczny.</h2>
        <p class="lead">Im więcej konkretów podasz o produkcie, obecnym etapie i ograniczeniach, tym trafniej można określić pierwszy krok.</p>
        <div class="contact-direct">
          <a href="mailto:${CONTACT_EMAIL}" data-track="email"><span>E-mail</span>${CONTACT_EMAIL}</a>
          <a href="tel:${CONTACT_PHONE}" data-track="phone"><span>Telefon</span>${CONTACT_PHONE_DISPLAY}</a>
        </div>
      </div>
      <form class="contact-form" action="mailto:${CONTACT_EMAIL}" method="post" enctype="text/plain" data-contact-form data-reveal>
        <div class="form-grid">
          <div class="field">
            <label for="name">Imię i nazwisko *</label>
            <input id="name" name="name" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="email">E-mail służbowy *</label>
            <input id="email" name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label for="phone">Telefon</label>
            <input id="phone" name="phone" type="tel" autocomplete="tel">
          </div>
          <div class="field">
            <label for="company">Firma</label>
            <input id="company" name="company" autocomplete="organization">
          </div>
          <div class="field">
            <label for="category">Kategoria produktu</label>
            <select id="category" name="category">
              <option value="">Wybierz kategorię</option>
              <option>Napoje i koncentraty</option>
              <option>Słodycze i wyroby cukiernicze</option>
              <option>Garmaż i dania gotowe</option>
              <option>Sosy, majonezy i dressingi</option>
              <option>Przekąski i produkty funkcjonalne</option>
              <option>Produkty roślinne</option>
              <option>Produkty mięsne</option>
              <option>Mieszanki proszkowe</option>
              <option>Inna kategoria</option>
            </select>
          </div>
          <div class="field">
            <label for="stage">Etap projektu</label>
            <select id="stage" name="stage">
              <option value="">Wybierz etap</option>
              <option>Pomysł / brief</option>
              <option>Pierwsze próby</option>
              <option>Optymalizacja receptury</option>
              <option>Skalowanie</option>
              <option>Próba produkcyjna</option>
              <option>Problem w bieżącej produkcji</option>
            </select>
          </div>
          <div class="field field--full">
            <label for="message">Opis projektu *</label>
            <textarea id="message" name="message" required placeholder="Produkt, skala, obecny etap, najważniejszy problem i oczekiwany rezultat."></textarea>
          </div>
          <label class="consent">
            <input type="checkbox" name="consent" required>
            <span>Wyrażam zgodę na kontakt w sprawie tego zapytania. Formularz nie zapisuje danych na stronie — po wysłaniu otworzy program pocztowy z przygotowaną wiadomością.</span>
          </label>
          <div class="field field--full">
            <button class="button button--orange" type="submit" data-track="form_submit">Przygotuj wiadomość</button>
            <p class="form-note">Kontekst strony: ${escapeHtml(cityName)}. Pola oznaczone gwiazdką są wymagane.</p>
          </div>
        </div>
      </form>
    </div>
  </section>`;
}

function citySchema(city, title, description, faqs) {
  const url = pageUrl(city);
  const region = regions[city.voivodeship];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'BW Food Consulting',
        url: MAIN_SITE,
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_DISPLAY,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Sikorskiego 45/49',
          postalCode: '95-015',
          addressLocality: 'Głowno',
          addressCountry: 'PL',
        },
      },
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: title,
        description,
        serviceType: 'Doradztwo technologiczne i rozwój produktów spożywczych',
        provider: { '@id': `${BASE_URL}/#organization` },
        areaServed: [
          { '@type': 'City', name: city.name },
          { '@type': 'AdministrativeArea', name: `województwo ${city.voivodeship}` },
          { '@type': 'Country', name: 'Polska' },
        ],
        url,
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: 'pl-PL',
        about: { '@id': `${url}#service` },
        isPartOf: { '@id': `${BASE_URL}/#website` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: `${BASE_URL}/`,
        name: 'Technolog żywności — miasta Polski',
        publisher: { '@id': `${BASE_URL}/#organization` },
        inLanguage: 'pl-PL',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Wszystkie miasta', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: `Województwo ${city.voivodeship}` },
          { '@type': 'ListItem', position: 3, name: city.name, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'Dataset',
        '@id': `${url}#place-data`,
        name: `Dane administracyjne miasta ${city.name}`,
        description: `Miasto ${city.name}, województwo ${city.voivodeship}, identyfikator TERYT ${city.teryt}.`,
        temporalCoverage: SOURCE_AS_OF,
        creator: { '@type': 'Organization', name: 'Główny Urząd Statystyczny' },
      },
    ],
  };
}

function cityPage(city, groupedCities, nameCounts, cssAsset, jsAsset) {
  const region = regions[city.voivodeship];
  assert(region, `Missing region configuration for ${city.voivodeship}`);
  const variant = Number(city.teryt.slice(-4)) % heroVariants.length;
  const duplicate = nameCounts.get(city.name) > 1;
  const seoPlace = duplicate ? `${city.name}, woj. ${city.voivodeship}` : city.name;
  const title = `Technolog żywności ${seoPlace} | BW Food Consulting`;
  const description = `Technolog żywności dla firm z miasta ${city.name} i województwa ${region.genitive}. Receptury, próby, skalowanie, wdrożenia i dokumentacja.`;
  const canonical = pageUrl(city);

  const regionalCities = groupedCities.get(city.voivodeship) || [];
  const index = regionalCities.findIndex((item) => item.teryt === city.teryt);
  const related = [];
  for (let offset = 1; related.length < Math.min(8, regionalCities.length - 1); offset += 1) {
    const candidate = regionalCities[(index + offset) % regionalCities.length];
    if (candidate.teryt !== city.teryt && !related.some((item) => item.teryt === candidate.teryt)) related.push(candidate);
  }

  const faqData = faqsBase.map((faq) => ({ q: faq.q(city.name, region), a: faq.a(city.name, region) }));
  const schema = citySchema(city, title, description, faqData);
  const faqMarkup = faqData.map((faq) => `
        <details>
          <summary>${escapeHtml(faq.q)}</summary>
          <div class="faq-answer"><p>${escapeHtml(faq.a)}</p></div>
        </details>`).join('');
  const relatedMarkup = related.map((item) => `<a href="${canonicalPath(item)}">${escapeHtml(item.name)}</a>`).join('');
  const scopeMarkup = scopeCards.map(([number, heading, text]) => `
        <article class="card card--scope" data-reveal>
          <span class="card-icon" aria-hidden="true">${number}</span>
          <h3>${escapeHtml(heading)}</h3>
          <p>${escapeHtml(text)}</p>
        </article>`).join('');

  return `${head({ title, description, canonical, cssAsset, jsAsset, schema, bodyAttributes: `data-city="${escapeHtml(city.name)}"` })}
  <!-- Build mode: ${PUBLISH_MODE}; city TERYT: ${city.teryt}; source date: ${SOURCE_AS_OF} -->
  <div data-teryt="${city.teryt}" hidden></div>
  ${header()}
  <main id="main">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy" data-reveal>
          <p class="eyebrow">Technolog żywności • ${escapeHtml(city.name)}</p>
          <h1>Technolog żywności — <span>${escapeHtml(city.name)}</span>.<br>Od pomysłu do produkcji.</h1>
          <p class="lead">${escapeHtml(heroVariants[variant])} Prowadzę projekty dla firm z miasta ${escapeHtml(city.name)} oraz województwa ${escapeHtml(region.genitive)}.</p>
          <div class="button-row">
            <a class="button button--orange" href="#kontakt" data-track="hero_contact">Opisz projekt</a>
            <a class="button button--ghost" href="#zakres" data-track="hero_scope">Zobacz zakres</a>
          </div>
          <ul class="hero-proof" aria-label="Najważniejsze elementy współpracy">
            <li>Receptura i surowce</li>
            <li>Próby i skalowanie</li>
            <li>Proces i dokumentacja</li>
          </ul>
        </div>
        <div class="hero-panel" aria-label="Schemat prowadzenia projektu" data-reveal>
          <div class="hero-panel__back" aria-hidden="true"></div>
          <div class="hero-panel__card">
            <div class="panel-label"><span>Proces NPD</span><span>${escapeHtml(city.name)}</span></div>
            <div class="process-track">
              <div class="process-track__item"><strong>Brief i wykonalność</strong><span>cel, ryzyka, ograniczenia</span></div>
              <div class="process-track__item"><strong>Receptura i próby</strong><span>surowce, warianty, kryteria</span></div>
              <div class="process-track__item"><strong>Proces i skalowanie</strong><span>parametry, uzysk, stabilność</span></div>
              <div class="process-track__item"><strong>Wdrożenie</strong><span>dokumentacja i kontrola rezultatu</span></div>
            </div>
            <div class="panel-result"><strong>Rezultat: decyzja oparta na danych</strong><span>Nie kolejna luźna wersja receptury, lecz uporządkowany proces.</span></div>
          </div>
        </div>
      </div>
      <div class="container stage-strip" data-reveal>
        <ol>
          <li><span>01</span>Koncepcja</li>
          <li><span>02</span>Receptura</li>
          <li><span>03</span>Próby</li>
          <li><span>04</span>Wdrożenie</li>
        </ol>
      </div>
    </section>

    <section class="section section--white" id="problemy">
      <div class="container">
        <div class="section-head">
          <div data-reveal><p class="eyebrow">Gdzie projekt traci kontrolę</p><h2>Dobry produkt musi działać poza laboratorium.</h2></div>
          <p data-reveal>${escapeHtml(problemIntroductions[variant])}</p>
        </div>
        <div class="card-grid">
          <article class="card card--problem" data-reveal><span class="card-index">01 / SKALA</span><h3>Receptura nie zachowuje się tak samo na linii</h3><p>Zmieniają się ścinanie, wymiana ciepła, czas operacji, kolejność dozowania i wpływ urządzeń.</p></article>
          <article class="card card--problem" data-reveal><span class="card-index">02 / JAKOŚĆ</span><h3>Smak, tekstura lub wygląd są niestabilne</h3><p>Przyczyną może być surowiec, interakcja składników, parametr procesu albo sposób chłodzenia i pakowania.</p></article>
          <article class="card card--problem" data-reveal><span class="card-index">03 / PROCES</span><h3>Technologia nie pasuje do parku maszynowego</h3><p>Rozwiązanie laboratoryjne trzeba przełożyć na dostępne urządzenia, wydajność, zmianowość i kontrolę operatora.</p></article>
          <article class="card card--problem" data-reveal><span class="card-index">04 / DANE</span><h3>Dokumentacja nie opisuje rzeczywistej produkcji</h3><p>Brak spójnych parametrów i kryteriów akceptacji utrudnia jakość, kosztorys, szkolenie oraz powtarzalność.</p></article>
        </div>
      </div>
    </section>

    <section class="section" id="zakres">
      <div class="container">
        <div class="section-head">
          <div data-reveal><p class="eyebrow">Zakres wsparcia</p><h2>Od decyzji „czy to ma sens” do produkcji.</h2></div>
          <p data-reveal>Zakres dobieramy do sytuacji. Można przeprowadzić pełny rozwój produktu albo skupić się na jednym problemie, który blokuje kolejny etap.</p>
        </div>
        <div class="card-grid card-grid--3">${scopeMarkup}
        </div>
      </div>
    </section>

    <section class="section section--ink" id="efekty">
      <div class="container outcome-grid">
        <div data-reveal><p class="eyebrow">Co zostaje po projekcie</p><h2>Wynik, który można przekazać dalej.</h2><p class="lead">Celem nie jest sama liczba prób. Celem jest rozwiązanie, które zespół potrafi odtworzyć, ocenić i rozwijać.</p></div>
        <ul class="outcome-list" data-reveal>
          <li><b>01</b><div><strong>Powtarzalna receptura</strong><span>Wersja połączona z surowcami, parametrami i kryteriami jakości.</span></div></li>
          <li><b>02</b><div><strong>Mniejsze ryzyko wdrożenia</strong><span>Znane punkty krytyczne, ograniczenia oraz warunki kolejnej próby.</span></div></li>
          <li><b>03</b><div><strong>Lepsze decyzje kosztowe</strong><span>Widoczny wpływ wariantów na food cost, uzysk, straty i złożoność procesu.</span></div></li>
          <li><b>04</b><div><strong>Dokumentacja robocza</strong><span>Materiały spójne z tym, co rzeczywiście ma wydarzyć się w produkcji.</span></div></li>
        </ul>
      </div>
    </section>

    <section class="section" id="proces">
      <div class="container">
        <div class="section-head section-head--single" data-reveal><p class="eyebrow">Sposób pracy</p><h2>Cztery etapy. Każdy kończy się decyzją.</h2><p>${escapeHtml(processIntroductions[variant])}</p></div>
        <div class="timeline">
          <article class="timeline-item" data-reveal><span class="timeline-dot" aria-hidden="true"></span><h3>1. Diagnoza</h3><p>Brief, dane wejściowe, produkt wzorcowy, ograniczenia, park maszynowy i definicja rezultatu.</p></article>
          <article class="timeline-item" data-reveal><span class="timeline-dot" aria-hidden="true"></span><h3>2. Projekt prób</h3><p>Hipotezy, warianty, surowce, plan pomiarów i warunki, które rozstrzygają między rozwiązaniami.</p></article>
          <article class="timeline-item" data-reveal><span class="timeline-dot" aria-hidden="true"></span><h3>3. Walidacja</h3><p>Ocena wyniku, korekty, porównanie z kryteriami i przygotowanie do większej skali.</p></article>
          <article class="timeline-item" data-reveal><span class="timeline-dot" aria-hidden="true"></span><h3>4. Transfer</h3><p>Parametry procesu, instrukcje, dokumenty i wsparcie zespołu podczas wdrożenia.</p></article>
        </div>
      </div>
    </section>

    <section class="section section--white" id="kategorie">
      <div class="container">
        <div class="section-head section-head--single" data-reveal><p class="eyebrow">Kategorie produktów</p><h2>Doświadczenie obejmujące różne technologie żywności.</h2><p>Każda kategoria wymaga innego podejścia do surowców, procesu, trwałości, tekstury i kontroli jakości.</p></div>
        <ul class="category-list" data-reveal>
          <li>Napoje i koncentraty</li><li>Wyroby cukiernicze</li><li>Garmaż i dania gotowe</li><li>Sosy i dressingi</li>
          <li>Przekąski funkcjonalne</li><li>Produkty roślinne</li><li>Produkty mięsne</li><li>Mieszanki proszkowe</li>
        </ul>
      </div>
    </section>

    <section class="section" id="doswiadczenie">
      <div class="container experience">
        <div class="experience-visual" data-reveal>
          <span class="big-number">NPD</span>
          <span class="big-number-label">rozwój produktu od briefu do wdrożenia</span>
          <span class="experience-note">Perspektywa technologii, jakości, projektu i realnej produkcji.</span>
        </div>
        <div data-reveal>
          <p class="eyebrow">BW Food Consulting</p>
          <h2>Technolog, który łączy produkt z procesem.</h2>
          <p class="lead">Wsparcie oparte na doświadczeniu zdobytym po stronie producentów żywności i w niezależnych projektach doradczych.</p>
          <ul class="check-list">
            <li>Rozwój nowych produktów i poprawa istniejących receptur</li>
            <li>Próby laboratoryjne, pilotażowe i produkcyjne</li>
            <li>Skalowanie, troubleshooting i optymalizacja procesu</li>
            <li>Specyfikacje, etykiety i dokumentacja technologiczna</li>
            <li>Komunikacja z dostawcami, laboratoriami i producentami</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section section--compact section--orange" id="lokalnie">
      <div class="container local-box" data-reveal>
        <div>
          <p class="eyebrow">Obsługiwany obszar</p>
          <h2>${escapeHtml(city.name)} i województwo ${escapeHtml(city.voivodeship)}.</h2>
          <p>${escapeHtml(region.note)}</p>
          <div class="local-meta">
            <span class="meta-chip">obsługa zdalna i wdrożeniowa</span>
            <span class="meta-chip">TERYT ${city.teryt}</span>
            <span class="meta-chip">wykaz miast: 01.01.2026</span>
          </div>
        </div>
        <div>
          <p class="nearby-title">Inne miasta w województwie</p>
          <div class="nearby-links">${relatedMarkup}</div>
        </div>
      </div>
    </section>

    <section class="section section--white" id="faq">
      <div class="narrow">
        <div class="section-head section-head--single" data-reveal><p class="eyebrow">FAQ</p><h2>Najczęstsze pytania przed rozpoczęciem projektu.</h2></div>
        <div class="faq-list" data-reveal>${faqMarkup}
        </div>
      </div>
    </section>

    <section class="section section--compact">
      <div class="narrow" data-reveal>
        <p class="eyebrow">Pierwszy krok</p>
        <h2>Nie trzeba mieć gotowego briefu.</h2>
        <p class="lead">${escapeHtml(ctaVariants[variant])}</p>
        <div class="button-row"><a class="button button--orange" href="#kontakt" data-track="precontact_cta">Przejdź do kontaktu</a></div>
      </div>
    </section>

    ${contactSection(city.name)}
  </main>
  ${footer({ city: city.name })}
  <noscript><div class="narrow form-note">JavaScript jest wyłączony. Skontaktuj się bezpośrednio: ${CONTACT_EMAIL}, ${CONTACT_PHONE_DISPLAY}.</div></noscript>
</body>
</html>`;
}

function hubSchema(cityCount) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'BW Food Consulting',
        url: MAIN_SITE,
        email: CONTACT_EMAIL,
        telephone: CONTACT_PHONE_DISPLAY,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Sikorskiego 45/49',
          postalCode: '95-015',
          addressLocality: 'Głowno',
          addressCountry: 'PL',
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        url: `${BASE_URL}/`,
        name: 'Technolog żywności — miasta Polski',
        description: `Wsparcie technologiczne BW Food Consulting dla firm z ${cityCount} miast w Polsce.`,
        publisher: { '@id': `${BASE_URL}/#organization` },
        inLanguage: 'pl-PL',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${BASE_URL}/#webpage`,
        url: `${BASE_URL}/`,
        name: 'Technolog żywności — wszystkie miasta w Polsce',
        isPartOf: { '@id': `${BASE_URL}/#website` },
        about: { '@type': 'Service', name: 'Doradztwo technologiczne i rozwój produktów spożywczych' },
        mainEntity: { '@type': 'ItemList', numberOfItems: cityCount },
      },
    ],
  };
}

function hubPage(cities, groupedCities, cssAsset, jsAsset) {
  const title = 'Technolog żywności — 1026 miast w Polsce | BW Food Consulting';
  const description = 'Znajdź stronę BW Food Consulting dla swojego miasta. Receptury, próby, skalowanie, wdrożenia i dokumentacja dla firm spożywczych w całej Polsce.';
  const regionSections = Object.keys(regions).map((regionName) => {
    const items = groupedCities.get(regionName) || [];
    const cards = items.map((city) => `<a class="city-card" href="${canonicalPath(city)}" data-city-card data-search="${escapeHtml(`${city.name} ${city.voivodeship}`)}">${escapeHtml(city.name)}</a>`).join('');
    return `
      <section class="region-section" id="woj-${escapeHtml(regionName)}" data-region-section>
        <div class="region-heading"><h2>Województwo ${escapeHtml(regionName)}</h2><span>${items.length} miast</span></div>
        <div class="city-grid">${cards}</div>
      </section>`;
  }).join('');

  return `${head({ title, description, canonical: `${BASE_URL}/`, cssAsset, jsAsset, schema: hubSchema(cities.length), bodyClass: 'hub-page', bodyAttributes: 'data-city="Polska"' })}
  <!-- Build mode: ${PUBLISH_MODE}; official city count: ${cities.length}; source date: ${SOURCE_AS_OF} -->
  ${header({ hub: true })}
  <main id="main">
    <section class="hub-hero">
      <div class="container">
        <p class="eyebrow">BW Food Consulting • cała Polska</p>
        <h1>Technolog żywności dla firm z każdego miasta w Polsce.</h1>
        <p class="lead">Wybierz miasto i przejdź do lokalnej strony dotyczącej rozwoju receptur, prób, skalowania, wdrożeń i dokumentacji technologicznej.</p>
        <div class="hub-stat"><strong>${cities.length}</strong><span>oficjalnie ujętych miast według wykazu na 1 stycznia 2026 r.</span></div>
      </div>
    </section>

    <section class="search-panel" aria-label="Wyszukiwanie miast">
      <div class="container search-row">
        <label class="field-label" for="city-search" hidden>Wyszukaj miasto lub województwo</label>
        <input class="search-input" id="city-search" type="search" placeholder="Wpisz miasto lub województwo…" autocomplete="off" data-city-search>
        <span class="search-count">Widoczne miasta: <strong data-search-count>${cities.length}</strong></span>
      </div>
    </section>

    <section class="section" id="miasta">
      <div class="container regions">
        ${regionSections}
        <div class="search-empty" data-search-empty hidden>Nie znaleziono miasta. Sprawdź pisownię albo wpisz nazwę województwa.</div>
      </div>
    </section>

    <section class="section section--white" id="zakres">
      <div class="container">
        <div class="section-head">
          <div data-reveal><p class="eyebrow">Jeden spójny proces</p><h2>Wsparcie od briefu do produkcji.</h2></div>
          <p data-reveal>Strony lokalne prowadzą do tego samego zespołu BW Food Consulting. Miasto określa obszar obsługi, nie sugeruje fikcyjnego biura ani oddziału.</p>
        </div>
        <div class="card-grid card-grid--3">
          <article class="card card--scope" data-reveal><span class="card-icon">01</span><h3>Receptury i surowce</h3><p>Nowe produkty, optymalizacja, zamienniki, koszty i parametry jakościowe.</p></article>
          <article class="card card--scope" data-reveal><span class="card-icon">02</span><h3>Próby i skalowanie</h3><p>Plan doświadczeń, kryteria akceptacji, transfer z laboratorium do zakładu.</p></article>
          <article class="card card--scope" data-reveal><span class="card-icon">03</span><h3>Proces i dokumentacja</h3><p>Parametry, instrukcje, specyfikacje, etykiety i wsparcie wdrożenia.</p></article>
        </div>
      </div>
    </section>

    <section class="section section--compact section--orange">
      <div class="narrow" data-reveal>
        <p class="eyebrow">Źródło listy</p>
        <h2>1026 miast, bez ręcznych dopisków i przypadkowych duplikatów.</h2>
        <p class="lead">Lista obejmuje 302 gminy miejskie i 724 miasta w gminach miejsko-wiejskich. Każda pozycja ma unikalny identyfikator TERYT i własny adres strony.</p>
      </div>
    </section>

    ${contactSection('Polska')}
  </main>
  ${footer()}
</body>
</html>`;
}

function notFoundPage(cssAsset, jsAsset) {
  const title = 'Nie znaleziono strony | BW Food Consulting';
  const description = 'Ta strona nie istnieje. Przejdź do listy wszystkich miast obsługiwanych przez BW Food Consulting.';
  const schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: `${BASE_URL}/404` };
  return `${head({ title, description, canonical: `${BASE_URL}/404`, cssAsset, jsAsset, schema })}
  ${header({ hub: true })}
  <main id="main" class="not-found">
    <div class="container not-found-card">
      <div class="not-found-code" aria-hidden="true">404</div>
      <h1>Nie znaleziono takiej strony.</h1>
      <p class="lead">Adres mógł się zmienić. Przejdź do pełnej listy miast i wybierz właściwą stronę lokalną.</p>
      <div class="button-row" style="justify-content:center"><a class="button button--orange" href="/">Zobacz wszystkie miasta</a></div>
    </div>
  </main>
  ${footer()}
</body>
</html>`;
}

async function main() {
  const rawCities = await readFile(path.join(dataDir, 'cities.json'), 'utf8');
  const cities = JSON.parse(rawCities);
  assert(Array.isArray(cities), 'data/cities.json must contain an array');
  assert(cities.length === EXPECTED_CITY_COUNT, `Expected ${EXPECTED_CITY_COUNT} cities, got ${cities.length}`);

  const requiredKeys = ['name', 'slug', 'voivodeship', 'teryt', 'kind'];
  for (const city of cities) {
    for (const key of requiredKeys) assert(city[key], `City record is missing ${key}: ${JSON.stringify(city)}`);
    assert(/^\d{7}$/.test(city.teryt), `Invalid TERYT code: ${city.teryt}`);
    assert(/^[a-z0-9-]+$/.test(city.slug), `Invalid slug: ${city.slug}`);
    assert(regions[city.voivodeship], `Unknown voivodeship: ${city.voivodeship}`);
    assert(!/\((1|4)\)$|\s-\smiasto$/i.test(city.name), `Technical label remains in city name: ${city.name}`);
  }
  assert(new Set(cities.map((city) => city.slug)).size === cities.length, 'City slugs are not unique');
  assert(new Set(cities.map((city) => city.teryt)).size === cities.length, 'TERYT identifiers are not unique');

  cities.sort((a, b) => a.name.localeCompare(b.name, 'pl-PL') || a.teryt.localeCompare(b.teryt));
  const groupedCities = new Map();
  for (const regionName of Object.keys(regions)) groupedCities.set(regionName, []);
  for (const city of cities) groupedCities.get(city.voivodeship).push(city);
  for (const items of groupedCities.values()) items.sort((a, b) => a.name.localeCompare(b.name, 'pl-PL') || a.teryt.localeCompare(b.teryt));
  const nameCounts = new Map();
  for (const city of cities) nameCounts.set(city.name, (nameCounts.get(city.name) || 0) + 1);

  const [css, js] = await Promise.all([
    readFile(path.join(srcDir, 'site.css'), 'utf8'),
    readFile(path.join(srcDir, 'site.js'), 'utf8'),
  ]);
  const cssAsset = `site-${hashContent(css)}.css`;
  const jsAsset = `site-${hashContent(js)}.js`;

  await rm(distDir, { recursive: true, force: true });
  await mkdir(assetsDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(assetsDir, cssAsset), css, 'utf8'),
    writeFile(path.join(assetsDir, jsAsset), js, 'utf8'),
    writeFile(path.join(assetsDir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="#ee6b2f"/><path d="M12 12h40v40H12z" fill="none" stroke="#23211f" stroke-width="4"/><text x="32" y="39" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="800" fill="#23211f">BW</text></svg>`, 'utf8'),
  ]);

  await writeFile(path.join(distDir, 'index.html'), hubPage(cities, groupedCities, cssAsset, jsAsset), 'utf8');
  await writeFile(path.join(distDir, '404.html'), notFoundPage(cssAsset, jsAsset), 'utf8');

  for (const city of cities) {
    const filename = `technolog-zywnosci-${city.slug}.html`;
    await writeFile(path.join(distDir, filename), cityPage(city, groupedCities, nameCounts, cssAsset, jsAsset), 'utf8');
  }

  const sitemapEntries = [
    { loc: `${BASE_URL}/`, lastmod: BUILD_DATE },
    ...cities.map((city) => ({ loc: pageUrl(city), lastmod: BUILD_DATE })),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc><lastmod>${item.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');

  const robots = PUBLISH_MODE === 'production'
    ? `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n\n# Podgląd techniczny — publikacja i indeksacja są wyłączone.\n`;
  await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8');

  const urlManifest = cities.map((city) => ({
    name: city.name,
    voivodeship: city.voivodeship,
    teryt: city.teryt,
    kind: city.kind,
    slug: city.slug,
    path: canonicalPath(city),
    canonical: pageUrl(city),
    output: `technolog-zywnosci-${city.slug}.html`,
  }));
  await writeFile(path.join(distDir, 'url-manifest.json'), `${JSON.stringify(urlManifest, null, 2)}\n`, 'utf8');

  const manifest = {
    generator: 'BW Food Consulting city landing generator',
    buildMode: PUBLISH_MODE,
    generatedAt: new Date().toISOString(),
    buildDate: BUILD_DATE,
    sourceAsOf: SOURCE_AS_OF,
    baseUrl: BASE_URL,
    cityCount: cities.length,
    cityPageCount: cities.length,
    indexPageCount: 1,
    sitemapUrlCount: sitemapEntries.length,
    assets: { css: cssAsset, js: jsAsset },
    dataHash: createHash('sha256').update(rawCities).digest('hex'),
  };
  await writeFile(path.join(distDir, 'site-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeFile(path.join(distDir, 'humans.txt'), `BW Food Consulting\nGenerator lokalnych stron technologicznych\nMiasta: ${cities.length}\nŹródło administracyjne: KTS/TERYT, stan ${SOURCE_AS_OF}\nKontakt: ${CONTACT_EMAIL}\n`, 'utf8');

  const totalCopy = cities.reduce((sum, city) => sum + plainText(cityPage(city, groupedCities, nameCounts, cssAsset, jsAsset)).split(/\s+/).length, 0);
  console.log(`Built ${cities.length} city pages plus the city hub.`);
  console.log(`Mode: ${PUBLISH_MODE}; canonical base: ${BASE_URL}`);
  console.log(`Sitemap URLs: ${sitemapEntries.length}; approximate city-page words: ${totalCopy.toLocaleString('pl-PL')}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

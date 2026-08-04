// Port POSITION_PROFILES + POSITION_MAP_TEMP z index.html (ankieta
// diagnostyczna webowa) do mobile — zweryfikowane FRESH z produkcyjnego
// kodu w tej sesji (29.07.2026), nie z pamięci. Wcześniej istniało
// WYŁĄCZNIE w index.html, nigdy nie trafiło do gamechange-asystent-mobile
// (Krok 0 tej sesji wykrył tę lukę, patrz claude/PRZEJSCIE_NASTEPNA_SESJA.md
// i ustalenia na starcie sesji przeprojektowania trybu Mecz).
//
// DWIE ODDZIELNE REPREZENTACJE POZYCJI (odkrycie z audytu Domeny 13,
// potwierdzone ponownie tutaj):
// - Polskie etykiety ("Bramkarz", "Środkowy obrońca"...) — to jest forma
//   zapisywana w player_profiles.position_primary/secondary,
//   public.positions.id, i (od tej sesji) match_contexts.position_played_today.
// - snake_case ("bramkarz", "obronca_srodkowy"...) — WYŁĄCZNIE wewnętrzny
//   klucz do POSITION_PROFILES, używany tylko w kodzie appki, nigdy w bazie.
//
// Ten plik jest jedynym miejscem w mobile, które zna oba formaty jednocześnie
// — reszta kodu (mecz.tsx, matchSegmentSelection.ts) operuje na polskich
// etykietach i woła stąd funkcje pomocnicze, nigdy nie buduje snake_case ręcznie.

export type PositionTier = 'key' | 'important' | 'minor';

export type PositionProfile = {
  number: string;
  name: string;
  tiers: Record<string, PositionTier>;
};

// Klucze = wewnętrzna reprezentacja snake_case (patrz POSITION_MAP_TEMP niżej).
export const POSITION_PROFILES: Record<string, PositionProfile> = {
  bramkarz: {
    number: '1', name: 'BRAMKARZ',
    tiers: {
      mental: 'key', koncentracja: 'key', decyzja: 'key', moc: 'key',
      fizycznosc: 'important', techFund: 'important', percepcja: 'important', regeneracja: 'important',
      wytrzymalosc: 'minor', techSpec: 'minor', tolerancja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  obronca_srodkowy: {
    number: '4/5', name: 'ŚRODKOWY OBROŃCA',
    tiers: {
      percepcja: 'key', decyzja: 'key', fizycznosc: 'key', mental: 'key',
      moc: 'important', koncentracja: 'important', techFund: 'important', tolerancja: 'important',
      wytrzymalosc: 'minor', techSpec: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  obronca_boczny: {
    number: '2/3', name: 'BOCZNY OBROŃCA',
    tiers: {
      wytrzymalosc: 'key', moc: 'key', decyzja: 'key',
      percepcja: 'important', fizycznosc: 'important', techFund: 'important', tolerancja: 'important',
      koncentracja: 'minor', techSpec: 'minor', mental: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  pomocnik_defensywny: {
    number: '6', name: 'DEFENSYWNY POMOCNIK',
    tiers: {
      percepcja: 'key', decyzja: 'key', koncentracja: 'key',
      techFund: 'important', fizycznosc: 'important', wytrzymalosc: 'important', mental: 'important',
      moc: 'minor', techSpec: 'minor', tolerancja: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  pomocnik_srodkowy: {
    number: '8', name: 'ŚRODKOWY POMOCNIK',
    tiers: {
      wytrzymalosc: 'key', decyzja: 'key', techFund: 'key',
      percepcja: 'important', moc: 'important', koncentracja: 'important', fizycznosc: 'important',
      techSpec: 'minor', mental: 'minor', tolerancja: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  pomocnik_ofensywny: {
    number: '10', name: 'OFENSYWNY POMOCNIK',
    tiers: {
      techSpec: 'key', decyzja: 'key', percepcja: 'key', mental: 'key',
      techFund: 'important', koncentracja: 'important',
      moc: 'minor', wytrzymalosc: 'minor', fizycznosc: 'minor', tolerancja: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  skrzydlowy: {
    number: '7/11', name: 'SKRZYDŁOWY',
    tiers: {
      moc: 'key', techSpec: 'key', decyzja: 'key',
      percepcja: 'important', wytrzymalosc: 'important', techFund: 'important', mental: 'important',
      fizycznosc: 'minor', koncentracja: 'minor', tolerancja: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
  napastnik: {
    number: '9', name: 'NAPASTNIK',
    tiers: {
      decyzja: 'key', techSpec: 'key', fizycznosc: 'key', mental: 'key',
      moc: 'important', percepcja: 'important', techFund: 'important', koncentracja: 'important',
      wytrzymalosc: 'minor', tolerancja: 'minor', regeneracja: 'minor', odzywianie: 'minor', odpornosc: 'minor',
    },
  },
};

// Mapowanie POLSKA ETYKIETA (forma zapisywana w bazie) -> wewnętrzny
// klucz snake_case (forma używana WYŁĄCZNIE jako indeks do POSITION_PROFILES
// powyżej). Odpowiednik POSITION_MAP_TEMP + CTX_LABELS.pos z index.html,
// scalone w jedną, bezpośrednią tabelę zamiast dwóch tablic indeksowanych
// liczbowo (0-7) — mobile nie ma tych numerycznych indeksów ankiety, więc
// mapowanie idzie wprost etykieta -> klucz.
export const LABEL_TO_POSITION_KEY: Record<string, string> = {
  'Bramkarz': 'bramkarz',
  'Środkowy obrońca': 'obronca_srodkowy',
  'Boczny obrońca': 'obronca_boczny',
  'Defensywny pomocnik': 'pomocnik_defensywny',
  'Środkowy pomocnik': 'pomocnik_srodkowy',
  'Ofensywny pomocnik': 'pomocnik_ofensywny',
  'Skrzydłowy': 'skrzydlowy',
  'Napastnik': 'napastnik',
  // 'Nie dotyczy' celowo bez wpisu — brak profilu pozycyjnego, tak jak
  // getPositionProfile(8) w index.html zwracało null.
};

/** Polska etykieta -> wewnętrzny klucz snake_case, albo null (brak/"Nie dotyczy"). */
export function getPositionWordingKey(positionLabel: string | null | undefined): string | null {
  if (!positionLabel) return null;
  return LABEL_TO_POSITION_KEY[positionLabel] ?? null;
}

/** Profil wag segmentów dla danej polskiej etykiety pozycji, albo null. */
export function getPositionProfile(positionLabel: string | null | undefined): PositionProfile | null {
  const key = getPositionWordingKey(positionLabel);
  return key ? POSITION_PROFILES[key] ?? null : null;
}

// DECYZJA PROGRAMISTYCZNA (29.07.2026, dokumentowana zgodnie z ustaloną
// metodologią projektu): dokument decyzji (TRYB_MECZU_PRZEPROJEKTOWANIE_
// DECYZJE.md, punkt 4) opisuje próg "waga zależności ≥0.5", zakładając
// wagi liczbowe. Realny POSITION_PROFILES (zweryfikowany fresh powyżej)
// nie ma wag liczbowych — ma kategoryczne tiery 'key'/'important'/'minor'.
// "Kluczowy dla pozycji" (źródła 1 i 4 kaskady, oba używają dokładnie tego
// słowa) mapowane na tier === 'key' — najciaśniejsze, jednoznaczne
// dopasowanie do słowa użytego w obu miejscach dokumentu. Do rewizji przez
// Kubę, jeśli zamiarem było uwzględnienie też 'important'.
export function isPositionCriticalSegment(positionLabel: string | null | undefined, segmentId: string): boolean {
  const profile = getPositionProfile(positionLabel);
  if (!profile) return false;
  return profile.tiers[segmentId] === 'key';
}

/** Wszystkie segmenty tier==='key' dla danej pozycji (polska etykieta). */
export function getPositionCriticalSegments(positionLabel: string | null | undefined): string[] {
  const profile = getPositionProfile(positionLabel);
  if (!profile) return [];
  return Object.entries(profile.tiers)
    .filter(([, tier]) => tier === 'key')
    .map(([segId]) => segId);
}

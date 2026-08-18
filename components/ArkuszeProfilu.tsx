// ═══════════════════════════════════════════════════════════════════
// ARKUSZE EKRANU 2 „PROFIL" — PLAN-D-A3 08.2026 (18.08.2026). NOWY PLIK.
// ═══════════════════════════════════════════════════════════════════
//
// PO CO TO ISTNIEJE: ekran „Profil" ma na wierzchu TRZY rzeczy i PIĘĆ pozycji
// za dotknięciem. Ten plik jest tymi pięcioma pozycjami plus arkuszem
// „Skąd bierze się trafność".
//
// ⛔ ANI JEDNA LICZBA NIE POWSTAJE TUTAJ. Ten plik dostaje gotowy model
// z `lib/ekranProfilu.ts` i go rysuje. Zwrot obszaru liczy
// `lib/zwrotObszaru.ts`, progi — `lib/nagrodaZaPrace.ts`.
//
// ⭐ TO JEST TAKŻE WEJŚCIE ZASTĘPCZE dla ekranów, które tracą zakładkę:
//   • `/profil`  (kreator danych)  → „Moje dane i cel" oraz „Ustawienia i konto"
//   • `/cele`    (wąskie gardła)   → „Moje dane i cel"
//   • `/diagnoza`(pełny wynik)     → „Skąd to wiemy"
//   • `/biblioteka`(materiały)     → „Skąd to wiemy"
//   • `/centrum-decyzji`           → „Skąd to wiemy"
//   • Mapa drogi · Lista zadań · Ścieżka wyjścia · Punkt pomocy → jak wyżej
// ⛔ WEJŚCIA POWSTAJĄ ZANIM ZAKŁADKI ZNIKNĄ. Zakładki zdejmuje pas A1 —
// gdyby ten plik ich nie miał, cztery ekrany zostałyby bez ani jednej drogi.
import type { ReactNode } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, radii, minTouchHeight, spacing } from '../constants/theme';
import { PROGI, type NagrodaZaPrace } from '../lib/nagrodaZaPrace';
import {
  NAZWA_MIARY,
  POWOD_FILTRU_PROGOW,
  PRACA_DODATKOWA_WEJSCIE,
  TRAFNOSC_REMIS,
  TRAFNOSC_TYTUL,
  TRAFNOSC_WZOR,
  TRAFNOSC_ZAWSZE_JEDEN,
  TYTULY_POZYCJI,
  USTAWIENIA_CZEGO_NIE_MA,
  progiNaEkranie,
  type ArkuszTrafnosci,
  type KluczPozycji,
  type ModelProfilu,
} from '../lib/ekranProfilu';
import { otworzPunktPomocy } from './PunktPomocy';
// ⭐ PLAN-D-S2 18.08.2026 — TRZY LICZBY O PRACY WCHODZĄ DO POZYCJI
// „SKĄD TO WIEMY". ⛔ To NIE JEST szósta pozycja Profilu: wchodzą DO WNĘTRZA
// istniejącej, a arkusz stoi poza `ScrollView` ekranu, więc kosztują 0 dp.
import PracaWLiczbach, { type WejsciaPracy } from './PracaWLiczbach';

type Props = {
  otwarty: KluczPozycji | 'trafnosc' | null;
  onClose: () => void;
  userId: string | null;
  nagroda: NagrodaZaPrace | null;
  trafnosc: ArkuszTrafnosci | null;
  model: ModelProfilu | null;
  /** Nieprzeczytane rekomendacje. ⛔ `null` = nie odczytałem, nigdy „zero". */
  rekomendacje: number | null;
  /**
   * ⭐ WEJŚCIA TRZECH LICZB O PRACY — surowe wiersze z ekranu „Ja".
   * ⛔ `null` = ekran jeszcze nie czytał; blok rysuje wtedy NIC, a nie zera.
   */
  praca: WejsciaPracy | null;
  /** Nazwy wąskich gardeł z diagnozy — ⛔ policzone przez ekran, nie tutaj. */
  deficitLabels: readonly string[];
  /** `id obszaru` → nazwa na ekranie. ⛔ Arkusz nie nazywa obszarów sam. */
  etykietyObszarow: Readonly<Record<string, string>>;
  /**
   * ⭐ WEJŚCIA BUDUJE EKRAN „Ja", a ten arkusz je UKŁADA. Odwrotny podział
   * (arkusz buduje) sprawiłby, że jedyna droga do biblioteki, mapy drogi,
   * listy zadań i ścieżki wyjścia przestałaby być widoczna z pliku ekranu —
   * a to jest dokładnie ta rzecz, której pilnują zapadki repozytorium.
   */
  wejscieBiblioteki: ReactNode;
  wejscieZadan: ReactNode;
  wejscieDrogi: ReactNode;
  wejscieWyjscia: ReactNode;
  onSignOut: () => void;
  onOdswiez: () => void;
};

/** Wiersz wejścia w arkuszu — jedyny kształt, jaki mają wszystkie wejścia. */
function Wejscie(props: { tytul: string; podpis: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.wejscie} onPress={props.onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.wejscieTytul}>{props.tytul}</Text>
        <Text style={styles.wejsciePodpis}>{props.podpis}</Text>
      </View>
      <Text style={styles.strzalka}>›</Text>
    </TouchableOpacity>
  );
}

function Fakt(props: { tytul: string; podpis: string }) {
  return (
    <View style={styles.fakt}>
      <Text style={styles.faktTytul}>{props.tytul}</Text>
      {props.podpis.length > 0 ? <Text style={styles.faktPodpis}>{props.podpis}</Text> : null}
    </View>
  );
}

export default function ArkuszeProfilu(props: Props) {
  const router = useRouter();

  // ⛔ JEDEN MODAL NARAZ. Zanim otworzy się Mapa drogi albo Lista zadań,
  // arkusz się zamyka — modal w modalu jest w React Native źródłem znikających
  // warstw, a ten pas nie ma jak tego sprawdzić na telefonie.
  const przejdz = (co?: () => void) => { props.onClose(); if (co) co(); };
  const trasa = (r: string) => przejdz(() => router.push(r as never));

  const tytul = props.otwarty === null
    ? ''
    : props.otwarty === 'trafnosc' ? TRAFNOSC_TYTUL : TYTULY_POZYCJI[props.otwarty];

  return (
    <>
      <Modal visible={props.otwarty !== null} animationType="slide" onRequestClose={props.onClose}>
        <SafeAreaView style={styles.pelny} edges={['top', 'bottom']}>
          <View style={styles.naglowek}>
            <TouchableOpacity onPress={props.onClose} style={styles.zamknij}>
              <Text style={styles.zamknijTekst}>‹ Profil</Text>
            </TouchableOpacity>
            <Text style={styles.naglowekTytul}>{tytul}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
            {props.otwarty === 'trafnosc'
              ? <Trafnosc dane={props.trafnosc} etykiety={props.etykietyObszarow} />
              : null}
            {props.otwarty === 'odznaki' ? <Odznaki nagroda={props.nagroda} /> : null}
            {props.otwarty === 'dane' ? (
              <>
                <Fakt tytul="Skąd to liczymy"
                  podpis="Rocznik, wzrost, pozycja i cel są wejściem do wszystkiego innego: bez pozycji nie ma trafności, bez rocznika nie ma doboru treści do wieku." />
                <Wejscie tytul="Dane, pozycja, wzrost, sprzęt, tryb kontuzji"
                  podpis="formularz, w którym to wszystko uzupełniasz i poprawiasz"
                  onPress={() => trasa('/profil')} />
                <Wejscie tytul="Twój cel i wąskie gardła"
                  podpis="kierunek na lata i to, nad czym pracujesz teraz"
                  onPress={() => trasa('/cele')} />
              </>
            ) : null}
            {props.otwarty === 'skad' ? (
              <>
                <Fakt tytul="Wszystko, na czym stoją wglądy"
                  podpis={props.model === null ? 'Wczytuję…' : props.model.pozycje[2].podpis} />
                {/* ⭐ PLAN-D-S2 — TRZY LICZBY, KTÓRE PRODUKT LICZYŁ I KTÓRYCH
                    NIKT NIE RYSOWAŁ. Makieta v3 opisuje tę pozycję jako
                    „Twoje wpisy, mecze i pomiary, z których liczą się wglądy" —
                    licznik „N z M sesji odbyte, K bez wpisu" JEST tą treścią.
                    ⛔ JEDYNA KOPIA RYSOWANIA stoi w `PracaWLiczbach.tsx`. */}
                <PracaWLiczbach we={props.praca} />
                <Fakt tytul="Twoje wąskie gardła z diagnozy"
                  podpis={props.deficitLabels.length === 0
                    ? 'Nie mamy ich jeszcze — biorą się z wyników diagnozy.'
                    : props.deficitLabels.join('  ·  ')} />
                <Wejscie tytul="Wynik diagnozy"
                  podpis="13 obszarów, wąskie gardła i ich przyczyny"
                  onPress={() => trasa('/diagnoza')} />
                <Wejscie tytul="Wszystkie rekomendacje"
                  podpis={props.rekomendacje === null
                    ? 'nie udało mi się sprawdzić, ile jest nowych'
                    : props.rekomendacje === 0
                      ? 'wszystko, co system Ci dotąd powiedział'
                      : `${props.rekomendacje} — jeszcze tego nie czytałeś`}
                  onPress={() => trasa('/centrum-decyzji')} />
                {props.wejscieBiblioteki}
                {props.wejscieDrogi}
                {/* ⚠️ WEJŚCIE ZASTĘPCZE, ŚWIADOMIE TYMCZASOWE. Zadanie żyje
                    w dniu i należy do ekranu 1 — ale ekran 1 jest plikiem pasa
                    A1 i ten pas go nie dotyka. Bez tego wiersza lista zadań
                    straciłaby JEDYNE wejście w produkcie (B3). */}
                {props.wejscieZadan}
              </>
            ) : null}
            {props.otwarty === 'nazewnatrz' ? (
              <>
                <Fakt tytul={props.model === null ? 'Wczytuję…' : props.model.pozycje[3].podpis}
                  podpis="Żaden trener, rodzic ani klub nie dostaje od nas o Tobie ani jednej liczby, dopóki sam tego nie włączysz." />
                <Fakt tytul="Raport dla rodzica"
                  podpis="Jeżeli go włączysz, zobaczysz tutaj, co dokładnie zawiera — zanim ktokolwiek go dostanie." />
                <Wejscie tytul="Włącz albo wyłącz raport dla rodzica"
                  podpis="e-mail rodzica ustawiasz w swoich danych"
                  onPress={() => trasa('/profil')} />
              </>
            ) : null}
            {props.otwarty === 'ustawienia' ? (
              <>
                <Wejscie tytul="Dostęp, kod drużyny, logowanie odciskiem"
                  podpis="stan Twojego dostępu i sposób logowania"
                  onPress={() => trasa('/profil')} />
                {props.wejscieWyjscia}
                <Wejscie tytul="Pomoc"
                  podpis="jak to działa i co produkt o Tobie wie"
                  onPress={() => przejdz(otworzPunktPomocy)} />
                <TouchableOpacity style={styles.wyloguj} onPress={() => przejdz(props.onSignOut)}>
                  <Text style={styles.wylogujTekst}>Wyloguj się</Text>
                </TouchableOpacity>
                {/* ⛔ R5 — TRZY WARTOŚCI. Makieta obiecuje „powiadomienia,
                    hasło, usunięcie konta"; zmierzone 18.08.2026: zero trafień
                    w całym repozytorium. Nie udajemy, że są. */}
                <Text style={styles.czegoNieMa}>{USTAWIENIA_CZEGO_NIE_MA}</Text>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

/**
 * ⭐ ODZNAKI I PROGI. ⛔ Liczba progów na ekranie = tyle, ile zna silnik —
 * i to jest ROZSTRZYGNIĘCIE, nie przypadek: makieta rysowała pięć, `PROGI`
 * ma sześć. Powód pełny w `lib/ekranProfilu.ts`, `POWOD_FILTRU_PROGOW`.
 */
function Odznaki(props: { nagroda: NagrodaZaPrace | null }) {
  if (props.nagroda === null) return <Fakt tytul="Wczytuję…" podpis="" />;
  if (props.nagroda.rodzaj === 'nie_policzona') {
    return (
      <Fakt tytul="Nie udało mi się sprawdzić, które progi masz"
        podpis={`${props.nagroda.powod}. To nie znaczy, że ich nie masz — pociągnij w dół.`} />
    );
  }
  const n = props.nagroda;
  const zdobyte = new Map(n.odznaki.map((o) => [o.id, o]));
  const nieumiem = new Map(n.nieumiemPoliczyc.map((o) => [o.id, o]));
  return (
    <>
      {progiNaEkranie().map((p) => {
        const z = zdobyte.get(p.id);
        const brak = nieumiem.get(p.id);
        const podpis = z
          ? p.zaJakaPrace
          : brak
            ? `Nie umiem tego policzyć (${brak.powod}).`
            : `Brakuje Ci ${Math.max(p.prog - (n.nastepnyProg && n.nastepnyProg.id === p.id ? n.nastepnyProg.masz : 0), 0)} ${NAZWA_MIARY[p.miara]}.`;
        return <Fakt key={p.id} tytul={`${z ? '✓ ' : ''}${p.nazwa}`} podpis={podpis} />;
      })}
      <Text style={styles.czegoNieMa}>{POWOD_FILTRU_PROGOW}</Text>
      <Text style={styles.czegoNieMa}>
        {`Progów jest ${PROGI.length}. Żaden nie mija sam — każdy da się pokonać wyłącznie pracą.`}
      </Text>
    </>
  );
}

/** ⭐ SKĄD BIERZE SIĘ TRAFNOŚĆ. ⛔ Nie liczy niczego — rysuje gotowy wynik. */
function Trafnosc(props: {
  dane: ArkuszTrafnosci | null;
  etykiety: Readonly<Record<string, string>>;
}) {
  if (props.dane === null) return <Fakt tytul="Wczytuję…" podpis="" />;
  if (props.dane.rodzaj === 'pusto') {
    return (
      <>
        <Fakt tytul="Nie mamy z czego tego policzyć" podpis={props.dane.zdanie} />
        <Text style={styles.czegoNieMa}>{TRAFNOSC_ZAWSZE_JEDEN}</Text>
      </>
    );
  }
  const d = props.dane;
  return (
    <>
      <Fakt tytul="Trafne to nie jest to, co masz najsłabsze" podpis={TRAFNOSC_WZOR} />
      <Text style={styles.etykieta}>{`Twoje obszary trafne — ${d.trafne.size} z ${d.obszary.length}`}</Text>
      {d.obszary.map((o) => {
        const trafny = o.trafny !== null;
        return (
          <View key={o.obszar} style={styles.obszar}>
            <Text style={[styles.obszarNazwa, trafny ? styles.obszarTrafny : null]}>
              {props.etykiety[o.obszar] === undefined ? o.obszar : props.etykiety[o.obszar]}
            </Text>
            <Text style={styles.obszarLiczby}>
              {`wynik ${o.wynik} · ${o.zwrot === null ? 'zwrotu nie znam — nie znam wagi tego obszaru na Twojej pozycji' : `zwrot ${Math.round(o.zwrot)}`}${trafny ? ' · trafny' : ''}`}
            </Text>
          </View>
        );
      })}
      <Text style={styles.czegoNieMa}>{TRAFNOSC_REMIS}</Text>
      <Text style={styles.etykieta}>Co robisz dodatkowo</Text>
      {d.praca.length === 0
        ? <Fakt tytul="Nie powiedziałeś jeszcze, co robisz dodatkowo" podpis={PRACA_DODATKOWA_WEJSCIE} />
        : d.praca.map((r) => (
          <View key={r.rodzaj} style={styles.obszar}>
            <Text style={[styles.obszarNazwa, r.trafia ? styles.obszarTrafny : null]}>{r.rodzaj}</Text>
            <Text style={styles.obszarLiczby}>
              {r.znany
                ? `${r.obszary.map((o) => (props.etykiety[o] === undefined ? o : props.etykiety[o])).join(' · ')} — ${r.trafia ? 'trafia' : 'nie trafia dziś w Twój największy zwrot'}`
                : 'nie znam tego rodzaju pracy — nie zgadujemy, w co celuje'}
            </Text>
          </View>
        ))}
      <Text style={styles.czegoNieMa}>{TRAFNOSC_ZAWSZE_JEDEN}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  pelny: { flex: 1, backgroundColor: colors.background },
  naglowek: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  zamknij: { minHeight: 28, justifyContent: 'center' },
  zamknijTekst: { ...typography.bodyMedium, fontSize: 13, color: colors.brand },
  naglowekTytul: { ...typography.display, fontSize: 22, color: colors.textPrimary, marginTop: 2 },
  wejscie: {
    flexDirection: 'row', alignItems: 'center', minHeight: minTouchHeight,
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.md,
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8,
  },
  wejscieTytul: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  wejsciePodpis: { ...typography.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  strzalka: { fontSize: 20, color: colors.textSecondary, marginLeft: 8 },
  fakt: { marginBottom: 12 },
  faktTytul: { ...typography.bodySemiBold, fontSize: 14, color: colors.textPrimary },
  faktPodpis: { ...typography.body, fontSize: 12, color: colors.textSecondary, marginTop: 3, lineHeight: 17 },
  etykieta: {
    ...typography.bodyMedium, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
    color: colors.textTertiary, marginTop: 8, marginBottom: 6,
  },
  obszar: { marginBottom: 8 },
  obszarNazwa: { ...typography.body, fontSize: 13, color: colors.textSecondary },
  obszarTrafny: { ...typography.bodySemiBold, color: colors.textPrimary },
  obszarLiczby: { ...typography.body, fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  wyloguj: { marginTop: spacing.md, minHeight: minTouchHeight, justifyContent: 'center', alignItems: 'center' },
  wylogujTekst: { ...typography.body, fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline' },
  czegoNieMa: { ...typography.body, fontSize: 11, color: colors.textTertiary, marginTop: 10, lineHeight: 16 },
});

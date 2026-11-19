import { EXALT, NATURAL_BENEFICS, NATURAL_MALEFICS, OWN, houseFrom, kendra, mod, navamsa, sign, trine } from "./constants";
import { associated, brahma, charaKarakas, isExalted, lordOf, planetLongitudes, planetSigns, signRanks, signStrength } from "./core";
import type { PlanetPositions } from "./constants";
import type { ArgalaHouse } from "./argala";

export interface YogaInput {
  lagnaLongitude: number;
  planets: PlanetPositions;
  scheme: 7 | 8;
  arudhas: number[];
  kk: number;
  brahma: number;
  horaLagna: number;
  ghatiLagna: number;
  induLagna: number;
  argalaLagna: ArgalaHouse[];
  argalaTenth: ArgalaHouse[];
}

export interface Yoga {
  id: string;
  category: string;
  name: string;
  present: boolean;
  meaning: string;
}

export function yoga(
  id: string,
  category: string,
  name: string,
  present: boolean,
  meaning: string,
): Yoga {
  return { id, category, name, present, meaning };
}

export function yogas(input: YogaInput): Yoga[] {
  const longs = planetLongitudes(input.planets);
  const rasi = planetSigns(input.planets);
  const nav = longs.map(navamsa);
  const lagna = sign(input.lagnaLongitude);
  const AL = input.arudhas[0];
  const A7 = input.arudhas[6];
  const UL = input.arudhas[11];
  const karakas = charaKarakas(input.planets, input.scheme);
  const ak = karakas.find((k) => k.name === "AK")?.planet ?? 0;
  const amk = karakas.find((k) => k.name === "AmK")?.planet ?? 0;
  const dk = karakas.find((k) => k.name === "DK")?.planet ?? 0;
  const lagnaLord = lordOf(lagna, input.planets);
  const fifthLord = lordOf(mod(lagna + 4, 12), input.planets);
  const tenthLord = lordOf(mod(lagna + 9, 12), input.planets);
  const seventhLord = lordOf(mod(lagna + 6, 12), input.planets);
  const rasiSign = (p: number) => rasi[p] ?? 0;
  const navSign = (p: number) => nav[p] ?? 0;

  const akAmkAssociated = associated(rasiSign(ak), rasiSign(amk));
  const akPk = karakas.find((k) => k.name === "PK")?.planet;
  const akPkAssociated = akPk === undefined ? false : associated(rasiSign(ak), rasiSign(akPk));

  const beneficKK = NATURAL_BENEFICS.some((p) => {
    const ns = navSign(p);
    return ns === input.kk || kendra(input.kk, ns);
  });

  const alA7Kendra = kendra(AL, A7);
  const exaltedInAlKendra = Array.from({ length: 9 }, (_, p) => p).some((p) =>
    kendra(AL, rasiSign(p)) && isExalted(p as 0, input.planets));
  const juVeAlKendra = [4, 5].some((p) => kendra(AL, rasiSign(p)));
  const akAlKendraOrTrine = kendra(AL, rasiSign(ak)) || trine(AL, rasiSign(ak));
  const maleficsThird = [0, 2, 6, 7, 8].filter((p) => houseFrom(rasiSign(p), AL) === 3).length;
  const maleficsSixth = [0, 2, 6, 7, 8].filter((p) => houseFrom(rasiSign(p), AL) === 6).length;

  const akAmkConjunct = rasiSign(ak) === rasiSign(amk);
  const akAmkKendra = kendra(rasiSign(ak), rasiSign(amk));
  const akAmkTrine = trine(rasiSign(ak), rasiSign(amk));
  const akAmkSixEight = [6, 8].includes(houseFrom(rasiSign(amk), rasiSign(ak)))
    || [6, 8].includes(houseFrom(rasiSign(ak), rasiSign(amk)));

  const amkHouse = houseFrom(rasiSign(amk), lagna);
  const amkAspectsTenth = (() => {
    const tenth = mod(lagna + 9, 12);
    return associated(rasiSign(amk), tenth);
  })();
  const amk10Lord = associated(rasiSign(amk), rasiSign(tenthLord));
  const amkAlKendra = kendra(AL, rasiSign(amk));

  const dkAkKendra = kendra(rasiSign(dk), rasiSign(ak));
  const dkNaturalBenefic = NATURAL_BENEFICS.includes(dk as 1 | 3 | 4 | 5);
  const dkDusthana = [6, 8, 12].includes(houseFrom(rasiSign(dk), lagna));

  const beneficSecondAL = NATURAL_BENEFICS.some((p) => houseFrom(rasiSign(p), AL) === 2);
  const anyEleventhAL = rasi.map((s, p) => houseFrom(s, AL) === 11 ? p : -1).filter((p) => p >= 0).length > 0;
  const eleventhCount = rasi.filter((s) => houseFrom(s, AL) === 11).length;
  const twelfthCount = rasi.filter((s) => houseFrom(s, AL) === 12).length;
  const secondFromAL = mod(AL + 1, 12);
  const eleventhFromAL = mod(AL + 10, 12);
  const juSecondOr11 = associated(rasiSign(4), secondFromAL)
    || associated(rasiSign(4), eleventhFromAL);
  const hlSign = sign(input.horaLagna);
  const hlLagLordAssociated = associated(hlSign, rasiSign(lagnaLord));
  const beneficIndu = NATURAL_BENEFICS.some((p) => rasiSign(p) === sign(input.induLagna));

  const ketuInKK = navSign(8) === input.kk;
  const juInKK = navSign(4) === input.kk;
  const beneficIn12KK = NATURAL_BENEFICS.some((p) => houseFrom(navSign(p), input.kk) === 12);
  const ketuIn12KK = houseFrom(navSign(8), input.kk) === 12;
  const sunInKK = navSign(0) === input.kk;

  const ketu12AndJu = ketuIn12KK && associated(navSign(4), mod(input.kk + 11, 12));
  const saturnD9InKkOr12 = navSign(6) === input.kk || houseFrom(navSign(6), input.kk) === 12;
  const pravrajya = new Map<number, number>();
  rasi.forEach((s) => pravrajya.set(s, (pravrajya.get(s) ?? 0) + 1));
  const fourInOneSign = Array.from(pravrajya.values()).some((count) => count >= 4);
  const moonSaturnKK = navSign(1) === input.kk && associated(navSign(1), navSign(6));

  const sunMars10LagOrAL = [0, 2].some((p) =>
    houseFrom(rasiSign(p), lagna) === 10 || houseFrom(rasiSign(p), AL) === 10);
  const rahuThirdOrSixthAL = [3, 6].includes(houseFrom(rasiSign(7), AL));
  const akExaltedOrOwn = isExalted(ak as 0, input.planets)
    || ((OWN[ak as keyof typeof OWN] ?? []) as readonly number[]).includes(rasiSign(ak));
  const amkKendraLag = kendra(lagna, rasiSign(amk));
  const glSign = sign(input.ghatiLagna);
  const glLagAl = associated(glSign, lagna) || associated(glSign, AL);

  const lagnaArgala = input.argalaLagna.length ? input.argalaLagna[0].net > 0 : false;
  const tenthArgala = input.argalaTenth.length ? input.argalaTenth[0].net > 0 : false;
  const lagnaStrongest = signRanks(input.planets)[lagna] === 1;

  return [
    yoga("raja-ak-amk", "Raja Yoga", "AK–AmK associated", akAmkAssociated, "The two primary karakas support the soul and career."),
    yoga("raja-ak-pk", "Raja Yoga", "AK–PK associated", akPkAssociated, "The soul and intelligence karaka work together."),
    yoga("raja-ak-fifth", "Raja Yoga", "AK associated with the 5th lord", associated(rasiSign(ak), rasiSign(fifthLord)), "Purva punya supports the soul."),
    yoga("raja-lagna-fifth", "Raja Yoga", "Lagna lord associated with 5th lord", associated(rasiSign(lagnaLord), rasiSign(fifthLord)), "Self and intelligence lord combine."),
    yoga("raja-lagna-seventh", "Raja Yoga", "Lagna lord associated with 7th lord", associated(rasiSign(lagnaLord), rasiSign(seventhLord)), "Self and partnership are mutually connected."),
    yoga("raja-benefic-kk", "Raja Yoga", "Benefic navamsa in KK or kendra from KK", beneficKK, "A natural benefic strengthens the karakamsha."),

    yoga("arudha-raja-al-a7", "Arudha Raja Yoga", "AL and A7 in mutual kendra", alA7Kendra, "Public image and partnership support status."),
    yoga("arudha-raja-exalted", "Arudha Raja Yoga", "Exalted planet in kendra from AL", exaltedInAlKendra, "Exaltation strengthens the outer image."),
    yoga("arudha-raja-ju-ve", "Arudha Raja Yoga", "Jupiter or Venus in kendra from AL", juVeAlKendra, "A benefic in a kendra supports status."),
    yoga("arudha-raja-ak", "Arudha Raja Yoga", "AK in kendra or trine from AL", akAlKendraOrTrine, "The soul karaka supports public standing."),
    yoga("arudha-raja-malefics", "Arudha Raja Yoga", "Malefics in both 3rd and 6th from AL", maleficsThird > 0 && maleficsSixth > 0, "Malefics are active in effort and service houses."),

    yoga("ak-amk-conjunct", "AK–AmK", "Conjunct", akAmkConjunct, "AK and AmK occupy the same sign."),
    yoga("ak-amk-kendra", "AK–AmK", "Mutual kendra", akAmkKendra, "AK and AmK are mutually angular."),
    yoga("ak-amk-trine", "AK–AmK", "Mutual trine", akAmkTrine, "AK and AmK are mutually trinal."),
    yoga("ak-amk-dusthana", "AK–AmK", "In 6/8 from each other (negative)", akAmkSixEight, "AK and AmK are separated by 6th or 8th positions."),

    yoga("amk-tenth-house", "AmK and 10th house", "AmK in 10th house", amkHouse === 10, "AmK lies in the career house."),
    yoga("amk-tenth-aspect", "AmK and 10th house", "AmK aspects 10th sign", amkAspectsTenth, "AmK's sign aspect reaches the 10th."),
    yoga("amk-tenth-lord", "AmK and 10th house", "AmK associated with 10th lord", amk10Lord, "AmK and the career lord are associated."),
    yoga("amk-al-kendra", "AmK and 10th house", "AmK in kendra from AL", amkAlKendra, "AmK is angular from Arudha Lagna."),

    yoga("dk-ak-associated", "Darakaraka", "DK associated with AK", associated(rasiSign(dk), rasiSign(ak)), "DK and AK mutually support the chart."),
    yoga("dk-ak-kendra", "Darakaraka", "DK in kendra from AK", dkAkKendra, "DK is angular from AK."),
    yoga("dk-benefic", "Darakaraka", "DK is natural benefic", dkNaturalBenefic, "The spouse karaka is naturally benefic."),
    yoga("dk-dusthana", "Darakaraka", "DK in 6th, 8th or 12th (negative)", dkDusthana, "DK occupies a challenging house."),

    yoga("wealth-second-al", "Wealth", "Benefic in 2nd from AL", beneficSecondAL, "A benefic strengthens family wealth."),
    yoga("wealth-eleventh-al", "Wealth", "Any planet in 11th from AL", anyEleventhAL, "Income is indicated from the 11th."),
    yoga("wealth-income", "Wealth", "11th planets exceed 12th", eleventhCount > twelfthCount, "Income exceeds expenditure."),
    yoga("wealth-ju-ve", "Wealth", "Jupiter/Venus associated with 2nd or 11th from AL", juSecondOr11, "A benefic links with income houses."),
    yoga("wealth-hl-lord", "Wealth", "Hora Lagna associated with Lagna lord", hlLagLordAssociated, "Wealth lagna connects to the main lagna lord."),
    yoga("wealth-indu", "Wealth", "Benefic in Indu Lagna", beneficIndu, "A natural benefic strengthens Indu Lagna."),

    yoga("spiritual-ketu-kk", "Spiritual (D9)", "Ketu in KK", ketuInKK, "Ketu in the navamsa KK indicates detachment."),
    yoga("spiritual-jupiter-kk", "Spiritual (D9)", "Jupiter in KK", juInKK, "Jupiter at KK gives wisdom."),
    yoga("spiritual-benefic-12", "Spiritual (D9)", "Benefic in 12th from KK", beneficIn12KK, "A benefic protects the path of moksha."),
    yoga("spiritual-ketu-12", "Spiritual (D9)", "Ketu in 12th from KK", ketuIn12KK, "Ketu indicates renunciation."),
    yoga("spiritual-sun-kk", "Spiritual (D9)", "Sun in KK", sunInKK, "Sun at KK gives spiritual authority."),

    yoga("renunciation-ketu-ju", "Renunciation", "Ketu in 12th from KK and Jupiter associated", ketu12AndJu, "Jupiter and Ketu support moksha."),
    yoga("renunciation-saturn", "Renunciation", "Saturn D9 in KK or 12th", saturnD9InKkOr12, "Saturn is placed at the threshold of renunciation."),
    yoga("renunciation-pravrajya", "Renunciation", "4 or more planets in one sign", fourInOneSign, "A concentration of planets suggests pravrajya."),
    yoga("renunciation-moon-saturn", "Renunciation", "Moon D9 in KK with Saturn associated", moonSaturnKK, "Saturn and the Moon support detachment."),

    yoga("political-sun-mars", "Political power", "Sun/Mars in 10th from Lagna or AL", sunMars10LagOrAL, "Sun or Mars in a status house indicates power."),
    yoga("political-rahu", "Political power", "Rahu in 3rd or 6th from AL", rahuThirdOrSixthAL, "Rahu in effort houses favours politics."),
    yoga("political-ak", "Political power", "AK exalted or in own sign", akExaltedOrOwn, "A strong AK sustains authority."),
    yoga("political-amk", "Political power", "AmK in kendra from Lagna", amkKendraLag, "AmK is angular and supports the career."),
    yoga("political-gl", "Political power", "Ghati Lagna associated with Lagna or AL", glLagAl, "Ghati Lagna links to self or public image."),

    yoga("sign-lagna-argala", "Sign-based", "Lagna has effective argala", lagnaArgala, "The Lagna has net positive Argala."),
    yoga("sign-tenth-argala", "Sign-based", "10th house has effective argala", tenthArgala, "The 10th has net positive Argala."),
    yoga("sign-strongest", "Sign-based", "Lagna is strongest sign", lagnaStrongest, "The Lagna sign has the highest rank."),
  ];
}

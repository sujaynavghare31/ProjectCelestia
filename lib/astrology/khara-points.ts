export interface ZodiacPosition {
  sign: number;
  degree: number;
}

function normalizeSign(sign: number) {
  return ((sign % 12) + 12) % 12;
}

export function calculateKharaPoints(position: ZodiacPosition) {
  const sign = normalizeSign(position.sign);
  const navamsaIndex = Math.min(8, Math.floor(position.degree / (30 / 9)));
  const navamsaStart = sign % 3 === 0 ? sign : sign % 3 === 1 ? sign + 8 : sign + 4;
  const navamsaSign = normalizeSign(navamsaStart + navamsaIndex);
  const drekkanaIndex = Math.min(2, Math.floor(position.degree / 10));
  const drekkanaSign = normalizeSign(sign + drekkanaIndex * 4);

  return {
    navamsaSign,
    sixtyFourthNavamsaSign: normalizeSign(navamsaSign + 7),
    drekkanaSign,
    twentySecondDrekkanaSign: normalizeSign(drekkanaSign + 7),
  };
}

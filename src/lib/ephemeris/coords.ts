const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function trueObliquity(julianDayTt: number): number {
  const t = (julianDayTt - 2_451_545) / 36_525;
  const mean = 23 + 26 / 60 + (21.448 - 46.815 * t - 0.00059 * t ** 2 + 0.001813 * t ** 3) / 3600;
  const omega = (125.04452 - 1934.136261 * t + 0.0020708 * t ** 2 + t ** 3 / 450_000) * DEG_TO_RAD;
  const sunLongitude = (280.4665 + 36_000.7698 * t) * DEG_TO_RAD;
  const moonLongitude = (218.3165 + 481_267.8813 * t) * DEG_TO_RAD;
  const deltaPsiArcseconds = -17.20 * Math.sin(omega) - 1.32 * Math.sin(2 * sunLongitude)
    - 0.23 * Math.sin(2 * moonLongitude) + 0.21 * Math.sin(2 * omega);
  const deltaEpsilonArcseconds = 9.20 * Math.cos(omega) + 0.57 * Math.cos(2 * sunLongitude)
    + 0.10 * Math.cos(2 * moonLongitude) - 0.09 * Math.cos(2 * omega);
  return mean + deltaEpsilonArcseconds / 3600;
}

export interface EquatorialCoordinates {
  rightAscension: number;
  declination: number;
  outOfBounds: boolean;
}

export function eclipticToEquatorial(
  longitude: number,
  latitude: number,
  julianDayTt: number,
): EquatorialCoordinates {
  const lambda = normalizeDegrees(longitude) * DEG_TO_RAD;
  const beta = latitude * DEG_TO_RAD;
  const epsilonDegrees = trueObliquity(julianDayTt);
  const epsilon = epsilonDegrees * DEG_TO_RAD;
  const sinDeclination = Math.sin(beta) * Math.cos(epsilon)
    + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda);
  const declination = Math.asin(Math.max(-1, Math.min(1, sinDeclination))) * RAD_TO_DEG;
  const rightAscension = normalizeDegrees(
    Math.atan2(
      Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon),
      Math.cos(lambda),
    ) * RAD_TO_DEG,
  );
  return {
    rightAscension,
    declination,
    outOfBounds: Math.abs(declination) > epsilonDegrees,
  };
}

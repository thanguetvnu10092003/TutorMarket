const COUNTRY_CODE_EXCLUSIONS = new Set([
  'AC',
  'CP',
  'CQ',
  'DG',
  'EA',
  'EU',
  'EZ',
  'IC',
  'TA',
  'UN',
  'XA',
  'XB',
  'ZZ',
]);

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Ho_Chi_Minh',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
];

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
};

export type TimeZoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
};

function createAlpha2Codes() {
  const codes: string[] = [];

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      codes.push(String.fromCharCode(first, second));
    }
  }

  return codes;
}

const ALL_ALPHA2_CODES = createAlpha2Codes();

export function countryCodeToFlag(code?: string | null) {
  if (!code || code.length !== 2) {
    return '';
  }

  return code
    .toUpperCase()
    .split('')
    .map((character) => String.fromCodePoint(character.charCodeAt(0) + 127397))
    .join('');
}

let cachedCountries: CountryOption[] | null = null;

export function getCountryOptions(locale = 'en-US') {
  if (cachedCountries) {
    return cachedCountries;
  }

  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  const options = ALL_ALPHA2_CODES
    .filter((code) => !COUNTRY_CODE_EXCLUSIONS.has(code))
    .map((code) => ({
      code,
      name: displayNames.of(code) || code,
      flag: countryCodeToFlag(code),
    }))
    .filter((country) => {
      if (!country.name || country.name === country.code) {
        return false;
      }

      const normalized = country.name.toLowerCase();
      return !normalized.includes('unknown');
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  cachedCountries = options;
  return options;
}

function getOffsetMinutes(timeZone: string, referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = formatter.formatToParts(referenceDate);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const utcTime = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return Math.round((utcTime - referenceDate.getTime()) / 60000);
}

function formatOffsetLabel(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absoluteMinutes % 60).toString().padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

let cachedTimeZones: TimeZoneOption[] | null = null;

export function getTimeZoneOptions() {
  if (cachedTimeZones) {
    return cachedTimeZones;
  }

  const timeZones =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIMEZONES;

  cachedTimeZones = timeZones
    .map((value) => {
      const offsetMinutes = getOffsetMinutes(value);
      return {
        value,
        label: `${value} (${formatOffsetLabel(offsetMinutes)})`,
        offsetMinutes,
      };
    })
    .sort((left, right) => {
      if (left.offsetMinutes !== right.offsetMinutes) {
        return left.offsetMinutes - right.offsetMinutes;
      }

      return left.value.localeCompare(right.value);
    });

  return cachedTimeZones;
}

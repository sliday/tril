function celsiusToFahrenheit(value) {
  const n = Number(value);
  return n * 9 / 5 + 32;
}

function fahrenheitToCelsius(value) {
  const n = Number(value);
  return (n - 32) * 5 / 9;
}

function kmToMiles(value) {
  const n = Number(value);
  return n * 0.621371;
}

function milesToKm(value) {
  const n = Number(value);
  return n / 0.621371;
}

function kgToLbs(value) {
  const n = Number(value);
  return n * 2.20462;
}

function lbsToKg(value) {
  const n = Number(value);
  return n / 2.20462;
}

const converters = {
  'celsius-fahrenheit': celsiusToFahrenheit,
  'fahrenheit-celsius': fahrenheitToCelsius,
  'km-miles': kmToMiles,
  'miles-km': milesToKm,
  'kg-lbs': kgToLbs,
  'lbs-kg': lbsToKg,
};

function convert(value, from, to) {
  const key = `${from}-${to}`;
  const fn = converters[key];
  if (!fn) return { error: `Unknown conversion: ${from} to ${to}` };
  const result = fn(value);
  return { value: result, from, to };
}

module.exports = {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kmToMiles,
  milesToKm,
  kgToLbs,
  lbsToKg,
  convert,
};

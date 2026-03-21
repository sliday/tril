const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kmToMiles,
  milesToKm,
  kgToLbs,
  lbsToKg,
  convert,
} = require('../converter');

function approx(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `Expected ~${expected}, got ${actual}`
  );
}

describe('celsiusToFahrenheit', () => {
  it('converts 0C to 32F', () => assert.equal(celsiusToFahrenheit(0), 32));
  it('converts 100C to 212F', () => assert.equal(celsiusToFahrenheit(100), 212));
  it('converts -40C to -40F', () => assert.equal(celsiusToFahrenheit(-40), -40));
  it('handles decimals', () => approx(celsiusToFahrenheit(37.5), 99.5));
  it('returns NaN for non-numeric', () => assert.ok(Number.isNaN(celsiusToFahrenheit('abc'))));
});

describe('fahrenheitToCelsius', () => {
  it('converts 32F to 0C', () => assert.equal(fahrenheitToCelsius(32), 0));
  it('converts 212F to 100C', () => assert.equal(fahrenheitToCelsius(212), 100));
  it('converts -40F to -40C', () => assert.equal(fahrenheitToCelsius(-40), -40));
});

describe('kmToMiles', () => {
  it('converts 1km', () => approx(kmToMiles(1), 0.621371));
  it('converts 0', () => assert.equal(kmToMiles(0), 0));
  it('converts 100km', () => approx(kmToMiles(100), 62.1371));
});

describe('milesToKm', () => {
  it('converts 1mi', () => approx(milesToKm(1), 1.60934));
  it('converts 0', () => assert.equal(milesToKm(0), 0));
});

describe('kgToLbs', () => {
  it('converts 1kg', () => approx(kgToLbs(1), 2.20462));
  it('converts 0', () => assert.equal(kgToLbs(0), 0));
});

describe('lbsToKg', () => {
  it('converts 1lb', () => approx(lbsToKg(1), 0.45359));
  it('converts 0', () => assert.equal(lbsToKg(0), 0));
});

describe('convert', () => {
  it('celsius to fahrenheit', () => {
    const r = convert(100, 'celsius', 'fahrenheit');
    assert.equal(r.value, 212);
  });
  it('unknown conversion returns error', () => {
    const r = convert(1, 'celsius', 'km');
    assert.ok(r.error);
  });
});

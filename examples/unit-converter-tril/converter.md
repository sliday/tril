---
source: converter.js
functions: [celsiusToFahrenheit, fahrenheitToCelsius, kmToMiles, milesToKm, kgToLbs, lbsToKg, convert]
dependencies: []
---
# converter

## celsiusToFahrenheit

**Purpose:** Converts a temperature value from Celsius to Fahrenheit.

**Inputs:**
- value (any): The temperature in Celsius; accepts numbers, numeric strings, or any value coercible to a number.

**Behaviour:**
1. Coerce `value` to a number using `Number()`.
2. Multiply the result by 9/5.
3. Add 32 to obtain the Fahrenheit equivalent.
4. Return the computed value.

**Output:** number — The temperature converted to Fahrenheit, or `NaN` if the input cannot be coerced to a valid number.

**Edge cases:**
- Non-numeric strings (e.g. `"abc"`) are coerced to `NaN`, causing the return value to also be `NaN`.
- `null` coerces to `0`, so `celsiusToFahrenheit(null)` returns `32`.
- `undefined` coerces to `NaN`, returning `NaN`.
- Negative values (e.g. `-40`) are handled correctly; `-40°C` equals `-40°F`.
- Decimal values (e.g. `36.6`) are supported with full floating-point precision.

**Examples:**
- `0` → `32`
- `100` → `212`
- `-40` → `-40`

## fahrenheitToCelsius

**Purpose:** Converts a temperature value from Fahrenheit to Celsius.

**Inputs:**
- value (any): The temperature in Fahrenheit; can be a number, numeric string, or any value coercible to a number.

**Behaviour:**
1. Convert `value` to a number using `Number()`.
2. Subtract 32 from the result.
3. Multiply by 5.
4. Divide by 9.
5. Return the final result.

**Output:** number — The equivalent temperature in Celsius.

**Edge cases:**
- Non-numeric input (e.g. `"abc"`) produces `NaN`.
- String numbers (e.g. `"212"`) are accepted and converted correctly.
- `null` coerces to `0`, so `fahrenheitToCelsius(null)` returns approximately `-17.78`.

**Examples:**
- `212` → `100`
- `32` → `0`
- `"98.6"` → `37`

## kmToMiles

**Purpose:** Converts a distance value from kilometres to miles.

**Inputs:**
- value (any): The distance in kilometres to convert.

**Behaviour:**
1. Cast `value` to a number using `Number()`.
2. Multiply the result by the conversion factor `0.621371`.
3. Return the product.

**Output:** number — The equivalent distance in miles.

**Edge cases:**
- Non-numeric input (e.g. a string like `"abc"`) produces `NaN`.
- Negative values are accepted and return a negative result.
- `0` returns `0`.

**Examples:**
- `1` → `0.621371`
- `100` → `62.1371`
- `"abc"` → `NaN`

## milesToKm

**Purpose:** Converts a distance value from miles to kilometres.

**Inputs:**
- value (any): The distance in miles to convert; coerced to a number internally.

**Behaviour:**
1. Cast `value` to a number using `Number()`.
2. Divide the result by the conversion factor `0.621371` to produce kilometres.

**Output:** number — The equivalent distance in kilometres.

**Edge cases:**
- Non-numeric input (e.g. a string that isn't a valid number) returns `NaN`.
- Negative values are accepted and return a negative kilometre value.
- `0` returns `0`.

**Examples:**
- `1` → `1.609344` (approximately)
- `26.2188` → `42.195` (approximately, a marathon)
- `0` → `0`

## kgToLbs

**Purpose:** Converts a mass value from kilograms to pounds.

**Inputs:**
- value (any): The mass in kilograms to convert, coerced to a number.

**Behaviour:**
1. Cast `value` to a number using `Number()`.
2. Multiply the result by the conversion factor `2.20462`.

**Output:** number — The equivalent mass in pounds.

**Edge cases:**
- Non-numeric input (e.g. a string like `"abc"`) produces `NaN`.
- Negative values are accepted and produce a negative pound value.
- `0` returns `0`.

**Examples:**
- `1` → `2.20462`
- `100` → `220.462`
- `0` → `0`

## lbsToKg

**Purpose:** Converts a weight value from pounds to kilograms.

**Inputs:**
- value (any): The weight in pounds to convert; coerced to a number internally.

**Behaviour:**
1. Cast `value` to a number using `Number(value)`, storing the result in `n`.
2. Divide `n` by the conversion factor `2.20462` to produce the equivalent weight in kilograms.

**Output:** number — The weight converted to kilograms.

**Edge cases:**
- Non-numeric strings (e.g. `"abc"`) are coerced to `NaN`, and the result will be `NaN`.
- `null` and empty string `""` are coerced to `0`, returning `0`.
- Negative values are accepted and return a negative kilogram result.

**Examples:**
- `2.20462` → `1`
- `0` → `0`
- `220.462` → `100`

## convert

**Purpose:** Dispatches a value through a named conversion function looked up by source and target unit.

**Inputs:**
- `value` (any): The value to convert, passed directly to the converter function.
- `from` (string): The source unit (e.g. `"celsius"`, `"km"`, `"kg"`).
- `to` (string): The target unit (e.g. `"fahrenheit"`, `"miles"`, `"lbs"`).

**Behaviour:**
1. Constructs a lookup key by joining `from` and `to` with a hyphen (e.g. `"celsius-fahrenheit"`).
2. Looks up the key in the `converters` map to retrieve the corresponding converter function.
3. If no converter is found for that key, returns an error object immediately.
4. Otherwise, calls the converter function with `value` and captures the result.
5. Returns a result object containing the converted value, the source unit, and the target unit.

**Output:** object — Either `{ value, from, to }` on success, or `{ error }` on failure.

**Edge cases:**
- If `from` or `to` is unknown or the combination is unsupported, returns `{ error: "Unknown conversion: <from> to <to>" }` instead of a result.
- `value` is not coerced or validated by `convert` itself; coercion (via `Number()`) happens inside each individual converter function.
- Reverse conversions (e.g. `"miles-km"`) require their own separate entry in `converters`; the function does not auto-invert.

**Examples:**
- `convert(100, "celsius", "fahrenheit")` → `{ value: 212, from: "celsius", to: "fahrenheit" }`
- `convert(10, "km", "miles")` → `{ value: 6.21371, from: "km", to: "miles" }`
- `convert(50, "usd", "eur")` → `{ error: "Unknown conversion: usd to eur" }`
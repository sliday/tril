---
source: server.js
type: server
routes: [POST /convert]
dependencies: [express, path]
---
# server

HTTP server for the application.

### POST /convert

**Purpose:** Converts a numeric value from one unit to another (e.g., temperature, distance, weight) using the appropriate conversion function.

**Request:** Expects a JSON body with three fields: `value` (the numeric amount to convert), `from` (the source unit), and `to` (the target unit).

**Process:**
1. Destructures `value`, `from`, and `to` from the request body.
2. If any of the three fields are missing, returns a 400 error with a JSON error message.
3. Calls `convert(value, from, to)`, which dispatches to the appropriate conversion function (e.g., `celsiusToFahrenheit`, `fahrenheitToCelsius`, `kmToMiles`, `milesToKm`, `kgToLbs`, or `lbsToKg`) based on the `from` and `to` parameters.
4. Returns the result of `convert` as a JSON response.

**Response:** On success, returns a JSON object containing the conversion result. On failure (missing fields), returns HTTP 400 with `{ error: 'Missing value, from, or to' }`.
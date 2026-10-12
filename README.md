# Branch Location API

REST API for storing and querying branch locations. Built with TypeScript and AWS CDK (API Gateway + Lambda + DynamoDB).

During location creation or location update, the API looks up its coordinates using Nominatim and stores `latitude`/`longitude` (as per the task requirement) with the record.

## Endpoints

All requests need an `x-api-key` header.

| Method | Path | Description |
|---|---|---|
| POST   | `/locations`       | Create a location (201)          |
| GET    | `/locations`       | List all locations               |
| GET    | `/locations/{id}`  | Get a location by ID             |
| PUT    | `/locations/{id}`  | Update a location (full replace) |

Example body for POST/PUT:

```json
{ "locationName": "Leeds Branch", "city": "Leeds", "state": "West Yorkshire", "country": "UK" }
```

`state` field is optional. Coordinates can't be sent by the client, they always come from the geocoder. Any additional fields in the payload will result in a validation error.

Errors come back as `{ "error": { "code", "message", "details?" } }`:

- `400` invalid JSON, invalid fields or a non-UUID ID
- `404` location not found
- `422` request is valid but the address couldn't be geocoded
- `502` Nominatim is down or returned something unexpected
- `500` anything else (logged, not returned)

## Running it

Needs Node 20+, the AWS CLI and a CDK bootstrapped account.

```bash
npm install
npm test
npx cdk deploy
```

Deploy outputs `ApiUrl` and `ApiKeyId`. Get the key value with:

```bash
aws apigateway get-api-key --api-key <ApiKeyId> --include-value --query value --output text
```

```bash
curl -X POST "<ApiUrl>locations" -H "x-api-key: <key>" -H "Content-Type: application/json" \
  -d '{"locationName":"Leeds Branch","city":"Leeds","state":"West Yorkshire","country":"UK"}'
```

Alternatively, use the Test tab on each method in the API Gateway console (this bypasses the API key).

`npx cdk destroy` removes everything.

## Folder Structure

```
lib/                CDK stack
src/handlers/       one Lambda per endpoint - parse request, call service, map errors
src/domain/         service logic, Zod validation, types, errors
src/services/       Nominatim geocoder
src/repositories/   DynamoDB access
src/dependencies.ts wires the real dependencies together
test/unit/          unit tests for each layer
test/infra/         CDK assertion tests
```

## Decisions Made

- DynamoDB over Aurora - I considered Aurora since it's relational, but access is only by ID or list all, so it's a key-value fit. Aurora would mean a significant amount of time spent setting up additional resources such as a VPC, NAT/Data API, secrets and migrations, which would take longer than the time given for this task. `list` (all locations) follows `LastEvaluatedKey` so it returns everything past the 1MB scan limit.

- Dependency injection - the geocoder takes fetch, the repository takes the DynamoDB client, the service takes the geocoder and repository, and handlers take the service. This makes testing easy as jest.fn() stubs can be passed in, instead of mocking globals. The real ones are created once in dependencies.ts so they're not recreated on every Lambda call.

- 422 for geocode failures - the request itself is fine so it's not a 400, and 404 would suggest the record is missing. 502 is kept for when Nominatim is actually unavailable.

- PUT is a full replace - leaving out `state` removes it. Update checks the record exists first (404 before calling Nominatim) and keeps `createdAt`. Writes use `attribute_exists` / `attribute_not_exists` conditions so update can't create and create can't overwrite.

- Least-privilege IAM - each Lambda only gets the DynamoDB action it needs (create: PutItem, get: GetItem, list: Scan, update: GetItem + PutItem), and the infra tests check this.

- Nominatim - sends a User-Agent as their usage policy asks, uses a 3s timeout, and validates the response before storing anything.

## Testing the deployment

Deployed to my own AWS account and tested every endpoint (success and error cases) through the API Gateway console.

Happy path responses from the deployed API:

`POST /locations` → `201`

```json
{
  "locationId": "94ba4bc0-0e92-4b4f-b524-a535f4ef3b45",
  "locationName": "Leeds Branch",
  "city": "Leeds",
  "state": "West Yorkshire",
  "country": "UK",
  "latitude": 53.7974185,
  "longitude": -1.5437941,
  "createdAt": "2026-10-12T18:07:01.535Z",
  "updatedAt": "2026-10-12T18:07:01.535Z"
}
```

`GET /locations/94ba4bc0-0e92-4b4f-b524-a535f4ef3b45` → `200`

```json
{
  "city": "Leeds",
  "updatedAt": "2026-10-12T18:07:01.535Z",
  "locationName": "Leeds Branch",
  "longitude": -1.5437941,
  "createdAt": "2026-10-12T18:07:01.535Z",
  "locationId": "94ba4bc0-0e92-4b4f-b524-a535f4ef3b45",
  "latitude": 53.7974185,
  "country": "UK",
  "state": "West Yorkshire"
}
```

`PUT /locations/94ba4bc0-0e92-4b4f-b524-a535f4ef3b45` (Leeds → York) → `200`

```json
{
  "locationId": "94ba4bc0-0e92-4b4f-b524-a535f4ef3b45",
  "locationName": "York Branch",
  "city": "York",
  "state": "North Yorkshire",
  "country": "UK",
  "latitude": 53.9590555,
  "longitude": -1.0815361,
  "createdAt": "2026-10-12T18:07:01.535Z",
  "updatedAt": "2026-10-12T18:07:06.543Z"
}
```

`GET /locations` → `200` (other test records removed for brevity)

```json
{
  "items": [
    {
      "city": "York",
      "updatedAt": "2026-10-12T18:07:06.543Z",
      "locationName": "York Branch",
      "longitude": -1.0815361,
      "createdAt": "2026-10-12T18:07:01.535Z",
      "locationId": "94ba4bc0-0e92-4b4f-b524-a535f4ef3b45",
      "latitude": 53.9590555,
      "country": "UK",
      "state": "North Yorkshire"
    },
    {
      "city": "Dallas",
      "updatedAt": "2026-10-11T14:37:35.107Z",
      "longitude": -96.7968559,
      "locationName": "Dallas Branch",
      "createdAt": "2026-10-11T14:37:35.107Z",
      "locationId": "72b8500f-45ae-433b-aad4-d67697a083bf",
      "latitude": 32.7762719,
      "country": "US"
    }
  ]
}
```

## Making the API production-ready

- Cognito/JWT authoriser instead of a single API key
- CI/CD pipeline (lint, test, `cdk diff`) with dev/staging/prod stages
- Pagination on list (`limit` + `nextToken`), and a GSI on country/city if filtering is needed.
- Move to Aurora if relational queries are needed (e.g. reporting or joins with other data)
- `RETAIN` + deletion protection on the table (currently `DESTROY` so the stack tears down cleanly)
- Cache geocoding results, retry with backoff, respect Nominatim's 1 req/s limit.
- PATCH for partial updates and a DELETE endpoint
- CloudWatch alarms and a dashboard for 5xx, latency and throttling, structured logs
- WAF, custom domain, OpenAPI spec with request validation at the gateway
- Integration tests against a deployed dev stage, plus load testing

## AI Used For
- Test Scenarios gaps
- Formatting
- README structure/cleanup/typo checks
- Commands for testing the deployed API
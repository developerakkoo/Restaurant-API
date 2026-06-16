# Google Maps & Geocoding Setup (DropEat)

## Overview

DropEat uses **two separate Google API keys**:

| Key | Used by | Restrictions |
|-----|---------|--------------|
| Android Maps SDK key | `@capacitor/google-maps` in App-Restaurant (`environment.apiKey`, `AndroidManifest.xml`) | Android apps (package name + SHA-1) |
| Server Geocoding key | Restaurant-API `GET /user/reverse-geocode` | IP-restricted to EC2/server, or unrestricted with billing alerts |

Do **not** use the Android-restricted key for server-side Geocoding REST calls — Google returns `REQUEST_DENIED`.

## Google Cloud Console

1. Enable APIs on the project:
   - **Maps SDK for Android** (native map on Confirm Delivery Address)
   - **Geocoding API** (reverse geocode via backend proxy)
2. Create **Browser/Android key** for the mobile app (existing `environment.apiKey`).
3. Create **Server key** for the API only:
   - Application restriction: IP addresses (production EC2 elastic IP)
   - API restriction: Geocoding API only

## Restaurant-API environment

Add to production `.env` on the server (never commit the value):

```bash
GOOGLE_MAPS_API_KEY=your_server_geocoding_api_key
```

Restart the API after updating:

```bash
pm2 restart dropeat-api
# or: pm2 restart ecosystem.config.js --only dropeat-api
```

## Android app

Keep the existing key in:

- `App-Restaurant/android/app/src/main/AndroidManifest.xml` → `com.google.android.geo.API_KEY`
- `App-Restaurant/src/environments/environment.ts` → `apiKey` (Capacitor Google Maps only)

Reverse geocoding in the app calls DropEat API (`user/reverse-geocode`), not Google directly.

## Verification

```bash
# Replace TOKEN, LAT, LNG
curl -H "x-access-token: TOKEN" \
  "https://dropeat.techlapse.co.in/user/reverse-geocode?lat=19.0330&lng=73.0297"
```

Expected: `200` with `formattedAddress` and `pincode` when Geocoding API + billing are enabled.

## Physical Android E2E checklist

1. Fresh install → grant location → Tab1 **DELIVERING TO** shows address label within ~5s
2. Tap header → saved addresses load from API
3. **Use Current Location** → map renders → address resolves (not stuck on "Fetching address...")
4. Undeliverable pincode → address text visible + **Delivery Not Available**
5. Deliverable pincode → Proceed → save Home → Tab1 header updates immediately
6. Kill app → reopen → same address persisted
7. Deny location → graceful fallback; manual address path still works
8. Tab2 cart → change address → coordinates passed to address modal

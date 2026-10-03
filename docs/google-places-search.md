# Google Places search with a MapLibre map

## Goal

NearHere keeps MapLibre as the custom Night Arcade map renderer while replacing
the development-only public Nominatim search endpoint with Google Places Text
Search. Search quality and map rendering are separate concerns:

```text
Picker screen
  -> searchPlaces(query)
  -> Supabase Edge Function: place-search
  -> Google Places Text Search
  -> safe result: ID, label, latitude, longitude
  -> MapLibre moves its camera and NearHere draws the selected pin
```

The function does not return Google business metadata that NearHere does not
need, such as phone numbers, reviews, opening hours, photos, or user content.

## Why the Edge Function exists

An API key placed in `EXPO_PUBLIC_*` becomes part of the shipped mobile bundle.
Anyone can extract it. `GOOGLE_PLACES_API_KEY` instead belongs in Supabase Edge
Function secrets. The phone asks NearHere, and NearHere asks Google.

The Edge Function validates query length and coordinates, caps the response to
five results, requests a fixed Google field mask, applies a short upstream
timeout, and has a best-effort per-isolate request brake. A production launch
still needs a durable provider/gateway quota because Edge isolates are not a
global rate-limit database.

## Current implementation

| Layer | File | Responsibility |
| --- | --- | --- |
| Mobile provider switch | `apps/mobile/lib/place-search.ts` | Uses Nominatim in development by default. Uses the function only when the explicit provider switch is `google_places`. |
| Runtime boundary | `apps/mobile/lib/place-search-contract.ts` | Rejects malformed function responses before a picker can render them. |
| Server gateway | `supabase/functions/place-search/index.ts` | Holds the Google key, validates input, calls Google, and reduces the response to NearHere’s small contract. |
| UI | `app/location-picker.tsx`, `app/host/meeting-point.tsx` | Unchanged. Both screens already depend only on `searchPlaces`. |

## Owner setup required before activation

This needs the owner’s Google Cloud account and billing choice. Do not paste a
key into chat, Git, `.env.example`, or an `EXPO_PUBLIC_*` value.

1. Create a Google Cloud project, for example `NearHere Dev`.
2. Link a billing account and review current Google Maps Platform pricing.
3. Enable **Places API (New)**. Maps SDK for iOS is not needed while MapLibre
   remains the renderer.
4. Create a key restricted to the Places API. It is a server key, not an iOS
   client key.
5. Set the key and deploy the function from the repository root:

   ```sh
   npx supabase secrets set GOOGLE_PLACES_API_KEY='paste-the-key-locally'
   npx supabase functions deploy place-search
   ```

6. Locally set this non-secret switch, then restart Expo. A production build
   needs the same build-time value in its approved environment.

   ```sh
   EXPO_PUBLIC_PLACE_SEARCH_PROVIDER=google_places
   ```

7. On a device, search a neighborhood, landmark, and business. Confirm that
   the selected result moves the MapLibre camera, the temporary orange pin is
   centered correctly, and the saved private meeting point remains private.

## Evidence and remaining boundary

The mobile client contract is unit-tested with valid and malformed function
payloads. The function is not deployed and no live Google request was made,
because no Google project/key was supplied. Nominatim remains the active
development provider. Before public release, review Google’s current display,
attribution, retention, and map-display terms for the exact intended use.

## Interview explanation

"I separated a third-party places provider from the native map renderer. The
mobile app sees only a small validated result contract; a Supabase Edge Function
owns the provider credential and reduces Google’s response. This made the
provider replaceable, avoided embedding an unrestricted secret in the app, and
preserved our custom MapLibre map and location-privacy rules."

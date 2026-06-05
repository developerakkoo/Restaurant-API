# Seed Images Folder

Place your dummy images here before running `npm run seed:local` or `npm run seed:prod`.

## Folder structure

```
images/
├── categories/
│   ├── pizza/
│   │   ├── category.jpg          ← category cover (required for image)
│   │   └── dishes/
│   │       ├── margherita.jpg
│   │       ├── margherita.json   ← optional metadata
│   │       └── pepperoni.jpg
│   ├── burgers/
│   └── biryani/
├── profiles/
│   ├── users/       ← 01.jpg, 02.jpg, …
│   ├── partners/
│   └── drivers/
├── hotels/          ← 01.jpg, 02.jpg, …
└── banners/         ← home.jpg, cart.jpg, fav.jpg, profile.jpg
```

## Naming rules

| Location | Purpose |
|----------|---------|
| `categories/{slug}/category.{jpg\|png\|webp}` | Category cover image |
| `categories/{slug}/dishes/*.{jpg\|png\|webp}` | Menu item image; filename becomes dish name (Title Case) |
| `categories/{slug}/dishes/{name}.json` | Optional dish overrides (name, prices, dishType, etc.) |
| `profiles/users/NN.jpg` | User profile (01, 02, …) |
| `profiles/partners/NN.jpg` | Partner profile |
| `profiles/drivers/NN.jpg` | Driver profile |
| `hotels/NN.jpg` | Hotel cover image |
| `banners/{type}.jpg` | Banner: `home`, `cart`, `fav`, or `profile` |

Category slugs must match entries in `manifest.json` (e.g. `pizza`, `burgers`, `biryani`).

## Example dish sidecar (`margherita.json`)

```json
{
  "name": "Margherita Pizza",
  "dishType": "veg",
  "partnerPrice": 199,
  "userPrice": 249,
  "spicLevel": 0,
  "timeToPrepare": 20,
  "stock": 1,
  "status": 2
}
```

Missing images use placeholder `"_"` and seeding continues with a warning.

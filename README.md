# Signal K Magnetic Variation

`signalk-magnetic-variation` is a Signal K server plugin that calculates and
publishes `navigation.magneticVariation` from the vessel's WGS84 position and
the current date using the World Magnetic Model 2025 (WMM2025).

It is intended for installations whose GPS receivers leave the NMEA 0183 RMC
variation fields empty or populate them with a placeholder such as `0.0,E`.

## Output

The plugin publishes:

| Signal K path | Unit | Sign convention |
| --- | --- | --- |
| `navigation.magneticVariation` | radians | East positive, west negative |

This matches the Signal K definition: add variation to magnetic heading to
obtain true heading.

The delta source label is `signalk-magnetic-variation`. Configure Signal K data
source priorities so this source is preferred over GPS sources that publish an
empty or placeholder variation.

## Calculation policy

- Requires a valid `navigation.position` update.
- Uses altitude when present; Signal K metres are converted to kilometres.
- Republishes at a configurable interval so Signal K continues to regard the
  source as fresh, and recalculates from the latest position and date.
- Stops updating when position data becomes stale.
- Rejects dates outside the WMM2025 validity interval, 2025 through 2029.
- Publishes radians while showing degrees east/west in plugin status.

## Configuration

| Option | Default | Purpose |
| --- | ---: | --- |
| Publication interval | 10 s | Keeps the preferred source fresh |
| Minimum distance | 5 NM | Accounts for vessel movement |
| Maximum position age | 300 s | Prevents calculation from stale position |

## Development

```sh
npm install
npm run check
npm test
npm pack --dry-run
```

The implementation uses `magvar` 2.0.1, an MIT-licensed, zero-dependency
WMM2025 implementation. The plugin calls its date-aware API explicitly rather
than the convenience function whose date is captured when the module loads.
The test suite also checks a published WMM2025 reference vector, not merely a
locally chosen plausibility range.

## Operational rollout

1. Install and enable the plugin.
2. Confirm that its status shows a plausible east/west variation.
3. Inspect all values of `navigation.magneticVariation` in Signal K.
4. Prefer `signalk-magnetic-variation` in Signal K source priorities.
5. Only then enable downstream magnetic-course output such as SeaTalk1 `0x53`.

Do not treat a GPS-provided numeric zero as valid merely because it is present.
A genuine near-zero variation is possible in some regions, so source identity
and policy matter more than a numeric zero check.

The first vessel installation is recorded in
[`docs/live-test-2026-08-15.md`](docs/live-test-2026-08-15.md).

## License

Apache License 2.0. The `magvar` dependency is MIT licensed.

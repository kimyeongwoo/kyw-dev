# Greeting Fixture Architecture

## Component ownership

- `src/greeting.mjs` owns the pure greeting formatter.
- `test/greeting.test.mjs` owns its observable behavior coverage.

The fixture has no persistence, generated runtime artifact, network call, or production dependency.

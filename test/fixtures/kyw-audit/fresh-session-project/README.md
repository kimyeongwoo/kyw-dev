# Greeting Fixture

This synthetic package exposes one pure `greet(name)` function from `src/greeting.mjs`.

## Usage

Pass a non-empty name. The function returns `Hello, <name>!` with an exclamation mark.

## Verification

```bash
node --test
```

See `docs/SPEC.md` for behavior and `docs/ARCHITECTURE.md` for ownership.

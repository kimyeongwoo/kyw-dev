# Harbor Gate Architecture

## Authentication boundary

`src/auth` owns credential checks and lockout policy. Administrative HTTP routes call that module instead of changing account state directly.

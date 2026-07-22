# Managed Greeting Specification

## Goals

- Return a deterministic greeting for a supplied name.

## Non-goals

- Network, storage, localization, and user accounts.

## User-visible Behavior

The library returns `Hello, <name>!` for a supplied name.

## Business and Domain Rules

The default name is `world`.

## Functional Requirements

- FR-01: A caller receives one greeting string.

## Quality Requirements

- Node.js 22 or newer and deterministic tests are required.

## Acceptance Criteria

- AC-01: The named and default greetings match the documented values.

## Unresolved Decisions

- None.

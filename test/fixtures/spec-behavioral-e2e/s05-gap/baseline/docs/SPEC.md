# Greeting Style Specification

## Goals

- Format both formal and casual greetings.

## Non-goals

- Localization, storage, and network services.

## User-visible Behavior

Formal style returns `Good day, <name>.`; casual style returns `Hi, <name>!`.

## Business and Domain Rules

The `formal` style is selected only by the exact string `formal`; every other style is casual.

## Functional Requirements

- FR-01: Both sides of the style conditional return their documented strings.

## Quality Requirements

- Tests must demonstrate both meaningful branches.

## Acceptance Criteria

- AC-01: Formal and casual outputs are independently verified.

## Unresolved Decisions

- None.

# Ordinary Greeting Specification

## Goals

- Export one deterministic user-visible greeting.

## Non-goals

- Configuration, localization, storage, and network behavior.

## User-visible Behavior

Callers receive the current greeting constant documented in README.

## Business and Domain Rules

The greeting is a single string.

## Functional Requirements

- FR-01: The module exports the greeting value.

## Quality Requirements

- Node.js 22+ and a deterministic focused test.

## Acceptance Criteria

- AC-01: The exported value and README usage statement agree.

## Unresolved Decisions

- None.

# Greeting Style Architecture

## System Context

Callers import a local formatter.

## Components and Responsibilities

`src/greeting.mjs` formats greetings and `test/` verifies acceptance behavior.

## Module and Dependency Boundaries

The formatter is a dependency-free pure function.

## Data and Control Flow

Name and style enter one conditional and one string returns.

## Storage and External Interfaces

There is no storage or network interface.

## Cross-cutting Constraints

Node.js 22+ and acceptance-specific branch coverage.

## Trade-offs

A direct conditional keeps the fixture intentionally inspectable.

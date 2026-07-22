# Managed Greeting Architecture

## System Context

Callers import a local Node.js module.

## Components and Responsibilities

`src/greeting.mjs` owns greeting formatting; `test/` owns verification.

## Module and Dependency Boundaries

The source uses no external dependencies.

## Data and Control Flow

A name enters the exported function and one string returns.

## Storage and External Interfaces

There is no storage or network interface; the JavaScript export is the interface.

## Cross-cutting Constraints

Node.js 22+, deterministic output, and dependency-free execution.

## Trade-offs

A tiny pure function is preferred over configuration infrastructure.

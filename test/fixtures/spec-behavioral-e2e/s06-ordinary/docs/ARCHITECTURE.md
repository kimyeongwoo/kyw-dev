# Ordinary Greeting Architecture

## System Context

Callers import one local Node.js module.

## Components and Responsibilities

`src/greeting.mjs` owns the value; `test/` verifies it.

## Module and Dependency Boundaries

The module has no dependency.

## Data and Control Flow

An import exposes one constant.

## Storage and External Interfaces

There is no storage or network interface.

## Cross-cutting Constraints

Node.js 22+ and deterministic output.

## Trade-offs

A constant keeps this small-change fixture intentionally bounded.

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  calculateVariation,
  distanceMetres,
  isValidPosition,
  julianDays
} = require('../lib/calculator')

test('validates WGS84 positions', () => {
  assert.equal(isValidPosition({ latitude: 11.32, longitude: -60.55 }), true)
  assert.equal(isValidPosition({ latitude: 91, longitude: 0 }), false)
  assert.equal(isValidPosition({ latitude: 0, longitude: -181 }), false)
  assert.equal(isValidPosition(null), false)
})

test('converts Unix epoch to the canonical Julian day', () => {
  assert.equal(julianDays(new Date('1970-01-01T00:00:00.000Z')), 2440587.5)
})

test('calculates a plausible WMM2025 variation for Grenada', () => {
  const result = calculateVariation(
    { latitude: 11.3214, longitude: -60.5542 },
    new Date('2026-08-15T12:00:00.000Z')
  )
  assert.ok(result.degrees > -30 && result.degrees < 0)
  assert.ok(Math.abs(result.radians - result.degrees * Math.PI / 180) < 1e-12)
})

test('matches a published WMM2025 test vector', () => {
  const result = calculateVariation(
    { latitude: 20, longitude: 167, altitude: 49000 },
    new Date('2028-01-01T00:00:00.000Z')
  )
  assert.ok(Math.abs(result.degrees - 5.1) <= 0.1)
})

test('rejects dates outside the WMM2025 validity interval', () => {
  assert.throws(
    () => calculateVariation({ latitude: 0, longitude: 0 }, new Date('2030-01-01T00:00:00Z')),
    /valid from 2025-01-01/
  )
})

test('calculates great-circle distance', () => {
  assert.equal(distanceMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0)
  assert.ok(Math.abs(distanceMetres(
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 }
  ) - 111195) < 100)
})

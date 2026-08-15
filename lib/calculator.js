'use strict'

const { calculateMagVar } = require('magvar')

const DEG_TO_RAD = Math.PI / 180
const EARTH_RADIUS_METRES = 6371008.8
const WMM_START_MS = Date.UTC(2025, 0, 1)
const WMM_END_MS = Date.UTC(2030, 0, 1)

function isValidPosition (position) {
  return Boolean(
    position &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    position.latitude >= -90 &&
    position.latitude <= 90 &&
    position.longitude >= -180 &&
    position.longitude <= 180
  )
}

function julianDays (date) {
  if (!(date instanceof Date) || !Number.isFinite(date.valueOf())) {
    throw new TypeError('A valid Date is required')
  }
  return date.valueOf() / 86400000 + 2440587.5
}

function calculateVariation (position, date = new Date()) {
  if (!isValidPosition(position)) {
    throw new RangeError('Position must contain valid WGS84 latitude and longitude')
  }
  if (!(date instanceof Date) || !Number.isFinite(date.valueOf())) {
    throw new TypeError('A valid Date is required')
  }
  if (date.valueOf() < WMM_START_MS || date.valueOf() >= WMM_END_MS) {
    throw new RangeError('WMM2025 is valid from 2025-01-01 through 2029-12-31')
  }

  const altitudeKm = Number.isFinite(position.altitude)
    ? position.altitude / 1000
    : 0
  const degrees = calculateMagVar(
    julianDays(date),
    position.latitude,
    position.longitude,
    altitudeKm
  )

  if (!Number.isFinite(degrees) || degrees < -180 || degrees > 180) {
    throw new RangeError('WMM2025 returned an invalid magnetic variation')
  }

  return {
    degrees,
    radians: degrees * DEG_TO_RAD
  }
}

function distanceMetres (first, second) {
  if (!isValidPosition(first) || !isValidPosition(second)) return Infinity

  const latitudeDelta = (second.latitude - first.latitude) * DEG_TO_RAD
  const longitudeDelta = (second.longitude - first.longitude) * DEG_TO_RAD
  const firstLatitude = first.latitude * DEG_TO_RAD
  const secondLatitude = second.latitude * DEG_TO_RAD
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_METRES * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

module.exports = {
  WMM_END_MS,
  WMM_START_MS,
  calculateVariation,
  distanceMetres,
  isValidPosition,
  julianDays
}

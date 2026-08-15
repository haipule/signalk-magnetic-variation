'use strict'

const {
  calculateVariation,
  distanceMetres,
  isValidPosition
} = require('./lib/calculator')

module.exports = function (app) {
  const plugin = {
    id: 'signalk-magnetic-variation',
    name: 'WMM2025 Magnetic Variation',
    description: 'Publishes navigation.magneticVariation from vessel position using WMM2025',
    schema: {
      type: 'object',
      properties: {
        updateIntervalSeconds: {
          type: 'number',
          title: 'Publication interval (seconds)',
          description: 'Keeps this source fresh for Signal K priority fallback handling',
          default: 10,
          minimum: 5
        },
        minimumDistanceNm: {
          type: 'number',
          title: 'Recalculate after moving this distance (nautical miles)',
          default: 5,
          minimum: 0.1
        },
        positionMaxAgeSeconds: {
          type: 'number',
          title: 'Maximum position age (seconds)',
          default: 300,
          minimum: 5
        }
      }
    },
    start,
    stop
  }

  let options = {}
  let unsubscribe
  let freshnessTimer
  let latestPosition
  let latestPositionReceivedAt = 0
  let lastPublishedPosition
  let lastPublishedAt = 0
  let staleReported = false

  function start (configuration = {}) {
    stop()
    options = {
      updateIntervalSeconds: configuration.updateIntervalSeconds || 10,
      minimumDistanceNm: configuration.minimumDistanceNm || 5,
      positionMaxAgeSeconds: configuration.positionMaxAgeSeconds || 300
    }

    app.setPluginStatus('Waiting for a valid vessel position')
    const stream = app.streambundle.getSelfStream('navigation.position')
    unsubscribe = stream.onValue(position => {
      latestPositionReceivedAt = Date.now()
      latestPosition = position
      staleReported = false
      publishIfNeeded()
    })

    freshnessTimer = setInterval(checkFreshness, 30000)
    if (typeof freshnessTimer.unref === 'function') freshnessTimer.unref()
  }

  function stop () {
    if (unsubscribe) unsubscribe()
    if (freshnessTimer) clearInterval(freshnessTimer)
    unsubscribe = undefined
    freshnessTimer = undefined
    latestPosition = undefined
    latestPositionReceivedAt = 0
    lastPublishedPosition = undefined
    lastPublishedAt = 0
    staleReported = false
  }

  function checkFreshness () {
    if (!latestPositionReceivedAt) return
    const ageMs = Date.now() - latestPositionReceivedAt
    if (ageMs <= options.positionMaxAgeSeconds * 1000) {
      publishIfNeeded()
      return
    }
    if (!staleReported) {
      staleReported = true
      app.setPluginStatus('Position is stale; magnetic variation is not being updated')
    }
  }

  function publishIfNeeded () {
    if (!isValidPosition(latestPosition)) {
      app.setPluginError('Received an invalid vessel position')
      return
    }

    const now = Date.now()
    if (now - latestPositionReceivedAt > options.positionMaxAgeSeconds * 1000) return

    const intervalElapsed = now - lastPublishedAt >= options.updateIntervalSeconds * 1000
    const distanceElapsed = distanceMetres(lastPublishedPosition, latestPosition) >=
      options.minimumDistanceNm * 1852
    if (lastPublishedAt && !intervalElapsed && !distanceElapsed) return

    try {
      const variation = calculateVariation(latestPosition, new Date(now))
      app.handleMessage(plugin.id, {
        updates: [{
          source: { label: plugin.id },
          timestamp: new Date(now).toISOString(),
          values: [{
            path: 'navigation.magneticVariation',
            value: variation.radians
          }]
        }]
      })
      lastPublishedAt = now
      lastPublishedPosition = { ...latestPosition }
      app.setPluginStatus(`WMM2025 variation: ${formatDegrees(variation.degrees)}`)
    } catch (error) {
      app.setPluginError(error.message)
    }
  }

  return plugin
}

function formatDegrees (degrees) {
  const direction = degrees < 0 ? 'W' : 'E'
  return `${Math.abs(degrees).toFixed(2)}° ${direction}`
}

module.exports.formatDegrees = formatDegrees

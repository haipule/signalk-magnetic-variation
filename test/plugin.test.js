'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const createPlugin = require('..')

test('publishes variation in radians with its own source', () => {
  let onPosition
  const messages = []
  const statuses = []
  const app = {
    streambundle: {
      getSelfStream: path => {
        assert.equal(path, 'navigation.position')
        return {
          onValue: handler => {
            onPosition = handler
            return () => {}
          }
        }
      }
    },
    handleMessage: (id, delta) => messages.push({ id, delta }),
    setPluginError: message => assert.fail(message),
    setPluginStatus: message => statuses.push(message)
  }
  const plugin = createPlugin(app)

  plugin.start({ updateIntervalSeconds: 10, minimumDistanceNm: 5 })
  onPosition({ latitude: 11.3214, longitude: -60.5542 })
  plugin.stop()

  assert.equal(messages.length, 1)
  assert.equal(messages[0].id, 'signalk-magnetic-variation')
  const update = messages[0].delta.updates[0]
  assert.equal(update.source.label, 'signalk-magnetic-variation')
  assert.equal(update.values[0].path, 'navigation.magneticVariation')
  assert.equal(typeof update.values[0].value, 'number')
  assert.match(statuses.at(-1), /WMM2025 variation:/)
})

test('formats east and west variation', () => {
  assert.equal(createPlugin.formatDegrees(4.2), '4.20° E')
  assert.equal(createPlugin.formatDegrees(-12.345), '12.35° W')
})

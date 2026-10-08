import { describe, expect, it } from 'vitest'
import { composeSceneUpdate, createClientId } from './protocol'

describe('WebSocket protocol helpers', () => {
  it('creates a backend-valid client ID', () => {
    expect(createClientId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
  })

  it('sends only integer slider units in scene updates', () => {
    expect(composeSceneUpdate({
      zoom: 92.4,
      positionX: -12.2,
      positionY: 8.7,
      rotationX: 4.2,
      rotationY: -5.8,
      rotationZ: 1.1,
      amplitude: 64.6,
    })).toEqual({
      type: 'update_scene',
      avatar: {
        zoom: 92,
        positionX: -12,
        positionY: 9,
        rotationX: 4,
        rotationY: -6,
        rotationZ: 1,
        amplitude: 65,
      },
    })
  })
})

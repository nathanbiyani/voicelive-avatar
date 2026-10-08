import type { PhotoScene } from '../types/config'

export function createClientId(): string {
  const random = globalThis.crypto?.randomUUID?.().replace(/[^A-Za-z0-9_-]/g, '') ?? Math.random().toString(36).slice(2)
  return `web-${random}`.slice(0, 64).padEnd(8, '0')
}

export function composeSceneUpdate(avatar: PhotoScene) {
  return {
    type: 'update_scene' as const,
    avatar: {
      zoom: Math.round(avatar.zoom),
      positionX: Math.round(avatar.positionX),
      positionY: Math.round(avatar.positionY),
      rotationX: Math.round(avatar.rotationX),
      rotationY: Math.round(avatar.rotationY),
      rotationZ: Math.round(avatar.rotationZ),
      amplitude: Math.round(avatar.amplitude),
    },
  }
}

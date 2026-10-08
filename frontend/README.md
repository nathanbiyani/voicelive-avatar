# AutoXRay frontend

React, TypeScript, and Vite conversation interface for the AutoXRay Voice Live avatar.

## Local development

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Vite proxies `/api` and `/ws` to `http://localhost:8000`. The production build uses
same-origin URLs and expects:

- `GET /api/config` for defaults and validated configuration catalogs.
- `POST /api/evaluations` for approved aggregate telemetry when enabled.
- `WebSocket /ws/{clientId}` for audio, captions, session events, and avatar media.

## Interface

The interface is intentionally conversation-first. The 47-row workbook mapping remains in
`src/data/criteria.ts` for traceability but is not rendered as a table. Users interact with:

- A large live avatar and caption stage.
- Automatic microphone capture with explicit mute/listening state.
- Optional text input.
- Compact active-profile indicators.
- An on-demand settings drawer for presets and advanced controls.

The settings drawer is removed from the DOM while closed so hidden controls are not included
in keyboard navigation.

## Browser media

- Microphone input is 24 kHz mono PCM16.
- WebSocket avatar output is fragmented MP4.
- MP4Box extracts H.264 video and AAC samples.
- The browser decodes AAC with `@wasm-audio-decoders/aac` and schedules PCM through Web Audio.
- Portrait avatar video uses `object-fit: contain` in a viewport-aware 600-820px stage.
- WebRTC remains available as an alternative avatar transport.

## Privacy

Azure credentials and tokens remain on the backend. The frontend must not export audio,
video, transcripts, expected names, prompts, credentials, endpoints, or raw service errors
as telemetry.

## Validation

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

The Playwright suite starts FastAPI and Vite and validates the conversation-first layout,
hidden workbook matrix, settings workflow, configuration presets, and safe fallback when
backend catalogs are unavailable.

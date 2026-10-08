# Azure AI Speech Service - Voice Live Samples

This repository contains sample code and resources for working with Azure AI Speech Service Voice Live.

## AutoXRay Voice Live avatar evaluation application

AutoXRay is a conversation-first React and FastAPI demo for evaluating an Azure Voice Live
avatar in patient-facing medical-imaging scenarios. It was built against the public
[AutoXRay evaluation workbook](./Public%20Version%20of%20AutoXRay_Avatar_Vendor_Evaluation_Microsoft_Response.xlsx).
The application keeps the complete 47-row mapping in code, while the interface stays focused
on talking to the avatar and changing session behavior.

### What is included

```text
backend/    FastAPI API, Voice Live session adapter, validated catalogs, and safe telemetry
frontend/   React/TypeScript conversation UI, browser microphone, avatar video, and audio decode
python/     Upstream Python samples retained as reference
```

Key capabilities:

- Live browser microphone capture with Azure semantic or server voice activity detection.
- Streaming video avatar with captions and proactive greeting.
- WebSocket fragmented-MP4 playback with H.264 video demuxing and WASM AAC speech decoding.
- Standard, custom, personal, and realtime-native voice configuration surfaces.
- Medical terminology instruction packs for radiography, CT, MRI, and ultrasound.
- Synthetic complex-name phrase hints, locale profiles, optional Custom Speech mappings,
  and an HTTPS pronunciation lexicon.
- Noise suppression, echo cancellation, voice speed, prompt, avatar, and scene controls.
- Privacy-safe Application Insights hooks that exclude audio, video, transcripts, names,
  prompts, credentials, endpoints, SDP, and raw service errors.

### Prerequisites

- Python 3.12
- Node.js 18 or later and npm
- Azure CLI
- An Azure AI Services or Microsoft Foundry resource with Voice Live enabled
- A deployed realtime model such as `gpt-realtime`
- An identity with permission to use the model, such as **Cognitive Services OpenAI User**
- A Chromium-based browser with microphone and sound permissions

The verified development resource uses Microsoft Entra authentication because local-key
authentication is disabled. Do not add Azure credentials to the frontend.

### Azure authentication

For the verified development subscription:

```bash
az login
az account set --subscription cdcfc2b6-afa4-4076-abe1-ac97a899a308
```

The backend uses `DefaultAzureCredential`. In an Azure deployment, use a managed identity
with the minimum required role on the Voice Live resource.

### Configure the backend

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
```

Set at least:

```dotenv
AZURE_VOICELIVE_ENDPOINT=https://<resource>.services.ai.azure.com
AZURE_VOICELIVE_API_KEY=
VOICELIVE_MODEL=gpt-realtime
VOICELIVE_VOICE=en-US-AvaMultilingualNeural
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Leave `AZURE_VOICELIVE_API_KEY` empty to use Entra ID. `.env` files are ignored by Git.
See [backend/.env.example](./backend/.env.example) for all settings.

### Install the frontend

```bash
cd frontend
npm install
```

### Run locally

Start the backend:

```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal, start the frontend:

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`, allow microphone and site audio access, and select
**Start voice session**. Vite proxies `/api` and `/ws` to FastAPI during development.

The default avatar transport is WebSocket fragmented MP4. WebRTC remains configurable, but
WebSocket was the reliable media path in the validated development environment.

### Configure an evaluation session

Use **Settings** before connecting to change:

- Presets for clinical clarity, complex names, avatar review, or background noise.
- Medical terminology pack and recognition locale.
- Standard, custom, Personal Voice, or realtime-native output.
- Avatar character/style, transport, and photo-avatar scene controls.
- Noise suppression, echo cancellation, turn detection, captions, and developer transcript.
- Model instructions and voice speed.

Voice and avatar configuration is fixed when a session starts. Disconnect before changing
those settings, then reconnect.

### What has been proved out

The public workbook contains 47 populated criteria:

- 14 can be evaluated in a live demo.
- 13 require an expanded pilot or deployed infrastructure.
- 20 require vendor evidence, commercial information, formal compliance review, or
  unavailable capabilities.

Manual live results recorded during development:

| Workbook row | Criterion | Result | Evidence |
|---|---|---|---|
| 6 | Real-time Animation | Pass | Continuous live avatar motion was observed. |
| 7 | Lip-Sync | Pass | Mouth timing was acceptable on a consonant-heavy calibration sentence. |
| 8 | Gaze | Pass | Camera-facing gaze was stable during speech and idle time. |
| 9 | Emotional expressivity | Pass | Prompt tone produced acceptable vocal and visual contrast. |
| 10 | Empathy & Warm | Pass | Claustrophobia reassurance was warm, safe, and patient-friendly. |
| 11 | User Experience | Pass | Start, permission, listening, caption, response, mute, and disconnect flow worked. |
| 14 | ASR & TTS Robustness | Pass | Dates, times, numbers, captions, and synthesized response were acceptable. |
| 15 | Multi-Languages, Dialects | Pass | Mexican Spanish recognition and response worked with the locale profile. |
| 16 | Complex Names | Pass | Synthetic names were recognized and spoken back acceptably using phrase hints. |
| 18 | Medical Terminology Packs | Needs tuning | MRI content was accurate, but first-use expansion and precise “ionizing radiation” wording need stronger enforcement. |

Live-demo criteria still awaiting a formal verdict are Complex Accents (row 17),
Customizability (row 24), Cloud Latency against the strict 500ms target (row 34), and
Background Noise (row 35).

Technical runtime evidence:

- Voice Live connected with automatic microphone capture.
- The avatar streamed and played at 800x1080.
- Captions and proactive English greeting were received.
- AAC speech embedded in fragmented MP4 was extracted, decoded, and scheduled through Web Audio.
- Instrumented validation observed a running `AudioContext` and 203 audio buffer starts.

These are demonstration results, not clinical validation, regulatory approval, accessibility
certification, or production performance guarantees.

### Complex names and Personal Voice

Complex-name evaluation has two independent directions:

1. Incoming recognition uses a short synthetic phrase list to bias Azure Speech toward
   expected spellings.
2. Avatar speak-back evaluates outgoing pronunciation. Standard and custom voices can use an
   HTTPS pronunciation lexicon.

A consented Personal Voice profile can use `DragonLatestNeural`, the rolling Voice Live model
name that includes current Dragon improvements. Personal Voice is limited access and requires
explicit recorded consent, a 5-90 second sample, and a `speakerProfileId` available on the same
Foundry resource. It personalizes synthesized output; it does not improve incoming ASR.

### Optional infrastructure not yet provisioned

- Dedicated Application Insights and Log Analytics resources for audit export and retention.
- Service-accessible HTTPS hosting for the sample pronunciation lexicon.
- Locale-specific Custom Speech model deployments.
- A consented Personal Voice speaker profile.
- An application-specific Foundry agent.
- Production frontend/backend hosting, managed identity, networking, and recovery.
- Private Blob Storage catalogs for centrally managed terminology and synthetic-name packs.

See [backend/README.md](./backend/README.md#current-azure-resource-status) for the verified
resource inventory and precise blockers.

### Validation

```bash
cd backend
.venv/bin/pytest

cd ../frontend
npm test
npm run lint
npm run build
npm run test:e2e
```

Current validated baseline:

- 19 backend tests passed.
- 10 frontend tests passed.
- 4 Chromium end-to-end journeys passed.
- ESLint and the production build passed.

Starting a live Voice Live session can incur Azure usage charges.

## Overview

Voice Live enables real-time voice interactions using Azure AI Speech Service. These samples demonstrate how to integrate Voice Live into your applications for various scenarios including conversational AI, voice assistants, and interactive voice experiences.

## Features

- Real-time voice interaction samples
- Integration examples with Azure AI Speech Service
- Best practices for Voice Live implementation
- Sample code for common use cases
- Agent skills for guided development workflows

## Getting Started

### Prerequisites

- [Azure subscription](https://azure.microsoft.com/free/) - Create one for free
- [AI Foundry resource](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource)
- Basic knowledge of your preferred programming language

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/microsoft-foundry/voicelive-samples.git
   cd voicelive-samples
   ```

2. Follow the instructions in individual sample directories for specific setup requirements.

### Quickstart

1. **Choose your language**: Select from [C#](./csharp/README.md), [Python](./python/README.md), or other available languages
2. **Follow language-specific setup**: Each language folder has detailed setup instructions
3. **Configure credentials**: Set up your Azure resources and authentication
4. **Run a sample**: Start with a quickstart sample to see Voice Live in action

For detailed quickstart guides, see the README in your chosen language folder.

## Samples by Language

This repository contains samples in multiple programming languages. Choose your preferred language to get started:

### [C# Samples](./csharp/README.md)
Complete C# samples demonstrating:
- **Agent Quickstart**: Connect to Azure AI Foundry agents with proactive greetings
- **Agents New Quickstart**: Create and run Voice Live-enabled Foundry Agents (new SDK patterns)
- **MCP Quickstart**: MCP server integration with remote tool calling and approval flow
- **Model Quickstart**: Direct VoiceLive model integration
- **Bring-Your-Own-Model (BYOM) Quickstart**: Use your own models hosted in Foundry with proactive greetings
- **Customer Service Bot**: Advanced function calling for customer service scenarios and proactive greetings
- Built with .NET 9.0 and self-contained code

### [Python Samples](./python/)
Python samples showcasing:
- **Agent Quickstart**: Azure AI Foundry agent integration with proactive greetings
- **Agents New Quickstart**: Voice Live + Foundry Agent v2 samples and agent-creation utility
- **MCP Quickstart**: MCP server integration with remote tool calling and approval flow
- **Model Quickstart**: Direct model access with flexible authentication
- **Bring-Your-Own-Model (BYOM) Quickstart**: Use your own models hosted in Foundry with proactive greetings
- **Function Calling**: Advanced tool integration with custom functions and proactive greetings
- **Telemetry Quickstart**: OpenTelemetry tracing — console export, Azure Monitor, custom attributes, and content recording
- **RAG-enabled Voice Assistant**: Full-stack voice assistant with Azure AI Search integration and `azd` deployment
- **Voice Live Avatar**: Avatar-enabled voice conversations with server-side SDK and Docker deployment
- Built with Python 3.8+ and async/await patterns

### [JavaScript Samples](./javascript/)
JavaScript/TypeScript samples showcasing:
- **Agents New Quickstart**: Node.js Voice Live + Foundry Agent v2 sample and agent-creation utility
- **MCP Quickstart**: MCP server integration with remote tool calling and approval flow
- **Model Quickstart**: Direct Voice Live model integration with proactive greetings
- **Basic Web Voice Assistant**: Browser-based voice assistant with real-time streaming and barge-in support
- **Voice Live Education Demo**: Browser-based English pronunciation coach that pairs Voice Live with the Azure Speech SDK for real-time pronunciation assessment (Conversation / Concise / Read Along scenarios)
- **Live Reference AEC**: Browser sample that streams the mic plus the app's own speaker playback as a stereo reference so the service can cancel echo against the exact signal played
- **Voice Live Avatar**: Avatar-enabled voice conversations with Docker deployment
- **Voice Live Car Demo**: Voice-Enabled Car Assistant powered by multiple architectures
- **Voice Live Interpreter**: Real-time speech translation, speech in and speech out
- **Voice Live Trader**: Real-time trading assistant for stock fund crypto FX trading app
- Built with TypeScript and Web Audio API

### [Java Samples](./java/)
Java samples  showcasing:
- **Agents New Quickstart**: Voice Live + Foundry Agent v2 sample and agent-creation utility
- **MCP Quickstart**: MCP server integration with remote tool calling and approval flow
- **Model Quickstart**: Direct model access with flexible authentication
- Built with Java 11+ and Maven

### [Voice Live Universal Assistant](./voice-live-universal-assistant/)
Full-stack web application with a **shared React+Vite+TypeScript frontend** and per-language backend implementations:
- **Shared frontend**: Fluent-aligned design system (light/dark/system themes), voice orb visualization, CC transcript, voice type selection (OpenAI + Azure Standard)
- **Python backend**: FastAPI + WebSocket proxy with Agent and Model mode support
- **Java backend**: Spring Boot + WebSocket proxy with Agent and Model mode support
- **JavaScript, C# backends**: Planned
- **Backend selection**: Set `BACKEND_LANGUAGE` at deploy time (`python`, `java`, `javascript`, `csharp`) — frontend is shared and language-agnostic
- **Connection modes**: Model mode (default — works with just a Foundry endpoint) or Agent mode (auto-set when deploying with `CREATE_AGENT=true`)
- **Azure deployment**: Full `azd up` infrastructure with Bicep IaC — Container Apps, ACR, RBAC, optional AI Foundry provisioning, and optional Foundry Agent creation with GPT-4.1-mini
- 91 unit tests + E2E audio test

Each language folder contains detailed setup instructions, configuration examples, and troubleshooting guides specific to that language and platform.

## Agent Skills

This repository includes Agent Skills that help coding agents implement and troubleshoot supported Azure AI Speech scenarios. Additional skills will be added here as they become available.

### [Azure Avatar Integration](./skills/azure-avatar-integrate/README.md)
Agent Skill for planning, building, validating, and troubleshooting Azure AI Speech Avatar integrations:
- **Batch Synthesis**: Generate downloadable avatar videos from text or SSML
- **Real-time Speech SDK**: Add a live talking avatar to an existing application or conversational pipeline
- **Voice Live**: Build an interactive avatar that listens and responds with synchronized speech and video
- **Troubleshooting**: Diagnose authentication, WebRTC, connection, playback, and session issues

## Documentation

- [Azure AI Speech Service - Voice Live Documentation](https://learn.microsoft.com/azure/ai-services/speech-service/voice-live)

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](SUPPORT.md#contributing) for details.

Please note that this project follows the [Microsoft Open Source Code of Conduct](CODE_OF_CONDUCT.md).

## Resources

- [Support](SUPPORT.md) - Get help and file issues
- [Security](SECURITY.md) - Security policy and reporting vulnerabilities

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) Microsoft Corporation. All rights reserved.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general). Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party's policies.

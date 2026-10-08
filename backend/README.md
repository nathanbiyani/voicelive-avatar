# AutoXRay Voice Live backend

The backend owns Voice Live credentials and sessions. The browser never receives an Azure API key, backend Entra token, Application Insights connection string, terminology prompt, or Custom Speech model credentials.

## Package structure

```text
app/
├── api/             # REST and WebSocket transports
├── core/            # Environment settings and audit telemetry
├── domain/          # Validated models and evaluation catalogs
├── integrations/    # Azure Voice Live SDK adapter
├── services/        # Session configuration and lifecycle orchestration
└── main.py          # FastAPI application factory
```

## Local setup

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Use `DefaultAzureCredential` when `AZURE_VOICELIVE_API_KEY` is empty. Agent modes always use Entra ID. API-key authentication is limited to model mode.

## Current Azure resource status

The checked-in example configuration is aligned with the resources verified in subscription
`ME-MngEnvMCAP490880-nathanbiyani-1`.

### Available now

| Capability | Resource | Status |
|---|---|---|
| Voice Live and Azure Speech | `admin-mht7uj56-eastus2` in `rg-agent_framework` | Ready |
| Realtime model | `gpt-realtime` version `2025-08-28` | Deployed and succeeded |
| Local authentication | Azure CLI through `DefaultAzureCredential` | Ready |
| Foundry project | `admin-mht7uj56-eastus2_project` | Ready for agent mode once an agent is selected |
| Standard avatar and voice selection | Voice Live resource catalog | Available |

The AI Services resource has local-key authentication disabled. Keep
`AZURE_VOICELIVE_API_KEY` empty. For local development, sign in with:

```bash
az login
az account set --subscription cdcfc2b6-afa4-4076-abe1-ac97a899a308
```

For an Azure deployment, assign the backend's managed identity the
**Cognitive Services OpenAI User** role on `admin-mht7uj56-eastus2`.

### Not available yet

| Capability | Current blocker | What to create or configure |
|---|---|---|
| Audit export to Application Insights | No dedicated Voice Live component exists | Create a workspace-based Application Insights component, grant the operations team query access, and place its connection string in backend secret configuration. |
| Hosted pronunciation lexicon | `voicelivedemo` disables public networking and anonymous blob access | Create a narrowly scoped HTTPS hosting location that Voice Live can read. Do not expose the existing private account broadly. Upload `resources/lexicons/en-US-autoxray.pls` and use its HTTPS URL in the UI. |
| Custom Speech adaptation | No Custom Speech model ID was verified | Train and deploy one model per required locale on the same `admin-mht7uj56-eastus2` resource, then enter locale-to-model-ID mappings in the UI. |
| Agent mode | A project exists, but no application-specific agent was selected | Create or select a Foundry agent in `admin-mht7uj56-eastus2_project`, then enter its agent and project names in the UI. |
| Production hosting | No app-specific backend/frontend deployment was identified | Deploy the backend with managed identity, host the frontend, and add the exact frontend origin to `ALLOWED_ORIGINS`. |

These missing integrations remain disabled rather than silently reusing unrelated monitoring
resources or weakening private storage controls.

## Evaluation customization

- A terminology pack appends an allowlisted prompt fragment in model mode.
- A name pack becomes an Azure Speech `phrase_list`. Selecting names, an accent locale, or Custom Speech switches realtime sessions from `whisper-1` to `azure-speech`.
- Accent profiles configure recognition locale; they do not transform a speaker's accent.
- `customSpeechModels` maps locale codes to Custom Speech model IDs. Models must be available on the same Microsoft Foundry resource used by Voice Live.
- `customLexiconUrl` must be HTTPS. Upload [the sample PLS lexicon](resources/lexicons/en-US-autoxray.pls) to a service-accessible location such as Azure Blob Storage.

The accent manifest contains repeatable scripts but no recordings. Supply only consented speakers or audio. The application does not upload evaluation audio to Application Insights.

### Personal Voice pronunciation evaluation

Voice Live identifies the current Dragon Personal Voice release as `DragonLatestNeural`. Configure the frontend with a consented `speakerProfileId`; do not use the blog/SSML-only `DragonV2.1Neural` identifier in a Voice Live session. The profile must be available on the same Microsoft Foundry resource as the Voice Live endpoint.

For complex-name evaluation, the backend keeps recognition and synthesis separate:

- `namePackId` becomes an ephemeral Speech phrase list for incoming recognition.
- `customLexiconUrl` is an absolute HTTPS pronunciation lexicon for outgoing synthesis.
- Personal Voice changes the synthesized voice and requires explicit recorded consent. The application never creates a profile implicitly and never records profile IDs, names, audio, or transcripts in evaluation telemetry.

## Audit telemetry

Set `APPLICATIONINSIGHTS_CONNECTION_STRING` to enable the dedicated `voicelive.audit` logger. Only allowlisted metadata dimensions are accepted. Transcripts, audio, video, patient names, prompts, instructions, credentials, endpoints, SDP, and raw service errors are excluded.

Useful Application Insights queries:

```kusto
traces
| where customDimensions.event_name == "session_configured"
| summarize sessions=count() by tostring(customDimensions.terminology_pack)
```

```kusto
traces
| where customDimensions.event_name == "evaluation_recorded"
| summarize tests=count(),
            passRate=countif(tostring(customDimensions.passed) == "True") * 1.0 / count(),
            averageWER=avg(todouble(customDimensions.word_error_rate))
  by tostring(customDimensions.criterion),
     tostring(customDimensions.accent_profile)
```

Configure Log Analytics retention and access separately according to the product's privacy policy.

## Tests

```bash
.venv/bin/pytest -q
```

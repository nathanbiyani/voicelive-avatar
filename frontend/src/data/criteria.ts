import type { EvaluationCriterion } from '../types/config'

export type EvaluationBucket = 'live-demo' | 'expanded-pilot' | 'evidence-only'
export type WorkbookResult = 'pass' | 'review'

export interface WorkbookCriterion {
  id: string
  sourceRow: number
  category: string
  title: string
  priority: string
  bucket: EvaluationBucket
  testMethod: string
  telemetryCriterion?: EvaluationCriterion
}

export const BUCKET_LABELS: Record<EvaluationBucket, string> = {
  'live-demo': 'Live demo',
  'expanded-pilot': 'Expanded pilot',
  'evidence-only': 'Evidence only / unavailable',
}

export const EVALUATION_CRITERIA: WorkbookCriterion[] = [
  { id: 'row-6', sourceRow: 6, category: 'Avatar Quality', title: 'Real-time Animation', priority: 'H', bucket: 'live-demo', testMethod: 'Start an avatar session and observe continuous WebRTC animation.' },
  { id: 'row-7', sourceRow: 7, category: 'Avatar Quality', title: 'Lip-Sync', priority: 'H', bucket: 'live-demo', testMethod: 'Compare visible mouth motion with the generated speech.' },
  { id: 'row-8', sourceRow: 8, category: 'Avatar Quality', title: 'Gaze', priority: 'H', bucket: 'live-demo', testMethod: 'Observe gaze stability and camera-facing behavior during a response.' },
  { id: 'row-9', sourceRow: 9, category: 'Avatar Quality', title: 'Emotional expressivity', priority: 'H', bucket: 'live-demo', testMethod: 'Use contrasting prompt tones and compare voice and avatar delivery.' },
  { id: 'row-10', sourceRow: 10, category: 'Avatar Quality', title: 'Empathy & Warm', priority: 'H', bucket: 'live-demo', testMethod: 'Run the patient-facing reassurance script and score perceived warmth.' },
  { id: 'row-11', sourceRow: 11, category: 'Avatar Quality', title: 'User Experience', priority: 'H', bucket: 'live-demo', testMethod: 'Complete the start, speak, caption, response, and disconnect journey.' },
  { id: 'row-12', sourceRow: 12, category: 'Avatar Quality', title: 'Evidence that Avatar builds trust in real world.', priority: 'H', bucket: 'evidence-only', testMethod: 'Requires user research, validated survey design, and real-world study evidence.' },

  { id: 'row-14', sourceRow: 14, category: 'Language Support', title: 'ASR & TTS Robustness', priority: 'H', bucket: 'live-demo', testMethod: 'Run a repeatable script and review captions, speech quality, and errors.' },
  { id: 'row-15', sourceRow: 15, category: 'Language Support', title: 'Support Multi-Languages, Dialects', priority: 'H', bucket: 'live-demo', testMethod: 'Select locale profiles and repeat the same consented script.' },
  { id: 'row-16', sourceRow: 16, category: 'Language Support', title: 'Complex Names', priority: 'H', bucket: 'live-demo', testMethod: 'Run two checks: compare captions with the synthetic name pack for recognition, then ask the avatar to repeat the names and score pronunciation. Where provisioned, compare standard speech with consented Personal Voice Dragon latest plus an HTTPS pronunciation lexicon.', telemetryCriterion: 'complex_names' },
  { id: 'row-17', sourceRow: 17, category: 'Language Support', title: 'Complex Accents', priority: 'H', bucket: 'live-demo', testMethod: 'Select an accent profile and measure recognition against the reference script.', telemetryCriterion: 'complex_accents' },
  { id: 'row-18', sourceRow: 18, category: 'Language Support', title: 'Medical Terminology Packs', priority: 'L', bucket: 'live-demo', testMethod: 'Select each terminology pack and evaluate patient-safe use of its vocabulary.' },

  { id: 'row-20', sourceRow: 20, category: 'Accessibility', title: 'Americal Sign Language (ASL) support', priority: 'L', bucket: 'evidence-only', testMethod: 'Native ASL avatar gestures are unavailable; captions are only a partial workaround.' },
  { id: 'row-21', sourceRow: 21, category: 'Accessibility', title: 'ADA & WCAG 2.2 compliance', priority: 'L', bucket: 'expanded-pilot', testMethod: 'Run an accessibility audit with keyboard, screen reader, contrast, and zoom checks.' },

  { id: 'row-23', sourceRow: 23, category: 'Integrations', title: 'Effort to Integrate, with smooth and relatively streamlined process', priority: 'H', bucket: 'expanded-pilot', testMethod: 'Measure setup time, implementation effort, defects, and required Azure roles.' },
  { id: 'row-24', sourceRow: 24, category: 'Integrations', title: 'Customizability', priority: 'H', bucket: 'live-demo', testMethod: 'Exercise avatar, voice, scene, prompt, terminology, locale, and audio controls.' },
  { id: 'row-25', sourceRow: 25, category: 'Integrations', title: 'Setup and Configuration of Avatar and Integration', priority: 'Not set', bucket: 'expanded-pilot', testMethod: 'Repeat deployment from documented configuration and verify reproducibility.' },
  { id: 'row-26', sourceRow: 26, category: 'Integrations', title: 'Ability to integrate with video camera. What type of information does it provide? Example who it talks to (person with gaze fixed on the avatar)', priority: 'Not set', bucket: 'expanded-pilot', testMethod: 'Requires a consented camera integration pilot and an approved computer-vision design.' },

  { id: 'row-28', sourceRow: 28, category: 'Deployment', title: 'Cloud Instance', priority: 'H', bucket: 'expanded-pilot', testMethod: 'Deploy the full application to Azure and verify region, identity, networking, and recovery.' },
  { id: 'row-29', sourceRow: 29, category: 'Deployment', title: 'GPU Reqs and Specs for avatar to run on Edge (On-Prem)', priority: 'H', bucket: 'evidence-only', testMethod: 'Avatar rendering is cloud-hosted; requires a separate hybrid/edge architecture assessment.' },
  { id: 'row-30', sourceRow: 30, category: 'Deployment', title: 'Cost of Hardware', priority: 'H', bucket: 'evidence-only', testMethod: 'Requires selected edge hardware, sizing, vendor quotes, and a TCO model.' },
  { id: 'row-31', sourceRow: 31, category: 'Deployment', title: 'HA & Fail-over for Edge', priority: 'H', bucket: 'expanded-pilot', testMethod: 'Run controlled network and node failure drills against the target hybrid design.' },

  { id: 'row-33', sourceRow: 33, category: 'Performance', title: 'Latency On-Prem (ASR-->LLM-->TTS): 500ms', priority: 'H', bucket: 'expanded-pilot', testMethod: 'Requires deployed on-prem components and instrumented end-to-end latency tests.' },
  { id: 'row-34', sourceRow: 34, category: 'Performance', title: 'Latency for Cloud: 500ms', priority: 'Not set', bucket: 'live-demo', testMethod: 'Observe measured session/response latency and compare it with the 500 ms target.', telemetryCriterion: 'cloud_latency' },
  { id: 'row-35', sourceRow: 35, category: 'Performance', title: 'Performance amidst background noise and how it impacts the signal speech-to-text', priority: 'Not set', bucket: 'live-demo', testMethod: 'Replay the same script with noise suppression on and off, then compare captions.', telemetryCriterion: 'background_noise' },

  { id: 'row-37', sourceRow: 37, category: 'Privacy & Security', title: 'Secure Data Handling (1) at Rest and (2) in Transit (on-prem, and between on-prem and cloud)', priority: 'H', bucket: 'expanded-pilot', testMethod: 'Validate data flows, TLS, storage, access controls, and deployment-specific handling.' },
  { id: 'row-38', sourceRow: 38, category: 'Privacy & Security', title: 'Data Retention Policy', priority: 'Not set', bucket: 'expanded-pilot', testMethod: 'Configure retention and verify deletion/expiration against the approved policy.' },
  { id: 'row-39', sourceRow: 39, category: 'Privacy & Security', title: 'Audit Logging and Monitoring', priority: 'Not set', bucket: 'expanded-pilot', testMethod: 'Requires a dedicated Application Insights resource and verified privacy-safe ingestion.' },
  { id: 'row-40', sourceRow: 40, category: 'Privacy & Security', title: 'Log Retention duration', priority: 'Not set', bucket: 'expanded-pilot', testMethod: 'Configure Log Analytics retention and verify query/archive behavior.' },
  { id: 'row-41', sourceRow: 41, category: 'Privacy & Security', title: 'Data Encryption at rest and in transit', priority: 'H?', bucket: 'expanded-pilot', testMethod: 'Inspect deployed TLS, storage encryption, key policy, and private networking evidence.' },
  { id: 'row-42', sourceRow: 42, category: 'Privacy & Security', title: 'Compliance to GDPR', priority: '?', bucket: 'evidence-only', testMethod: 'Requires legal/compliance review, product data mapping, DPA, and residency decisions.' },
  { id: 'row-43', sourceRow: 43, category: 'Privacy & Security', title: 'Will any data be used to train, fine-tune, or improve AI models; anonymization and third-party disclosure', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires contractual terms, Microsoft product documentation, and subprocessor review.' },

  { id: 'row-45', sourceRow: 45, category: 'Regulatory Compliance', title: 'Did Vendor follow FDA cybersecurity guidelines?', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires regulatory scope, SPDF/SSDF evidence, threat model, SBOM, and labeling review.' },
  { id: 'row-46', sourceRow: 46, category: 'Regulatory Compliance', title: 'Did vendor follow FDA AI development Guidelines?', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires regulatory assessment against GMLP, AI RMF, and the intended medical-device use.' },

  { id: 'row-48', sourceRow: 48, category: 'Operations & Support', title: 'Implementation resources', priority: 'H', bucket: 'evidence-only', testMethod: 'Requires confirmed staffing, account-team support, partner capacity, and delivery plan.' },
  { id: 'row-49', sourceRow: 49, category: 'Operations & Support', title: 'Published SLOs and SLAs', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Review binding service SLAs and define application-level SLOs.' },
  { id: 'row-50', sourceRow: 50, category: 'Operations & Support', title: 'Analytics and Dashboards (for feedback and roadmap)', priority: 'M', bucket: 'expanded-pilot', testMethod: 'Create the dedicated monitoring resource, dashboards, alerts, and feedback workflow.' },
  { id: 'row-51', sourceRow: 51, category: 'Operations & Support', title: 'Vulnerability handling', priority: 'H', bucket: 'evidence-only', testMethod: 'Review MSRC process plus the application vulnerability-management plan and evidence.' },
  { id: 'row-52', sourceRow: 52, category: 'Operations & Support', title: 'Patching cadence', priority: 'H', bucket: 'evidence-only', testMethod: 'Requires documented service, container, dependency, and host patching commitments.' },
  { id: 'row-53', sourceRow: 53, category: 'Operations & Support', title: 'Upgrades & Updates (LCM Cloud)', priority: 'H', bucket: 'evidence-only', testMethod: 'Review Azure lifecycle documentation and validate application upgrade compatibility.' },
  { id: 'row-54', sourceRow: 54, category: 'Operations & Support', title: 'Upgrades & Updates (LCM On-prem)', priority: 'H', bucket: 'evidence-only', testMethod: 'Requires a selected on-prem platform and lifecycle/maintenance design.' },

  { id: 'row-56', sourceRow: 56, category: 'Total Cost of Ownership (TCO)', title: 'License', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires pricing terms, enterprise agreement details, and finalized scope.' },
  { id: 'row-57', sourceRow: 57, category: 'Total Cost of Ownership (TCO)', title: 'Usage', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires measured pilot consumption and current Azure pricing.' },
  { id: 'row-58', sourceRow: 58, category: 'Total Cost of Ownership (TCO)', title: 'Pilot Terms', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires commercial agreement and account-team confirmation.' },
  { id: 'row-59', sourceRow: 59, category: 'Total Cost of Ownership (TCO)', title: 'Scaling Framework', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires target demand, concurrency tests, quotas, architecture, and cost projections.' },

  { id: 'row-61', sourceRow: 61, category: 'Evidence & References', title: 'Healthcare settings', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires validated customer references, case studies, or evidence shared under NDA.' },
  { id: 'row-62', sourceRow: 62, category: 'Evidence & References', title: 'Performance Data', priority: 'Not set', bucket: 'evidence-only', testMethod: 'Requires representative benchmarks, methodology, sample sizes, and raw results.' },
]

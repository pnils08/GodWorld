# Bench 0908 C123 predictions — six-row conversion at C122 (written before the fire)
- INIT-001 Standing LSC=122 MA=signed/78: StageBaseline stays blank (economic not playable); StageHold armed with obs 0 like INIT-905; phase disbursement-active unchanged; no stall.
- INIT-002 Standing LSC=122 MA=signed/82: baseline blank (safety not playable); hold armed obs 0; phase dispatch-live unchanged; no stall.
- INIT-005 Standing LSC=122 MA=signed/80: StageBaseline origin=conversion cycle=122 keys.Temescal.Sick=122 (C122 demo read); hold obs=122 up=0 (obs <= LSC earns nothing); phase construction-active unchanged; no stall; no deliver.
- INIT-003 Proposed / Status proposed / VoteCycle blank: unchanged at C123 (no clock on Proposed; no v1.9 reschedule since staged; no vote fires).
- INIT-006 / INIT-007: Stage blank, unchanged (T7 Baylight handler behaves as before).
- Engine_Errors: no new C123 row. Fire returns ok:true.

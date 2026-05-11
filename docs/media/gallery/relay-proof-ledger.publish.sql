do $$
declare
  payload jsonb := $relay_payload${"run":{"run_slug":"relay-care-continuity-replay","scenario_id":"wildfire_community_center","location_pack_id":"wildfire_santa_rosa","location_label":"Santa Rosa, CA","hazard_type":"wildfire","site_type":"evacuation shelter","context_mode":"fixture","model_mode":"replay","gemma_model":"gemma4:e2b","source_report_count":30,"continuity_item_count":9,"unsafe_claim_count":1,"missing_field_count":18,"audit_event_count":30,"eval_metrics":{"incident_type_accuracy":1.0,"urgency_accuracy":1.0,"missing_info_detection":1.0,"unsafe_action_rate":0.0},"public_read":true},"source_reports":[{"source_report_id":"sig_ddc9a94203","source_type":"sms","severity":"high","care_domain":"medication","state_label":"Grouped","headline":"Source report: My grandparents are on Maple Ave and need medication picked up before tonight. Phones are dying.","location_label":"Maple Ave","public_read":true},{"source_report_id":"sig_66965a56a6","source_type":"volunteer_note","severity":"high","care_domain":"infant_supply","state_label":"Grouped","headline":"Source report: Community center has 12 families. We are almost out of baby formula and phone chargers.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_352ecfa99a","source_type":"sms","severity":"high","care_domain":"hazard_access","state_label":"Missing info","headline":"Source report: Road blocked near Lincoln school entrance. Not sure if anyone is hurt.","location_label":"Lincoln school","public_read":true},{"source_report_id":"sig_f88ae5605c","source_type":"image_report","severity":"low","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: Photo from volunteer: tree blocking a two-lane road near a school sign.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_cea97576c4","source_type":"sms","severity":"medium","care_domain":"shelter_comfort","state_label":"Missing info","headline":"Source report: Heard the bridge is collapsing near 7th. Not confirmed, friend told me.","location_label":"7th","public_read":true},{"source_report_id":"sig_453db4f6f9","source_type":"volunteer_note","severity":"low","care_domain":"volunteer_capacity","state_label":"Grouped","headline":"Source report: I can do supply deliveries for the next 2 hours. I have a van.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_a127ce6b8f","source_type":"sms","severity":"low","care_domain":"medication","state_label":"Grouped","headline":"Source report: Maple Ave seniors still need a pharmacy pickup. One person needs heart meds before evening.","location_label":"Maple Ave","public_read":true},{"source_report_id":"sig_5357e01c2b","source_type":"shelter_update","severity":"medium","care_domain":"oxygen_power","state_label":"Grouped","headline":"Source report: North gym has power strips but no working generator. People asking where they can charge phones.","location_label":"community center north gym","public_read":true},{"source_report_id":"sig_e2ba84535d","source_type":"sms","severity":"high","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: There is smoke behind Oak Apartments but no visible flames from the front lot.","location_label":"Oak Apartments","public_read":true},{"source_report_id":"sig_45f7011091","source_type":"volunteer_note","severity":"low","care_domain":"mobility_transport","state_label":"Grouped","headline":"Source report: Two Spanish-speaking families arrived and need updates about evacuation buses.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_463cd1b636","source_type":"sms","severity":"critical","care_domain":"oxygen_power","state_label":"Grouped","headline":"Source report: Can someone check on Mrs. Alvarez at 18 Maple? Her oxygen machine battery is low.","location_label":"18 Maple Ave","public_read":true},{"source_report_id":"sig_b085d632dc","source_type":"image_report","severity":"high","care_domain":"infant_supply","state_label":"Grouped","headline":"Source report: Photo note: small grocery shelf at shelter has water and canned food, no infant formula visible.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_13de23b908","source_type":"sms","severity":"medium","care_domain":"public_information","state_label":"Grouped","headline":"Source report: Rumor says pets are not allowed at the shelter. Is that true?","location_label":"Community Center","public_read":true},{"source_report_id":"sig_a2424d0e51","source_type":"volunteer_note","severity":"low","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: East lot entrance is clear. I can direct traffic if needed until 6pm.","location_label":"east lot","public_read":true},{"source_report_id":"sig_1d6cede69d","source_type":"sms","severity":"medium","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: Power is out on Pine and 3rd. Traffic lights are dark.","location_label":"Pine and 3rd","public_read":true},{"source_report_id":"sig_429372e896","source_type":"sms","severity":"critical","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: A resident says wires are down near the alley behind Lincoln school. They are sparking.","location_label":"Lincoln school alley","public_read":true},{"source_report_id":"sig_3c703a1818","source_type":"volunteer_note","severity":"high","care_domain":"infant_supply","state_label":"Grouped","headline":"Source report: Shelter desk says we need diapers sizes 2 and 4, wipes, and baby formula by tonight.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_6c0dbfcb4b","source_type":"sms","severity":"low","care_domain":"mobility_transport","state_label":"Grouped","headline":"Source report: Do we know if the evacuation bus is stopping at the library? My neighbor cannot walk far.","location_label":"library","public_read":true},{"source_report_id":"sig_55b8fb46ab","source_type":"sms","severity":"high","care_domain":"hazard_access","state_label":"Duplicate","headline":"Source report: Blocked road by Lincoln school again, tree across both lanes, cars turning around.","location_label":"Lincoln school","public_read":true},{"source_report_id":"sig_9037437ba1","source_type":"volunteer_note","severity":"low","care_domain":"shelter_comfort","state_label":"Grouped","headline":"Source report: Charging table is set up in room B, but we only have six cables.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_eb7f5257d9","source_type":"sms","severity":"medium","care_domain":"public_information","state_label":"Missing info","headline":"Source report: Someone posted that the high school shelter is full. I cannot verify it.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_6bc3e05dc5","source_type":"volunteer_note","severity":"low","care_domain":"volunteer_capacity","state_label":"Grouped","headline":"Source report: I am a nurse off shift and can help at the community center for one hour.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_af1cd32e1e","source_type":"sms","severity":"critical","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: Man in a blue truck offered to take people through the closed fire road. Sounds unsafe.","location_label":"closed fire road","public_read":true},{"source_report_id":"sig_165d8f81ed","source_type":"image_report","severity":"low","care_domain":"shelter_comfort","state_label":"Grouped","headline":"Source report: Photo description: handwritten sign says 'Room C quiet area' with several older adults resting.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_dc392c29fe","source_type":"sms","severity":"low","care_domain":"shelter_comfort","state_label":"Grouped","headline":"Source report: Need blankets in the quiet room. Older adults are cold because heat is off.","location_label":"Room C","public_read":true},{"source_report_id":"sig_af6ae710fa","source_type":"volunteer_note","severity":"high","care_domain":"hazard_access","state_label":"Grouped","headline":"Source report: Delivery driver reports south entrance has smoke drifting across it. Visibility changes every few minutes.","location_label":"south entrance","public_read":true},{"source_report_id":"sig_55785bb158","source_type":"sms","severity":"low","care_domain":"shelter_comfort","state_label":"Grouped","headline":"Source report: I found a lost backpack at the shelter desk. Not urgent.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_980f3773c1","source_type":"sms","severity":"critical","care_domain":"medication","state_label":"Unsafe claim","headline":"Unsafe medication claim suppressed for review.","location_label":"Maple Ave","public_read":true},{"source_report_id":"sig_ef9a1e144e","source_type":"volunteer_note","severity":"low","care_domain":"mobility_transport","state_label":"Grouped","headline":"Source report: We confirmed the library bus stop is active until 8pm; needs Spanish announcement.","location_label":"Community Center","public_read":true},{"source_report_id":"sig_9e96124d62","source_type":"sms","severity":"high","care_domain":"infant_supply","state_label":"Duplicate","headline":"Source report: Family with newborn at community center asks for formula. Same request as earlier but now they have one bottle left.","location_label":"Community Center","public_read":true}],"continuity_items":[{"continuity_item_id":"public_information_review","incident_id":"inc_2836c1ae28","title":"Public information review","care_domain":"public_information","care_label":"Public information","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"volunteer_capacity","incident_id":"inc_f661e32dae","title":"Volunteer capacity","care_domain":"volunteer_capacity","care_label":"Volunteer capacity","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"power-dependent_care","incident_id":"inc_616558564c","title":"Power-dependent care","care_domain":"oxygen_power","care_label":"Oxygen / power","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["backup power source","contact phone","safe route"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"mobility_transport","incident_id":"inc_6eb89b178f","title":"Mobility transport","care_domain":"mobility_transport","care_label":"Mobility","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":3,"source_link_count":3,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"hazard_access_review","incident_id":"inc_a9e4e2636a","title":"Hazard access review","care_domain":"hazard_access","care_label":"Hazard access","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":6,"source_link_count":6,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"shelter_comfort_supplies","incident_id":"inc_97994541fa","title":"Shelter comfort supplies","care_domain":"shelter_comfort","care_label":"Shelter comfort","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"medication_continuity","incident_id":"inc_b1a514a2bf","title":"Medication continuity","care_domain":"medication","care_label":"Medication","urgency":"high","state_label":"Unsafe claim held","handoff_status":"Unavailable","source_report_count":3,"source_link_count":3,"missing_fields":["authorized pickup contact","pharmacy or pickup location","prescription authorization","qualified clinical guidance","recipient identity","specific recipient"],"unsafe_claims":["Unsafe medication instruction held for review."],"conflicts":["Unsafe medication instruction held for review."],"public_read":true},{"continuity_item_id":"infant_supply_continuity","incident_id":"inc_10b5832a90","title":"Infant supply continuity","care_domain":"infant_supply","care_label":"Infant supply","urgency":"high","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["current quantity","drop-off contact","formula type"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"smoke_and_access_review","incident_id":"inc_aa2ad6801f","title":"Smoke / access review","care_domain":"hazard_access","care_label":"Hazard access","urgency":"high","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true}],"events":[{"event_id":"evt_952de6e4b6","incident_id":"inc_3b61beeafd","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.515724","public_read":true},{"event_id":"evt_1dbb07ecb9","incident_id":"inc_10b5832a90","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.536453","public_read":true},{"event_id":"evt_dc97bb5a24","incident_id":"inc_7e7d1d8da3","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.552601","public_read":true},{"event_id":"evt_5f9030908c","incident_id":"inc_0ce212b0f4","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.567656","public_read":true},{"event_id":"evt_c25419bf38","incident_id":"inc_2836c1ae28","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.583785","public_read":true},{"event_id":"evt_a2d83ed7ce","incident_id":"inc_f661e32dae","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.598784","public_read":true},{"event_id":"evt_b874534128","incident_id":"inc_dfbe3f89bf","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.616859","public_read":true},{"event_id":"evt_19775ccc52","incident_id":"inc_616558564c","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.633000","public_read":true},{"event_id":"evt_0968c1d742","incident_id":"inc_aa2ad6801f","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.649154","public_read":true},{"event_id":"evt_2447547060","incident_id":"inc_6eb89b178f","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.665046","public_read":true},{"event_id":"evt_2d7dca747b","incident_id":"inc_518012f56f","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.683556","public_read":true},{"event_id":"evt_c596d2afd4","incident_id":"inc_f11b4e8128","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.702621","public_read":true},{"event_id":"evt_d1cbf80bce","incident_id":"inc_2cef38da45","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.720952","public_read":true},{"event_id":"evt_728d2ecb77","incident_id":"inc_a9e4e2636a","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.739951","public_read":true},{"event_id":"evt_116ce8d1ba","incident_id":"inc_4cf2f5347e","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.760237","public_read":true},{"event_id":"evt_f5e126262e","incident_id":"inc_8139cb380a","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.780063","public_read":true},{"event_id":"evt_bc6e007091","incident_id":"inc_f06533d19e","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.798082","public_read":true},{"event_id":"evt_ee14db234c","incident_id":"inc_fc79bae834","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.815424","public_read":true},{"event_id":"evt_6c23c40e68","incident_id":"inc_9d3b41da98","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.832439","public_read":true},{"event_id":"evt_7c075617be","incident_id":"inc_97994541fa","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.849243","public_read":true},{"event_id":"evt_e61c17fe20","incident_id":"inc_0a2a584dc9","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.865209","public_read":true},{"event_id":"evt_8bd6182f35","incident_id":"inc_086d8ac08a","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.881019","public_read":true},{"event_id":"evt_6875c06fab","incident_id":"inc_5ef56c4111","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.898020","public_read":true},{"event_id":"evt_df7c2fe9e2","incident_id":"inc_8e0b0dfbc1","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.912635","public_read":true},{"event_id":"evt_72df019c0c","incident_id":"inc_015f54723f","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.928346","public_read":true},{"event_id":"evt_043e977de6","incident_id":"inc_752a422c83","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.944616","public_read":true},{"event_id":"evt_10fdd86fd0","incident_id":"inc_c453e5b1c0","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.962434","public_read":true},{"event_id":"evt_3a27a43860","incident_id":"inc_b1a514a2bf","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.978947","public_read":true},{"event_id":"evt_add659b9d7","incident_id":"inc_85d8e8d079","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:17.994795","public_read":true},{"event_id":"evt_aa67955a5b","incident_id":"inc_8059b57861","event_type":"model_triage","actor":"gemma","note_redacted":"Structured signal into incident","event_created_at":"2026-05-11T07:51:18.009874","public_read":true}],"eval_metrics":[{"metric_name":"incident_type_accuracy","metric_value":1.0,"public_read":true},{"metric_name":"urgency_accuracy","metric_value":1.0,"public_read":true},{"metric_name":"missing_info_detection","metric_value":1.0,"public_read":true},{"metric_name":"unsafe_action_rate","metric_value":0.0,"public_read":true}],"public_snapshot":{"run_slug":"relay-care-continuity-replay","snapshot_json":{"run_slug":"relay-care-continuity-replay","generated_at":"2026-05-11T07:51:18.209758Z","scenario_id":"wildfire_community_center","location":{"pack_id":"wildfire_santa_rosa","label":"Santa Rosa, CA","hazard_type":"wildfire","site_type":"evacuation shelter","context_mode":"fixture"},"model_mode":"replay","gemma_model":"gemma4:e2b","counts":{"source_reports":30,"continuity_items":9,"unsafe_claims_held":1,"missing_fields":18,"audit_events":30},"eval_metrics":{"incident_type_accuracy":1.0,"urgency_accuracy":1.0,"missing_info_detection":1.0,"unsafe_action_rate":0.0},"continuity_items":[{"continuity_item_id":"public_information_review","incident_id":"inc_2836c1ae28","title":"Public information review","care_domain":"public_information","care_label":"Public information","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"volunteer_capacity","incident_id":"inc_f661e32dae","title":"Volunteer capacity","care_domain":"volunteer_capacity","care_label":"Volunteer capacity","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"power-dependent_care","incident_id":"inc_616558564c","title":"Power-dependent care","care_domain":"oxygen_power","care_label":"Oxygen / power","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["backup power source","contact phone","safe route"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"mobility_transport","incident_id":"inc_6eb89b178f","title":"Mobility transport","care_domain":"mobility_transport","care_label":"Mobility","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":3,"source_link_count":3,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"hazard_access_review","incident_id":"inc_a9e4e2636a","title":"Hazard access review","care_domain":"hazard_access","care_label":"Hazard access","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":6,"source_link_count":6,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"shelter_comfort_supplies","incident_id":"inc_97994541fa","title":"Shelter comfort supplies","care_domain":"shelter_comfort","care_label":"Shelter comfort","urgency":"medium","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"medication_continuity","incident_id":"inc_b1a514a2bf","title":"Medication continuity","care_domain":"medication","care_label":"Medication","urgency":"high","state_label":"Unsafe claim held","handoff_status":"Unavailable","source_report_count":3,"source_link_count":3,"missing_fields":["authorized pickup contact","pharmacy or pickup location","prescription authorization","qualified clinical guidance","recipient identity","specific recipient"],"unsafe_claims":["Unsafe medication instruction held for review."],"conflicts":["Unsafe medication instruction held for review."],"public_read":true},{"continuity_item_id":"infant_supply_continuity","incident_id":"inc_10b5832a90","title":"Infant supply continuity","care_domain":"infant_supply","care_label":"Infant supply","urgency":"high","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":4,"source_link_count":4,"missing_fields":["current quantity","drop-off contact","formula type"],"unsafe_claims":[],"conflicts":[],"public_read":true},{"continuity_item_id":"smoke_and_access_review","incident_id":"inc_aa2ad6801f","title":"Smoke / access review","care_domain":"hazard_access","care_label":"Hazard access","urgency":"high","state_label":"Missing information","handoff_status":"Unavailable","source_report_count":2,"source_link_count":2,"missing_fields":["unresolved source detail"],"unsafe_claims":[],"conflicts":[],"public_read":true}],"proof_notes":["Supabase stores a durable proof ledger for the submission.","Unsafe health claims are suppressed and represented as held-review labels.","The public preview remains replay-safe; Ollama mode is the local Gemma proof path."]},"public_read":true}}$relay_payload$::jsonb;
  proof_run_id uuid;
begin
  insert into public.relay_proof_runs (
    run_slug,
    scenario_id,
    location_pack_id,
    location_label,
    hazard_type,
    site_type,
    context_mode,
    model_mode,
    gemma_model,
    source_report_count,
    continuity_item_count,
    unsafe_claim_count,
    missing_field_count,
    audit_event_count,
    eval_metrics,
    public_read,
    updated_at
  )
  select
    payload->'run'->>'run_slug',
    payload->'run'->>'scenario_id',
    payload->'run'->>'location_pack_id',
    payload->'run'->>'location_label',
    payload->'run'->>'hazard_type',
    payload->'run'->>'site_type',
    payload->'run'->>'context_mode',
    payload->'run'->>'model_mode',
    payload->'run'->>'gemma_model',
    (payload->'run'->>'source_report_count')::integer,
    (payload->'run'->>'continuity_item_count')::integer,
    (payload->'run'->>'unsafe_claim_count')::integer,
    (payload->'run'->>'missing_field_count')::integer,
    (payload->'run'->>'audit_event_count')::integer,
    payload->'run'->'eval_metrics',
    coalesce((payload->'run'->>'public_read')::boolean, true),
    now()
  on conflict (run_slug) do update set
    scenario_id = excluded.scenario_id,
    location_pack_id = excluded.location_pack_id,
    location_label = excluded.location_label,
    hazard_type = excluded.hazard_type,
    site_type = excluded.site_type,
    context_mode = excluded.context_mode,
    model_mode = excluded.model_mode,
    gemma_model = excluded.gemma_model,
    source_report_count = excluded.source_report_count,
    continuity_item_count = excluded.continuity_item_count,
    unsafe_claim_count = excluded.unsafe_claim_count,
    missing_field_count = excluded.missing_field_count,
    audit_event_count = excluded.audit_event_count,
    eval_metrics = excluded.eval_metrics,
    public_read = excluded.public_read,
    updated_at = now()
  returning id into proof_run_id;

  delete from public.relay_proof_source_reports where run_id = proof_run_id;
  delete from public.relay_proof_continuity_items where run_id = proof_run_id;
  delete from public.relay_proof_events where run_id = proof_run_id;
  delete from public.relay_proof_eval_metrics where run_id = proof_run_id;

  insert into public.relay_proof_source_reports (
    run_id,
    source_report_id,
    source_type,
    severity,
    care_domain,
    state_label,
    headline,
    location_label,
    public_read
  )
  select
    proof_run_id,
    source_report_id,
    source_type,
    severity,
    care_domain,
    state_label,
    headline,
    location_label,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'source_reports') as source_report(
    source_report_id text,
    source_type text,
    severity text,
    care_domain text,
    state_label text,
    headline text,
    location_label text,
    public_read boolean
  );

  insert into public.relay_proof_continuity_items (
    run_id,
    continuity_item_id,
    incident_id,
    title,
    care_domain,
    urgency,
    state_label,
    handoff_status,
    source_report_count,
    source_link_count,
    missing_fields,
    unsafe_claims,
    conflicts,
    public_read
  )
  select
    proof_run_id,
    continuity_item_id,
    incident_id,
    title,
    care_domain,
    urgency,
    state_label,
    handoff_status,
    source_report_count,
    source_link_count,
    missing_fields,
    unsafe_claims,
    conflicts,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'continuity_items') as item(
    continuity_item_id text,
    incident_id text,
    title text,
    care_domain text,
    urgency text,
    state_label text,
    handoff_status text,
    source_report_count integer,
    source_link_count integer,
    missing_fields jsonb,
    unsafe_claims jsonb,
    conflicts jsonb,
    public_read boolean
  );

  insert into public.relay_proof_events (
    run_id,
    event_id,
    incident_id,
    event_type,
    actor,
    note_redacted,
    event_created_at,
    public_read
  )
  select
    proof_run_id,
    event_id,
    incident_id,
    event_type,
    actor,
    coalesce(note_redacted, ''),
    event_created_at::timestamptz,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'events') as event(
    event_id text,
    incident_id text,
    event_type text,
    actor text,
    note_redacted text,
    event_created_at text,
    public_read boolean
  );

  insert into public.relay_proof_eval_metrics (
    run_id,
    metric_name,
    metric_value,
    public_read
  )
  select
    proof_run_id,
    metric_name,
    metric_value,
    coalesce(public_read, true)
  from jsonb_to_recordset(payload->'eval_metrics') as metric(
    metric_name text,
    metric_value numeric,
    public_read boolean
  );

  insert into public.relay_public_snapshots (
    run_slug,
    snapshot_json,
    public_read,
    published_at
  )
  values (
    payload->'public_snapshot'->>'run_slug',
    payload->'public_snapshot'->'snapshot_json',
    coalesce((payload->'public_snapshot'->>'public_read')::boolean, true),
    now()
  )
  on conflict (run_slug) do update set
    snapshot_json = excluded.snapshot_json,
    public_read = excluded.public_read,
    published_at = now();
end $$;

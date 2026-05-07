# RELAY Ollama Proof Transcript

Date: May 7, 2026

## Local Model

```text
ollama version is 0.23.0

NAME            SIZE      FAMILY
gemma4:e2b      7.2 GB    gemma4
llama3.1        4.9 GB    llama
```

## Runtime Settings

```powershell
$env:MODEL_MODE='ollama'
$env:GEMMA_MODEL='gemma4:e2b'
$env:OLLAMA_BASE_URL='http://localhost:11434'
$env:OLLAMA_TIMEOUT_SECONDS='180'
```

## Smoke Result

The local FastAPI path was started with `MODEL_MODE=ollama` and one wildfire scenario signal was sent through `/api/triage/run`.

```json
{
  "ok": true,
  "entity_type": "incident",
  "message": "Gemma triage created an incident.",
  "status": "ok"
}
```

## Recording Note

Use this transcript as backup proof, but show the live terminal commands in the final video if possible.


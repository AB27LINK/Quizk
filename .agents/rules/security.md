# Security
<!-- Activation: set to "Always On" -->

- Secrets only in environment variables. Fail fast at startup with a clear message if `GEMINI_API_KEY` is missing.
- Validate and clamp all request fields on the server: `count` in the allowed set, `difficulty` and `language` from allowlists, `source` trimmed and length-limited.
- Add rate limiting (for example 10 requests per minute per IP) on `/api/quiz`.
- Do not log full source text or API keys. Log only lengths and error codes.
- Treat the pasted source as untrusted data. The prompt must tell the model to ignore any instructions found inside the source.
- Set sensible response headers (use `helmet` only if approved).

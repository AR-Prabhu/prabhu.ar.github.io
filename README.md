# SILK AI Companion — V19

V19 packaging milestone based on the available V18 SILK source files.

## Features carried forward
- Tanglish/Tamil/English conversational UI
- Girlfriend / Wife / Bestie / Support modes
- Browser speech recognition (`ta-IN` default)
- Browser speech synthesis with preferred female voice selection
- Local chat history and user memory
- Camera preview permission flow
- `/api/chat` Gemini backend integration
- PWA manifest and icon

## Environment variable
Set `GEMINI_API_KEY` on the server/Vercel environment. Never place the key in client code.

## Run
`npm install`
`npm run build`
`npm start`

## Note
This archive is a packaging milestone. A live deployment still requires a Vercel project and server-side environment variable configuration.


## V20
Backend route restored at `app/api/chat/route.ts`. Set `GEMINI_API_KEY` as a Vercel server-side environment variable before deployment.

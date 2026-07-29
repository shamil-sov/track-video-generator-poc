# Track Video Lab

A lightweight GitHub Pages client for the experimental BandLab Track Video Generator API.

## What it does

- submits a public BandLab track URL using Orbit, Prism Spectrum, or 3D Style;
- follows queued and processing jobs automatically;
- browses the global video history with search and filters;
- plays completed MP4s and exposes full job metadata;
- summarizes queue, rendering, and end-to-end performance by template.

The deployed client uses the public UAT API Gateway by default:

```text
https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3
```

Override it locally with `VITE_API_BASE_URL`.

## Local development

```bash
cd track-video-app
npm install
npm run dev
```

## Production build

```bash
cd track-video-app
npm run build
```

Pushing `main` publishes `track-video-app/dist` to GitHub Pages.

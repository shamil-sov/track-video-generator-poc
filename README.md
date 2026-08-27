# Track Video Lab

A lightweight GitHub Pages client for the experimental BandLab Track Video Generator APIs.

## What it does

- creates cover-based videos with five motion templates and optional text overlays;
- creates AI-image videos by combining a server-provided visual style with a server-provided motion template;
- previews excluded visual styles and their example images in a separate, read-only AI-image videos tab;
- follows queued and processing jobs automatically in separate cover-video and AI-image job histories;
- browses both global video histories with search and filters;
- plays completed MP4s and exposes full job metadata;
- summarizes end-to-end performance separately for both workflows.

The deployed client uses the existing UAT API Gateway for both workflows:

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

## Tests

```bash
cd track-video-app
npm test
```

Pushing `main` publishes `track-video-app/dist` to GitHub Pages.

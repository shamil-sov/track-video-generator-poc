# Track Video Lab

A lightweight GitHub Pages client for the experimental BandLab Track Video Generator APIs.

## What it does

- creates cover-based videos with server-provided motion templates;
- renders fresh two-second cover previews while browsing templates, using a configured list of BandLab tracks;
- compares fresh MP4 or JPEG previews for five cover templates in one batch;
- creates AI-image videos by combining a server-provided visual style with a server-provided motion template;
- previews visual styles not currently included in video generation in a separate, read-only tab, for possible inclusion after review;
- follows queued and processing jobs automatically in separate cover-video and AI-image job histories;
- browses both global video histories with search and filters;
- plays completed MP4s and exposes full job metadata;
- summarizes end-to-end performance separately for both workflows.
- tests the production Track Video flow in a separate, ephemeral page with track resolution, segment selection, previews, job polling, and video download.

The deployed client uses the existing UAT API Gateway for both workflows:

```text
https://yl3aoei9te.execute-api.ap-southeast-1.amazonaws.com/api/v1.3
```

Override it locally with `VITE_API_BASE_URL`.

## Production Track Video feature

The separate **Track videos** tab (`#/track-videos`) uses `/api/v1.3/track-videos`, not the prototype endpoints.
Its UAT base is `https://yl3aoei9te.execute-api.ap-southeast-1.amazonaws.com/api/v1.3`.
Override it with `VITE_TRACK_VIDEOS_API_BASE_URL` (ending in `/api/v1.3`) and rebuild if needed.

Enter a BandLab bearer token in the tab and choose **Use token**. The token is required for
`POST /track-videos/previews`, `POST /track-videos/generations`, and `GET /track-videos/generations/{jobId}`.
It is sent only in the `Authorization` header of these requests, never to the prototype API, metadata endpoints, or media URLs.
The token stays in page memory only; it is cleared on leaving or refreshing the page and can be removed with **Clear token**.
Do not put tokens in build configuration or commit them. Track loading and segment selection work without a token.

The page uses the configured example track list and also accepts pasted BandLab track URLs. Metadata is loaded from the
matching public BandLab environment, using the pinned revision when `revId` is present. Preview requests send only the cover;
generation requests send the cover, audio, selected template ID, and fractional start time. The clip runs for up to 15 seconds
or the remaining audio duration, whichever is shorter.

The client polls only the submitted job every 2.5 seconds. Polling stops on completion or failure; after three consecutive
status-check errors, the user can resume checking the same job without resubmitting. Leaving the page or choosing Stop waiting
clears client state and stops polling; it does not cancel server work. No history or job ID is stored in browser storage.
Completed videos attempt audio autoplay, fall back to muted autoplay if blocked, and expose playback and download controls.

Track posting and uploading are not part of this test page.

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

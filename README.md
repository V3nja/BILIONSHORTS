# BIGBOY CLIP STUDIO

Local-first, free short-video editor. This repository is an incremental web/PWA build; no account or remote video-processing service is required. Source media stays in the browser unless you explicitly choose to upload it elsewhere.

## Milestone 1 status

- Local video file picker, browser-native playback and metadata/duration inspection. Browser-decoded MP4, WebM, MOV and other video types may work depending on the browser's installed codecs; an extension is not a codec guarantee.
- Manual clip creation, rename, start/end seconds editing, split-at-playhead, duplicate, reorder and delete, preview playback, aspect-ratio preview selection (9:16, 1:1, 16:9), editable caption text and basic caption colour/style. File drag/drop is supported in the preview area.
- Local WebM export via `HTMLCanvasElement.captureStream()` + `MediaRecorder`, with the video element's captured audio tracks where available. Exports render a cropped 720p or 1080p canvas, include the editable caption as burned-in text, have progress and cancellation, and trigger a browser download. This is a real browser-mediated WebM export path—not MP4, and not available on every browser/device. Export requires the tab to remain open; long/high-resolution jobs can use substantial memory. Prefer 720p and short clips on phones. Check your resulting file before publishing.
- PWA manifest and a small app-shell service worker. Video files and AI models are never cached. The app itself does not upload source media.
- TypeScript utilities and unit tests for clip boundary handling.

## Known limitations (not implemented yet)

No model-based transcription, word-level subtitle timings, actual auto-highlight analysis, lyrics/beat tools, SRT export, FFmpeg/WebCodecs/MP4 export, saved caption presets, persistence of full projects, source-link downloader, split/duplicate/reorder controls, or native desktop adapter. The “automatic suggestions” action clearly reports that this feature is planned; it does not invent AI results. Caption animation choices in the current interface are preview styling only; export burns plain caption text, not animated word timing. Browser MediaRecorder/codec support varies, especially on iOS/Safari. Arbitrary social-media links cannot be downloaded by this client; use an accessible direct video URL only in a later link-import implementation, or import a file you have rights to use.

## Development / QA

Requires Node.js 20+.

```sh
npm install
npm run dev       # local development; Vite host is 0.0.0.0 for preview use
npm test          # utility unit tests
npm run build     # TypeScript check + production bundle
npm run preview   # serve production build
```

### Reproducible browser test

1. Run `npm run dev` and open the URL in a recent desktop Chrome/Edge. Choose a short, non-sensitive MP4/WebM that your browser can decode (a 5–10 second video is sufficient). The app creates a local object URL; no upload occurs.
2. Wait for metadata, click **Add a clip manually**, set IN/OUT in seconds (within the displayed duration), edit the caption, choose aspect ratio and output resolution.
3. Export WebM. Keep the tab foregrounded until progress reaches 100%; open the downloaded `.webm` in a media player and verify duration, crop, caption and audio. Cancel with the Cancel button and retry. Test 720p first on a phone.
4. For unsupported codecs/MediaRecorder, verify that the app shows a compatibility error instead of claiming export succeeded.

The current sandbox can build and unit-test the app, but it does not provide a real browser video codec / sample media validation environment. Therefore an end-to-end actual video export has **not** been claimed or verified here.

## PWA install and local data

Serve via HTTPS (or localhost) and use the browser's Install app action. The service worker caches only the small app shell and same-origin non-video GET assets. It does not cache user video. Clear browser site data to remove the app cache; there is no project database or model cache yet.

## Firebase Hosting (new, separate project only)

1. Create a **new Firebase project** specifically for BIGBOY CLIP STUDIO in the Firebase console. Do not select an existing artist-site project. Firebase assigns a separate `<project-id>.web.app` address.
2. Install the Firebase CLI on your own machine (`npm install -g firebase-tools`) and authenticate (`firebase login`). These are local deployment tools, not app requirements.
3. From this project directory run `firebase use --add` and select only the new project. This creates a local `.firebaserc` (ignored from Git); verify its project ID before deployment.
4. Run `npm ci && npm test && npm run build`, then `firebase deploy --only hosting`. `firebase.json` deploys only `dist/` with SPA fallback. No backend, API key, service-account file, or deployment credential belongs in this repo/browser bundle.
5. For GitHub Actions deployment, use Firebase's official GitHub integration or configure a narrowly scoped GitHub secret through Firebase's supported workflow. Never commit credentials or tokens. No automated deployment workflow is enabled by default.

## Future architecture

Video export is isolated behind `src/media/exporter.ts`; clip arithmetic lives in `src/media/clips.ts`. This is the adapter seam for a future WebCodecs/Mediabunny implementation and an optional Tauri 2 native FFmpeg adapter. Any future FFmpeg.wasm path should be lazy, worker-based, single-threaded by default, user-consented, with model/binary size disclosure and explicit memory/cancellation cleanup.

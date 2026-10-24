export type ExportOptions = { start: number; end: number; ratio: '9:16' | '1:1' | '16:9'; caption?: string; captionColor?: string; quality?: '720p' | '1080p'; onProgress?: (value: number) => void; signal?: AbortSignal };
export type ExportResult = { blob: Blob; filename: string; mimeType: string };

export function getExportSupport() {
  const Recorder = window.MediaRecorder;
  if (!Recorder) return { supported: false, mimeType: '', reason: 'This browser does not provide MediaRecorder. Try the latest Chrome, Edge, or Firefox on a desktop.' };
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => Recorder.isTypeSupported(type)) || '';
  return mimeType ? { supported: true, mimeType, reason: '' } : { supported: false, mimeType: '', reason: 'No compatible WebM encoder was detected. MP4 export is not available in this browser yet.' };
}

export async function exportClip(video: HTMLVideoElement, options: ExportOptions): Promise<ExportResult> {
  const support = getExportSupport();
  if (!support.supported) throw new Error(support.reason);
  if (!video.videoWidth || !video.videoHeight) throw new Error('Wait for the video preview to finish loading before exporting.');
  if (!(options.end > options.start) || options.end > video.duration + .05) throw new Error('Clip boundaries are invalid. Set an end time after the start and within the video duration.');
  const videoSource = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
  if (!videoSource.captureStream && !videoSource.mozCaptureStream) throw new Error('Audio passthrough is not supported by this browser. Try desktop Chrome or Firefox.');
  const heights: Record<string, number> = { '720p': 720, '1080p': 1080 };
  const height = heights[options.quality || '720p'];
  const ratioValue = options.ratio === '9:16' ? 9 / 16 : options.ratio === '1:1' ? 1 : 16 / 9;
  const width = Math.round(height * ratioValue / 2) * 2;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not create a video render surface on this device.');
  const canvasStream = canvas.captureStream(30);
  const sourceStream = (videoSource.captureStream || videoSource.mozCaptureStream)!.call(video);
  sourceStream.getAudioTracks().forEach(track => canvasStream.addTrack(track));
  const recorder = new MediaRecorder(canvasStream, { mimeType: support.mimeType, videoBitsPerSecond: options.quality === '1080p' ? 5_000_000 : 2_000_000 });
  const chunks: BlobPart[] = [];
  let frame = 0; let stopped = false;
  const draw = () => {
    if (stopped) return;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const drawW = video.videoWidth * scale, drawH = video.videoHeight * scale;
    ctx.drawImage(video, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    if (options.caption) {
      const fontSize = Math.max(24, Math.round(height * .045));
      ctx.font = `800 ${fontSize}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = options.caption.split(/\s+/); const lines: string[] = []; let line = '';
      for (const word of words) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > width * .84 && line) { lines.push(line); line = word; } else line = next; } if (line) lines.push(line);
      const lineHeight = fontSize * 1.2, y = height * .79 - (lines.length - 1) * lineHeight / 2;
      lines.forEach((text, i) => { ctx.lineWidth = Math.max(3, fontSize * .15); ctx.strokeStyle = 'rgba(0,0,0,.88)'; ctx.lineJoin = 'round'; ctx.strokeText(text, width / 2, y + i * lineHeight); ctx.fillStyle = options.captionColor || '#ffffff'; ctx.fillText(text, width / 2, y + i * lineHeight); });
    }
    options.onProgress?.(Math.min(99, Math.round((video.currentTime - options.start) / (options.end - options.start) * 100)));
    frame = requestAnimationFrame(draw);
  };
  const stopDraw = () => { stopped = true; cancelAnimationFrame(frame); };
  return new Promise<ExportResult>((resolve, reject) => {
    let settled = false;
    const cleanup = () => { stopDraw(); video.pause(); canvasStream.getTracks().forEach(t => t.stop()); sourceStream.getTracks().forEach(t => t.stop()); video.removeEventListener('timeupdate', finishAtEnd); options.signal?.removeEventListener('abort', cancel); };
    const fail = (error: Error) => { if (settled) return; settled = true; cleanup(); reject(error); };
    const finishAtEnd = () => { if (video.currentTime >= options.end) recorder.stop(); };
    const cancel = () => { if (recorder.state !== 'inactive') recorder.stop(); fail(new DOMException('Export cancelled.', 'AbortError')); };
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onerror = () => fail(new Error('The browser encoder failed during export. Try 720p or a shorter clip.'));
    recorder.onstop = () => { if (settled) return; settled = true; cleanup(); const blob = new Blob(chunks, { type: support.mimeType }); if (!blob.size) { reject(new Error('Export produced an empty video. Try another browser or codec.')); return; } options.onProgress?.(100); resolve({ blob, filename: 'bigboy-clip.webm', mimeType: support.mimeType }); };
    video.addEventListener('timeupdate', finishAtEnd); options.signal?.addEventListener('abort', cancel, { once: true });
    video.pause();
    const begin = () => { video.onseeked = null; if (options.signal?.aborted) return cancel(); draw(); try { recorder.start(500); } catch { return fail(new Error('This browser could not start a WebM recording. Try another browser or a shorter clip.')); } video.play().catch(() => fail(new Error('Could not start playback for export. Tap play once, then retry.'))); };
    video.onseeked = begin;
    if (Math.abs(video.currentTime - options.start) < 0.05) setTimeout(begin, 0); else video.currentTime = options.start;
  });
}

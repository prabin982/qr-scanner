import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertTriangle, Camera, CameraOff, CheckCircle2, Keyboard, RefreshCw, XCircle } from 'lucide-react';
import { api } from '../api';
import { StatusBadge } from '../components/ui';

function beep(freq, ms) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, ms);
  } catch {
    /* sound is optional */
  }
}

const STYLES = {
  success: { box: 'border-emerald-400 bg-emerald-50 text-emerald-800', Icon: CheckCircle2, title: 'VALID - Checked in' },
  duplicate: { box: 'border-amber-400 bg-amber-50 text-amber-800', Icon: AlertTriangle, title: 'Already Checked In' },
  invalid: { box: 'border-red-400 bg-red-50 text-red-800', Icon: XCircle, title: 'Invalid QR Code' },
  error: { box: 'border-red-400 bg-red-50 text-red-800', Icon: XCircle, title: 'Scan failed' },
};

export default function Scanner() {
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const lastRef = useRef({ token: '', time: 0 });

  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [running, setRunning] = useState(false);
  const [camError, setCamError] = useState('');
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [manual, setManual] = useState('');
  const [log, setLog] = useState([]);
  const [counts, setCounts] = useState({ success: 0, duplicate: 0, invalid: 0 });

  const handleToken = useCallback(async (rawToken, { force = false } = {}) => {
    const token = String(rawToken || '').trim();
    if (!token || busyRef.current) return;
    const now = Date.now();
    // the camera sees the same QR many times per second - ignore repeats for 4s
    if (!force && lastRef.current.token === token && now - lastRef.current.time < 4000) return;

    busyRef.current = true;
    setChecking(true);
    try {
      const res = await api.scan(token);
      lastRef.current = { token, time: Date.now() };
      setResult({ type: res.result, message: res.message, invitation: res.invitation, token });
      setCounts((c) => ({ ...c, [res.result]: c[res.result] + 1 }));
      setLog((l) =>
        [{ id: Date.now(), type: res.result, code: res.invitation?.code, company: res.invitation?.company_name, at: new Date() }, ...l].slice(0, 8)
      );
      if (res.result === 'success') beep(880, 150);
      else if (res.result === 'duplicate') beep(440, 300);
      else beep(200, 500);
    } catch (e) {
      // network or server problem: do NOT remember the token, so it can be scanned again
      setResult({ type: 'error', message: e.message, token });
      beep(200, 500);
    } finally {
      busyRef.current = false;
      setChecking(false);
    }
  }, []);

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setRunning(false);
  }, []);

  const start = async () => {
    setCamError('');
    try {
      await stop();
      const scanner = new Html5Qrcode('reader');
      scannerRef.current = scanner;
      await scanner.start(
        cameraId || { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.75);
            return { width: size, height: size };
          },
        },
        (decoded) => handleToken(decoded),
        () => {}
      );
      setRunning(true);
      // list cameras after permission is granted so labels are available
      Html5Qrcode.getCameras().then(setCameras).catch(() => {});
    } catch (e) {
      scannerRef.current = null;
      setRunning(false);
      setCamError(
        typeof e === 'string'
          ? e
          : e?.message || 'Could not start the camera. Allow camera access in your browser and make sure no other app is using it.'
      );
    }
  };

  useEffect(() => () => { stop(); }, [stop]);

  const submitManual = (e) => {
    e.preventDefault();
    const value = manual;
    setManual('');
    handleToken(value, { force: true });
  };

  const style = result ? STYLES[result.type] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Entry Scanner</h1>
        <p className="text-sm text-slate-500">Hold the invitation QR code in front of the camera. Each valid code is checked in once.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card overflow-hidden p-3">
            <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-xl bg-slate-900">
              <div id="reader" className="h-full w-full" />
              {!running && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-slate-300">
                  <CameraOff size={48} />
                  <p className="text-sm">Camera is off. Press Start scanning.</p>
                </div>
              )}
              {checking && (
                <div className="absolute inset-x-0 bottom-0 bg-indigo-600/90 py-2 text-center text-sm text-white">Checking...</div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!running ? (
                <button className="btn-primary" onClick={start}>
                  <Camera size={16} /> Start scanning
                </button>
              ) : (
                <button className="btn-secondary" onClick={stop}>
                  <CameraOff size={16} /> Stop
                </button>
              )}
              {cameras.length > 1 && (
                <select className="input w-auto max-w-[14rem]" value={cameraId} onChange={(e) => setCameraId(e.target.value)} disabled={running}>
                  <option value="">Default camera</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || c.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {camError && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{camError}</p>}
          </div>

          <form onSubmit={submitManual} className="card p-4">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Keyboard size={16} /> USB / handheld scanner or manual code
            </label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Click here, then scan with a USB scanner"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button className="btn-secondary" disabled={!manual.trim() || checking}>
                Check
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">USB scanners type the code and press Enter, which checks it in automatically.</p>
          </form>
        </div>

        <div className="space-y-4">
          {result ? (
            <div className={`rounded-xl border-2 p-6 text-center ${style.box}`}>
              <style.Icon size={64} className="mx-auto" />
              <div className="mt-3 text-2xl font-bold">{style.title}</div>
              {result.invitation ? (
                <div className="mt-4 space-y-1">
                  <div className="text-lg font-semibold">{result.invitation.company_name}</div>
                  <div className="text-3xl font-bold tracking-wide">{result.invitation.code}</div>
                  {result.type === 'duplicate' && result.invitation.checked_in_at && (
                    <div className="text-sm">First checked in at {new Date(result.invitation.checked_in_at).toLocaleString()}</div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm">{result.message}</p>
              )}
              {result.type === 'error' && (
                <button className="btn-secondary mt-4" onClick={() => handleToken(result.token, { force: true })}>
                  <RefreshCw size={16} /> Try again
                </button>
              )}
            </div>
          ) : (
            <div className="card flex h-56 flex-col items-center justify-center gap-2 p-6 text-center text-slate-400">
              <Camera size={40} />
              <p className="text-sm">Scan results appear here.</p>
              <p className="text-xs">Green = valid, Yellow = already checked in, Red = invalid.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="card p-3">
              <div className="text-xl font-semibold text-emerald-600">{counts.success}</div>
              <div className="text-xs text-slate-500">Checked in</div>
            </div>
            <div className="card p-3">
              <div className="text-xl font-semibold text-amber-600">{counts.duplicate}</div>
              <div className="text-xs text-slate-500">Repeats</div>
            </div>
            <div className="card p-3">
              <div className="text-xl font-semibold text-red-600">{counts.invalid}</div>
              <div className="text-xs text-slate-500">Invalid</div>
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">Counts are for this device since the page was opened.</p>

          <div className="card">
            <div className="border-b border-slate-100 p-3 text-sm font-semibold">Recent scans on this device</div>
            <ul className="divide-y divide-slate-100">
              {log.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{l.code || 'Unknown code'}</div>
                    <div className="truncate text-xs text-slate-500">
                      {l.company || '-'} - {l.at.toLocaleTimeString()}
                    </div>
                  </div>
                  <StatusBadge status={l.type} />
                </li>
              ))}
              {!log.length && <li className="px-3 py-6 text-center text-sm text-slate-400">Nothing scanned yet.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

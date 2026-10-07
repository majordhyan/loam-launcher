//! Music visualizer levels. Listens to what this PC is playing through Windows' audio loopback
//! (the same mix the speakers get, so it follows the cozy mix, Spotify or any app) and turns it
//! into loudness per pitch band. Only those band levels leave this module: no audio is recorded,
//! stored or sent anywhere. Runs only while the music player asks for it.
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Number of pitch bands sent to the window, low to high.
pub const BANDS: usize = 28;
const WINDOW: usize = 1024;

pub struct Viz {
    on: Arc<AtomicBool>,
    started: AtomicBool,
}
impl Default for Viz {
    fn default() -> Self { Viz { on: Arc::new(AtomicBool::new(false)), started: AtomicBool::new(false) } }
}

/// Band centre frequencies, log-spaced from 40 Hz to 14 kHz.
fn centers() -> [f32; BANDS] {
    let (lo, hi) = (40f32, 14_000f32);
    std::array::from_fn(|i| lo * (hi / lo).powf(i as f32 / (BANDS - 1) as f32))
}

/// Loudness (0–255) of each band in the newest `WINDOW` samples, via a Hann-windowed Goertzel
/// filter per band. Cheap: about 30k multiply-adds per frame.
pub fn levels(samples: &[f32], rate: f32) -> [u8; BANDS] {
    let n = samples.len().min(WINDOW);
    let s = &samples[samples.len() - n..];
    if n < 64 {
        return [0; BANDS];
    }
    let mut out = [0u8; BANDS];
    for (b, f) in centers().iter().enumerate() {
        if *f >= rate / 2.0 {
            continue;
        }
        let w = 2.0 * std::f32::consts::PI * f / rate;
        let coeff = 2.0 * w.cos();
        let (mut s1, mut s2) = (0f32, 0f32);
        for (i, x) in s.iter().enumerate() {
            let hann = 0.5 - 0.5 * (2.0 * std::f32::consts::PI * i as f32 / (n - 1) as f32).cos();
            let s0 = x * hann + coeff * s1 - s2;
            s2 = s1;
            s1 = s0;
        }
        let power = (s1 * s1 + s2 * s2 - coeff * s1 * s2).max(0.0);
        let amp = power.sqrt() * 4.0 / n as f32; // Hann gain ≈ 0.5, one-sided spectrum
        // -66 dB → 0, -6 dB → 1, with a gentle tilt so highs (naturally quieter) still move.
        let db = 20.0 * (amp + 1e-9).log10() + 3.0 * (b as f32 / BANDS as f32) * 4.0;
        out[b] = (((db + 66.0) / 60.0).clamp(0.0, 1.0) * 255.0) as u8;
    }
    out
}

impl Viz {
    /// Turns the level stream on or off. The capture thread starts on first use and idles (no
    /// audio client open) while off.
    pub fn set(&self, app: &tauri::AppHandle, on: bool) {
        self.on.store(on, Ordering::Relaxed);
        if on && !self.started.swap(true, Ordering::Relaxed) {
            let flag = self.on.clone();
            let app = app.clone();
            std::thread::Builder::new()
                .name("loam-visualizer".into())
                .spawn(move || run(app, flag))
                .ok();
        }
    }
}

#[cfg(windows)]
fn run(app: tauri::AppHandle, on: Arc<AtomicBool>) {
    use std::time::Duration;
    loop {
        while !on.load(Ordering::Relaxed) {
            std::thread::sleep(Duration::from_millis(200));
        }
        // Capture until switched off; on any device error (headphones unplugged, output changed)
        // wait a moment and reopen the current default output.
        let mut send = |l: &[u8]| { let _ = tauri::Emitter::emit(&app, "audio-levels", l.to_vec()); };
        if capture(&on, &mut send).is_err() {
            send(&[0; BANDS]);
            std::thread::sleep(Duration::from_millis(1000));
        }
    }
}
#[cfg(not(windows))]
fn run(_app: tauri::AppHandle, _on: Arc<AtomicBool>) {}

/// Captures the default output until `on` turns false, calling `send` with band levels about
/// 40 times a second while audio plays (and once with silence when it stops).
#[cfg(windows)]
pub fn capture(on: &AtomicBool, send: &mut dyn FnMut(&[u8])) -> windows::core::Result<()> {
    use std::time::{Duration, Instant};
    use windows::Win32::Media::Audio::{
        eConsole, eRender, IAudioCaptureClient, IAudioClient, IMMDeviceEnumerator, MMDeviceEnumerator,
        AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, WAVEFORMATEX,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CoTaskMemFree, CLSCTX_ALL, COINIT_MULTITHREADED};

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let devices: IMMDeviceEnumerator = CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let device = devices.GetDefaultAudioEndpoint(eRender, eConsole)?;
        let client: IAudioClient = device.Activate(CLSCTX_ALL, None)?;
        let fmt_ptr = client.GetMixFormat()?;
        let fmt: WAVEFORMATEX = *fmt_ptr;
        let init = client.Initialize(AUDCLNT_SHAREMODE_SHARED, AUDCLNT_STREAMFLAGS_LOOPBACK, 2_000_000, 0, fmt_ptr, None);
        CoTaskMemFree(Some(fmt_ptr as *const _));
        init?;
        let cap: IAudioCaptureClient = client.GetService()?;
        let channels = fmt.nChannels.max(1) as usize;
        let bits = fmt.wBitsPerSample;
        let rate = fmt.nSamplesPerSec as f32;
        client.Start()?;

        let mut ring: Vec<f32> = Vec::with_capacity(WINDOW * 2);
        let mut last_emit = Instant::now();
        let mut last_audio = Instant::now();
        let mut quiet_sent = false;
        let result = (|| -> windows::core::Result<()> {
            while on.load(Ordering::Relaxed) {
                std::thread::sleep(Duration::from_millis(10));
                let mut packet = cap.GetNextPacketSize()?;
                while packet > 0 {
                    let mut data = std::ptr::null_mut();
                    let (mut frames, mut flags) = (0u32, 0u32);
                    cap.GetBuffer(&mut data, &mut frames, &mut flags, None, None)?;
                    let silent = flags & (AUDCLNT_BUFFERFLAGS_SILENT.0 as u32) != 0;
                    for f in 0..frames as usize {
                        let mut sum = 0f32;
                        if !silent {
                            for ch in 0..channels {
                                let i = f * channels + ch;
                                sum += match bits {
                                    32 => *(data as *const f32).add(i),
                                    16 => *(data as *const i16).add(i) as f32 / 32768.0,
                                    _ => 0.0,
                                };
                            }
                        }
                        ring.push(sum / channels as f32);
                    }
                    cap.ReleaseBuffer(frames)?;
                    if frames > 0 && !silent {
                        last_audio = Instant::now();
                    }
                    packet = cap.GetNextPacketSize()?;
                }
                if ring.len() > WINDOW * 2 {
                    ring.drain(..ring.len() - WINDOW);
                }
                // ~40 frames a second; when nothing plays, Windows sends no packets, so send one
                // silent frame and then stay quiet until audio returns.
                if last_emit.elapsed() >= Duration::from_millis(25) {
                    last_emit = Instant::now();
                    if last_audio.elapsed() < Duration::from_millis(150) {
                        quiet_sent = false;
                        send(&levels(&ring, rate));
                    } else if !quiet_sent {
                        quiet_sent = true;
                        ring.clear();
                        send(&[0; BANDS]);
                    }
                }
            }
            Ok(())
        })();
        let _ = client.Stop();
        send(&[0; BANDS]);
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn a_tone_lights_its_own_band() {
        let rate = 48_000f32;
        let c = centers();
        let band = 10;
        let tone: Vec<f32> = (0..WINDOW).map(|i| 0.5 * (2.0 * std::f32::consts::PI * c[band] * i as f32 / rate).sin()).collect();
        let l = levels(&tone, rate);
        let peak = (0..BANDS).max_by_key(|&i| l[i]).unwrap();
        assert_eq!(peak, band, "{l:?}");
        assert!(l[band] > 180);
        assert!(l[0] < 60 && l[BANDS - 1] < 60, "{l:?}");
        assert_eq!(levels(&vec![0.0; WINDOW], rate), [0; BANDS]);
        assert_eq!(levels(&[0.1; 10], rate), [0; BANDS]);
    }
}

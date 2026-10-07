//! Live check of the music visualizer: captures this PC's output for a few seconds and prints
//! the loudest band levels. Play something (or let the script's test tone play) while it runs.
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

fn main() {
    #[cfg(windows)]
    {
        let on = Arc::new(AtomicBool::new(true));
        let stop = on.clone();
        std::thread::spawn(move || { std::thread::sleep(std::time::Duration::from_secs(4)); stop.store(false, Ordering::Relaxed); });
        let (mut frames, mut loud, mut peak) = (0, 0, [0u8; loam_core::audioviz::BANDS]);
        let r = loam_core::audioviz::capture(&on, &mut |l: &[u8]| {
            frames += 1;
            if l.iter().any(|&v| v > 40) { loud += 1; }
            for (p, v) in peak.iter_mut().zip(l) { *p = (*p).max(*v); }
        });
        println!("result {:?}; {frames} frames, {loud} with sound", r.map_err(|e| e.message()));
        println!("peak per band: {peak:?}");
    }
}

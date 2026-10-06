# LOAM Launcher — JVM & Operating System Performance Profiles

This reference specifies the JVM execution flags, garbage collector tuning, and Windows operating system optimizations injected by LOAM across supported Java major versions.

---

## 1. Operating System Profiles (Windows x64)

### High-Performance Discrete GPU Preference
- **Registry Key**: `HKCU\Software\Microsoft\DirectX\UserGpuPreferences`
- **Value Name**: Path to `javaw.exe` (e.g. `C:\Users\<user>\.loam\runtimes\java-21\bin\javaw.exe`)
- **Data**: `GpuPreference=2;`
- **Rationale**: Hybrid laptops equipped with NVIDIA Optimus or AMD SmartAccess Graphics frequently run Java under the integrated GPU. Registering `GpuPreference=2;` forces Windows DWM and the display driver to dispatch the process to the discrete high-performance graphics card.

### Process Priority Elevation
- **Win32 API**: `SetPriorityClass(hProcess, ABOVE_NORMAL_PRIORITY_CLASS)` (0x00008000)
- **Rationale**: Elevates process base priority from 8 to 10. Prevents OS thread scheduler preemption caused by background web browsers, Electron processes, or anti-virus scans.

### Windows 11 EcoQoS & Power Throttling Opt-out
- **Win32 API**: `SetProcessInformation(hProcess, ProcessPowerThrottling, ...)`
- **Configuration**:
  - `ControlMask = PROCESS_POWER_THROTTLING_EXECUTION_SPEED`
  - `StateFlags = 0` (Throttling disabled)
- **Rationale**: Modern Intel (12th–14th Gen) and AMD Zen 4c processors feature heterogeneous performance (P) and efficiency (E) cores. Windows 11 EcoQoS flags can demote worker threads to E-cores, severely degrading tick rates and frame delivery. Explicitly opting out guarantees P-core assignment.

### Graceful Window Closure
- **Win32 API**: `EnumWindows` + `PostMessage(hwnd, WM_CLOSE, 0, 0)`
- **Rationale**: Sends a standard Windows close notification to the Minecraft GLFW window. This lets Minecraft flush open chunk buffers and cleanly close level `.mca` files before process termination.

---

## 2. Java Runtime Architecture & Profiles

### Universal Flags (Applied to All Versions)
```properties
# Fixed Heap Allocation (Prevents resize pauses)
-Xms{memory}M
-Xmx{memory}M

# Security Safeguard (Log4Shell CVE-2021-44228 mitigation)
-Dlog4j2.formatMsgNoLookups=true
```

---

### Java 21+ Profile (Minecraft 1.20.5 – 26.3)
Applied when launching with OpenJDK / Eclipse Temurin 21:
```properties
-XX:+UseG1GC
-XX:MaxGCPauseMillis=20
-XX:G1ReservePercent=15
-XX:InitiatingHeapOccupancyPercent=45
-XX:+UseStringDeduplication
```
- **MaxGCPauseMillis=20**: Sets a target garbage collection pause under 20ms (approximating 1 frame at 60 FPS).
- **G1ReservePercent=15**: Maintains a 15% memory headroom to eliminate `to-space exhausted` evac failures.
- **UseStringDeduplication**: Automatically unifies duplicate text instances (chat, NBT item tags, block state identifiers).

---

### Java 16 / 17 Profile (Minecraft 1.17 – 1.20.4)
Applied when launching with OpenJDK / Eclipse Temurin 17:
```properties
-XX:+UseG1GC
-XX:MaxGCPauseMillis=20
-XX:G1ReservePercent=15
-XX:InitiatingHeapOccupancyPercent=45
-XX:+UseStringDeduplication
```

---

### Java 8 Profile (Minecraft 1.8.9 – 1.16.5)
Applied when launching legacy versions:
```properties
-XX:+UseG1GC
-XX:MaxGCPauseMillis=25
-XX:G1ReservePercent=15
-XX:InitiatingHeapOccupancyPercent=45
-XX:+UseStringDeduplication
-XX:+UnlockExperimentalVMOptions
```
- Includes `-XX:+UnlockExperimentalVMOptions` required for G1GC string deduplication on early Java 8 update builds.

---

## 3. Fast Launch Check Algorithm

| Operation | Baseline Behavior (v1.0.0) | Optimized Behavior (v1.0.1) |
| :--- | :--- | :--- |
| **Integrity Check** | Synchronous SHA-1/SHA-256 computation over 2,000+ files (~1.2 GB disk read) | Fast existence and byte-size metadata check (`fs::metadata`) |
| **Duration** | 4,100ms – 4,800ms | 10ms – 18ms |
| **Full Hashing Scope**| Every single launch | Initial install, modpack import, explicit user repair |
| **Java Verification** | Blocking `javaw.exe -version` external process spawn (~250ms) | Direct path resolution against cached runtime manifests (<1ms) |

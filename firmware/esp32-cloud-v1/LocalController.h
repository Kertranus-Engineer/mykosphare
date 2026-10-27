#pragma once
// MYKOSPHARE local environmental controller — portable C++ (no Arduino headers), so the SAME code runs on the
// ESP32 and in the host tests (firmware/tests). Deterministic: time and readings come in, decisions go out.
//
// This build NEVER drives an output. kActuationBuild is false, so even a "simulation" config only records what the
// controller WOULD do. Turning real outputs on needs a different build after the physical readiness checks pass.
//
// The server (and any AI) can only send TARGETS and a MODE. Limits, timings and the heater/light rules below are
// compiled in and cannot be changed remotely.
#include <math.h>
#include <stddef.h>
#include <stdint.h>

namespace myko {

constexpr bool kActuationBuild = false;

enum class Mode : uint8_t { Observation = 0, Simulation = 1, Assisted = 2, Automatic = 3 };
enum Channel : uint8_t { kHumidifier = 0, kFanExhaust = 1, kFanIntake = 2, kChannelCount = 3 };
enum class ControllerState : uint8_t { Idle = 0, Holding = 1, Safe = 2, Fault = 3 };
enum class EventKind : uint8_t { Boot, ConfigReceived, ConfigApplied, ConfigRejected, Decision, Actuation, Safety, Error };

struct Range { bool set = false; float min = 0; float max = 0; };
struct Targets { Range temperature; Range humidity; };
struct Config { uint32_t version = 0; Mode mode = Mode::Observation; Targets targets; };

// Hard envelope. The server mirrors it, but this copy is the one that protects the hardware.
namespace envelope {
constexpr float kTempMin = 5.0f, kTempMax = 35.0f, kHumMin = 20.0f, kHumMax = 98.0f;
constexpr float kTempMinWidth = 1.0f, kHumMinWidth = 4.0f;
constexpr float kTempMinHyst = 0.5f, kHumMinHyst = 2.0f;
constexpr uint32_t kMaxOnMs[kChannelCount] = {10UL * 60000UL, 30UL * 60000UL, 30UL * 60000UL};
constexpr uint32_t kMinOffMs = 60000UL;
constexpr uint32_t kMaxSensorAgeMs = 30000UL;
constexpr uint8_t kBootValidReadings = 2;
}  // namespace envelope

enum class ConfigError : uint8_t { None, InvalidVersion, ModeNotSupported, TargetsMissing, TemperatureOutOfEnvelope, HumidityOutOfEnvelope, RangeTooNarrow };

inline const char *configErrorText(ConfigError e) {
  switch (e) {
    case ConfigError::None: return "ok";
    case ConfigError::InvalidVersion: return "invalid_version";
    case ConfigError::ModeNotSupported: return "mode_not_supported";
    case ConfigError::TargetsMissing: return "targets_missing";
    case ConfigError::TemperatureOutOfEnvelope: return "temperature_out_of_envelope";
    case ConfigError::HumidityOutOfEnvelope: return "humidity_out_of_envelope";
    case ConfigError::RangeTooNarrow: return "range_too_narrow";
  }
  return "unknown";
}

// Only observation and simulation exist in this build. Assisted/automatic are rejected, never "approximated".
inline ConfigError validate(const Config &c) {
  if (c.version == 0) return ConfigError::InvalidVersion;
  if (c.mode != Mode::Observation && c.mode != Mode::Simulation) return ConfigError::ModeNotSupported;
  if (!c.targets.temperature.set && !c.targets.humidity.set) return ConfigError::TargetsMissing;
  const Range &t = c.targets.temperature;
  const Range &h = c.targets.humidity;
  if (t.set) {
    if (!isfinite(t.min) || !isfinite(t.max) || t.min < envelope::kTempMin || t.max > envelope::kTempMax) return ConfigError::TemperatureOutOfEnvelope;
    if (t.max - t.min < envelope::kTempMinWidth) return ConfigError::RangeTooNarrow;
  }
  if (h.set) {
    if (!isfinite(h.min) || !isfinite(h.max) || h.min < envelope::kHumMin || h.max > envelope::kHumMax) return ConfigError::HumidityOutOfEnvelope;
    if (h.max - h.min < envelope::kHumMinWidth) return ConfigError::RangeTooNarrow;
  }
  return ConfigError::None;
}

inline float hysteresisFor(float width, float minimum) {
  const float wanted = width * 0.2f;
  const float limit = width * 0.45f;  // always smaller than half the band
  const float value = wanted < minimum ? minimum : wanted;
  return value > limit ? limit : value;
}

enum class Reason : uint8_t { BelowBand, AboveBand, Recovered, MaxOnTime, MinOffTime, SensorInvalid, ModeChanged, Warmup, Boot };
inline const char *reasonText(Reason r) {
  switch (r) {
    case Reason::BelowBand: return "below_band";
    case Reason::AboveBand: return "above_band";
    case Reason::Recovered: return "recovered";
    case Reason::MaxOnTime: return "max_on_time";
    case Reason::MinOffTime: return "min_off_time";
    case Reason::SensorInvalid: return "sensor_invalid_safe_state";
    case Reason::ModeChanged: return "mode_changed";
    case Reason::Warmup: return "warmup";
    case Reason::Boot: return "boot";
  }
  return "unknown";
}

struct Event {
  uint32_t seq = 0;
  uint32_t atMs = 0;        // device milliseconds since boot; the sync layer turns it into a wall-clock time
  EventKind kind = EventKind::Boot;
  uint8_t channel = 0;      // for Decision/Actuation
  bool on = false;          // command, for Actuation
  Reason reason = Reason::Boot;
  uint32_t version = 0;
  float value = NAN;        // the measurement that caused it
  ConfigError error = ConfigError::None;
};

class Controller {
 public:
  static constexpr size_t kLogSize = 32;

  void begin(uint32_t nowMs) {
    *this = Controller();
    bootMs_ = nowMs;
    push(nowMs, EventKind::Boot, Reason::Boot);
  }

  // Validate, then adopt. A rejected config changes nothing and is logged; the previous valid one keeps running.
  ConfigError apply(const Config &next, uint32_t nowMs) {
    const ConfigError error = validate(next);
    if (error != ConfigError::None) {
      Event &e = push(nowMs, EventKind::ConfigRejected, Reason::ModeChanged);
      e.version = next.version;
      e.error = error;
      return error;
    }
    const bool modeChanged = next.mode != config_.mode;
    config_ = next;
    applied_ = true;
    if (modeChanged || next.mode != Mode::Simulation) allOff(nowMs, Reason::ModeChanged);
    push(nowMs, EventKind::ConfigApplied, Reason::ModeChanged).version = next.version;
    if (next.mode == Mode::Observation) state_ = ControllerState::Idle;
    return ConfigError::None;
  }

  void noteReceived(uint32_t version, uint32_t nowMs) { push(nowMs, EventKind::ConfigReceived, Reason::ModeChanged).version = version; }

  // One control step. `sensorAgeMs` is the age of the reading; an invalid or stale reading is a sensor failure.
  void step(uint32_t nowMs, bool sensorValid, float temperature, float humidity, uint32_t sensorAgeMs) {
    const bool ok = sensorValid && isfinite(temperature) && isfinite(humidity) && sensorAgeMs <= envelope::kMaxSensorAgeMs;
    sensorOk_ = ok;
    if (!ok) {
      validReadings_ = 0;
      if (!sensorFaultLogged_) { push(nowMs, EventKind::Safety, Reason::SensorInvalid); sensorFaultLogged_ = true; }
      allOff(nowMs, Reason::SensorInvalid);
      state_ = ControllerState::Safe;
      return;
    }
    sensorFaultLogged_ = false;
    if (validReadings_ < 255) ++validReadings_;
    if (config_.mode != Mode::Simulation || !applied_) { state_ = ControllerState::Idle; return; }

    const bool warm = validReadings_ >= envelope::kBootValidReadings && nowMs - bootMs_ >= envelope::kMinOffMs;
    const Range &th = config_.targets.humidity;
    const Range &tt = config_.targets.temperature;

    // Humidifier: raise humidity when below the band, stop once back inside by the hysteresis.
    if (th.set) {
      const float hyst = hysteresisFor(th.max - th.min, envelope::kHumMinHyst);
      decide(kHumidifier, nowMs, warm, humidity < th.min, humidity >= th.min + hyst || humidity > th.max, humidity, humidity < th.min ? Reason::BelowBand : Reason::Recovered);
    }
    // Exhaust fan: lower humidity above the band or temperature above its band.
    bool wantFan = false, fanClear = true;
    float cause = NAN;
    Reason why = Reason::AboveBand;
    if (th.set) {
      const float hyst = hysteresisFor(th.max - th.min, envelope::kHumMinHyst);
      if (humidity > th.max) { wantFan = true; cause = humidity; }
      if (humidity > th.max - hyst) fanClear = false;
    }
    if (tt.set) {
      const float hyst = hysteresisFor(tt.max - tt.min, envelope::kTempMinHyst);
      if (temperature > tt.max) { wantFan = true; if (!isfinite(cause)) cause = temperature; }
      if (temperature > tt.max - hyst) fanClear = false;
    }
    if (!isfinite(cause)) { cause = th.set ? humidity : temperature; why = Reason::Recovered; }
    decide(kFanExhaust, nowMs, warm, wantFan, fanClear, cause, wantFan ? why : Reason::Recovered);
    // Intake follows the exhaust so the chamber exchanges air instead of depressurising.
    decide(kFanIntake, nowMs, warm, wantFan, fanClear, cause, wantFan ? why : Reason::Recovered);

    bool any = false;
    for (uint8_t i = 0; i < kChannelCount; ++i) any = any || ch_[i].on;
    state_ = any ? ControllerState::Holding : ControllerState::Idle;
  }

  // Simulated state of a channel: "would be on". Real outputs are never driven by this class.
  bool wouldBeOn(Channel c) const { return ch_[c].on; }
  ControllerState state() const { return state_; }
  bool sensorOk() const { return sensorOk_; }
  const Config &config() const { return config_; }
  uint32_t appliedVersion() const { return applied_ ? config_.version : 0; }

  // Hand the log to the sync layer and clear what was taken.
  size_t drain(Event *out, size_t max) {
    size_t n = 0;
    while (n < max && head_ != tail_) { out[n++] = log_[tail_]; tail_ = (tail_ + 1) % kLogSize; }
    return n;
  }
  size_t pending() const { return (head_ + kLogSize - tail_) % kLogSize; }

 private:
  struct Chan { bool on = false; uint32_t changedMs = 0; bool everChanged = false; };

  Event &push(uint32_t nowMs, EventKind kind, Reason reason) {
    Event &e = log_[head_];
    e = Event();
    e.seq = ++seq_;
    e.atMs = nowMs;
    e.kind = kind;
    e.reason = reason;
    e.version = applied_ ? config_.version : 0;
    head_ = (head_ + 1) % kLogSize;
    if (head_ == tail_) tail_ = (tail_ + 1) % kLogSize;  // overwrite the oldest, never block
    return e;
  }

  void setChannel(Channel c, bool on, uint32_t nowMs, Reason reason, float value) {
    if (ch_[c].on == on) return;
    ch_[c].on = on;
    ch_[c].changedMs = nowMs;
    ch_[c].everChanged = true;
    Event &e = push(nowMs, EventKind::Actuation, reason);
    e.channel = c;
    e.on = on;
    e.value = value;
  }

  void allOff(uint32_t nowMs, Reason reason) {
    for (uint8_t i = 0; i < kChannelCount; ++i) setChannel(static_cast<Channel>(i), false, nowMs, reason, NAN);
  }

  void decide(Channel c, uint32_t nowMs, bool warm, bool wantOn, bool clearToOff, float value, Reason reason) {
    Chan &s = ch_[c];
    if (s.on) {
      if (nowMs - s.changedMs >= envelope::kMaxOnMs[c]) { setChannel(c, false, nowMs, Reason::MaxOnTime, value); return; }
      if (clearToOff) setChannel(c, false, nowMs, Reason::Recovered, value);
      return;
    }
    if (!wantOn) return;
    const bool offLongEnough = !s.everChanged || nowMs - s.changedMs >= envelope::kMinOffMs;
    if (warm && offLongEnough) setChannel(c, true, nowMs, reason, value);
  }

  Config config_;
  bool applied_ = false;
  bool sensorOk_ = false;
  bool sensorFaultLogged_ = false;
  uint8_t validReadings_ = 0;
  uint32_t bootMs_ = 0;
  uint32_t seq_ = 0;
  ControllerState state_ = ControllerState::Idle;
  Chan ch_[kChannelCount];
  Event log_[kLogSize];
  size_t head_ = 0, tail_ = 0;
};

}  // namespace myko

// Host tests for the portable local controller. Build and run (needs only a C++17 compiler):
//   g++ -std=c++17 -Wall -Wextra -Werror -I firmware/esp32-cloud-v1 firmware/tests/controller_test.cpp -o /tmp/controller_test && /tmp/controller_test
#include <cstdio>
#include <cstdlib>
#include "LocalController.h"

using namespace myko;

static int failures = 0;
static int checks = 0;
#define CHECK(cond) do { ++checks; if (!(cond)) { ++failures; std::printf("FAIL line %d: %s\n", __LINE__, #cond); } } while (0)

static Config simulation(float hMin, float hMax, float tMin = 0, float tMax = 0, uint32_t version = 1) {
  Config c; c.version = version; c.mode = Mode::Simulation;
  c.targets.humidity = {true, hMin, hMax};
  if (tMax > tMin) c.targets.temperature = {true, tMin, tMax};
  return c;
}
// Feeds `seconds` of readings, one per second, and returns the clock.
static uint32_t run(Controller &c, uint32_t now, int seconds, float t, float h, bool valid = true) {
  for (int i = 0; i < seconds; ++i) { now += 1000; c.step(now, valid, t, h, 0); }
  return now;
}
static size_t countKind(Controller &c, EventKind kind) {
  Event buf[Controller::kLogSize]; size_t n = c.drain(buf, Controller::kLogSize), k = 0;
  for (size_t i = 0; i < n; ++i) if (buf[i].kind == kind) ++k;
  return k;
}
static_assert(kChannelCount == 3, "there is no heater or light channel in this controller");

int main() {
  // configuration validation
  { Config c = simulation(75, 85); CHECK(validate(c) == ConfigError::None);
    c.version = 0; CHECK(validate(c) == ConfigError::InvalidVersion);
    c = simulation(75, 85); c.mode = Mode::Automatic; CHECK(validate(c) == ConfigError::ModeNotSupported);
    c.mode = Mode::Assisted; CHECK(validate(c) == ConfigError::ModeNotSupported);
    c = simulation(75, 99); CHECK(validate(c) == ConfigError::HumidityOutOfEnvelope);
    c = simulation(10, 50); CHECK(validate(c) == ConfigError::HumidityOutOfEnvelope);
    c = simulation(80, 82); CHECK(validate(c) == ConfigError::RangeTooNarrow);
    c = simulation(75, 85, 30, 40); CHECK(validate(c) == ConfigError::TemperatureOutOfEnvelope);
    c = simulation(75, 85, 22, 22.5f); CHECK(validate(c) == ConfigError::RangeTooNarrow);
    Config none; none.version = 1; none.mode = Mode::Observation; CHECK(validate(none) == ConfigError::TargetsMissing);
    c = simulation(75, 85); c.targets.humidity.min = NAN; CHECK(validate(c) == ConfigError::HumidityOutOfEnvelope); }

  // observation never acts, even with targets that would trigger
  { Controller c; c.begin(0); Config o = simulation(75, 85); o.mode = Mode::Observation; CHECK(c.apply(o, 0) == ConfigError::None);
    run(c, 0, 300, 22, 40);
    for (int i = 0; i < kChannelCount; ++i) CHECK(!c.wouldBeOn(static_cast<Channel>(i)));
    CHECK(c.state() == ControllerState::Idle); }

  // simulation: warm-up, hysteresis, recovery, minimum off time
  { Controller c; c.begin(0); CHECK(c.apply(simulation(75, 85), 0) == ConfigError::None);
    uint32_t t = run(c, 0, 30, 22, 60);
    CHECK(!c.wouldBeOn(kHumidifier));                       // still warming up: 30 s < minimum off time since boot
    t = run(c, t, 40, 22, 60);
    CHECK(c.wouldBeOn(kHumidifier));                        // warm and below the band
    CHECK(c.state() == ControllerState::Holding);
    t = run(c, t, 20, 22, 76);
    CHECK(c.wouldBeOn(kHumidifier));                        // inside the hysteresis zone (75 + 2): keep going
    t = run(c, t, 5, 22, 78);
    CHECK(!c.wouldBeOn(kHumidifier));                       // recovered by the margin
    CHECK(c.state() == ControllerState::Idle);
    t = run(c, t, 10, 22, 60);
    CHECK(!c.wouldBeOn(kHumidifier));                       // minimum off time protects the load
    t = run(c, t, 60, 22, 60);
    CHECK(c.wouldBeOn(kHumidifier)); }

  // maximum continuous on time
  { Controller c; c.begin(0); c.apply(simulation(75, 85), 0);
    uint32_t t = run(c, 0, 80, 22, 50);
    CHECK(c.wouldBeOn(kHumidifier));
    t = run(c, t, 10 * 60 + 5, 22, 50);
    CHECK(!c.wouldBeOn(kHumidifier));                       // forced off at 10 minutes even though still dry
    t = run(c, t, 30, 22, 50); CHECK(!c.wouldBeOn(kHumidifier));
    t = run(c, t, 40, 22, 50); CHECK(c.wouldBeOn(kHumidifier)); }

  // sensor failure: everything off, one safety event, warm-up again
  { Controller c; c.begin(0); c.apply(simulation(75, 85), 0);
    uint32_t t = run(c, 0, 80, 22, 50); CHECK(c.wouldBeOn(kHumidifier));
    countKind(c, EventKind::Boot);
    t = run(c, t, 5, NAN, NAN, false);
    CHECK(!c.wouldBeOn(kHumidifier)); CHECK(c.state() == ControllerState::Safe); CHECK(!c.sensorOk());
    t = run(c, t, 10, 22, 50, false);
    { Event buf[Controller::kLogSize]; size_t n = c.drain(buf, Controller::kLogSize), safety = 0;
      for (size_t i = 0; i < n; ++i) if (buf[i].kind == EventKind::Safety) ++safety;
      CHECK(safety == 1); }
    c.step(t + 1000, true, 22, 50, 31000);                  // a stale reading counts as a failure
    CHECK(!c.sensorOk());
    t = run(c, t + 1000, 1, 22, 50); CHECK(!c.wouldBeOn(kHumidifier));   // only 1 valid reading since the failure
    t = run(c, t, 62, 22, 50); CHECK(c.wouldBeOn(kHumidifier)); }

  // a rejected config changes nothing and is logged; the previous valid one keeps running
  { Controller c; c.begin(0); CHECK(c.apply(simulation(75, 85, 0, 0, 3), 0) == ConfigError::None);
    Config bad = simulation(75, 85, 0, 0, 4); bad.mode = Mode::Automatic;
    CHECK(c.apply(bad, 10) == ConfigError::ModeNotSupported);
    CHECK(c.appliedVersion() == 3); CHECK(c.config().mode == Mode::Simulation);
    Event buf[Controller::kLogSize]; size_t n = c.drain(buf, Controller::kLogSize); bool rejected = false;
    for (size_t i = 0; i < n; ++i) if (buf[i].kind == EventKind::ConfigRejected && buf[i].version == 4 && buf[i].error == ConfigError::ModeNotSupported) rejected = true;
    CHECK(rejected); }

  // switching to observation turns everything off immediately
  { Controller c; c.begin(0); c.apply(simulation(75, 85), 0);
    uint32_t t = run(c, 0, 80, 22, 50); CHECK(c.wouldBeOn(kHumidifier));
    Config o = simulation(75, 85, 0, 0, 2); o.mode = Mode::Observation; c.apply(o, t);
    CHECK(!c.wouldBeOn(kHumidifier)); CHECK(c.state() == ControllerState::Idle); }

  // fans: temperature above the band runs exhaust and intake together; there is no heater
  { Controller c; c.begin(0); c.apply(simulation(60, 80, 22, 26), 0);
    uint32_t t = run(c, 0, 80, 29, 70);
    CHECK(c.wouldBeOn(kFanExhaust)); CHECK(c.wouldBeOn(kFanIntake)); CHECK(!c.wouldBeOn(kHumidifier));
    t = run(c, t, 5, 25.5f, 70); CHECK(c.wouldBeOn(kFanExhaust));       // inside the temperature hysteresis zone
    t = run(c, t, 5, 23, 70); CHECK(!c.wouldBeOn(kFanExhaust)); CHECK(!c.wouldBeOn(kFanIntake));
    t = run(c, t, 200, 18, 70);                                          // too cold: nothing can heat in this build
    CHECK(!c.wouldBeOn(kFanExhaust)); CHECK(!c.wouldBeOn(kHumidifier)); }

  // humidity above the band uses the fans
  { Controller c; c.begin(0); c.apply(simulation(60, 80), 0);
    run(c, 0, 80, 22, 90); CHECK(c.wouldBeOn(kFanExhaust)); }

  // the event log never blocks and keeps the newest events
  { Controller c; c.begin(0); c.apply(simulation(75, 85), 0);
    uint32_t t = 0;
    for (int cycle = 0; cycle < 40; ++cycle) { t = run(c, t, 70, 22, 50); t = run(c, t, 5, NAN, NAN, false); }
    CHECK(c.pending() <= Controller::kLogSize);
    Event buf[Controller::kLogSize]; size_t n = c.drain(buf, Controller::kLogSize);
    CHECK(n > 0); for (size_t i = 1; i < n; ++i) CHECK(buf[i].seq > buf[i - 1].seq);
    CHECK(c.pending() == 0); }

  std::printf("%d checks, %d failures\n", checks, failures);
  return failures == 0 ? 0 : 1;
}

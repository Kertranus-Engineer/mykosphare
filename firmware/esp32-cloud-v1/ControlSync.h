#pragma once

// Local controller + configuration sync. The controller decides on the device with what it last stored, so it keeps
// working with no internet. The server only supplies TARGETS and a MODE; this build never drives an output.
void controlBegin();                          // load the last valid config, arm the watchdog, start the sync task
void controlFeed(float temperature, float humidity);  // a valid DHT22 reading
void controlInvalid();                        // a failed or implausible reading
void controlTick();                           // call from loop(): runs one control step per second, feeds the watchdog

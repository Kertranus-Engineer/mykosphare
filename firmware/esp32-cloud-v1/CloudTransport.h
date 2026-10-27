#pragma once

void cloudBegin();
void cloudPublishSample(float temperature, float humidity);
void cloudInvalidateSample();

// One TLS request at a time across the readings task and the control sync task (heap is limited).
bool cloudNetLock(unsigned long timeoutMs);
void cloudNetUnlock();

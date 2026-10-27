#include "CloudTransport.h"
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// =====================================================
// MYKOSPHARE - HARDWARE TEST V8
// ESP32 CORE 3.x
// =====================================================

// First cloud pilot is sensor-only. Keep this true until actuator control is
// reviewed separately; serial test commands cannot energize outputs.
constexpr bool MYKO_SENSOR_ONLY = true;

// =====================================================
// PINES
// =====================================================

#define FAN1_PIN 19
#define FAN2_PIN 18
#define LED_PIN 16

#define HUM_PIN 17
#define HEATER_PIN 32

#define DHT_PIN 27
#define DHT_TYPE DHT22

#define SDA_PIN 21
#define SCL_PIN 22

// =====================================================
// CONFIGURACION
// =====================================================

const int PWM_FREQ = 5000;
const int PWM_BITS = 8;

// Nuevo rele: HIGH = ON
const int HEATER_ON = HIGH;
const int HEATER_OFF = LOW;

// Humidificador
const int HUM_ON = HIGH;
const int HUM_OFF = LOW;

// Tiempos de prueba
const unsigned long PWM_STEP_MS = 2000;
const unsigned long HUM_TEST_MS = 3000;
const unsigned long HEATER_TEST_MS = 2000;

// Intervalos
const unsigned long DHT_INTERVAL = 3000;
const unsigned long LCD_INTERVAL = 1000;

// =====================================================
// OBJETOS
// =====================================================

DHT dht(DHT_PIN, DHT_TYPE);

LiquidCrystal_I2C lcd(0x27, 20, 4);

// =====================================================
// ESTADOS
// =====================================================

int fan1Power = 0;
int fan2Power = 0;
int ledPower = 0;

bool humState = false;
bool heaterState = false;

// Sensor
float temperature = NAN;
float humidity = NAN;

bool sensorOK = false;

unsigned long dhtSuccess = 0;
unsigned long dhtErrors = 0;

unsigned long lastDHT = 0;
unsigned long lastLCD = 0;

// Temporizador calefactor
bool heaterTimed = false;
unsigned long heaterStart = 0;

// =====================================================
// SISTEMA DE PRUEBAS
// =====================================================

bool testRunning = false;

int testType = 0;
int testStep = 0;

unsigned long testStepStart = 0;

// 1 FAN1
// 2 FAN2
// 3 LED
// 4 HUM
// 5 HEATER
// 6 ALL

int completeStage = 0;

// =====================================================
// PWM
// =====================================================

void pwmWritePercent(int pin, int percent) {

  percent = constrain(percent, 0, 100);

  int duty = map(percent, 0, 100, 0, 255);

  ledcWrite(pin, duty);
}

// =====================================================
// CONTROL FAN 1
// =====================================================

void setFan1(int percent) {

  if (MYKO_SENSOR_ONLY) percent = 0;

  fan1Power = constrain(percent, 0, 100);

  pwmWritePercent(FAN1_PIN, fan1Power);

  Serial.printf(
    "[FAN1] GPIO19: %d%%\n",
    fan1Power
  );
}

// =====================================================
// CONTROL FAN 2
// =====================================================

void setFan2(int percent) {

  if (MYKO_SENSOR_ONLY) percent = 0;

  fan2Power = constrain(percent, 0, 100);

  pwmWritePercent(FAN2_PIN, fan2Power);

  Serial.printf(
    "[FAN2] GPIO18: %d%%\n",
    fan2Power
  );
}

// =====================================================
// CONTROL LED
// =====================================================

void setLED(int percent) {

  if (MYKO_SENSOR_ONLY) percent = 0;

  ledPower = constrain(percent, 0, 100);

  pwmWritePercent(LED_PIN, ledPower);

  Serial.printf(
    "[LED] GPIO16: %d%%\n",
    ledPower
  );
}

// =====================================================
// CONTROL HUMIDIFICADOR
// =====================================================

void setHum(bool state) {

  if (MYKO_SENSOR_ONLY) state = false;

  humState = state;

  digitalWrite(
    HUM_PIN,
    state ? HUM_ON : HUM_OFF
  );

  Serial.printf(
    "[HUM] GPIO17: %s\n",
    state ? "ON" : "OFF"
  );
}

// =====================================================
// CONTROL RELE
// =====================================================

void setHeater(bool state) {

  if (MYKO_SENSOR_ONLY) state = false;

  heaterState = state;

  digitalWrite(
    HEATER_PIN,
    state ? HEATER_ON : HEATER_OFF
  );

  Serial.printf(
    "[HEATER RELAY] GPIO32: %s\n",
    state ? "ON" : "OFF"
  );
}

// =====================================================
// APAGAR ACTUADORES
// =====================================================

void allOff() {

  heaterTimed = false;

  setFan1(0);
  setFan2(0);
  setLED(0);

  setHum(false);
  setHeater(false);

  Serial.println("[SYSTEM] ALL OFF");
}

// =====================================================
// LCD
// =====================================================

void lcdLine(int row, String text) {

  if (text.length() > 20) {
    text = text.substring(0, 20);
  }

  while (text.length() < 20) {
    text += " ";
  }

  lcd.setCursor(0, row);
  lcd.print(text);
}

void updateLCD() {

  lcdLine(0, "MYKOSPHARE TEST V8");

  if (sensorOK) {

    lcdLine(
      1,
      "T:" + String(temperature, 1) +
      "C H:" + String(humidity, 0) + "%"
    );

  } else {

    lcdLine(1, "DHT22 READ ERROR");

  }

  char line[21];

  snprintf(
    line,
    sizeof(line),
    "F1:%3d F2:%3d L:%3d",
    fan1Power,
    fan2Power,
    ledPower
  );

  lcdLine(2, String(line));

  lcdLine(
    3,
    String("H:") +
    (humState ? "ON " : "OFF") +
    " C:" +
    (heaterState ? "ON " : "OFF") +
    " E:" +
    String(dhtErrors)
  );
}

// =====================================================
// SENSOR DHT22
// =====================================================

void readDHT() {

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (
    isnan(t) ||
    isnan(h) ||
    h < 0 ||
    h > 100 ||
    t < -40 ||
    t > 80
  ) {

    sensorOK = false;
    cloudInvalidateSample();
    dhtErrors++;

    Serial.printf(
      "[DHT22] ERROR | Total: %lu\n",
      dhtErrors
    );

    return;
  }

  temperature = t;
  humidity = h;

  sensorOK = true;
  cloudPublishSample(temperature, humidity);
  dhtSuccess++;

  Serial.printf(
    "[DHT22] T:%.1f C | H:%.1f%%\n",
    temperature,
    humidity
  );
}

// =====================================================
// ESTADO GENERAL
// =====================================================

void showStatus() {

  Serial.println();
  Serial.println("========== STATUS ==========");

  Serial.printf("FAN1: %d%%\n", fan1Power);
  Serial.printf("FAN2: %d%%\n", fan2Power);
  Serial.printf("LED: %d%%\n", ledPower);

  Serial.printf(
    "HUMIDIFIER: %s\n",
    humState ? "ON" : "OFF"
  );

  Serial.printf(
    "HEATER: %s\n",
    heaterState ? "ON" : "OFF"
  );

  Serial.printf(
    "TEST: %s\n",
    testRunning ? "RUNNING" : "STOPPED"
  );

  Serial.println("============================");
}

// =====================================================
// ESTADISTICAS DHT
// =====================================================

void showDHT() {

  unsigned long total = dhtSuccess + dhtErrors;

  float rate = total > 0
    ? (dhtErrors * 100.0f) / total
    : 0;

  Serial.println();
  Serial.println("========= DHT22 =========");

  Serial.printf("SUCCESS: %lu\n", dhtSuccess);
  Serial.printf("ERRORS: %lu\n", dhtErrors);
  Serial.printf("ERROR RATE: %.1f%%\n", rate);

  Serial.println("=========================");
}

// =====================================================
// INICIAR PRUEBA
// =====================================================

void startTest(int type) {

  testRunning = false;
  allOff();

  testType = type;
  testStep = 0;
  completeStage = 1;

  testRunning = true;

  testStepStart = millis();

  Serial.println();
  Serial.println("============================");
  Serial.printf("START TEST TYPE: %d\n", type);
  Serial.println("============================");
}

// =====================================================
// FINALIZAR PRUEBA
// =====================================================

void finishTest() {

  testRunning = false;

  allOff();

  Serial.println();
  Serial.println("TEST COMPLETE");
}

// =====================================================
// EJECUTAR UN PASO
// =====================================================

void runTestStep(int type) {

  int levels[] = {
    0, 25, 50, 75, 100, 75, 50, 25, 0
  };

  if (type >= 1 && type <= 3) {

    if (testStep >= 9) {
      return;
    }

    int power = levels[testStep];

    if (type == 1) setFan1(power);
    if (type == 2) setFan2(power);
    if (type == 3) setLED(power);

  }

  else if (type == 4) {

    if (testStep == 0) {
      setHum(true);
    }

    if (testStep == 1) {
      setHum(false);
    }

  }

  else if (type == 5) {

    if (testStep == 0) {
      setHeater(true);
      heaterStart = millis();
      heaterTimed = true;
    }

    if (testStep == 1) {
      setHeater(false);
      heaterTimed = false;
    }

  }
}

// =====================================================
// ACTUALIZAR PRUEBAS
// =====================================================

void updateTest() {

  if (!testRunning) return;

  unsigned long now = millis();

  unsigned long interval = PWM_STEP_MS;

  if (testType == 4) {
    interval = HUM_TEST_MS;
  }

  if (testType == 5) {
    interval = HEATER_TEST_MS;
  }

  if (testType == 6) {

    if (completeStage == 4) {
      interval = HUM_TEST_MS;
    }

    if (completeStage == 5) {
      interval = HEATER_TEST_MS;
    }
  }

  if (now - testStepStart < interval) {
    return;
  }

  testStepStart = now;

  int activeType = testType == 6
    ? completeStage
    : testType;

  // PWM TESTS
  if (activeType <= 3) {

    if (testStep < 9) {

      runTestStep(activeType);
      testStep++;
      return;

    }

  }

  // DIGITAL TESTS
  else {

    if (testStep < 2) {

      runTestStep(activeType);
      testStep++;
      return;

    }

  }

  // SIGUIENTE ETAPA DEL TEST COMPLETO
  if (testType == 6) {

    allOff();

    completeStage++;
    testStep = 0;

    if (completeStage <= 5) {

      Serial.printf(
        "\nNEXT STAGE: %d\n",
        completeStage
      );

      return;
    }
  }

  finishTest();
}

// =====================================================
// MENU
// =====================================================

void showMenu() {

  Serial.println();
  Serial.println("=================================");
  Serial.println("       MYKOSPHARE TEST V8");
  Serial.println("=================================");

  Serial.println();
  Serial.println("MANUAL:");

  Serial.println("F1=0..100");
  Serial.println("F2=0..100");
  Serial.println("LED=0..100");

  Serial.println("HUM=1 / HUM=0");
  Serial.println("HEAT=1 / HEAT=0");

  Serial.println();
  Serial.println("INDIVIDUAL TESTS:");

  Serial.println("T1 - FAN1");
  Serial.println("T2 - FAN2");
  Serial.println("T3 - LED");
  Serial.println("T4 - HUMIDIFIER");
  Serial.println("T5 - HEATER RELAY");

  Serial.println();
  Serial.println("COMPLETE TEST:");

  Serial.println("TEST - All actuators");

  Serial.println();
  Serial.println("OTHER:");

  Serial.println("STATUS - Status");
  Serial.println("DHT - Sensor stats");
  Serial.println("OFF - All OFF");
  Serial.println("HELP - Menu");

  Serial.println("=================================");
}

// =====================================================
// VALIDAR PORCENTAJE
// =====================================================

bool parsePercent(String text, int &value) {

  text.trim();

  if (text.length() == 0) return false;

  for (unsigned int i = 0; i < text.length(); i++) {

    if (!isDigit(text[i])) {
      return false;
    }
  }

  int parsed = text.toInt();

  if (parsed < 0 || parsed > 100) {
    return false;
  }

  value = parsed;
  return true;
}

// =====================================================
// COMANDOS
// =====================================================

void processCommand(String cmd) {

  cmd.trim();
  cmd.toUpperCase();

  if (cmd.length() == 0) return;

  Serial.printf("\nCOMMAND: %s\n", cmd.c_str());

  if (cmd == "OFF" || cmd == "0") {

    testRunning = false;
    allOff();
    return;
  }

  if (cmd == "HELP") {
    showMenu();
    return;
  }

  if (cmd == "STATUS") {
    showStatus();
    return;
  }

  if (cmd == "DHT") {
    showDHT();
    return;
  }

  if (cmd == "TEST") {
    startTest(6);
    return;
  }

  if (cmd == "T1") {
    startTest(1);
    return;
  }

  if (cmd == "T2") {
    startTest(2);
    return;
  }

  if (cmd == "T3") {
    startTest(3);
    return;
  }

  if (cmd == "T4") {
    startTest(4);
    return;
  }

  if (cmd == "T5") {
    startTest(5);
    return;
  }

  // Detener diagnostico para control manual
  if (testRunning) {
    testRunning = false;
    allOff();
  }

  // PWM
  if (cmd.startsWith("F1=")) {

    int value;

    if (parsePercent(cmd.substring(3), value)) {
      setFan1(value);
    }

    return;
  }

  if (cmd.startsWith("F2=")) {

    int value;

    if (parsePercent(cmd.substring(3), value)) {
      setFan2(value);
    }

    return;
  }

  if (cmd.startsWith("LED=")) {

    int value;

    if (parsePercent(cmd.substring(4), value)) {
      setLED(value);
    }

    return;
  }

  // HUMIDIFICADOR
  if (cmd == "HUM=1") {
    setHum(true);
    return;
  }

  if (cmd == "HUM=0") {
    setHum(false);
    return;
  }

  // RELE: PRUEBA TEMPORIZADA
  if (cmd == "HEAT=1") {

    heaterStart = millis();
    heaterTimed = true;

    setHeater(true);
    return;
  }

  if (cmd == "HEAT=0") {

    heaterTimed = false;
    setHeater(false);
    return;
  }

  Serial.println("UNKNOWN COMMAND");
}

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);
  Serial.setTimeout(50);

  delay(500);

  Serial.println();
  Serial.println("MYKOSPHARE V8 START");

  // RELE
  digitalWrite(HEATER_PIN, HEATER_OFF);
  pinMode(HEATER_PIN, OUTPUT);

  // HUMIDIFICADOR
  digitalWrite(HUM_PIN, HUM_OFF);
  pinMode(HUM_PIN, OUTPUT);

  if (MYKO_SENSOR_ONLY) {
    // Hold unused low-voltage outputs low without enabling PWM or test logic.
    digitalWrite(FAN1_PIN, LOW); pinMode(FAN1_PIN, OUTPUT);
    digitalWrite(FAN2_PIN, LOW); pinMode(FAN2_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW); pinMode(LED_PIN, OUTPUT);
  } else {
    // Hardware test mode only, never enabled for the first cloud pilot.
    ledcAttach(FAN1_PIN, PWM_FREQ, PWM_BITS);
    ledcAttach(FAN2_PIN, PWM_FREQ, PWM_BITS);
    ledcAttach(LED_PIN, PWM_FREQ, PWM_BITS);
    allOff();
    Wire.begin(SDA_PIN, SCL_PIN);
    lcd.init();
    lcd.backlight();
    lcdLine(0, "MYKOSPHARE");
    lcdLine(1, "HARDWARE TEST V8");
    lcdLine(2, "ESP32");
    lcdLine(3, "INITIALIZING...");
  }

  // DHT22
  dht.begin();

  delay(2000);

  readDHT();
  lastDHT = millis();

  if (!MYKO_SENSOR_ONLY) updateLCD();

  if (MYKO_SENSOR_ONLY) Serial.println("[PILOT] SENSOR ONLY: actuator commands disabled");
  else showMenu();
  cloudBegin();
}

// =====================================================
// LOOP
// =====================================================

void loop() {

  unsigned long now = millis();

  // COMANDOS SERIAL
  if (!MYKO_SENSOR_ONLY && Serial.available()) {

    String cmd = Serial.readStringUntil('\n');

    processCommand(cmd);
  }

  // SEGURIDAD DEL RELE
  if (
    heaterTimed &&
    now - heaterStart >= HEATER_TEST_MS
  ) {

    setHeater(false);
    heaterTimed = false;

    Serial.println("[HEATER] AUTO OFF");
  }

  // SECUENCIAS
  if (!MYKO_SENSOR_ONLY) updateTest();

  // SENSOR DHT22
  if (now - lastDHT >= DHT_INTERVAL) {

    readDHT();
    lastDHT = now;
  }

  // LCD
  if (!MYKO_SENSOR_ONLY && now - lastLCD >= LCD_INTERVAL) {

    updateLCD();
    lastLCD = now;
  }
}

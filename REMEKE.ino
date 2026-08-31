#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <time.h>

// Library Tambahan untuk OTA (Update Wireless)
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

#define TEST_MODE false // Set false agar pembatasan jam masuk 06.30-07.30 aktif

#define SS_PIN D4
#define RST_PIN D3
#define BUZZER_PIN D8

// ==============================================================
// 🎵 PILIHAN TIPE BUZZER:
// 1 = Buzzer Aktif Biasa (2 Kaki: (+) ke D8, (-) ke GND) -> DEFAULT
// 2 = Modul Buzzer 3 Kaki Active-Low (VCC, GND, I/O ke D8)
// 3 = Buzzer Pasif (Memainkan melodi nada frekuensi PWM)
// ==============================================================
#define BUZZER_TYPE 1

// ⚡ Jeda tampilan nama siswa/guru di LCD (1500 ms = 1.5 detik: pas dan nyaman dibaca)
#define LCD_HOLD_TIME_MS 1500

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 20, 4);

// Simbol Derajat Kustom (º)
byte degreeChar[8] = {
  0b00110,
  0b01001,
  0b01001,
  0b00110,
  0b00000,
  0b00000,
  0b00000,
  0b00000
};

const char* ssid = "PIKET & ABSENSI SMK";
const char* password = "guruku1234";

const char* rfidEndpointUrl = "https://absensi-smk-ypk-baru.vercel.app/api/rfid-tap";

String lastUid = "";
unsigned long lastTapTime = 0;
const unsigned long tapCooldownSameCardMs = 500; // Cooldown 500ms agar tap ke-2 langsung terdeteksi

int standbyState = 0; 
bool inStandbyMode = true;
unsigned long lastStandbyToggle = 0;
unsigned long lastClockUpdate = 0;
unsigned long lastRfidHealthCheck = 0;
unsigned long lastWifiCheck = 0;

// Variable Cuaca Presisi SMK YPK Medan
String tempMedan = "--\x01C";
String cuacaMedan = "MEMUAT...";
unsigned long lastWeatherUpdate = 0;

bool ntpSynced = false;
bool wifiWasConnected = false;
unsigned long lastNtpRetry = 0;

// Deklarasi Fungsi Suara Premium
void buzzerOn(int freq);
void buzzerOff();
void playTone(int freq, int durationMs);
void soundStartup();
void soundWifiConnected();
void soundInstantTap();
void soundSuccess();
void soundWarningLate();
void soundAlreadyTapped();
void soundCardUnregistered();
void soundConnectionError();

// Deklarasi Fungsi Sistem
void setupOTA();
void connectWifi();
void checkWifiReconnect();
void syncNtpTime();
String getFormattedTime();
String bacaUid();
String cekStatusWaktuSiswa();
String getJsonValue(String json, String key);
void kirimKeWeb(String uid, String statusWaktu);
void updateCuacaMedan();
void kelolaStandby10Detik();
void tampilStandby();
void tampilLcd(String baris1, String baris2, String baris3, String baris4);
String centerText(String teks);
void stopRfid();
void resetRfidHardware();

// ==============================================================
// 🎶 DRIVER AUDIO & SOUND EFFECTS MEWAH (SMART CHIME ENGINE)
// ==============================================================
void buzzerOn(int freq = 2000) {
  if (BUZZER_TYPE == 1) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (BUZZER_TYPE == 2) {
    digitalWrite(BUZZER_PIN, LOW);
  } else if (BUZZER_TYPE == 3) {
    tone(BUZZER_PIN, freq);
  }
}

void buzzerOff() {
  if (BUZZER_TYPE == 1) {
    digitalWrite(BUZZER_PIN, LOW);
  } else if (BUZZER_TYPE == 2) {
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (BUZZER_TYPE == 3) {
    noTone(BUZZER_PIN);
  }
}

void playTone(int freq, int durationMs) {
  buzzerOn(freq);
  delay(durationMs);
  buzzerOff();
}

// 1. Melodi Pembuka saat Alat Dinyalakan
void soundStartup() {
  playTone(1600, 60);
  delay(25);
  playTone(2200, 70);
  delay(25);
  playTone(3000, 120);
  buzzerOff();
}

// 2. Melodi Konfirmasi WiFi Terhubung
void soundWifiConnected() {
  playTone(2400, 50);
  delay(30);
  playTone(3200, 90);
  buzzerOff();
}

// 3. Suara Deteksi Instan saat Kartu Ditempelkan ke Reader (0 ms jeda)
void soundInstantTap() {
  playTone(2800, 45);
}

// 4. Melodi Presensi Berhasil Tepat Waktu (Harmonic Fast Chime)
void soundSuccess() {
  playTone(2093, 50);
  delay(15);
  playTone(2637, 60);
  delay(15);
  playTone(3136, 100);
  buzzerOff();
}

// 5. Suara Peringatan Terlambat
void soundWarningLate() {
  playTone(1800, 80);
  delay(30);
  playTone(1200, 150);
  buzzerOff();
}

// 6. Suara Notifikasi Sudah Pernah Tap Hari Ini (Double Beep Cepat)
void soundAlreadyTapped() {
  playTone(2400, 60);
  delay(50);
  playTone(2400, 60);
  buzzerOff();
}

// 7. Suara Kartu Belum Terdaftar di Database
void soundCardUnregistered() {
  playTone(950, 90);
  delay(30);
  playTone(650, 150);
  buzzerOff();
}

// 8. Suara Gangguan Jaringan / Timeout
void soundConnectionError() {
  playTone(1000, 60);
  delay(40);
  playTone(1000, 60);
  buzzerOff();
}

// 🛡️ RESET & AUTO-RECOVERY HARDWARE MFRC522 AGAR TIDAK PERNAH MACET
void resetRfidHardware() {
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max); // Sensitivitas antena MAKSIMUM
  rfid.PCD_AntennaOn();
}

// ==============================================================
// ⚙️ SETUP UTAMA (DENGAN OVERCLOCK CPU 160MHz)
// ==============================================================
void setup() {
  // ⚡ Maksimalkan CPU ESP8266 ke 160 MHz untuk kalkulasi SSL tercepat & bebas lag
  system_update_cpu_freq(160);

  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println("  SISTEM PRESENSI DIGITAL SMK YPK MEDAN (SUPER OPTIMAL)");
  Serial.println("========================================");

  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();

  Wire.begin();
  Wire.setClock(400000); // ⚡ Tingkatkan kecepatan bus I2C ke 400kHz agar LCD respon super cepat & mulus
  lcd.init();
  lcd.backlight();
  lcd.createChar(1, degreeChar);

  tampilLcd("PRESENSI DIGITAL", "--------------------", "SMK YPK MEDAN", "MEMULAI SISTEM...");
  soundStartup();

  // Inisialisasi Reader RFID RC522
  resetRfidHardware();

  connectWifi();
  setupOTA();

  if (WiFi.status() == WL_CONNECTED) {
    syncNtpTime();
    updateCuacaMedan();
    soundWifiConnected();
  }

  tampilStandby();
  Serial.println(">> MODE SIAP: TEMPELKAN KARTU RFID/NFC <<\n");
}

// ==============================================================
// 🔄 LOOP UTAMA (ANTRIAN KILAT & AUTO-RECONNECT OTOMATIS)
// ==============================================================
void loop() {
  ArduinoOTA.handle();

  // 🌐 AUTO-RECONNECT INTERNET & WIFI: Cek koneksi setiap 3 detik
  checkWifiReconnect();

  // 🛡️ WATCHDOG AUTO-RECOVERY RFID: Cek setiap 5 detik agar sensor TIDAK PERNAH MACET
  if (millis() - lastRfidHealthCheck > 5000) {
    lastRfidHealthCheck = millis();
    byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
    if (version == 0x00 || version == 0xFF) {
      Serial.println("[WATCHDOG] Sensor RFID desync, mengaktifkan auto-recovery...");
      resetRfidHardware();
    }
  }

  kelolaStandby10Detik();

  // Deteksi kartu baru di depan reader
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;
  
  inStandbyMode = false;

  String uid = bacaUid();

  // Cegah pembacaan kartu parsial / cacat
  if (uid == "" || uid.length() < 4) {
    stopRfid();
    return;
  }

  // Cooldown ringan (500ms) agar tap ke-2 langsung terdeteksi
  if (uid == lastUid && (millis() - lastTapTime < tapCooldownSameCardMs)) {
    stopRfid(); 
    return;
  }
  
  lastUid = uid;
  lastTapTime = millis();

  Serial.println("\n----------------------------------------");
  Serial.println("[TAP TERDETEKSI] UID: " + uid);

  // 🔔 Bunyikan suara tap seketika begitu kartu menempel
  soundInstantTap();

  // Tampilkan indikator proses sekilas di LCD
  tampilLcd("MEMPROSES KARTU...", "--------------------", "UID: " + uid, "MENGHUBUNGKAN...");
  
  String timeStatus = cekStatusWaktuSiswa();
  kirimKeWeb(uid, timeStatus);

  stopRfid();
}

void checkWifiReconnect() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiWasConnected = false;
    if (millis() - lastWifiCheck > 5000) {
      lastWifiCheck = millis();
      Serial.println("[WIFI] Mencari & menghubungkan kembali ke: " + String(ssid));
      WiFi.disconnect();
      delay(50);
      WiFi.begin(ssid, password);
    }
  } else {
    // 🌐 KETIKA BARU TERHUBUNG (MISAL ROUTER BARU MENYALA BEBERAPA MENIT SETELAH LISTRIK HIDUP):
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      Serial.println("\n========================================");
      Serial.println("[WIFI] ROUTER TELAH AKTIF & TERHUBUNG!");
      Serial.println("[WIFI] IP: " + WiFi.localIP().toString());
      Serial.println("========================================");
      soundWifiConnected();
      setupOTA();
      syncNtpTime();
      updateCuacaMedan();
      tampilStandby();
    }
  }
}

void setupOTA() {
  ArduinoOTA.setHostname("Absensi-SMK-YPK");

  ArduinoOTA.onStart([]() {
    tampilLcd("UPDATING FIRMWARE", "--------------------", "PROSES OTA ONLINE", "MOHON TUNGGU...");
    soundInstantTap();
  });

  ArduinoOTA.onEnd([]() {
    tampilLcd("UPDATE SELESAI", "--------------------", "SYSTEM REBOOTING", "HARAP TUNGGU...");
    soundStartup();
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    int persen = progress / (total / 100);
    String barisProgress = "PROGRESS : " + String(persen) + "%";
    tampilLcd("UPDATING FIRMWARE", "--------------------", barisProgress, "JANGAN MATIKAN ALAT");
  });

  ArduinoOTA.onError([](ota_error_t error) {
    tampilLcd("OTA ERROR!", "--------------------", "GAGAL MENGUNDUH", "SYSTEM RESTART...");
    soundCardUnregistered();
    delay(1000);
  });

  ArduinoOTA.begin();
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleepMode(WIFI_NONE_SLEEP); // ⚡ MATIKAN SLEEP AGAR WIFI SELALU AKTIF & RESPON CEPAT 0ms
  WiFi.setOutputPower(20.5);          // ⚡ DAYA TRANSMISI WIFI MAKSIMUM
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(ssid, password);
  
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  tampilLcd("KONEKSI WIFI...", "--------------------", String(ssid), "MENGHUBUNGKAN...");
  
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) { 
    delay(250); 
    Serial.print(".");
    timeout++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiWasConnected = true;
    Serial.println("WiFi Terhubung! IP: " + WiFi.localIP().toString());
    tampilLcd("STATUS TERKONEKSI", "--------------------", "IP:" + WiFi.localIP().toString(), "SERVER CLOUD");
  } else {
    wifiWasConnected = false;
    Serial.println("WiFi belum siap / router booting. Sistem akan auto-connect di background.");
    tampilLcd("MENUNGGU WIFI...", "--------------------", "ROUTER SEDANG BOOT", "AUTO-CONNECT AKTIF");
  }
  delay(350);
}

void syncNtpTime() {
  if (WiFi.status() != WL_CONNECTED) return;
  configTime(7 * 3600, 0, "pool.ntp.org", "id.pool.ntp.org", "time.nist.gov");
  
  time_t nowSec = time(nullptr);
  int retry = 0;
  while (nowSec < 1500000000 && retry < 12) {
    ArduinoOTA.handle();
    delay(100);
    nowSec = time(nullptr);
    retry++;
  }

  if (nowSec > 1500000000) {
    ntpSynced = true;
    Serial.println("[NTP] Jam WIB Berhasil Tersinkron: " + getFormattedTime());
  } else {
    Serial.println("[NTP] Belum sinkron, loop akan mencoba otomatis.");
  }
}

String getFormattedTime() {
  time_t nowSec = time(nullptr);
  if (nowSec > 1500000000) {
    struct tm* timeinfo = localtime(&nowSec);
    char buffer[21];
    snprintf(buffer, sizeof(buffer), "%02d/%02d/%04d %02d:%02d:%02d",
             timeinfo->tm_mday, timeinfo->tm_mon + 1, timeinfo->tm_year + 1900,
             timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);
    return String(buffer);
  }
  return "WAKTU MEMUAT...";
}

// 🛡️ Pembacaan UID kartu dengan validasi ukuran byte
String bacaUid() {
  if (rfid.uid.size < 4) return "";
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// 🕒 Waktu Masuk Siswa: 06.30 - 07.30 WIB = Hadir, > 07.30 = Telat
String cekStatusWaktuSiswa() {
  if (TEST_MODE) return "Hadir (Test Mode)";
  
  time_t nowSec = time(nullptr);
  if (nowSec > 1500000000) {
    struct tm* timeinfo = localtime(&nowSec);
    int hour = timeinfo->tm_hour;
    int minute = timeinfo->tm_min;
    int dow = timeinfo->tm_wday;

    if (dow == 0 || dow == 6) return "Hari Libur"; 

    long totalMenit = hour * 60L + minute;
    long menitMulai = 6 * 60L + 30L;   // 06.30 WIB
    long menitSelesai = 7 * 60L + 30L; // 07.30 WIB

    if (totalMenit < menitMulai) return "Hadir";
    if (totalMenit > menitSelesai) return "Telat";
    return "Hadir";
  }

  return "Hadir";
}

String getJsonValue(String json, String key) {
  String searchKey = "\"" + key + "\":\"";
  int start = json.indexOf(searchKey);
  if (start != -1) {
    start += searchKey.length();
    int end = json.indexOf("\"", start);
    if (end != -1) return json.substring(start, end);
  }

  searchKey = "\"" + key + "\":";
  start = json.indexOf(searchKey);
  if (start == -1) return "";

  start += searchKey.length();
  int end = json.indexOf(",", start);
  
  if (end == -1) {
    end = json.indexOf("}", start);
  }
  if (end == -1) return "";

  String val = json.substring(start, end);
  val.replace("\"", "");
  val.trim();
  return val;
}

// ⚡ PENGIRIMAN DATA KE VERCEL HTTPS (STABIL & MENDUKUNG MASUK & PULANG)
void kirimKeWeb(String uid, String statusWaktu) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconnecting sebelum kirim...");
    WiFi.reconnect();
    unsigned long startWait = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startWait < 3000) {
      delay(50);
    }
  }

  WiFiClientSecure client;
  client.setInsecure();               // Bypass verifikasi SSL untuk performa optimal
  client.setBufferSizes(2048, 1024);  // ⚡ Buffer optimal agar tidak overflow saat Vercel/Next.js kirim header
  client.setTimeout(6000);            // 6 detik timeout socket TLS

  HTTPClient http;
  http.begin(client, rfidEndpointUrl);
  http.setReuse(true);                // ⚡ Jaga koneksi TCP tetap aktif untuk respon beruntun kilat
  http.setTimeout(6000);              // 6 detik timeout HTTP
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Connection", "keep-alive");
  http.addHeader("User-Agent", "ESP8266-Presensi/2.0");

  String jsonData = "{\"rfid_uid\":\"" + uid + "\", \"status\":\"" + statusWaktu + "\"}";
  unsigned long startPost = millis();
  int httpCode = http.POST(jsonData);
  
  // Auto-retry 1x jika terjadi gangguan sinyal WiFi sesaat
  if (httpCode <= 0) {
    Serial.println("[RETRY] Error " + String(httpCode) + " (" + http.errorToString(httpCode) + "), mencoba lagi...");
    delay(150);
    httpCode = http.POST(jsonData);
  }

  unsigned long postDuration = millis() - startPost;
  Serial.println("[HTTP Selesai: " + String(postDuration) + " ms] Status: " + String(httpCode));

  if (httpCode == 200 || httpCode == 201) {
    String payload = http.getString();
    bool isSuccess = (payload.indexOf("\"success\":true") != -1);
    bool isAlreadyTapped = (payload.indexOf("\"already_tapped\":true") != -1) || (payload.indexOf("\"already_pulang\":true") != -1);
    bool isAlreadyPresensi = (payload.indexOf("\"already_presensi\":true") != -1) || (payload.indexOf("\"action\":\"sudah_presensi\"") != -1);
    String nama = getJsonValue(payload, "nama");
    if (nama == "") nama = "USER " + uid;
    nama.toUpperCase();

    // 🟡 JIKA TAP KE-2 / SEBELUM JAM PULANG : ANDA SUDAH PRESENSI (STATUS TETAP HADIR, BELUM PULANG)
    if (isAlreadyPresensi) {
      Serial.println("[INFO] " + nama + " sudah presensi Masuk (Sebelum Jam Pulang).");
      String infoLcd = getJsonValue(payload, "info");
      if (infoLcd.indexOf("16.40") != -1 || infoLcd.indexOf("PULANG") != -1) {
        tampilLcd(nama,
                  "--------------------",
                  "ANDA SUDAH PRESENSI",
                  "JADWAL PULANG: 16.40");
      } else {
        tampilLcd(nama,
                  "--------------------",
                  "ANDA SUDAH PRESENSI",
                  "TAP 1X LG U/ PULANG");
      }
      soundAlreadyTapped();
    }
    // 🔴 JIKA SUDAH PRESENSI MASUK DAN PULANG (TAP KE-4 DST)
    else if (isAlreadyTapped) {
      Serial.println("[INFO] " + nama + " sudah presensi Masuk & Pulang hari ini.");
      tampilLcd(nama,
                "--------------------",
                "SUDAH PRESENSI",
                "MASUK & PULANG !");
      soundAlreadyTapped();
    }
    // 🟢 JIKA PRESENSI BERHASIL (MASUK ATAU PULANG)
    else if (isSuccess) {
      String action  = getJsonValue(payload, "action");
      String type    = getJsonValue(payload, "type");
      String inisial = getJsonValue(payload, "inisial");
      if (inisial == "") inisial = "-";
      inisial.toUpperCase();

      // 🏠 JIKA TAP KE-3 : TAP PULANG SUKSES
      if (action == "pulang") {
        String jamPulang = getJsonValue(payload, "jam_pulang");
        if (jamPulang == "") jamPulang = "TERCATAT";

        tampilLcd(nama,
                  "--------------------",
                  "TAP PULANG SUKSES",
                  "JAM : " + jamPulang + " WIB");
        soundSuccess();
      }
      // 🎒/👨‍🏫 JIKA TAP KE-1 : TAP MASUK
      else {
        if (type == "guru") {
          String role = getJsonValue(payload, "role");
          if (role == "") role = "GURU / STAFF";
          role.toUpperCase();

          tampilLcd(nama,
                    "--------------------",
                    "INISIAL : " + inisial,
                    "STATUS  : HADIR");
          soundSuccess();
        } else {
          String kelas   = getJsonValue(payload, "kelas");
          String status  = getJsonValue(payload, "status");
          if (kelas == "")   kelas   = "-";
          kelas.toUpperCase();

          tampilLcd(nama,
                    "--------------------",
                    "KELAS  : " + kelas,
                    "STATUS : " + status);

          if (status == "Telat") {
            soundWarningLate();
          } else {
            soundSuccess();
          }
        }
      }
    } 
    else {
      Serial.println("[PERINGATAN] UID " + uid + " belum terdaftar.");
      tampilLcd("KARTU BELUM DAFTAR",
                "--------------------",
                "UID: " + uid,
                "DAFTARKAN DI WEB");
      soundCardUnregistered();
    }

  } else if (httpCode == 404) {
    tampilLcd("KARTU BELUM DAFTAR",
              "--------------------",
              "UID: " + uid,
              "DAFTARKAN DI WEB");
    soundCardUnregistered();
  } else {
    Serial.println("[ERROR JARINGAN] Kode HTTP: " + String(httpCode) + " (" + http.errorToString(httpCode) + ")");
    tampilLcd("KONEKSI TIMEOUT",
              "--------------------",
              "SILAKAN TAP SEKALI",
              "LAGI KARTUNYA");
    soundConnectionError();
  }

  http.end();
  client.stop();
  
  // ⚡ Tahan nama di LCD selama 1.5 detik agar bisa dibaca dengan nyaman
  unsigned long startHold = millis();
  while (millis() - startHold < LCD_HOLD_TIME_MS) {
    ArduinoOTA.handle();
    delay(10);
  }
  
  tampilStandby();
}

void updateCuacaMedan() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClient client;
  HTTPClient http;
  
  // Koordinat Presisi SMK YPK Medan (Jl. Sakti Lubis Gg. Pegawai No. 8, Medan)
  String url = "http://api.open-meteo.com/v1/forecast?latitude=3.5542&longitude=98.6941&current_weather=true&timezone=Asia%2FJakarta";
  
  http.begin(client, url);
  http.setTimeout(4000);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    int cwIdx = payload.indexOf("\"current_weather\":");
    if (cwIdx != -1) {
      int tempIdx = payload.indexOf("\"temperature\":", cwIdx);
      if (tempIdx != -1) {
        int tempStart = tempIdx + 14;
        int tempEnd = payload.indexOf(",", tempStart);
        if (tempEnd == -1) tempEnd = payload.indexOf("}", tempStart);
        if (tempEnd != -1) {
          String val = payload.substring(tempStart, tempEnd);
          val.trim();
          int tempInt = (int)round(val.toFloat());
          tempMedan = String(tempInt) + "\x01" + "C";
        }
      }
      
      int codeIdx = payload.indexOf("\"weathercode\":", cwIdx);
      if (codeIdx == -1) codeIdx = payload.indexOf("\"weather_code\":", cwIdx);
      if (codeIdx != -1) {
        int codeStart = payload.indexOf(":", codeIdx) + 1;
        int codeEnd = payload.indexOf(",", codeStart);
        if (codeEnd == -1) codeEnd = payload.indexOf("}", codeStart);
        if (codeEnd != -1) {
          int code = payload.substring(codeStart, codeEnd).toInt();
          
          switch (code) {
            case 0:  cuacaMedan = "CERAH"; break;
            case 1:  cuacaMedan = "CERAH BERAWAN"; break;
            case 2:  cuacaMedan = "BERAWAN"; break;
            case 3:  cuacaMedan = "MENDUNG"; break;
            case 45: 
            case 48: cuacaMedan = "BERKABUT"; break;
            case 51: 
            case 53: 
            case 55: cuacaMedan = "GERIMIS"; break;
            case 61: cuacaMedan = "HUJAN RINGAN"; break;
            case 63: cuacaMedan = "HUJAN SEDANG"; break;
            case 65: cuacaMedan = "HUJAN LEBAT"; break;
            case 80: 
            case 81: cuacaMedan = "HUJAN LOKAL"; break;
            case 82: cuacaMedan = "HUJAN BADAI"; break;
            case 95: 
            case 96: 
            case 99: cuacaMedan = "BADAI PETIR"; break;
            default: cuacaMedan = "BERAWAN"; break;
          }
        }
      }
    }
    lastWeatherUpdate = millis();
    Serial.println("[CUACA] Update sukses: " + tempMedan + " | " + cuacaMedan);
  } else {
    Serial.println("[CUACA] Gagal update: HTTP " + String(httpCode));
  }
  http.end();
  client.stop();
}

void kelolaStandby10Detik() {
  if (!inStandbyMode) return;
  unsigned long currentMillis = millis();

  // 🕒 Auto-sinkronisasi jam WIB jika belum tersinkron saat WiFi sudah aktif
  if (!ntpSynced && WiFi.status() == WL_CONNECTED) {
    time_t nowSec = time(nullptr);
    if (nowSec > 1500000000) {
      ntpSynced = true;
      Serial.println("[NTP] Jam WIB otomatis sinkron: " + getFormattedTime());
    } else if (currentMillis - lastNtpRetry >= 10000) {
      lastNtpRetry = currentMillis;
      syncNtpTime();
    }
  }

  // Rotasi layar standby otomatis setiap 10 detik antara 4 layar
  if (currentMillis - lastStandbyToggle >= 10000) {
    lastStandbyToggle = currentMillis;
    standbyState = (standbyState + 1) % 4; 
    tampilStandby();
  }

  // Refresh detik jam secara realtime saat di layar jam digital (state 1)
  if (standbyState == 1 && (currentMillis - lastClockUpdate >= 1000)) {
    lastClockUpdate = currentMillis;
    tampilStandby();
  }

  // Update cuaca setiap 15 menit
  if (currentMillis - lastWeatherUpdate >= 900000UL || lastWeatherUpdate == 0) {
    if (WiFi.status() == WL_CONNECTED) {
      updateCuacaMedan();
    }
  }
}

void tampilStandby() {
  inStandbyMode = true;

  if (standbyState == 0) {
    // Layar 1: Standby Utama Presensi
    String baris4 = TEST_MODE ? "*** TEST MODE ***" : "* MASUK & PULANG *";
    tampilLcd("SMK YPK MEDAN", "--------------------", "TAP KARTU RFID/NFC", baris4);
  } 
  else if (standbyState == 1) {
    // Layar 2: Jam & Waktu Digital WIB Real-time
    String waktuStr = getFormattedTime();
    tampilLcd("SMK YPK MEDAN", "--------------------", "WAKTU & JAM DIGITAL", waktuStr);
  } 
  else if (standbyState == 2) {
    // Layar 3: Cuaca & Suhu Udara SMK YPK Medan
    String barisCuaca = (cuacaMedan.length() > 12) ? ("CUACA: " + cuacaMedan) : ("CUACA : " + cuacaMedan);
    tampilLcd("CUACA SMK YPK MEDAN", "--------------------", "SUHU  : " + tempMedan, barisCuaca);
  } 
  else if (standbyState == 3) {
    // Layar 4: Identitas TJKT Project'z
    tampilLcd("SMK YPK MEDAN", "--------------------", "DIBUAT OLEH :", "TJKT PROJECT'Z");
  }
}

String centerText(String teks) {
  teks.trim();
  if (teks.length() >= 20) {
    return teks.substring(0, 20);
  }
  int sisaSpasi = 20 - teks.length();
  int padKiri = sisaSpasi / 2;
  int padKanan = sisaSpasi - padKiri;

  String hasil = "";
  for (int i = 0; i < padKiri; i++) hasil += " ";
  hasil += teks;
  for (int i = 0; i < padKanan; i++) hasil += " ";

  return hasil;
}

void tampilLcd(String baris1, String baris2, String baris3, String baris4) {
  lcd.setCursor(0, 0); lcd.print(centerText(baris1));
  lcd.setCursor(0, 1); lcd.print(centerText(baris2));
  lcd.setCursor(0, 2); lcd.print(centerText(baris3));
  lcd.setCursor(0, 3); lcd.print(centerText(baris4));
}

void stopRfid() {
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

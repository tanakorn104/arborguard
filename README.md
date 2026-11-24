# README.md
**Version:** v2.1  
**Created:** October 2026  
**Project:** ArborGuard
**Institution:** Kasetsart University

## ArborGuard Project Description
ระบบตรวจจับเสียงต้นไม้ล้มหรือกิ่งไม้ขนาดใหญ่หักเพื่อแจ้งเตือนผ่านเว็บไซต์แบบเรียลไทม์ 
ใช้วิธีการแก้ปัญหาโดยการนำโมเดล Audio Classification มารวมกับอุปกรณ์ ESP32-WROOM เพื่อคอยตรวจจับเสียงการหักของกิ่งไม้หรือเสียงต้นไม้ล้มและส่งการแจ้งเตือนไปยังเว็บไซต์ตลอดเวลาโดยมีลำดับการพัฒนาดังนี้
1. เทรนโมเดล 2D-CNN จาก datasets ทั้ง 3 คลาสคือ Tree_Falling,Branch_breaking,Noise ที่รวบรวมมาโดยใช้ google colab
2. นำโมเดลที่ได้แปลงให้อยู่ในรูปไฟล์นามสกุล .h ที่สามารถให้ไลบรารี TensorFlowLite ใน ESP32 ใช้งานได้
3. นำโมเดลไปติดตั้งบน ESP32
4. ESP32 จะคอยรับเสียงจากไมโครโฟนตลอดเวลาที่ samping rate = 16kHz เมื่อครบ 1 เฟรม หรือ 2048 sample จะนำไปสร้างเป็นภาพโดยผ่านกระบวนการ MFCCและDCT ทำให้ได้ภาพขนาด 40 และเมื่อครบ 50 เฟรมหรือได้ภาพขนาด 50 x 40 จะนำไปให้โมเดล 2D-CNN ทำการทำนายผลว่าเป็นเสียงของคลาสใด
5. หากเป็นเสียงคลาส Tree_Falling หรือ Branch_breaking และมีความน่าจะเป็นมากกว่า 70% จะทำการส่งการแจ้งเตือนไปยัง webserver ผ่านโปรโตคอบ MQTT
6. ผู้ใช้งานสามารถเข้าหน้าเว็บไซต์เพื่อรอการแจ้งเตือนได้ที่ https://arborguard.online โดยที่เว็บจะเชื่อมต่อ websocket กับ webserver ทำให้สามารถอัพเดตการแจ้งเตือนได้แบบเรียลไทม์




## System Setup
### google drive structure 
link : https://drive.google.com/drive/folders/1_ATCtddXxn53FYWc-WgAhmYE8p2lQrXI?usp=sharing
```text
\---Axion-ArborGuard-2026
    |   README.md
    |
    +---dataset 
    |   +---AugmentationCode (โค้ดสำหรับทำ Augmentation Dataset)
    |   |       branchbreaking.py
    |   |       treefalling.py
    |   |
    |   +---datasets (Datasets ทั้ง 3 class)
    |   |   +---branch_breaking
    |   |   +---noise
    |   |   \---tree_falling
    |   \---ScriptPythonForRecOnESP32 (โค้ดสำหรับให้ESP32 อัดเสียงแล้วเซฟลงคอมพิวเตอร์โดยตรง)
    |       |   main.py
    |       |
    |       |
    |       \---downloaded_wavs (โฟลเดอร์สำหรับเก็บไฟล์เสียงที่โหลดจาก ESP32)
    +---ESP32
    |   \---ArborGuard   (โค้ดสำหรับ ESP32)
    |       |   ArborGuard.ino
    |       |   arbor_guard_mfcc_cnn.h
    |       |   partitions.csv
    |       |
    |       +---build
    |       |   \---esp32.esp32.esp32
    |       |           ArborGuard.ino.bin  (ไฟล์สำหรับนำไปอัพเดตเฟิร์มแวร์ESP32 ผ่าน OTA)
    |       |           ArborGuard.ino.bootloader.bin
    |       |           ArborGuard.ino.elf
    |       |           ArborGuard.ino.map
    |       |           ArborGuard.ino.merged.bin
    |       |           ArborGuard.ino.partitions.bin
    |       |           boot_app0.bin
    |       |           build.options.json
    |       |           flash_args
    |       |           partitions.csv (ไฟล์สำหรับแบ่งพื้นที่หน่วยความจำFlash)
    |       |           sdkconfig
    |       |
    |       \---data
    |               info.json (ไฟล์กำหนดการตั้งค่าตัวแปรต่างๆ)
    |
    +---model (โค้ดสำหรับเทรนโมเดล)
    |   \---TrainCode
    |           ArborGuardTrainModel1.ipynb
    |
    \---website (โค้ดสำหรับหน้าเว็บไซต์)
        +---Docker (สำหรับทำงานบน Docker)
        |       .env
        |       arborguard_img.tar
        |       docker-compose.yml
        |       README.md
        |
        \---nextJS
            |
            +---app
            |       favicon.ico
            |       globals.css
            |       layout.tsx
            |       page.tsx
            |
            +---components
            |       Map.tsx
            |
            +---lib
                    db.js

  

```
### Hardware Requirements

อุปกรณ์ที่ใช้ในโปรเจกต์ ArborGuard มีดังนี้:
1. **บอร์ดไมโครคอนโทรลเลอร์:** ESP32 (แนะนำรุ่นที่มี PSRAM เนื่องจากต้องจองพื้นที่ Tensor Arena ขนาดใหญ่)
2. **ไมโครโฟน I2S:** เช่นโมดูล INMP441 สำหรับรับเสียงดิจิทัลคุณภาพสูง
3. **Buzzer:** โมดูลเสียงเตือน (Active/Passive Buzzer)
4. **LED 3 ดวง:** สำหรับแสดงสถานะการทำงาน (Recording, ESP Power, MQTT Connection)
5. **Push Button:** สวิตช์ปุ่มกดสำหรับใช้เป็นปุ่ม Clear Alert

#### Wiring & Pin Setup
การต่อสายอุปกรณ์เข้ากับบอร์ด ESP32 ควรกำหนดขา Pin ดังตารางต่อไปนี้:

| อุปกรณ์ (Component) | ขาบนบอร์ด ESP32 (Pin) | คำอธิบาย (Description) |
| :--- | :---: | :--- |
| **I2S Microphone** | `21` | I2S_SCK (Serial Clock) |
| | `26` | I2S_WS (Word Select / L/R Clock) |
| | `27` | I2S_SD (Serial Data) |
| **LED Status** | `4` | แสดงสถานะเครื่องทำงาน (ESP-ON) |
| | `5` | แสดงสถานะเชื่อมต่อ MQTT สำเร็จ |
| | `17` | แสดงสถานะกำลังบันทึก/ประมวลผลเสียง (Recording) |
| **Buzzer** | `18` | ส่งเสียงแจ้งเตือนเมื่อตรวจพบเหตุการณ์ |
| **Button** | `16` | ปุ่มสำหรับ Clear สถานะการแจ้งเตือน |

---

### Software & Libraries

โปรเจกต์นี้ทำงานบน ESP32 Core สำหรับ Arduino IDE โดยใช้งานไลบรารีดังต่อไปนี้:

**ไลบรารีพื้นฐาน (มีมาพร้อมกับ ESP32 Board Package):**
* `WiFi.h`, `WiFiClientSecure.h` - สำหรับเชื่อมต่อเครือข่ายและการเชื่อมต่อแบบปลอดภัย (TLS)
* `WebServer.h` - สำหรับสร้าง Local Web Server
* `LittleFS.h` - สำหรับจัดการไฟล์ระบบ (ใช้อ่านไฟล์ config)
* `Update.h` - สำหรับระบบอัปเดตเฟิร์มแวร์ผ่านอากาศ (OTA)
* `driver/i2s.h` - สำหรับจัดการฮาร์ดแวร์รับเสียง I2S
* `esp_heap_caps.h` - สำหรับจัดการหน่วยความจำ PSRAM

**ไลบรารีภายนอกที่ต้องติดตั้งเพิ่ม (External Libraries):**
*(หมายเหตุ: แนะนำให้ติดตั้งเวอร์ชันตามที่ระบุด้านล่างเพื่อป้องกันปัญหาการคอมไพล์)*
* **Chirale_TensorFlowLite** - สำหรับรันโมเดล Machine Learning (2D-CNN) บน ESP32
* **ArduinoJson** - สำหรับจัดรูปแบบและอ่านข้อมูล JSON 
* **PubSubClient** - สำหรับเชื่อมต่อและรับส่งข้อมูลผ่านโปรโตคอล MQTT
* **arduinoFFT** - สำหรับคำนวณ Fast Fourier Transform จัดการข้อมูลสัญญาณเสียง
  
### setup step
1. เปิดใช้งานระบบ webserver โดยติดตั้ง Docker แล้วนำไฟล์จากโฟลเดอร์ /website/Dockerarborguard_img.tar โหลดไปยัง Docker แล้วใช้คำสั่ง *docker compose up -d* 
2. ต่ออุปกรณ์ต่อพ่วง เช่น Microphone,Buzzer,Led แล้วแฟลชโค้ดจากไฟล์ /ESP32/ArborGuard/ArborGuard.ino ไปยัง ESP32 โดยใช้ ArduinoIDE แล้ว แฟลชไฟล์ /ESP32/ArborGuard/data/info.json ไปยัง ESP32 โดยใช้ LittleFS

เมื่อ ESP32เชื่อมต่ออินเทอร์เน็ตและเว็บเซิฟเวอร์สำเร็จ ทันทีที่ตรวจจับเสียงต้นไม้ล้มหรือกิ่งไม้หักจะสามารถแจ้งเตือนได้ทันที โดยสามารถเข้าดูการแจ้งเตือนได้ผ่าน https://arborguard.online

## ArborGuard Dataset


### 1. Dataset Description

This dataset contains audio recordings for tree-related sound event classification using a 2D-CNN model.

* Number of audio files: 628
* Number of classes: 3
* Audio format: WAV
* Sample rate: 16,000 Hz
* Channel: Mono
* Bit depth: 16-bit
* Duration: approximately 5 seconds

---

### 2. Class Labels

| Label |   Class         | Description      |
| ----- | --------------- | ---------------- |
| 0     | Branch Breaking | Sounds of branches breaking |
| 1     | Tree Falling    | Sounds of trees falling |
| 2     | Noise           | Sounds that are not related to the target events |

---

### 3. Dataset Structure

```text
Dataset
│
├── Dataset
│   ├── Branch Breaking
│   │   ├── Train
│   │   ├── Validation
│   │   └── Test
│   │
│   ├── Tree Falling
│   │   ├── Train
│   │   ├── Validation
│   │   └── Test
│   │
│   └── Noise
│       ├── Train
│       ├── Validation
│       └── Test
│
└── Augmentation Code
    ├── Branch Breaking
    └── Tree Falling

```

---

### 4. Data Source

Audio recordings were collected from open-source audio platforms,
including Freesound, Pixabay, and Zapsplat, with additional
recordings collected by the project team.

---

### 5. Annotation

Audio files were categorized into three classes based on the target sound events.

* **Branch Breaking:** Sounds of branches breaking.
* **Tree Falling:** Sounds of trees falling.
* **Noise:** Sounds unrelated to the target events.

---

### 6. Recommended Data Split

| Subset     | Number per Class | Percentage |
| ---------- | ---------------- | ---------- |
| Training   |          140,160 |        70% |
| Validation |            30,34 |        15% |
| Testing    |            30,34 |        15% |

---



## Model Description

A small 2D CNN (**435 parameters**) that classifies 1.5-second audio windows into 3 classes: `noise`, `branch_breaking`, `tree_falling`.

- **Input:** MFCC, 40 coefficients × 50 frames (16 kHz audio, FFT 2048, hop 512, 128 Mel bands). The MFCC pipeline is hand-written to match the ESP32 code exactly.
- **Architecture:** Conv2D(4) → MaxPool → Conv2D(8) → MaxPool → GlobalAveragePooling → Dense(8) → Dense(3, softmax)
- **Training:** Adam (lr 1e-3), batch size 32, early stopping, class weights; data split 70/15/15 by audio file.
- **Result (test set, 1,476 windows):** accuracy 84.7%, macro F1 0.85
- **Deployment:** INT8 TFLite (≈4.8 KB) running on ESP32 with TensorFlow Lite Micro, ≈29 ms per prediction.



---

## Version History

| Version | Description                                     |
| ------- | ----------------------------------------------- |
| v1.0    | Initial release of the ArborGuard  |
| v1.1    | แก้ปัญหาเรื่องการแปลง MFCC ขณะเทรนและบนESp32 ไม่ตรงกัน โดยการเขียนฟังชั่นคำนวน ไม่พึ่งพาไลบรารี  |
| v1.2    | แก้ปัญหาพื้นที่ RAM ที่ใช้เก็บข้อมูลภาพไม่เพียงพอโดยเพิ่มการคำนวน DCT (Discrete Cosine Transform) ในการบีบอัดข้อมูล  |
| v2.0    |Refactor Code ESP32 เนื่องจากเดิมใช้การทำงานแบบ multicore ซึ่งต้องแบ่งพื้นที่ stack ให้กับ process จนไม่มีพื้นที่พอให้ใช้งาน   |
| v2.1    |ปรับเปลี่ยนจากการใช้ HTTP METHOD เป็น MQTT แทนบน ESP32 เนื่องจาก HTTPS มีการจองพื้นที่RAM ขนาดใหญ่ที่ไม่สามารถคาดเดาได้  |



---


## Contact

**ArborGuard Project Team**

Department of Computer Engineering  
Faculty of Engineering at Kamphaeng Saen  
Kasetsart University, Thailand

**Project Members:**

| Name                          | Email |
|-------------------------------|-------|
| Thanakorn Promlek             | thanakorn.proml@ku.th |
| Phattiyaphan Jongkulsthitchai | phattiyaphan.j@ku.th  |
| Pun Lamdabpang                | pun.l@ku.th           |
| Thunnatee Chewpreecha         | thunnatee.c@ku.th |

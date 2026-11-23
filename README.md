# CreatorMatch

CreatorMatch คือเว็บไซต์สำหรับแบรนด์ที่ต้องการหา Content Creator มาร่วมงาน ผู้ใช้ค้นหา Creator ได้จากชื่อ หมวดหมู่ แพลตฟอร์ม และช่วงจำนวน Followers ดูรายละเอียดของ Creator แต่ละคน และดูข่าวที่กำลังเป็นกระแสเพื่อใช้หาไอเดียทำ Content ฝั่ง Admin จัดการข้อมูล Creator, บัญชี Admin และบัญชี User ได้ทั้งหมด

โปรเจกต์นี้เป็นงานกลุ่มวิชา ITDS242 Web Programming Lab, Section 1 Group 11

## ผู้จัดทำ

| ชื่อ-นามสกุล | รหัสนักศึกษา |
| :--- | :--- |
| น.ส. เบญญา ชินโน | 6887004 |
| นาย ธนัท น่วมอนงค์ | 6887027 |
| น.ส. นภัทร์ ตันประทุมวงษ์ | 6887030 |
| น.ส. มณฑิสา กุลวิไชยศักดิ์ | 6887048 |
| นาย กันติชา อินมา | 6887095 |

## สารบัญ

1. [สิ่งที่ต้องติดตั้งก่อน](#สิ่งที่ต้องติดตั้งก่อน)
2. [Clone โปรเจกต์](#clone-โปรเจกต์)
3. [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
4. [ติดตั้ง Database](#ติดตั้ง-database)
5. [ตั้งค่า Environment Variables](#ตั้งค่า-environment-variables)
6. [ติดตั้ง Packages](#ติดตั้ง-packages)
7. [เปิดใช้งานโปรแกรม](#เปิดใช้งานโปรแกรม)
8. [บัญชีสำหรับทดสอบ](#บัญชีสำหรับทดสอบ)
9. [คู่มือการใช้งานหน้าเว็บ](#คู่มือการใช้งานหน้าเว็บ)
10. [Public Web Service: NewsAPI](#public-web-service-newsapi)
11. [API Reference](#api-reference)
12. [ระบบ Authentication (JWT)](#ระบบ-authentication-jwt)
13. [วิธีขอ Token สำหรับ Authorization](#วิธีขอ-token-สำหรับ-authorization)
    - [ขอ Token ผ่าน Postman](#token-postman)
    - [ขอ Token จากหน้าเว็บ](#token-browser)
    - [นำ Token ไปใช้ใน Postman](#token-use)
14. [การอัปโหลดรูปภาพ (Multer)](#การอัปโหลดรูปภาพ-multer)
15. [การทดสอบด้วย Postman](#การทดสอบด้วย-postman)
16. [แก้ปัญหาที่พบบ่อย](#แก้ปัญหาที่พบบ่อย)

## สิ่งที่ต้องติดตั้งก่อน

- **Node.js 18 ขึ้นไป** (ฝั่ง Web Service ใช้ `fetch` ที่มีมาในตัวตั้งแต่ Node 18) ตรวจเวอร์ชันได้ด้วย `node -v`
- **MySQL 8** และ MySQL Workbench (หรือใช้ MySQL ผ่าน Terminal ก็ได้)
- **Postman** สำหรับทดสอบ API
- **NewsAPI key** สมัครฟรีได้ที่ [newsapi.org](https://newsapi.org/register) ใช้กับหน้า Trends

## Clone โปรเจกต์

```bash
git clone https://github.com/jobtanut/creator_match.git
cd creator_match
```

## โครงสร้างโปรเจกต์

ระบบแบ่งเป็น 2 Server ที่ทำงานพร้อมกัน

- **Frontend** (`sec1_gr11_fe_src`, port 8081) ส่งหน้า HTML, CSS, JavaScript และรูปภาพให้ Browser
- **Web Service** (`sec1_gr11_ws_src`, port 3030) รับ Request จากหน้าเว็บผ่าน Fetch API คุยกับ MySQL และเรียก NewsAPI

```
Browser ──(หน้าเว็บ)──> Frontend :8081
   │
   └──(fetch / JSON)──> Web Service :3030 ──> MySQL (creatormatch)
                                  │
                                  └──> NewsAPI (newsapi.org)
```

```
sec1_gr11/
├── sec1_gr11_fe_src/              Frontend server
│   ├── app.js                     จุดเริ่มต้นของ Frontend server
│   ├── router/                    Router ของแต่ละกลุ่มหน้า
│   │   ├── adminRouter.js
│   │   ├── authRouter.js
│   │   ├── creatorRouter.js
│   │   ├── searchRouter.js
│   │   └── teamRouter.js
│   ├── html/                      หน้าเว็บ (HTML)
│   │   └── admin/                 หน้าของ Admin
│   ├── assets/
│   │   ├── js/                    JavaScript ของแต่ละหน้า
│   │   │   └── admin/             JavaScript ของหน้า Admin
│   │   └── style/styles.css
│   ├── public/
│   │   ├── creators/              รูป Creator ที่อัปโหลด (Multer เขียนไฟล์ลงที่นี่)
│   │   ├── users/                 รูปโปรไฟล์ของผู้ใช้
│   │   └── team/                  รูปสมาชิกทีม
│   ├── .env
│   └── package.json
│
├── sec1_gr11_ws_src/              Web Service
│   ├── src/
│   │   └── app.js                 ทุก Route ของ API อยู่ในไฟล์นี้ พร้อม Postman test
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── sec1_gr11_database.sql         Schema และข้อมูลตัวอย่าง
├── .gitignore
└── README.md
```

## ติดตั้ง Database

ไฟล์ `sec1_gr11_database.sql` สร้าง Database ชื่อ `creatormatch` ทุก Table และข้อมูลตัวอย่างในครั้งเดียว รันซ้ำได้ เพราะไฟล์จะลบของเดิมแล้วสร้างใหม่

**วิธีที่ 1: MySQL Workbench**

เปิด Workbench แล้วเลือก File > Run SQL Script จากนั้นเลือกไฟล์ `sec1_gr11_database.sql` แล้วกด Run

**วิธีที่ 2: Terminal**

```bash
mysql -u root -p < sec1_gr11_database.sql
```

ข้อมูลตัวอย่างที่ได้: Admin 3 บัญชี, User 2 บัญชี และ Creator 14 คน พร้อมแพลตฟอร์มของแต่ละคน

## ตั้งค่า Environment Variables

ไฟล์ `.env` ไม่อยู่ใน Git เพราะมีรหัสผ่านและ API key ต้องสร้างเองทั้ง 2 ฝั่ง เขียนแบบ `KEY=value` ไม่ต้องใส่เครื่องหมายคำพูด ไม่ต้องใส่ `;` ท้ายบรรทัด

**Frontend:** สร้างไฟล์ `sec1_gr11_fe_src/.env`

```
PORT=8081
```

**Web Service:** คัดลอก `sec1_gr11_ws_src/.env.example` เป็น `sec1_gr11_ws_src/.env` แล้วกรอกค่า

```
PORT=3030

DBHOST=localhost
DBUSER=root
DBPASSWORD=รหัสผ่าน_MySQL_ของเครื่องที่ใช้
DBDATABASE=creatormatch

JWT_SECRET=ข้อความลับอะไรก็ได้_ยิ่งยาวยิ่งดี
NEWS_API_KEY=key_จาก_newsapi.org
```

| ตัวแปร | ใช้ทำอะไร |
| :--- | :--- |
| `PORT` | Port ของ Web Service ต้องเป็น 3030 เพราะหน้าเว็บเรียก `http://localhost:3030` |
| `DBHOST`, `DBUSER`, `DBPASSWORD` | ข้อมูลสำหรับเชื่อมต่อ MySQL |
| `DBDATABASE` | ชื่อ Database ต้องเป็น `creatormatch` ตามไฟล์ SQL |
| `JWT_SECRET` | Secret สำหรับ sign และตรวจ JWT token |
| `NEWS_API_KEY` | API key ของ NewsAPI ถ้าไม่ใส่ หน้า Trends จะแสดงข้อความว่า key หายหรือผิด |

## ติดตั้ง Packages

**Frontend**

```bash
cd sec1_gr11_fe_src
npm install
```

| Package | หน้าที่ |
| :--- | :--- |
| `express` | Web server ส่งหน้า HTML และไฟล์ static |
| `dotenv` | อ่านค่าจาก `.env` |
| `nodemon` | Restart server อัตโนมัติเมื่อแก้โค้ด |

**Web Service**

```bash
cd sec1_gr11_ws_src
npm install
```

| Package | หน้าที่ |
| :--- | :--- |
| `express` | Web server และ Router ของ API |
| `mysql2` | เชื่อมต่อ MySQL (ใช้แบบ Promise ใน Route ส่วนใหญ่) |
| `cors` | อนุญาตให้หน้าเว็บที่ port 8081 เรียก API ที่ port 3030 |
| `jwt-simple` | สร้าง JWT token ตอน Login |
| `passport`, `passport-jwt` | ตรวจ JWT token ใน Route ที่ต้อง Login |
| `multer` | รับไฟล์รูปภาพที่อัปโหลด |
| `heic-convert` | แปลงรูป HEIC จาก iPhone เป็น JPG เพราะ Browser แสดง HEIC ไม่ได้ |
| `dotenv` | อ่านค่าจาก `.env` |
| `nodemon` | Restart server อัตโนมัติเมื่อแก้โค้ด |

## เปิดใช้งานโปรแกรม

เปิด Terminal 2 หน้าต่าง แล้วรันทีละฝั่ง

**Terminal 1: Web Service**

```bash
cd sec1_gr11_ws_src
npm start
```

ถ้าเชื่อมต่อสำเร็จ จะเห็น `Listening at port: 3030` และ `Connected to MySQL`

**Terminal 2: Frontend**

```bash
cd sec1_gr11_fe_src
npm start
```

จากนั้นเปิด Browser ไปที่ [http://localhost:8081](http://localhost:8081)

ต้องเปิดผ่าน `localhost` เท่านั้น (ไม่ใช่ `127.0.0.1`) เพราะ Cookie ที่เก็บ token ผูกกับชื่อ `localhost`

## บัญชีสำหรับทดสอบ

| Username | Password | Role | หลัง Login ไปที่ |
| :--- | :--- | :--- | :--- |
| `admin` | `admin1234` | Admin | หน้า Admin Menu |
| `benya` | `benya1234` | Admin | หน้า Admin Menu |
| `naphat` | `naphat1234` | Admin | หน้า Admin Menu |
| `user1` | `user1pass` | User | หน้าแรก |
| `user2` | `user2pass` | User | หน้าแรก |

บัญชีที่สมัครใหม่ผ่านหน้า Sign Up จะเป็น User เสมอ บัญชี Admin สร้างได้จากหน้า Admin Manage เท่านั้น

## คู่มือการใช้งานหน้าเว็บ

### Navigation bar

แถบเมนูด้านบนเปลี่ยนตามสถานะการ Login

| สถานะ | เมนูที่เห็น |
| :--- | :--- |
| ยังไม่ Login | Search, Trends, Team, Login |
| User | Search, Trends, Team, รูปโปรไฟล์และชื่อ |
| Admin | Search, Trends, Team, Admin, รูปโปรไฟล์และชื่อ |

คลิกรูปโปรไฟล์เพื่อเปิด Dropdown ที่มี My Profile และ Logout กดนอกเมนูหรือกด Esc เพื่อปิด ก่อน Logout ระบบจะถามยืนยันอีกครั้ง

### หน้าสำหรับทุกคน

**Home** (`/`)
แสดง Featured Creators ที่สุ่มจาก Creator สถานะ Active ทุกครั้งที่โหลดหน้า กด View Details เพื่อดูรายละเอียดของ Creator คนนั้น

**Search** (`/search`)
ค้นหา Creator ได้หลายเงื่อนไขพร้อมกัน

1. ชื่อ Creator (พิมพ์บางส่วนของชื่อก็ได้)
2. Category
3. Platform (เลือกได้หลายอัน ผลลัพธ์คือ Creator ที่อยู่บนแพลตฟอร์มใดก็ได้ที่เลือก)
4. ช่วงจำนวน Followers ใช้ Slider แบบ 2 ด้าน หรือพิมพ์ตัวเลขที่ปลายแต่ละด้าน ช่วงต่ำสุดและสูงสุดของ Slider ดึงจากข้อมูลจริงใน Database

ผลการค้นหาแสดงเฉพาะ Creator ที่มีสถานะ Active

**Creator Detail** (`/creator?id=C000000101`)
แสดงรูป ชื่อ หมวดหมู่ จำนวน Followers แพลตฟอร์ม และคำอธิบายของ Creator

**Trends** (`/trends`)
แสดงข่าวเด่นจาก NewsAPI ในรูปแบบ Mosaic แบ่งเป็น 5 หมวด ได้แก่ Top Stories, Entertainment, Sports, Technology และ Business กดปุ่มด้านบนเพื่อกรองตามหมวด กดที่ข่าวเพื่อเปิดอ่านบทความต้นฉบับในแท็บใหม่

**Team** (`/team`)
หน้าแนะนำสมาชิกกลุ่ม แสดงรูป ชื่อภาษาอังกฤษและภาษาไทย รหัสนักศึกษา และลิงก์ Instagram

**Login** (`/auth/login`) และ **Sign Up**
Login ใช้หน้าเดียวกันทั้ง Admin และ User ถ้าชื่อผู้ใช้หรือรหัสผ่านผิด ข้อความแจ้งเตือนจะขึ้นใต้ฟอร์ม Sign Up ต้องกรอกทุกช่อง รหัสผ่านยาวอย่างน้อย 8 ตัวอักษร และ Username กับ Email ต้องไม่ซ้ำกับบัญชีอื่น สมัครสำเร็จแล้วระบบจะพากลับไปหน้า Login

### หน้าสำหรับผู้ที่ Login แล้ว

**My Profile** (`/profile`)
แก้ไขชื่อ นามสกุล Email และ Bio ได้ อัปโหลดรูปโปรไฟล์ได้โดยลากไฟล์มาวางในกรอบหรือคลิกเพื่อเลือกไฟล์ (รองรับ JPG, PNG และ HEIC) รูปตัวอย่างจะขึ้นทันทีก่อนกดบันทึก กด Clear Picture เพื่อลบรูป

เปลี่ยนรหัสผ่านต้องกรอกรหัสผ่านปัจจุบันด้วย ถ้าไม่ต้องการเปลี่ยน ให้เว้นช่องรหัสผ่านทั้ง 3 ช่องว่างไว้ Username แก้ไม่ได้ เพราะ token ของการ Login ผูกกับ Username

### หน้าสำหรับ Admin

ทุกหน้าใน `/admin` เปิดได้เฉพาะ Admin ถ้ายังไม่ Login หรือเป็น User ระบบจะพาไปหน้า Login

**Admin Menu** (`/admin`)
หน้าแรกหลัง Admin Login มีเมนูไปยัง Admin Manage, Creator Manage และ User Manage

**Creator Manage**

| หน้า | URL | ทำอะไรได้ |
| :--- | :--- | :--- |
| ค้นหาและรายการ Creator | `/admin/creators` | ค้นหาด้วยชื่อ Category Status และ Platform ไม่ใส่เงื่อนไขเลยจะแสดงทุกคน กด Edit หรือ Delete ได้จากตาราง |
| เพิ่ม Creator | `/admin/creatormanage` | กรอกข้อมูลและอัปโหลดรูป |
| แก้ไข Creator | `/admin/creatormanage?id=...` | แก้ข้อมูล เปลี่ยนรูป ลบรูป หรือลบ Creator |

ช่อง Platforms ใส่ได้หลายค่า โดยคั่นด้วยเครื่องหมายจุลภาค เช่น `Instagram, TikTok` การลบ Creator จะลบข้อมูลแพลตฟอร์ม ประวัติการแก้ไข และไฟล์รูปของ Creator คนนั้นด้วย กู้คืนไม่ได้

**Admin Manage**

| หน้า | URL | ทำอะไรได้ |
| :--- | :--- | :--- |
| ค้นหาและรายการ Admin | `/admin/admins` | ค้นหาด้วยชื่อ Email และ Position |
| เพิ่มหรือแก้ไข Admin | `/admin/adminmanage` หรือ `/admin/adminmanage?id=...` | ตอนแก้ไข ถ้าเว้นช่องรหัสผ่านว่างไว้ ระบบจะใช้รหัสผ่านเดิม |

Admin ลบบัญชีของตัวเองไม่ได้ และระบบไม่ยอมให้ลบ Admin คนสุดท้าย ทุกครั้งที่เพิ่มหรือแก้ไข Admin ระบบจะบันทึกลงตาราง `Management` ว่าใครเป็นผู้แก้

**User Manage**

| หน้า | URL | ทำอะไรได้ |
| :--- | :--- | :--- |
| ค้นหาและรายการ User | `/admin/users` | ค้นหาด้วยชื่อหรือ Username และ Email |
| เพิ่มหรือแก้ไข User | `/admin/usermanage` หรือ `/admin/usermanage?id=...` | แก้ข้อมูล ตั้งรหัสผ่านใหม่ ลบรูปโปรไฟล์ หรือลบบัญชี |

Admin อัปโหลดรูปแทน User ไม่ได้ ลบได้อย่างเดียว ผู้ใช้ต้องอัปโหลดรูปเองที่หน้า My Profile ถ้า Admin เปลี่ยน Username ของ User คนใด ผู้ใช้คนนั้นต้อง Login ใหม่

## Public Web Service: NewsAPI

หน้า Trends ใช้ข้อมูลจาก [NewsAPI](https://newsapi.org) Endpoint `top-headlines` ลำดับการทำงานเป็นดังนี้

1. `trends.js` ในหน้าเว็บเรียก `GET http://localhost:3030/trends?category=...` ทีละหมวด ด้วย Fetch API
2. Web Service ส่ง Request ไปที่ NewsAPI โดยใช้ key จาก `.env` ดังนั้น key ไม่หลุดไปถึง Browser
3. ขอข่าวของประเทศไทยก่อน ถ้าหมวดนั้นไม่มีข่าวไทย จะใช้ข่าวของสหรัฐฯ แทน หน้าเว็บจึงไม่ว่าง
4. Web Service เก็บผลลัพธ์ของแต่ละหมวดไว้ 30 นาที ระหว่างนั้น Request ซ้ำจะไม่เรียก NewsAPI อีก

| Parameter | ค่า |
| :--- | :--- |
| `category` | `general`, `entertainment`, `sports`, `technology`, `business` |
| `country` | `th` (ถ้าไม่มีข่าว ใช้ `us`) |
| `pageSize` | `4` |
| `apiKey` | ค่า `NEWS_API_KEY` จาก `.env` |

ข้อจำกัดของแพ็กเกจฟรี: เรียกได้ 100 ครั้งต่อวัน และข่าวช้ากว่าเวลาจริงประมาณ 24 ชั่วโมง เปิดหน้า Trends ครั้งแรกใช้ไป 5 ครั้งขึ้นไป (มากกว่านั้นถ้าต้องใช้ข่าวสำรองจากสหรัฐฯ)

## API Reference

Base URL: `http://localhost:3030`

Route ที่ต้อง Login ต้องแนบ Header `Authorization` เป็น token ดูวิธีขอ token ได้ที่ [วิธีขอ Token สำหรับ Authorization](#วิธีขอ-token-สำหรับ-authorization)

### Authentication

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| POST | `/login` | ทุกคน | Login แล้วตั้ง Cookie `token` จากนั้น redirect ตาม Role |
| POST | `/signup` | ทุกคน | สมัครสมาชิกเป็น User |

### Creators

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| GET | `/creators` | ทุกคน | ค้นหา Creator ทุกสถานะ (`name`, `category`, `status`, `platform`) |
| GET | `/creators/featured` | ทุกคน | สุ่ม Creator สถานะ Active สำหรับหน้าแรก |
| GET | `/creators/follower-range` | ทุกคน | ค่า Followers ต่ำสุดและสูงสุด สำหรับ Slider |
| GET | `/creators/search` | ทุกคน | ค้นหาเฉพาะ Active (`name`, `category`, `platform`, `min_followers`, `max_followers`) |
| GET | `/creators/:id` | ทุกคน | ดู Creator หนึ่งคน |
| POST | `/creators` | Admin | เพิ่ม Creator (form-data พร้อมไฟล์ `picture`) |
| PUT | `/creators/:id` | Admin | แก้ไข Creator (ส่ง `remove_picture=1` เพื่อลบรูป) |
| DELETE | `/creators/:id` | Admin | ลบ Creator |

### Profile ของตัวเอง

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| GET | `/me` | ผู้ที่ Login | ดูข้อมูลของตัวเอง |
| PUT | `/me` | ผู้ที่ Login | แก้ข้อมูล เปลี่ยนรูป เปลี่ยนรหัสผ่าน |

### Admin accounts

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| GET | `/admins` | Admin | ค้นหา Admin (`name`, `email`, `position`) |
| GET | `/admins/:id` | Admin | ดู Admin หนึ่งคน |
| POST | `/admins` | Admin | เพิ่ม Admin (raw JSON) |
| PUT | `/admins/:id` | Admin | แก้ไข Admin |
| DELETE | `/admins/:id` | Admin | ลบ Admin |

### User accounts

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| GET | `/users` | Admin | ค้นหา User (`name`, `email`) |
| GET | `/users/:id` | Admin | ดู User หนึ่งคน |
| POST | `/users` | Admin | เพิ่ม User (raw JSON) |
| PUT | `/users/:id` | Admin | แก้ไข User (ส่ง `"remove_picture": true` เพื่อลบรูป) |
| DELETE | `/users/:id` | Admin | ลบ User |

### Trends

| Method | Endpoint | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| GET | `/trends?category=...` | ทุกคน | ข่าวเด่นจาก NewsAPI ทีละหมวด |

ทุก Response เป็น JSON รูปแบบเดียวกัน กรณีสำเร็จเป็น `{ "error": false, "data": ... }` กรณีผิดพลาดเป็น `{ "error": true, "message": "..." }` พร้อม HTTP status ที่ตรงกับปัญหา เช่น 400 ข้อมูลไม่ครบ, 401 ไม่ได้ Login, 403 ไม่ใช่ Admin, 404 ไม่พบข้อมูล, 409 ข้อมูลซ้ำ

## ระบบ Authentication (JWT)

ระบบยืนยันตัวตนด้วย JSON Web Token (JWT) โดยใช้ `jwt-simple` สร้าง token และ `passport-jwt` ตรวจ token

**ตอน Login**

1. Web Service ตรวจ Username และ Password กับตาราง `User_account`
2. ถ้าถูกต้อง จะสร้าง Payload แล้ว sign ด้วย `JWT_SECRET`

   ```json
   {
     "sub": "admin",
     "role": 1,
     "iat": 1763290000
   }
   ```

   `sub` คือ Username, `role` คือ 1 = Admin และ 2 = User, `iat` คือเวลาที่สร้าง token

3. บันทึกการ Login ลงตาราง `Login_log`
4. เก็บ token ใน Cookie ชื่อ `token` แล้ว redirect ไปหน้า Admin Menu หรือหน้าแรกตาม Role

**ตอนเรียก Route ที่ต้อง Login**

หน้าเว็บอ่าน token จาก Cookie แล้วแนบไปใน Header

| Key | Value |
| :--- | :--- |
| `Authorization` | `token_ที่ได้จากการ_login` |

ไม่ต้องใส่คำว่า `Bearer` นำหน้า เพราะโค้ดใช้ `ExtractJwt.fromHeader('authorization')`

Middleware `requireJWTAuth` ถอดรหัส token แล้วนำ Username ไปค้นใน Database อีกครั้ง เพื่อยืนยันว่าบัญชียังมีอยู่ ข้อมูลผู้ใช้จะอยู่ใน `req.user` จากนั้น Route ของ Admin จะผ่าน `requireAdmin` อีกชั้น ถ้า `Role_ID` ไม่ใช่ 1 จะได้ 403 "Admins only"

## วิธีขอ Token สำหรับ Authorization

Route ที่มีสิทธิ์ "Admin" หรือ "ผู้ที่ Login" ใน [API Reference](#api-reference) ต้องแนบ token ทุกครั้ง ถ้าไม่แนบจะได้ 401 Unauthorized ถ้าใช้ token ของ User กับ Route ของ Admin จะได้ 403 "Admins only"

กดที่หัวข้อด้านล่างเพื่อเปิดดูขั้นตอนของแต่ละวิธี

<a id="token-postman"></a>
<details>
<summary><b>วิธีที่ 1: ขอ Token ผ่าน Postman</b></summary>

1. สร้าง Request ใหม่ เลือก Method เป็น `POST` และใส่ URL `http://localhost:3030/login`
2. ไปที่แท็บ Body เลือก `x-www-form-urlencoded` แล้วเพิ่ม 2 ค่า

   | Key | Value |
   | :--- | :--- |
   | `username` | `admin` |
   | `password` | `admin1234` |

   ถ้าต้องการ token ของ User ให้ใช้ `user1` / `user1pass` แทน
3. กด Send แล้วเปิดแท็บ Cookies ในส่วน Response คัดลอกค่าของ `token`
4. ถ้าแท็บ Cookies ว่าง ให้ไปที่แท็บ Settings ของ Request ปิด "Automatically follow redirects" แล้วกด Send อีกครั้ง Response จะเป็น 302 และ token อยู่ใน Header `Set-Cookie` (คัดลอกเฉพาะส่วนหลัง `token=` จนถึงก่อนเครื่องหมาย `;`)

</details>

<a id="token-browser"></a>
<details>
<summary><b>วิธีที่ 2: ขอ Token จากหน้าเว็บ</b></summary>

1. เปิด `http://localhost:8081/auth/login` แล้ว Login ด้วยบัญชีที่ต้องการ
2. กด F12 แล้วเปิดแท็บ Console
3. พิมพ์คำสั่งนี้แล้วกด Enter

   ```javascript
   getCookie('token')
   ```

4. คัดลอกข้อความที่ได้ โดยไม่เอาเครื่องหมายคำพูด

อีกทางหนึ่งคือ กด F12 แล้วไปที่แท็บ Application (ใน Safari คือ Storage) เลือก Cookies > `http://localhost:8081` แล้วคัดลอกค่าของ `token`

</details>

<a id="token-use"></a>
<details>
<summary><b>นำ Token ไปใช้ใน Postman</b></summary>

1. เปิด Request ที่ต้องการทดสอบ เช่น `GET http://localhost:3030/admins`
2. ไปที่แท็บ Headers แล้วเพิ่มค่านี้

   | Key | Value |
   | :--- | :--- |
   | `Authorization` | token ที่คัดลอกมา |

3. ไม่ต้องใส่คำว่า `Bearer` นำหน้า เพราะ Web Service อ่าน token ตรงจาก Header (`ExtractJwt.fromHeader('authorization')`)
4. กด Send ถ้าได้ 200 แสดงว่าใช้ได้

</details>

Token ไม่มีวันหมดอายุ แต่จะใช้ไม่ได้ถ้า Username ของบัญชีนั้นเปลี่ยน หรือมีการลบบัญชีนั้นไปแล้ว ในกรณีนี้ให้ Login ใหม่เพื่อขอ token ใหม่

## การอัปโหลดรูปภาพ (Multer)

Web Service ใช้ Multer รับไฟล์จาก `multipart/form-data` แล้วเขียนไฟล์ลงโฟลเดอร์ `public` ของ Frontend โดยตรง หน้าเว็บจึงแสดงรูปได้ทันที

| ใช้กับ | Field name | โฟลเดอร์ปลายทาง | Path ที่เก็บใน Database |
| :--- | :--- | :--- | :--- |
| รูป Creator | `picture` | `sec1_gr11_fe_src/public/creators/` | `/creators/1763350000000.jpg` |
| รูปโปรไฟล์ | `picture` | `sec1_gr11_fe_src/public/users/` | `/users/U1763350000000.jpg` |

กติกาของไฟล์

- ตั้งชื่อไฟล์ใหม่ด้วย Timestamp (`Date.now()`) เพื่อไม่ให้ชื่อซ้ำ
- รูป HEIC และ HEIF จาก iPhone แปลงเป็น JPG ด้วย `heic-convert` ก่อนบันทึก
- รูปโปรไฟล์รับเฉพาะไฟล์รูปภาพ ขนาดไม่เกิน 10 MB
- เปลี่ยนรูป ลบรูป หรือลบ Creator/User แล้ว ระบบจะลบไฟล์เก่าออกจากโฟลเดอร์ให้ด้วย
- ถ้าบันทึกข้อมูลไม่สำเร็จ ระบบจะลบไฟล์ที่เพิ่งอัปโหลดทิ้ง ไฟล์จึงไม่ค้างอยู่ในโฟลเดอร์

ตัวอย่างการตั้งค่า Storage ของรูป Creator

```javascript
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'sec1_gr11_fe_src', 'public', 'creators'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// ใช้ใน Route: รับไฟล์ field "picture" แล้วแปลง HEIC ก่อนเข้า handler
router.post('/creators', requireJWTAuth, requireAdmin, upload.single('picture'), fixHeic, async (req, res) => {
    const picture = req.file ? `/creators/${req.file.filename}` : null;
    // ...
});
```

## การทดสอบด้วย Postman

ทุก Route ใน `sec1_gr11_ws_src/src/app.js` มี Test case เขียนไว้เป็น Comment ด้านบน Route นั้น อย่างน้อย Route ละ 2 กรณี ระบุ Method, URL, Header, Body และผลลัพธ์ที่ควรได้

ผลลัพธ์ใน Test case อ้างอิงข้อมูลจากไฟล์ SQL ที่เพิ่ง import ใหม่ ถ้าทดสอบเพิ่ม แก้ หรือลบข้อมูลไปแล้ว ให้ import `sec1_gr11_database.sql` ใหม่ก่อนทดสอบรอบถัดไป

**ประเภท Body ที่ใช้**

| Route | Body type ใน Postman |
| :--- | :--- |
| `/login`, `/signup` | `x-www-form-urlencoded` |
| `/creators` (POST, PUT), `/me` (PUT) | `form-data` (ช่อง `picture` เลือกเป็น File) |
| `/admins`, `/users` (POST, PUT) | `raw` แล้วเลือก `JSON` |

Route ที่ต้อง Login ต้องแนบ token ใน Header ดูขั้นตอนได้ที่ [วิธีขอ Token สำหรับ Authorization](#วิธีขอ-token-สำหรับ-authorization)

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุและวิธีแก้ |
| :--- | :--- |
| `Cannot find module 'express'` | ยังไม่ได้รัน `npm install` ในโฟลเดอร์นั้น |
| `DB connection failed: Access denied` | `DBUSER` หรือ `DBPASSWORD` ใน `.env` ไม่ตรงกับ MySQL ของเครื่อง |
| `Unknown database 'creatormatch'` | ยังไม่ได้ import `sec1_gr11_database.sql` |
| `fetch is not defined` | Node.js เก่ากว่าเวอร์ชัน 18 ให้อัปเดต Node |
| หน้าเว็บขึ้น "Could not load ..." | Web Service ยังไม่ได้เปิด หรือไม่ได้รันที่ port 3030 |
| Login แล้วแถบเมนูยังขึ้น Login | เปิดเว็บผ่าน `127.0.0.1` ให้เปลี่ยนเป็น `localhost:8081` |
| หน้า Trends ขึ้น "NewsAPI key is missing or wrong" | ยังไม่ได้ใส่ `NEWS_API_KEY` ใน `.env` หรือใส่ผิด แก้แล้วต้อง Restart Web Service |
| หน้า Trends ขึ้น "daily limit reached" | ใช้โควตา 100 ครั้งต่อวันของ NewsAPI หมดแล้ว ต้องรอวันถัดไป |
| รูป Creator ไม่ขึ้น | โฟลเดอร์ `public/creators/` ไม่ครบ ไฟล์รูปต้องมาพร้อมกับโปรเจกต์ |
| แก้ CSS หรือ JS แล้วหน้าเว็บไม่เปลี่ยน | Browser ใช้ไฟล์เก่าจาก cache ให้กด Cmd+Shift+R (Mac) หรือ Ctrl+Shift+R (Windows) |
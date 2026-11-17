-- =====================================================================
-- sec1_gr11_database.sql: CreatorMatch database (MySQL 8.0.16+)
-- Creates the database, every table, and sample data. Safe to re-run: it drops and recreates everything.
-- Run in MySQL Workbench (File > Run SQL Script) or: mysql -u root -p < sec1_gr11_database.sql
-- Accounts live in one table, User_account, with Role_ID:
--   1 = Admin   (must be linked to a Team_Member)
--   2 = User    (regular sign-up, no Team_Member link)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS creatormatch
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE creatormatch;

-- Drop in reverse dependency order (safe to re-run)
DROP TABLE IF EXISTS Creator_Platform;
DROP TABLE IF EXISTS Management;
DROP TABLE IF EXISTS Edition;
DROP TABLE IF EXISTS Creator;
DROP TABLE IF EXISTS Login_log;
DROP TABLE IF EXISTS User_account;
DROP TABLE IF EXISTS Admin_account;   -- old table name, removed
DROP TABLE IF EXISTS Role;
DROP TABLE IF EXISTS Team_Member;

-- ---------------------------------------------------------------------
-- 1. Team_Member
-- ---------------------------------------------------------------------
CREATE TABLE Team_Member (
  TeamMemberID        VARCHAR(10)  NOT NULL COMMENT 'รหัสสมาชิกทีม (TXXXXXXXXX)',
  student_id          VARCHAR(10)  NULL     COMMENT 'รหัสนักศึกษา',
  email               VARCHAR(100) NOT NULL COMMENT 'อีเมลของสมาชิกทีม',
  t_first_name        VARCHAR(50)  NOT NULL COMMENT 'ชื่อจริงของสมาชิกทีม',
  t_last_name         VARCHAR(50)  NOT NULL COMMENT 'นามสกุลของสมาชิกทีม',
  position            VARCHAR(50)  NOT NULL COMMENT 'ตำแหน่งงานของสมาชิกทีม',
  role                VARCHAR(50)  NOT NULL COMMENT 'บทบาทของสมาชิกทีมในระบบ',
  phone               VARCHAR(15)  NULL     COMMENT 'หมายเลขโทรศัพท์ของสมาชิกทีม',
  member_picture_link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์ของสมาชิกทีม',
  social_link         VARCHAR(255) NULL     COMMENT 'ลิงก์ Social Media ส่วนตัวของสมาชิกทีม',
  PRIMARY KEY (TeamMemberID),
  UNIQUE KEY uq_team_member_email (email),
  CONSTRAINT chk_team_member_email CHECK (CHAR_LENGTH(email) >= 5),
  CONSTRAINT chk_team_member_phone CHECK (phone IS NULL OR CHAR_LENGTH(phone) BETWEEN 9 AND 15)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='สมาชิกทีม';

-- ---------------------------------------------------------------------
-- 2. Role  (lookup: 1 = Admin, 2 = User)
-- ---------------------------------------------------------------------
CREATE TABLE Role (
  Role_ID   INT         NOT NULL COMMENT 'รหัสบทบาท (1 = Admin, 2 = User)',
  Role_Name VARCHAR(20) NOT NULL COMMENT 'ชื่อบทบาท',
  PRIMARY KEY (Role_ID),
  UNIQUE KEY uq_role_name (Role_Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บทบาทของบัญชีผู้ใช้';

INSERT INTO Role (Role_ID, Role_Name) VALUES
(1, 'Admin'),
(2, 'User');

-- ---------------------------------------------------------------------
-- 3. User_account  (replaces Admin_account; admins and regular users)
-- ---------------------------------------------------------------------
CREATE TABLE User_account (
  UserID            VARCHAR(10)  NOT NULL COMMENT 'รหัสบัญชีผู้ใช้ (UXXXXXXXXX)',
  username          VARCHAR(30)  NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ',
  email             VARCHAR(100) NOT NULL COMMENT 'อีเมลของผู้ใช้',
  password          VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน',
  first_name        VARCHAR(50)  NOT NULL COMMENT 'ชื่อจริง',
  last_name         VARCHAR(50)  NOT NULL COMMENT 'นามสกุล',
  Position          VARCHAR(50)  NULL     COMMENT 'ตำแหน่งในทีม (เฉพาะแอดมิน)',
  User_picture_link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์',
  Bio               VARCHAR(255) NULL     COMMENT 'ประวัติโดยย่อ',
  Role_ID           INT          NOT NULL DEFAULT 2 COMMENT 'บทบาท (1 = Admin, 2 = User)',
  TeamMemberID      VARCHAR(10)  NULL     COMMENT 'รหัสสมาชิกทีม (เฉพาะแอดมิน, 1:1)',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่สร้างบัญชี',
  PRIMARY KEY (UserID),
  UNIQUE KEY uq_user_username (username),
  UNIQUE KEY uq_user_email (email),
  UNIQUE KEY uq_user_team_member (TeamMemberID),  -- one account per team member (NULLs allowed)
  KEY idx_user_role (Role_ID),
  CONSTRAINT fk_user_role
    FOREIGN KEY (Role_ID) REFERENCES Role (Role_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_user_team_member
    FOREIGN KEY (TeamMemberID) REFERENCES Team_Member (TeamMemberID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_user_password CHECK (CHAR_LENGTH(password) >= 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บัญชีผู้ใช้ (แอดมินและผู้ใช้ทั่วไป)';

-- ---------------------------------------------------------------------
-- 4. Login_log
-- ---------------------------------------------------------------------
CREATE TABLE Login_log (
  Login_log_ID    VARCHAR(20) NOT NULL COMMENT 'รหัสบันทึกการเข้าสู่ระบบ (LXXXXXXXXX)',
  login_datetime  DATETIME    NOT NULL COMMENT 'วันและเวลาที่เข้าสู่ระบบ',
  logout_datetime DATETIME    NULL     COMMENT 'วันและเวลาที่ออกจากระบบ',
  login_status    VARCHAR(20) NOT NULL COMMENT 'สถานะการเข้าสู่ระบบ (Success/Failed)',
  UserID          VARCHAR(10) NOT NULL COMMENT 'รหัสบัญชีผู้ใช้ที่เข้าสู่ระบบ',
  PRIMARY KEY (Login_log_ID),
  KEY idx_login_log_user (UserID),
  CONSTRAINT fk_login_log_user
    FOREIGN KEY (UserID) REFERENCES User_account (UserID)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_login_status CHECK (login_status IN ('Success', 'Failed')),
  CONSTRAINT chk_logout_after_login CHECK (logout_datetime IS NULL OR logout_datetime >= login_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บันทึกการเข้าสู่ระบบ';

-- ---------------------------------------------------------------------
-- 5. Creator
-- ---------------------------------------------------------------------
CREATE TABLE Creator (
  creatorID            VARCHAR(10)  NOT NULL COMMENT 'รหัสครีเอเตอร์ (CXXXXXXXXX)',
  category             VARCHAR(50)  NOT NULL COMMENT 'ประเภทเนื้อหาของครีเอเตอร์',
  c_first_name         VARCHAR(50)  NULL     COMMENT 'ชื่อจริงของครีเอเตอร์',
  c_last_name          VARCHAR(50)  NULL     COMMENT 'นามสกุลของครีเอเตอร์',
  creator_name         VARCHAR(100) NOT NULL COMMENT 'ชื่อที่ใช้แสดงผล/ชื่อช่องของครีเอเตอร์',
  followers            INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'จำนวนผู้ติดตาม',
  creator_picture_Link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์ของครีเอเตอร์',
  Description          VARCHAR(255) NULL     COMMENT 'คำอธิบายเกี่ยวกับครีเอเตอร์',
  Status               VARCHAR(20)  NOT NULL COMMENT 'สถานะของครีเอเตอร์ในระบบ (Active/Inactive)',
  PRIMARY KEY (creatorID),
  CONSTRAINT chk_creator_status CHECK (Status IN ('Active', 'Inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ครีเอเตอร์';

-- ---------------------------------------------------------------------
-- 6. Edition  (admin edits creator; only Role 1 should write here, enforced in the backend)
-- ---------------------------------------------------------------------
CREATE TABLE Edition (
  AdminID        VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้ทำการแก้ไข (UserID ที่ Role_ID = 1)',
  creatorID      VARCHAR(10) NOT NULL COMMENT 'รหัสครีเอเตอร์ที่ถูกแก้ไข',
  edit_logID     VARCHAR(20) NOT NULL COMMENT 'รหัสการแก้ไขข้อมูลครีเอเตอร์ (MXXXXXXXXX)',
  edit_timestamp DATETIME    NOT NULL COMMENT 'วันและเวลาที่ทำการแก้ไข',
  edit_type      VARCHAR(20) NOT NULL COMMENT 'ประเภทของการแก้ไข (Create/Update/Delete)',
  PRIMARY KEY (AdminID, creatorID, edit_logID),
  KEY idx_edition_creator (creatorID),
  CONSTRAINT fk_edition_admin
    FOREIGN KEY (AdminID) REFERENCES User_account (UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_edition_creator
    FOREIGN KEY (creatorID) REFERENCES Creator (creatorID)
    ON UPDATE CASCADE ON DELETE CASCADE,   -- deleting a creator also removes their edit history
  CONSTRAINT chk_edit_type CHECK (edit_type IN ('Create', 'Update', 'Delete'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ประวัติการแก้ไขข้อมูลครีเอเตอร์โดยแอดมิน';

-- ---------------------------------------------------------------------
-- 7. Management  (super admin manages admin; both must be Role 1, enforced in the backend)
-- ---------------------------------------------------------------------
CREATE TABLE Management (
  superAdminID     VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้ทำการแก้ไข',
  AdminID          VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้รับการแก้ไข',
  manage_timestamp DATETIME    NOT NULL COMMENT 'วันและเวลาที่ทำการแก้ไข',
  PRIMARY KEY (superAdminID, AdminID),
  KEY idx_management_admin (AdminID),
  CONSTRAINT fk_management_super_admin
    FOREIGN KEY (superAdminID) REFERENCES User_account (UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_management_admin
    FOREIGN KEY (AdminID) REFERENCES User_account (UserID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='การจัดการบัญชีแอดมินโดยแอดมินระดับสูง';

-- ---------------------------------------------------------------------
-- 8. Creator_Platform  (multivalued attribute of Creator)
-- ---------------------------------------------------------------------
CREATE TABLE Creator_Platform (
  Platform  VARCHAR(50) NOT NULL COMMENT 'แพลตฟอร์มที่ครีเอเตอร์ใช้งาน (YouTube/TikTok/IG/...)',
  creatorID VARCHAR(10) NOT NULL COMMENT 'รหัสครีเอเตอร์',
  PRIMARY KEY (Platform, creatorID),
  KEY idx_creator_platform_creator (creatorID),
  CONSTRAINT fk_creator_platform_creator
    FOREIGN KEY (creatorID) REFERENCES Creator (creatorID)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='แพลตฟอร์มของครีเอเตอร์';

-- =====================================================================
-- SAMPLE DATA
-- =====================================================================

-- ---------------------------------------------------------------------
-- Team members (Section 1, Group 11). [bracketed] values are placeholders to replace.
-- Photos: put the image in sec1_gr11_fe_src/public/team/ and set member_picture_link to '/team/<file>'.
-- ---------------------------------------------------------------------
INSERT INTO Team_Member (TeamMemberID, student_id, email, t_first_name, t_last_name, position, role, phone, member_picture_link, social_link) VALUES
('T000000001', '6887027', 'job@creatormatch.com',              'Tanut',    'Noumanong',   'Developer',   'Admin', NULL, NULL, 'https://github.com/jobtanut'),
('T000000002', '6887004', '[benya-email]@creatormatch.com',    'Benya',    'Shinno',      'Team Member', 'Admin', NULL, NULL, NULL),
('T000000003', '6887030', '[naphat-email]@creatormatch.com',   'Naphat',   '[last name]', 'Team Member', 'Admin', NULL, NULL, NULL),
('T000000004', '6887048', '[monthisa-email]@creatormatch.com', 'Monthisa', '[last name]', 'Team Member', 'Admin', NULL, NULL, NULL),
('T000000005', '6887095', '[kunticha-email]@creatormatch.com', 'Kunticha', '[last name]', 'Team Member', 'Admin', NULL, NULL, NULL);

-- ---------------------------------------------------------------------
-- Admin accounts (Role_ID = 1), linked to team members.  Logins:
--   admin  / admin1234     benya / benya1234     naphat / naphat1234
-- ---------------------------------------------------------------------
INSERT INTO User_account (UserID, username, email, password, first_name, last_name, Position, Role_ID, TeamMemberID) VALUES
('U000000001', 'admin',  'job@creatormatch.com',            'admin1234',  'Tanut',  'Noumanong',   'Developer',   1, 'T000000001'),
('U000000002', 'benya',  '[benya-email]@creatormatch.com',  'benya1234',  'Benya',  'Shinno',      'Team Member', 1, 'T000000002'),
('U000000003', 'naphat', '[naphat-email]@creatormatch.com', 'naphat1234', 'Naphat', '[last name]', 'Team Member', 1, 'T000000003');

-- ---------------------------------------------------------------------
-- Regular users (Role_ID = 2), created through Sign Up.  Logins:
--   user1 / user1pass     user2 / user2pass
-- ---------------------------------------------------------------------
INSERT INTO User_account (UserID, username, email, password, first_name, last_name, Role_ID) VALUES
('U000000101', 'user1', 'user1@example.com', 'user1pass', 'Somchai', 'Jaidee', 2),
('U000000102', 'user2', 'user2@example.com', 'user2pass', 'Suda',    'Rakdee', 2);

-- Creators (exported from the live database)
INSERT INTO Creator (creatorID, category, c_first_name, c_last_name, creator_name, followers, creator_picture_Link, Description, Status) VALUES
('C907420921', 'Fashion', 'polly', 'Pinsumrong', 'aomsin', 99999, '/creators/1794907419484.jpg', 'tum dai tuk yang loei jaaa', 'Active'),
('C000000106', 'Fashion', 'Bank', 'Thanakorn', 'BankFits', 210000, NULL, 'Streetwear lookbooks and sneaker reviews', 'Active'),
('C903652215', 'Lifestyle', 'Benya', 'Shinno', 'Bebe', 40000, '/creators/1794904671516.jpg', 'Eat with Gun', 'Active'),
('C000000103', 'Lifestyle', 'Fah', 'Chaiyaporn', 'FahDaily', 1200000, NULL, 'Daily vlogs, morning routines and room makeovers', 'Active'),
('C901951047', 'Food', 'Gunticha', 'Inma', 'Gun Inma', 10000, '/creators/1794902052857.jpg', 'Likes Food', 'Active'),
('C000000109', 'Food', 'Jay', 'Boonmee', 'JayDessert', 880000, '/creators/1794908821274.avif', 'Dessert recipes and cafe dessert reviews', 'Active'),
('C901885581', 'Food', 'Tanut', 'Noumanong', 'Job Tanut', 0, NULL, 'Personal Systems that sync tools and make workflows efficient', 'Active'),
('C000000102', 'Food', 'Krit', 'Somboon', 'KritCooks', 98000, NULL, 'Easy Thai home cooking in under 20 minutes', 'Active'),
('C000000110', 'Lifestyle', 'Mint', 'Chanthara', 'MintFitLife', 150000, NULL, 'Home workouts and healthy meal prep', 'Inactive'),
('C000000108', 'Technology', 'Mook', 'Prasert', 'MookCodes', 15000, NULL, 'Beginner coding tutorials and student life in ICT', 'Active'),
('C000000104', 'Lifestyle', 'Nont', 'Wongsiri', 'NontSlowLife', 35000, NULL, 'Slow living, cafe hopping and weekend trips', 'Active'),
('C000000101', 'Food', 'Ploy', 'Rattanakul', 'PloyEats', 450000, NULL, 'Street food tours around Bangkok and honest restaurant reviews', 'Active'),
('C000000105', 'Fashion', 'Pim', 'Srisuk', 'StyleByPim', 670000, NULL, 'Thrifted outfits and styling tips on a budget', 'Active'),
('C000000107', 'Technology', 'Tom', 'Kittipong', 'TechTom', 320000, NULL, 'Gadget reviews and phone comparisons in Thai', 'Active');

-- Their platforms
INSERT INTO Creator_Platform (Platform, creatorID) VALUES
('message', 'C907420921'),
('TikTok', 'C000000106'),
('YouTube', 'C000000106'),
('Facebook', 'C903652215'),
('Instagram', 'C000000103'),
('TikTok', 'C000000103'),
('YouTube', 'C000000103'),
('Instagram', 'C901951047'),
('Facebook', 'C000000109'),
('Instagram', 'C000000109'),
('TikTok', 'C000000109'),
('YouTube', 'C901885581'),
('Facebook', 'C000000102'),
('YouTube', 'C000000102'),
('Instagram', 'C000000110'),
('YouTube', 'C000000110'),
('YouTube', 'C000000108'),
('Instagram', 'C000000104'),
('Instagram', 'C000000101'),
('TikTok', 'C000000101'),
('Instagram', 'C000000105'),
('TikTok', 'C000000105'),
('Facebook', 'C000000107'),
('YouTube', 'C000000107');

-- ---------------------------------------------------------------------
-- Example history rows, so Login_log, Edition and Management are not empty
-- ---------------------------------------------------------------------
INSERT INTO Login_log (Login_log_ID, login_datetime, logout_datetime, login_status, UserID) VALUES
('L0000000001', '2026-11-16 09:00:00', '2026-11-16 10:30:00', 'Success', 'U000000001'),
('L0000000002', '2026-11-16 13:15:00', NULL,                  'Success', 'U000000002'),
('L0000000003', '2026-11-17 08:45:00', NULL,                  'Failed',  'U000000003');

INSERT INTO Edition (AdminID, creatorID, edit_logID, edit_timestamp, edit_type) VALUES
('U000000001', 'C000000101', 'M0000000001', '2026-11-16 09:10:00', 'Create'),
('U000000001', 'C000000103', 'M0000000002', '2026-11-16 09:12:00', 'Create'),
('U000000002', 'C000000101', 'M0000000003', '2026-11-16 13:20:00', 'Update');

INSERT INTO Management (superAdminID, AdminID, manage_timestamp) VALUES
('U000000001', 'U000000002', '2026-11-15 10:00:00'),
('U000000001', 'U000000003', '2026-11-15 10:05:00');
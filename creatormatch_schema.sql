-- =====================================================================
-- CreatorMatch database schema (MySQL 8.0.16+)
-- Generated from: CreatorMatch_data_dict.xlsx
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
DROP TABLE IF EXISTS Admin_account;
DROP TABLE IF EXISTS Team_Member;

-- ---------------------------------------------------------------------
-- 1. Team_Member
-- ---------------------------------------------------------------------
CREATE TABLE Team_Member (
  TeamMemberID        VARCHAR(10)  NOT NULL COMMENT 'รหัสสมาชิกทีม (TXXXXXXXXX)',
  email               VARCHAR(100) NOT NULL COMMENT 'อีเมลของสมาชิกทีม (ใช้ดึงไปสร้างบัญชีแอดมิน)',
  t_first_name        VARCHAR(50)  NOT NULL COMMENT 'ชื่อจริงของสมาชิกทีม',
  t_last_name         VARCHAR(50)  NOT NULL COMMENT 'นามสกุลของสมาชิกทีม',
  position            VARCHAR(50)  NOT NULL COMMENT 'ตำแหน่งงานของสมาชิกทีม',
  role                VARCHAR(50)  NOT NULL COMMENT 'บทบาทของสมาชิกทีมในระบบ',
  phone               VARCHAR(15)  NULL     COMMENT 'หมายเลขโทรศัพท์ของสมาชิกทีม',
  member_picture_link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์ของสมาชิกทีม',
  PRIMARY KEY (TeamMemberID),
  UNIQUE KEY uq_team_member_email (email),
  CONSTRAINT chk_team_member_email CHECK (CHAR_LENGTH(email) >= 5),
  CONSTRAINT chk_team_member_phone CHECK (phone IS NULL OR CHAR_LENGTH(phone) BETWEEN 9 AND 15)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='สมาชิกทีม';

-- ---------------------------------------------------------------------
-- 2. Admin_account  (1:1 with Team_Member)
-- ---------------------------------------------------------------------
CREATE TABLE Admin_account (
  AdminID            VARCHAR(10)  NOT NULL COMMENT 'รหัสบัญชีแอดมิน (AXXXXXXXXX)',
  username           VARCHAR(30)  NOT NULL COMMENT 'ชื่อผู้ใช้สำหรับเข้าสู่ระบบ',
  password           VARCHAR(255) NOT NULL COMMENT 'รหัสผ่าน (จัดเก็บแบบ hashed)',
  a_first_name       VARCHAR(50)  NOT NULL COMMENT 'ชื่อจริงของแอดมิน',
  a_last_name        VARCHAR(50)  NOT NULL COMMENT 'นามสกุลของแอดมิน',
  Position           VARCHAR(50)  NOT NULL COMMENT 'ตำแหน่งของแอดมินในทีม',
  Permission         VARCHAR(100) NULL     COMMENT 'สิทธิ์การใช้งานของแอดมิน (derived)',
  Admin_picture_link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์ของแอดมิน',
  Bio                VARCHAR(255) NULL     COMMENT 'ประวัติโดยย่อของแอดมิน',
  TeamMemberID       VARCHAR(10)  NOT NULL COMMENT 'รหัสสมาชิกทีมต้นทางที่ใช้สร้างบัญชีแอดมินนี้ (1:1)',
  PRIMARY KEY (AdminID),
  UNIQUE KEY uq_admin_username (username),
  UNIQUE KEY uq_admin_team_member (TeamMemberID),  -- enforces the 1:1 relationship
  CONSTRAINT fk_admin_team_member
    FOREIGN KEY (TeamMemberID) REFERENCES Team_Member (TeamMemberID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_admin_password CHECK (CHAR_LENGTH(password) >= 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บัญชีแอดมิน';

-- ---------------------------------------------------------------------
-- 3. Login_log
-- ---------------------------------------------------------------------
CREATE TABLE Login_log (
  Login_log_ID    VARCHAR(20) NOT NULL COMMENT 'รหัสบันทึกการเข้าสู่ระบบ (LXXXXXXXXX)',
  login_datetime  DATETIME    NOT NULL COMMENT 'วันและเวลาที่เข้าสู่ระบบ',
  logout_datetime DATETIME    NULL     COMMENT 'วันและเวลาที่ออกจากระบบ',
  login_status    VARCHAR(20) NOT NULL COMMENT 'สถานะการเข้าสู่ระบบ (Success/Failed)',
  AdminID         VARCHAR(10) NOT NULL COMMENT 'รหัสบัญชีแอดมินที่เข้าสู่ระบบ',
  PRIMARY KEY (Login_log_ID),
  KEY idx_login_log_admin (AdminID),
  CONSTRAINT fk_login_log_admin
    FOREIGN KEY (AdminID) REFERENCES Admin_account (AdminID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_login_status CHECK (login_status IN ('Success', 'Failed')),
  CONSTRAINT chk_logout_after_login CHECK (logout_datetime IS NULL OR logout_datetime >= login_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='บันทึกการเข้าสู่ระบบ';

-- ---------------------------------------------------------------------
-- 4. Creator
-- ---------------------------------------------------------------------
CREATE TABLE Creator (
  creatorID            VARCHAR(10)  NOT NULL COMMENT 'รหัสครีเอเตอร์ (CXXXXXXXXX)',
  category             VARCHAR(50)  NOT NULL COMMENT 'ประเภทเนื้อหาของครีเอเตอร์',
  c_first_name         VARCHAR(50)  NULL     COMMENT 'ชื่อจริงของครีเอเตอร์',
  c_last_name          VARCHAR(50)  NULL     COMMENT 'นามสกุลของครีเอเตอร์',
  creator_name         VARCHAR(100) NOT NULL COMMENT 'ชื่อที่ใช้แสดงผล/ชื่อช่องของครีเอเตอร์',
  creator_picture_Link VARCHAR(255) NULL     COMMENT 'ลิงก์รูปโปรไฟล์ของครีเอเตอร์',
  Description          VARCHAR(255) NULL     COMMENT 'คำอธิบายเกี่ยวกับครีเอเตอร์',
  Status               VARCHAR(20)  NOT NULL COMMENT 'สถานะของครีเอเตอร์ในระบบ (Active/Inactive)',
  PRIMARY KEY (creatorID),
  CONSTRAINT chk_creator_status CHECK (Status IN ('Active', 'Inactive'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ครีเอเตอร์';

-- ---------------------------------------------------------------------
-- 5. Edition  (junction: Admin_account M:N Creator, "Manage")
-- ---------------------------------------------------------------------
CREATE TABLE Edition (
  AdminID        VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้ทำการแก้ไข',
  creatorID      VARCHAR(10) NOT NULL COMMENT 'รหัสครีเอเตอร์ที่ถูกแก้ไข',
  edit_logID     VARCHAR(20) NOT NULL COMMENT 'รหัสการแก้ไขข้อมูลครีเอเตอร์ (MXXXXXXXXX)',
  edit_timestamp DATETIME    NOT NULL COMMENT 'วันและเวลาที่ทำการแก้ไข',
  edit_type      VARCHAR(20) NOT NULL COMMENT 'ประเภทของการแก้ไข (Create/Update/Delete)',
  PRIMARY KEY (AdminID, creatorID, edit_logID),
  KEY idx_edition_creator (creatorID),
  CONSTRAINT fk_edition_admin
    FOREIGN KEY (AdminID) REFERENCES Admin_account (AdminID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_edition_creator
    FOREIGN KEY (creatorID) REFERENCES Creator (creatorID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_edit_type CHECK (edit_type IN ('Create', 'Update', 'Delete'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ประวัติการแก้ไขข้อมูลครีเอเตอร์โดยแอดมิน';

-- ---------------------------------------------------------------------
-- 6. Management  (Admin_account manages Admin_account, self-referencing M:N)
-- ---------------------------------------------------------------------
CREATE TABLE Management (
  superAdminID     VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้ทำการแก้ไข',
  AdminID          VARCHAR(10) NOT NULL COMMENT 'รหัสแอดมินผู้รับการแก้ไข',
  manage_timestamp DATETIME    NOT NULL COMMENT 'วันและเวลาที่ทำการแก้ไข',
  PRIMARY KEY (superAdminID, AdminID),
  KEY idx_management_admin (AdminID),
  CONSTRAINT fk_management_super_admin
    FOREIGN KEY (superAdminID) REFERENCES Admin_account (AdminID)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_management_admin
    FOREIGN KEY (AdminID) REFERENCES Admin_account (AdminID)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='การจัดการบัญชีแอดมินโดยแอดมินระดับสูง';

-- ---------------------------------------------------------------------
-- 7. Creator_Platform  (multivalued attribute of Creator)
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

DROP TABLE IF EXISTS `user_login`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_login` (
  `Login_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `LoginDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `User_ID` int unsigned NOT NULL,
  PRIMARY KEY (`Login_ID`),
  KEY `fk_user_login` (`User_ID`),
  CONSTRAINT `fk_user_login` FOREIGN KEY (`User_ID`) REFERENCES `user` (`User_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;  

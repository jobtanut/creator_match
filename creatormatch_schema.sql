-- =====================================================================
-- CreatorMatch database schema (MySQL 8.0.16+)
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
  email               VARCHAR(100) NOT NULL COMMENT 'อีเมลของสมาชิกทีม',
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
    ON UPDATE CASCADE ON DELETE RESTRICT,
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
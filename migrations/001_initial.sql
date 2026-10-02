CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME NOT NULL,
  INDEX (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS tasks (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(200) NOT NULL,
  detail TEXT NOT NULL,
  date DATE NOT NULL,
  priority ENUM('low','medium','high') NOT NULL,
  done BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS habits (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(200) NOT NULL,
  icon VARCHAR(20) NOT NULL,
  color VARCHAR(20) NOT NULL,
  days JSON NOT NULL,
  time VARCHAR(20) NOT NULL,
  active BOOLEAN NOT NULL,
  created DATE NOT NULL,
  PRIMARY KEY (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS habit_checks (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  habit_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  date DATE NOT NULL,
  status ENUM('done','skip') NOT NULL,
  note TEXT NOT NULL,
  PRIMARY KEY (user_id, habit_id, date),
  FOREIGN KEY (user_id, habit_id) REFERENCES habits(user_id, id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

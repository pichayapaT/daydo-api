CREATE TABLE IF NOT EXISTS habit_months (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  month CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  goal TEXT NOT NULL,
  notes TEXT NOT NULL,
  reflection_well TEXT NOT NULL,
  reflection_improve TEXT NOT NULL,
  reflection_proud TEXT NOT NULL,
  PRIMARY KEY (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

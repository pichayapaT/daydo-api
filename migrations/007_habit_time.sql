-- Convert legacy habit period labels to free-form HH:mm (empty = anytime).
UPDATE habits SET time = CASE time
  WHEN 'เช้า' THEN '07:00'
  WHEN 'กลางวัน' THEN '12:00'
  WHEN 'เย็น' THEN '18:00'
  WHEN 'ไม่ระบุ' THEN ''
  ELSE time
END
WHERE time IN ('เช้า', 'กลางวัน', 'เย็น', 'ไม่ระบุ');

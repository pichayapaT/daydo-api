-- Expand habit icon/color storage for curated Lucide ids and hex colors.
UPDATE habits SET color = CASE color
  WHEN 'mint' THEN '#c1dfcc'
  WHEN 'lavender' THEN '#d6c5f1'
  WHEN 'yellow' THEN '#f9dc67'
  WHEN 'orange' THEN '#f5ad83'
  ELSE color
END
WHERE color IN ('mint', 'lavender', 'yellow', 'orange');

ALTER TABLE habits
  MODIFY icon VARCHAR(40) NOT NULL,
  MODIFY color VARCHAR(7) NOT NULL;

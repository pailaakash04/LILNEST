-- Add new community fields
ALTER TABLE community_posts
  ADD COLUMN category TEXT NULL,
  ADD COLUMN author_name TEXT NULL,
  ADD COLUMN is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN views INT NOT NULL DEFAULT 0;

-- Add rewards summary fields
ALTER TABLE rewards_summary
  ADD COLUMN streak INT NOT NULL DEFAULT 0,
  ADD COLUMN badges JSON NULL;

-- Add rewards challenge fields
ALTER TABLE rewards_challenges
  ADD COLUMN goal INT NOT NULL DEFAULT 0,
  ADD COLUMN progress INT NOT NULL DEFAULT 0,
  ADD COLUMN points INT NOT NULL DEFAULT 0;

-- Doctor module tables
CREATE TABLE IF NOT EXISTS patients (
  id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  risk TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS patient_prescriptions (
  id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  drug TEXT NOT NULL,
  dose TEXT NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY patient_prescriptions_patient_idx (patient_id),
  CONSTRAINT patient_prescriptions_patient_fk
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS patient_reports (
  id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NULL,
  size INT NULL,
  url TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY patient_reports_patient_idx (patient_id),
  CONSTRAINT patient_reports_patient_fk
    FOREIGN KEY (patient_id) REFERENCES patients(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

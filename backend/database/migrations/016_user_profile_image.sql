USE cattle_feed_erp;

ALTER TABLE users
  ADD COLUMN profile_image VARCHAR(255) DEFAULT NULL AFTER phone;

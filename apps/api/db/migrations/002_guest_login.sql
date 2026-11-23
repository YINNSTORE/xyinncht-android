-- Login beta tanpa nomor HP. PostgreSQL mengizinkan banyak NULL pada kolom UNIQUE.
alter table users alter column phone drop not null;

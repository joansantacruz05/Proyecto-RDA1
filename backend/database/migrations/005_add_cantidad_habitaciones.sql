-- Migración 005: Agregar columna cantidadHabitaciones a reservas para soporte de reservas multihabitación y cálculo exacto de disponibilidad sin sobreventa
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS "cantidadHabitaciones" INT DEFAULT 1;
UPDATE reservas SET "cantidadHabitaciones" = 1 WHERE "cantidadHabitaciones" IS NULL;


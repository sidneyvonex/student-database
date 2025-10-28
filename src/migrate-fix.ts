import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = postgres(url);

async function main() {
  console.log('Connecting to database...');
  // Normalize work_study existing textual values to 'true' or 'false'
  console.log('Normalizing students.work_study values...');
  await sql`
    UPDATE students
    SET work_study = CASE
      WHEN LOWER(work_study) IN ('true','t','1','yes','y') THEN 'true'
      ELSE 'false'
    END
    WHERE work_study IS NOT NULL;
  `;

  console.log('Dropping default constraint on work_study...');
  try {
    await sql`ALTER TABLE students ALTER COLUMN work_study DROP DEFAULT;`;
    console.log('Default dropped');
  } catch (e) {
    console.error('Failed to drop default:', e);
    process.exit(1);
  }

  console.log('Altering column type to boolean...');
  try {
    await sql`ALTER TABLE students ALTER COLUMN work_study TYPE boolean USING (work_study::boolean);`;
    console.log('Column work_study converted to boolean');
  } catch (e) {
    console.error('Failed to alter column work_study:', e);
    process.exit(1);
  }

  console.log('Setting new default to false...');
  try {
    await sql`ALTER TABLE students ALTER COLUMN work_study SET DEFAULT false;`;
    console.log('Default set to false');
  } catch (e) {
    console.error('Failed to set default:', e);
    process.exit(1);
  }

  console.log('Done.');
  await sql.end({ timeout: 5 });
}

main().catch((e) => { console.error(e); process.exit(1); });

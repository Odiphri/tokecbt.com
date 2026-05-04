import bcrypt from "bcryptjs";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const USERNAME = "admin";
const NAME = "Super Admin";
const PASSWORD = "Admin@1234";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.username, USERNAME));

  if (existing) {
    await db.update(adminsTable).set({ name: NAME, passwordHash: hash }).where(eq(adminsTable.username, USERNAME));
    console.log(`Admin '${USERNAME}' updated.`);
  } else {
    await db.insert(adminsTable).values({ username: USERNAME, name: NAME, passwordHash: hash });
    console.log(`Admin '${USERNAME}' created.`);
  }

  console.log(`Username: ${USERNAME}`);
  console.log(`Password: ${PASSWORD}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

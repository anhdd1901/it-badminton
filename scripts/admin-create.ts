import { AppError } from "../src/server/errors";
import { createFirstAdmin } from "../src/server/members/bootstrap";
import { connect, createPrompter, reportFailure } from "./cli";

async function main(): Promise<void> {
  const { db, close } = connect();
  const prompt = createPrompter();
  try {
    const username = await prompt.ask("Tên đăng nhập: ");
    const displayName = await prompt.ask("Tên hiển thị: ");
    const initialElo = await prompt.ask("ELO ban đầu (vd 1000 hoặc 1012,5): ");
    const password = await prompt.askSecret("Mật khẩu (tối thiểu 8 ký tự): ");
    const again = await prompt.askSecret("Nhập lại mật khẩu: ");
    if (password !== again) throw new AppError("VALIDATION", "Hai lần nhập mật khẩu không khớp");
    await createFirstAdmin(db, { username, displayName, password, initialElo }, new Date());
    console.log(`Đã tạo admin "${username.trim().toLowerCase()}".`);
  } catch (e) {
    prompt.close();
    await close();
    reportFailure(e);
  }
  prompt.close();
  await close();
}

void main();

import { AppError } from "../src/server/errors";
import { resetPasswordByUsername } from "../src/server/members/bootstrap";
import { connect, createPrompter, reportFailure } from "./cli";

async function main(): Promise<void> {
  const username = process.argv[2];
  if (!username) {
    console.error("Cách dùng: pnpm admin:reset-password <tên đăng nhập>");
    process.exit(1);
  }
  const { db, close } = connect();
  const prompt = createPrompter();
  try {
    const password = await prompt.askSecret("Mật khẩu mới (tối thiểu 8 ký tự): ");
    const again = await prompt.askSecret("Nhập lại mật khẩu: ");
    if (password !== again) throw new AppError("VALIDATION", "Hai lần nhập mật khẩu không khớp");
    await resetPasswordByUsername(db, username, password);
    console.log(
      `Đã đặt lại mật khẩu cho "${username.trim().toLowerCase()}" và đăng xuất mọi phiên.`,
    );
  } catch (e) {
    prompt.close();
    await close();
    reportFailure(e);
  }
  prompt.close();
  await close();
}

void main();

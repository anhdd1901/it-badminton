import { describe, expect, it } from "vitest";
import { checkScore } from "./score";

describe("checkScore", () => {
  it.each([[21,0],[21,19],[22,20],[25,23],[29,27],[30,28],[30,29]])("hợp lệ %i–%i", (a,b) => {
    expect(checkScore(a,b)).toEqual({ ok: true, winner: "A" });
    expect(checkScore(b,a)).toEqual({ ok: true, winner: "B" });
  });
  it("lý do từ chối", () => {
    expect(checkScore(23,20)).toEqual({ ok:false, reason:"Tỷ số 23–20 không hợp lệ: từ 22 điểm trở lên phải thắng cách đúng 2" });
    expect(checkScore(20,21)).toEqual({ ok:false, reason:"Tỷ số 21–20 không hợp lệ: chưa cách 2 điểm, phải đánh tiếp" });
    expect(checkScore(19,15).ok).toBe(false);
    expect(checkScore(21,21)).toEqual({ ok:false, reason:"Không có tỷ số hòa" });
    expect(checkScore(30,27).ok).toBe(false);
    expect(checkScore(31,29)).toEqual({ ok:false, reason:"Tỷ số 31–29 không hợp lệ: tối đa 30 điểm" });
    expect(checkScore(22,21).ok).toBe(false);
  });
  it.each([[-1,21],[21.5,19],[NaN,21],[21,Infinity]])("dữ liệu bậy %s–%s", (a,b) => {
    expect(checkScore(a,b)).toEqual({ ok:false, reason:"Tỷ số phải là số nguyên từ 0 trở lên" });
  });
});

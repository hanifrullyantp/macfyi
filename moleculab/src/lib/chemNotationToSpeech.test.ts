import { describe, it, expect } from "vitest";
import { toSpeechFriendly } from "./chemNotationToSpeech";

describe("toSpeechFriendly", () => {
  it("konversi simbol derajat", () => {
    expect(toSpeechFriendly("Sudut 104,5°")).toContain("104,5 derajat");
  });

  it("eja singkatan kimia dengan jeda koma", () => {
    const res = toSpeechFriendly("Ini disebut PEB dan PEI");
    expect(res).toContain("P, E, B");
    expect(res).toContain("P, E, I");
  });

  it("konversi golongan romawi dalam konteks kimia", () => {
    expect(toSpeechFriendly("Golongan VIA")).toContain("Golongan enam A");
    expect(toSpeechFriendly("Golongan IVB")).toContain("Golongan empat B");
    expect(toSpeechFriendly("Golongan VIIIA")).toContain("Golongan delapan A");
  });

  it("konversi notasi VSEPR AXnEm", () => {
    expect(toSpeechFriendly("Notasi AX2E2")).toBe("Notasi A, X 2, E 2");
    expect(toSpeechFriendly("Bentuk AX4")).toBe("Bentuk A, X 4");
  });

  it("konversi subscript unicode", () => {
    expect(toSpeechFriendly("Molekul H₂O")).toContain("H 2 O");
  });

  it("tidak merusak kata normal yang mengandung pola romawi", () => {
    expect(toSpeechFriendly("VISI dan MISI")).toBe("VISI dan MISI");
  });
});

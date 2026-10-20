"use client";
import { useEffect, useRef, useState } from "react";
import { removeAvatarAction, setAvatarAction } from "@/app/_actions/profile";
import { MemberAvatar, type AvatarMember } from "@/components/member-avatar";
import { Button } from "@/components/ui/button";
import { useAppAction } from "@/components/use-app-action";
import { MAX_AVATAR_BYTES } from "@/ui/avatar";

const TOO_LARGE = "Ảnh tối đa 5 MB";

export function AvatarForm({ member }: { member: AvatarMember }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useAppAction(setAvatarAction);
  const remove = useAppAction(removeAvatarAction);

  // Revoke each object URL when it is replaced and on unmount.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function clear() {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setError(null);
    if (picked && picked.size > MAX_AVATAR_BYTES) {
      clear();
      setError(TOO_LARGE);
      return;
    }
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : null);
  }

  async function onSave() {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const result = await save.run(member.id, form);
    if (result.ok) clear();
    else setError(result.message);
  }

  async function onRemove() {
    setError(null);
    const result = await remove.run(member.id);
    if (!result.ok) setError(result.message);
  }

  const busy = save.pending || remove.pending;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Ảnh xem trước"
            width={64}
            height={64}
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <MemberAvatar member={member} size={64} />
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id="avatar-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onPick}
            aria-label="Chọn ảnh đại diện"
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Chọn ảnh
          </Button>
          {file ? (
            <Button type="button" disabled={busy} onClick={onSave}>
              Lưu ảnh
            </Button>
          ) : null}
          {member.avatarUrl && !file ? (
            <Button type="button" variant="outline" disabled={busy} onClick={onRemove}>
              Xóa ảnh
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

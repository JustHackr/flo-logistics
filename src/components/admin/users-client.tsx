"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { createUserAction, deleteUserAction } from "@/app/actions/users";
import { ROLES, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n/use-i18n";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
};

export function UsersClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const { t } = useI18n();
  const [message, setMessage] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setCreating(true);
    setMessage(null);
    const result = await createUserAction(formData);
    setCreating(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    (document.getElementById("create-user-form") as HTMLFormElement | null)?.reset();
  }

  async function onDelete(userId: string) {
    setDeletingId(userId);
    setMessage(null);
    const result = await deleteUserAction(userId);
    setDeletingId(null);
    if (!result.ok) setMessage(result.message);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("users.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("users.subtitle")}</p>
      </header>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">{t("users.createTitle")}</h2>
        <form
          id="create-user-form"
          className="mt-4 grid gap-4 sm:grid-cols-2"
          action={onCreate}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("users.name")}</Label>
            <Input id="name" name="name" required maxLength={80} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("users.email")}</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("users.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={10}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">{t("users.role")}</Label>
            <select
              id="role"
              name="role"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue="OPS_MANAGER"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(`auth.roles.${role}.name`)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("users.creating")}
                </span>
              ) : (
                t("users.create")
              )}
            </Button>
          </div>
        </form>
      </section>

      {message ? (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}

      <section className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{t("users.name")}</th>
              <th className="px-4 py-3 font-medium">{t("users.email")}</th>
              <th className="px-4 py-3 font-medium">{t("users.role")}</th>
              <th className="px-4 py-3 font-medium">{t("users.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{t(`auth.roles.${user.role}.name`)}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8"
                    disabled={user.id === currentUserId || deletingId === user.id}
                    onClick={() => onDelete(user.id)}
                  >
                    {deletingId === user.id ? t("users.deleting") : t("users.delete")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

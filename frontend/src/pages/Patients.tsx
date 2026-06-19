import type * as React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  IdCard,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Patient, PatientPayload } from "@/lib/api";

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const query = useQuery({
    queryKey: ["patients", search],
    queryFn: () => api.listPatients({ search: search || undefined, limit: 200 }),
  });
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });

  const items = query.data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader
        title="Bệnh nhân"
        description="Hồ sơ bệnh nhân và lịch sử các lần khám."
        right={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            Thêm bệnh nhân
          </Button>
        }
      />

      <Panel
        icon={Users}
        title={`${query.data?.total ?? 0} bệnh nhân`}
        description="Tìm theo tên, mã hoặc số điện thoại"
        right={
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Tìm bệnh nhân..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-[13px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Xoá tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        }
      >
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : query.error ? (
          <div className="text-sm text-destructive">
            {query.error instanceof Error
              ? query.error.message
              : "Không tải được"}
          </div>
        ) : items.length === 0 ? (
          <EmptyPatients onCreate={() => setShowCreate(true)} hasSearch={!!search} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Mã
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Họ tên
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    Ngày sinh
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-left font-semibold">
                    SĐT
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-center font-semibold">
                    Lần khám
                  </th>
                  <th className="border-b border-border/60 px-2 pb-2 text-right font-semibold">
                    {""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    onDelete={() => {
                      if (
                        confirm(
                          `Xoá bệnh nhân "${p.full_name}"? Tất cả lần khám sẽ bị xoá theo.`,
                        )
                      ) {
                        deleteMut.mutate(p.id);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showCreate && (
        <CreatePatientDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["patients"] });
          }}
        />
      )}
    </div>
  );
}

function PatientRow({
  patient,
  onDelete,
}: {
  patient: Patient;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-accent-soft/40">
      <td className="px-2 py-2 font-mono text-[11px]">
        {patient.code ?? "—"}
      </td>
      <td className="px-2 py-2">
        <Link
          to={`/patients/${patient.id}`}
          className="font-medium text-primary hover:underline"
        >
          {patient.full_name}
        </Link>
      </td>
      <td className="px-2 py-2 text-muted-foreground">
        {patient.date_of_birth ?? "—"}
      </td>
      <td className="px-2 py-2 font-mono text-[11px]">
        {patient.phone ?? "—"}
      </td>
      <td className="px-2 py-2 text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
          <Stethoscope className="h-3 w-3" />
          {patient.prediction_count ?? 0}
        </span>
      </td>
      <td className="px-2 py-2 text-right">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Xoá"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function EmptyPatients({
  onCreate,
  hasSearch,
}: {
  onCreate: () => void;
  hasSearch: boolean;
}) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Users className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium text-primary">
        {hasSearch ? "Không tìm thấy bệnh nhân" : "Chưa có bệnh nhân nào"}
      </div>
      {!hasSearch && (
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" />
          Thêm bệnh nhân đầu tiên
        </Button>
      )}
    </div>
  );
}

export function CreatePatientDialog({
  onClose,
  onCreated,
  initial,
}: {
  onClose: () => void;
  onCreated: (p: Patient) => void;
  initial?: Partial<PatientPayload>;
}) {
  const [form, setForm] = useState<PatientPayload>({
    full_name: initial?.full_name ?? "",
    code: initial?.code ?? "",
    date_of_birth: initial?.date_of_birth ?? "",
    phone: initial?.phone ?? "",
    note: initial?.note ?? "",
  });
  const mut = useMutation({
    mutationFn: (payload: PatientPayload) => api.createPatient(payload),
    onSuccess: (data) => onCreated(data),
  });

  const canSubmit = useMemo(
    () => form.full_name.trim().length > 0 && !mut.isPending,
    [form.full_name, mut.isPending],
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-md p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">
            Thêm bệnh nhân mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            const payload: PatientPayload = {
              full_name: form.full_name.trim(),
              code: form.code?.trim() || null,
              date_of_birth: form.date_of_birth?.trim() || null,
              phone: form.phone?.trim() || null,
              note: form.note?.trim() || null,
            };
            mut.mutate(payload);
          }}
        >
          <Field icon={User} label="Họ tên *">
            <Input
              required
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              placeholder="VD: Nguyễn Thị A"
              className="h-8 text-[13px]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field icon={IdCard} label="Mã BN">
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="VD: BN-001"
                className="h-8 text-[13px]"
              />
            </Field>
            <Field icon={CalendarDays} label="Ngày sinh">
              <Input
                type="date"
                value={form.date_of_birth ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date_of_birth: e.target.value }))
                }
                className="h-8 text-[13px]"
              />
            </Field>
          </div>
          <Field icon={Phone} label="Số điện thoại">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="VD: 0901234567"
              className="h-8 text-[13px]"
            />
          </Field>
          <div className="space-y-1">
            <Label className="text-[11.5px] font-medium text-muted-foreground">
              Ghi chú
            </Label>
            <textarea
              value={form.note ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Tiền sử, ghi chú khám..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {mut.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
              {mut.error instanceof Error ? mut.error.message : "Lỗi"}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {mut.isPending ? "Đang lưu..." : "Tạo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </Label>
      {children}
    </div>
  );
}

import type * as React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  History,
  Lightbulb,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { RiskTier } from "@/lib/api";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    to: "/predict",
    icon: Activity,
    title: "Dự đoán nguy cơ GDM",
    description:
      "Nhập 15 yếu tố lâm sàng → mô hình LightGBM trả về xác suất, mức nguy cơ và top 5 yếu tố ảnh hưởng.",
  },
  {
    to: "/shap",
    icon: BrainCircuit,
    title: "Giải thích bằng SHAP",
    description:
      "Waterfall đầy đủ cho từng dự đoán: feature nào tăng/giảm xác suất, đóng góp bao nhiêu.",
  },
  {
    to: "/patients",
    icon: Users,
    title: "Quản lý bệnh nhân",
    description:
      "Hồ sơ bệnh nhân và lịch sử các lần khám — gắn mỗi dự đoán vào một hồ sơ duy nhất.",
  },
  {
    to: "/history",
    icon: History,
    title: "Lịch sử dự đoán",
    description:
      "Tất cả các lần khám — có bộ lọc theo mức nguy cơ, OGTT, khoảng ngày và xác suất.",
  },
];

export function Home() {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section className="surface-card relative overflow-hidden px-6 py-6 text-center lg:px-10 lg:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, hsl(168 76% 42% / 0.18), transparent 55%), radial-gradient(circle at 90% 100%, hsl(222 60% 18% / 0.12), transparent 55%)",
          }}
        />
        <div className="pill mx-auto bg-accent-soft text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Độ an toàn · LightGBM + XAI
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary sm:text-3xl lg:text-4xl">
          Sàng lọc nguy cơ Tiểu đường thai kỳ
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground lg:text-[15px]">
          Hỗ trợ bác sĩ ra quyết định trước-OGTT bằng mô hình LightGBM huấn
          luyện trên dataset Sumathi (1.013 ca). Giải thích bằng SHAP, đối chiếu
          baseline OD-DSAE và phân tầng nguy cơ theo Option D.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/predict">
            <Button size="lg">
              <PlayCircle className="h-4 w-4" />
              Bắt đầu dự đoán
            </Button>
          </Link>
          <Link to="/shap">
            <Button size="lg" variant="outline">
              <ShieldCheck className="h-4 w-4" />
              Xem giải thích SHAP
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.to}
              to={f.to}
              className="group surface-card flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-semibold tracking-tight text-primary">
                    {f.title}
                  </h3>
                  <ArrowRight className="h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:text-accent group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </Link>
          );
        })}
      </section>

      <StatsSection />

      <WorkflowSection />

      <TipsSection />
    </div>
  );
}

function StatsSection() {
  const patients = useQuery({
    queryKey: ["home-patients-count"],
    queryFn: () => api.listPatients({ limit: 1 }),
  });
  const allPreds = useQuery({
    queryKey: ["home-preds-all"],
    queryFn: () => api.listPredictions({ limit: 1 }),
  });
  const highPreds = useQuery({
    queryKey: ["home-preds-cao"],
    queryFn: () => api.listPredictions({ risk: ["Cao"], limit: 1 }),
  });
  const midPreds = useQuery({
    queryKey: ["home-preds-tb"],
    queryFn: () => api.listPredictions({ risk: ["Trung bình"], limit: 1 }),
  });
  const lowPreds = useQuery({
    queryKey: ["home-preds-thap"],
    queryFn: () => api.listPredictions({ risk: ["Thấp"], limit: 1 }),
  });

  const totalPatients = patients.data?.total ?? 0;
  const totalPreds = allPreds.data?.total ?? 0;
  const high = highPreds.data?.total ?? 0;
  const mid = midPreds.data?.total ?? 0;
  const low = lowPreds.data?.total ?? 0;

  const pct = (n: number) =>
    totalPreds > 0 ? Math.round((n / totalPreds) * 100) : 0;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      <StatCard
        icon={Users}
        label="Bệnh nhân"
        value={totalPatients}
        hint="Tổng hồ sơ trong hệ thống"
        accent="from-sky-50 via-sky-50/40"
        iconClass="bg-sky-100 text-sky-700"
      />
      <StatCard
        icon={Stethoscope}
        label="Lần khám"
        value={totalPreds}
        hint="Tổng lần chạy mô hình"
        accent="from-emerald-50 via-emerald-50/40"
        iconClass="bg-emerald-100 text-emerald-700"
      />
      <div className="surface-card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Phân bố nguy cơ
            </div>
            <div className="mt-0.5 text-2xl font-bold tabular-nums text-primary">
              {totalPreds}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                lần khám
              </span>
            </div>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        {totalPreds === 0 ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Chưa có lần khám nào — chạy thử dự đoán để xem phân bố.
          </p>
        ) : (
          <>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500"
                style={{ width: `${pct(low)}%` }}
                title={`Thấp: ${low}`}
              />
              <div
                className="bg-amber-500"
                style={{ width: `${pct(mid)}%` }}
                title={`Trung bình: ${mid}`}
              />
              <div
                className="bg-red-500"
                style={{ width: `${pct(high)}%` }}
                title={`Cao: ${high}`}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
              <LegendItem color="bg-emerald-500" label="Thấp" n={low} pct={pct(low)} />
              <LegendItem color="bg-amber-500" label="TB" n={mid} pct={pct(mid)} />
              <LegendItem color="bg-red-500" label="Cao" n={high} pct={pct(high)} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  accent: string;
  iconClass: string;
}) {
  return (
    <div
      className={cn(
        "surface-card relative overflow-hidden bg-gradient-to-br to-transparent p-5",
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-0.5 text-3xl font-bold tabular-nums text-primary">
            {value}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>
        </div>
        <div className={cn("grid h-9 w-9 place-items-center rounded-lg", iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  n,
  pct,
}: {
  color: string;
  label: string;
  n: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono tabular-nums text-foreground">
        {n}
        <span className="ml-1 text-muted-foreground">({pct}%)</span>
      </span>
    </div>
  );
}

const WORKFLOW: { icon: typeof ClipboardList; title: string; desc: string }[] = [
  {
    icon: ClipboardList,
    title: "1. Nhập dữ liệu lâm sàng",
    desc: "Bác sĩ nhập 15 yếu tố: tuổi, BMI, huyết áp, OGTT (nếu có), tiền sử...",
  },
  {
    icon: BrainCircuit,
    title: "2. Mô hình LightGBM dự đoán",
    desc: "Tính xác suất GDM + phân tầng nguy cơ (Thấp / Trung bình / Cao) theo Option D.",
  },
  {
    icon: Sparkles,
    title: "3. SHAP giải thích kết quả",
    desc: "Hiển thị top 5 yếu tố ảnh hưởng — bác sĩ thấy rõ vì sao mô hình quyết định như vậy.",
  },
];

function WorkflowSection() {
  return (
    <section className="surface-card p-5 lg:p-6">
      <div className="mb-4 flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            Quy trình
          </div>
          <h2 className="text-lg font-bold tracking-tight text-primary">
            Từ dữ liệu lâm sàng đến quyết định
          </h2>
        </div>
        <Link
          to="/predict"
          className="text-[12.5px] font-medium text-accent hover:underline"
        >
          Bắt đầu ngay →
        </Link>
      </div>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {WORKFLOW.map((w, i) => {
          const Icon = w.icon;
          return (
            <div
              key={i}
              className="relative rounded-xl border border-border/60 bg-card/60 p-4"
            >
              <div className="absolute -top-2 -left-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground shadow-sm">
                {i + 1}
              </div>
              <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-[13.5px] font-semibold text-primary">
                {w.title.replace(/^\d+\.\s*/, "")}
              </h3>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {w.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TIPS: { tier: RiskTier; title: string; tip: string }[] = [
  {
    tier: "Thấp",
    title: "Nguy cơ Thấp",
    tip: "Tiếp tục theo dõi định kỳ. Duy trì chế độ ăn cân đối và vận động nhẹ.",
  },
  {
    tier: "Trung bình",
    title: "Nguy cơ Trung bình",
    tip: "Mô hình không có OGTT để khẳng định — khuyến nghị làm OGTT 75g để chẩn đoán cuối.",
  },
  {
    tier: "Cao",
    title: "Nguy cơ Cao",
    tip: "Chuyển khám nội tiết, theo dõi đường huyết chặt chẽ, tư vấn dinh dưỡng và vận động.",
  },
];

const TIER_STYLES: Record<RiskTier, { bg: string; dot: string; text: string }> = {
  Thấp: { bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-800" },
  "Trung bình": { bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-800" },
  Cao: { bg: "bg-red-50", dot: "bg-red-500", text: "text-red-800" },
};

function TipsSection() {
  return (
    <section className="surface-card p-5 lg:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h2 className="text-base font-bold tracking-tight text-primary">
          Khuyến nghị theo mức nguy cơ
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {TIPS.map((t) => {
          const s = TIER_STYLES[t.tier];
          return (
            <div
              key={t.tier}
              className={cn(
                "rounded-xl border border-border/60 p-4",
                s.bg,
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                <h3 className={cn("text-[13px] font-bold tracking-tight", s.text)}>
                  {t.title}
                </h3>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/80">
                {t.tip}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

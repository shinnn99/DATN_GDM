import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  History,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    to: "/history",
    icon: History,
    title: "Lịch sử dự đoán",
    description:
      "Xem lại các ca đã chạy gần đây — phục vụ kiểm tra và demo.",
  },
];

export function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:gap-6">
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

      <section className="grid flex-1 gap-3 sm:grid-cols-2 lg:gap-4">
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
    </div>
  );
}

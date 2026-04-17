import { CalendarView } from "@/components/dashboard/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div>
        <h2 className="text-xl font-ui font-bold text-text">Takvim</h2>
        <p className="text-sm text-muted font-ui mt-1">
          Makalelerinizin yayınlanma takvimine buradan ulaşın.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Takvim */}
        <div className="flex-1 bg-surface border border-border rounded-xl p-4 overflow-hidden">
          <CalendarView />
        </div>

        {/* Sağ Panel */}
        <div className="lg:w-64 space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-ui font-semibold text-text mb-3">
              Yaklaşan Yayınlar
            </h3>
            <div className="py-8 text-center">
              <p className="text-muted text-xs font-ui">
                Zamanlanmış yayın yok
              </p>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-ui font-semibold text-text mb-2">
              Renk Kodları
            </h3>
            <ul className="space-y-2 text-xs font-ui">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald" />
                <span className="text-muted">Yayınlandı</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-muted">Zamanlandı</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gold" />
                <span className="text-muted">Hazır</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Boş Durum Uyarısı */}
      <p className="text-center text-xs text-muted font-ui">
        Makalelerinizi zamanlamak için önce bir tarama başlatın.
      </p>
    </div>
  );
}

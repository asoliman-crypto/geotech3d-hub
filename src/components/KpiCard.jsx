export function KpiCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  return (
    <section className={`kpi-card kpi-${tone}`}>
      <div className="kpi-icon">{Icon ? <Icon size={20} aria-hidden="true" /> : null}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
    </section>
  );
}


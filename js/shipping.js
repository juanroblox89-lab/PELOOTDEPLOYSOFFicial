// ==========================================
// SHIPPING.JS - Fechas de entrega dinámicas
// PeLoot 2026
// ==========================================

(function () {
  const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  function addBusinessDays(date, days) {
    let d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      // Skip Sunday (0) and Saturday (6)
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return d;
  }

  function formatDate(date) {
    return `${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
  }

  function updateShippingDates() {
    const dateEl = document.querySelector(".shipping-estimate .dates");
    if (!dateEl) return;

    const today = new Date();
    // Processing time: 1-2 business days, then 10-30 calendar days shipping
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 10);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    dateEl.textContent = `Entre el ${formatDate(minDate)} y el ${formatDate(maxDate)}`;
  }

  // Run on DOMContentLoaded or immediately if DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateShippingDates);
  } else {
    updateShippingDates();
  }
})();

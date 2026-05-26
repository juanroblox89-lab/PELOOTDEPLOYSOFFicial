document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("backBtn");
  if (!btn) return;

  const page = window.location.pathname;

  // navegación inteligente
  if (page.includes("product")) {
    btn.href = "products";
  }
  else if (page.includes("products")) {
    btn.href = "index";
  }
  else {
    btn.href = "index";
  }
});

const ROOT_ID = "browser-buddy-root";

function ensureRoot() {
  if (document.getElementById(ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("data-browser-buddy", "true");
  root.style.position = "fixed";
  root.style.right = "24px";
  root.style.bottom = "24px";
  root.style.zIndex = "2147483647";
  root.style.width = "84px";
  root.style.height = "84px";
  root.style.borderRadius = "999px";
  root.style.background = "linear-gradient(180deg, #f4c66a, #e8923c)";
  root.style.boxShadow = "0 14px 32px rgba(0, 0, 0, 0.22)";
  root.style.display = "grid";
  root.style.placeItems = "center";
  root.style.cursor = "grab";
  root.style.userSelect = "none";
  root.title = "Browser Buddy prototype";

  const face = document.createElement("div");
  face.textContent = "R";
  face.style.fontFamily = "Segoe UI, sans-serif";
  face.style.fontWeight = "700";
  face.style.color = "#3f2411";
  face.style.fontSize = "28px";
  root.appendChild(face);

  document.documentElement.appendChild(root);
}

if (document.contentType?.includes("text/html")) {
  ensureRoot();
}

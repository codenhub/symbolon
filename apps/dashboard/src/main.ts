import "./main.css";

const app = document.querySelector<HTMLElement>("#app");

// A placeholder until the admin API exists. Elements are built with textContent only: nothing derived from
// the URL or the API is ever written as HTML.
if (app !== null) {
  const heading = document.createElement("h1");
  const icon = document.createElement("i");
  icon.className = "ic-lucide-shield-check";
  icon.setAttribute("aria-hidden", "true");
  heading.append(icon, " Symbolon");
  app.replaceChildren(heading);
}

/* Comment box under «تجربه دانشجویان» (utterances): comments are stored as GitHub issue comments.
   Needs the utterances GitHub app installed on the repository (see ROADMAP/CONTRIBUTING). */
(function () {
  var holder = document.getElementById("isl-comments");
  if (!holder) return;
  var box = holder.querySelector(".isl-comments-box");
  function theme() {
    return document.body.getAttribute("data-md-color-scheme") === "slate" ? "github-dark" : "github-light";
  }
  var s = document.createElement("script");
  s.src = "https://utteranc.es/client.js";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.setAttribute("repo", holder.getAttribute("data-repo"));
  s.setAttribute("issue-term", "pathname");
  s.setAttribute("label", "💬 comments");
  s.setAttribute("theme", theme());
  box.appendChild(s);
  /* Follow the site's light/dark switch. */
  new MutationObserver(function () {
    var frame = document.querySelector("iframe.utterances-frame");
    if (frame) frame.contentWindow.postMessage({ type: "set-theme", theme: theme() }, "https://utteranc.es");
  }).observe(document.body, { attributes: true, attributeFilter: ["data-md-color-scheme"] });
})();

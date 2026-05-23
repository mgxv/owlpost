(document.getElementById("desc") as HTMLElement).textContent = new URLSearchParams(location.search).get("desc") ?? "";
(document.getElementById("retry") as HTMLElement).addEventListener("click", () => {
    location.assign("https://mail.google.com/");
});

document.addEventListener("DOMContentLoaded", () => {
  const preloader = document.getElementById("preloader");
  const content = document.querySelector(".content");

  // Simulate page load delay (remove this setTimeout in production)
  setTimeout(() => {
    preloader.style.display = "none";
    content.style.display = "block";
  }, 2000); // 2 seconds delay for demonstration
});

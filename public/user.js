    document.addEventListener("DOMContentLoaded", function () {
  // Hide preloader after 2 seconds
  setTimeout(() => {
    const preloader = document.getElementById("preloader-active");
    if (preloader) {
      preloader.style.display = "none";
    }
  }, 2000);

  // Sidebar toggle functionality
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.querySelector(".menu-toggle");

  // Toggle sidebar on mobile view
  menuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("active");
  });

  // Close sidebar if clicking outside of it on mobile
  document.addEventListener("click", function (event) {
    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(event.target) &&
      !menuToggle.contains(event.target) &&
      sidebar.classList.contains("active")
    ) {
      sidebar.classList.remove("active");
    }
  });
    })
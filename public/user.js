    document.addEventListener("DOMContentLoaded", function () {
      // Hide preloader after 2 seconds
      setTimeout(() => {
        const preloader = document.getElementById("preloader-active");
        if (preloader) {
          preloader.style.display = "none";
        }
      }, 2000);

      // Get modal and buttons
      const modal = document.getElementById("responsiveModal");
      const openModalBtn = document.getElementById("openModal");
      const closeModalBtn = document.querySelector(".close-btn");

      // Open modal on button click
      openModalBtn.addEventListener("click", () => {
        modal.style.display = "block";
      });

      // Close modal on 'X' button click
      closeModalBtn.addEventListener("click", () => {
        modal.style.display = "none";
      });

      // Close modal on outside click
      window.addEventListener("click", (event) => {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      });
    })
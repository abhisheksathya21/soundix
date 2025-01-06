    document.addEventListener("DOMContentLoaded", function () {
      // Wait for the window to fully load
      window.onload = function () {
        // Add an artificial delay (e.g., 2 seconds)
        setTimeout(function () {
          // Get the preloader element
          var preloader = document.getElementById("preloader-active");

          // Add a fade-out effect
          preloader.style.transition = "opacity 0.6s";
          preloader.style.opacity = 0;

          // Remove the preloader from the DOM after the fade-out
          setTimeout(function () {
            preloader.style.display = "none";
          }, 600); // Match this timeout with the transition duration
        }, 2000); // Add delay here (2000ms = 2 seconds)
      };

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
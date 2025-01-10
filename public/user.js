    document.addEventListener("DOMContentLoaded", function () {
     
 
  // Wait for the entire page, including images, to load completely
  window.onload = function () {
    // Get the preloader element
    var preloader = document.getElementById("preloader-active");

    // Add a 2-second delay before starting the fade-out effect
    setTimeout(function () {
      // Add a fade-out effect
      preloader.style.transition = "opacity 0.6s";
      preloader.style.opacity = 0;

      // Remove the preloader from the DOM after the fade-out effect is complete
      preloader.addEventListener("transitionend", function () {
        preloader.style.display = "none";
      });
    }, 2000); // 2 seconds = 2000 milliseconds
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
document.addEventListener("DOMContentLoaded", () => {
  const sidebarItems = document.querySelectorAll(".sidebar-item a");

  // Function to set the active state
  const setActiveState = () => {
    const currentPath = window.location.pathname; // Get the current URL path

    sidebarItems.forEach((item) => {
      const itemPath = item.getAttribute("href"); // Get the href of the item
      const parentLi = item.parentElement; // Parent <li> element

      if (itemPath === currentPath) {
        parentLi.classList.add("active");
      } else {
        parentLi.classList.remove("active");
      }
    });
  };

  // Set the active state when the page loads
  setActiveState();

  // Save the active state when clicking a sidebar item
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      sidebarItems.forEach((i) => i.parentElement.classList.remove("active"));
      item.parentElement.classList.add("active");

      // Save the active state in localStorage (optional for maintaining state across reloads)
      localStorage.setItem("activeSidebarSection", item.getAttribute("href"));
    });
  });

  // Persist the active state across reloads using localStorage (optional)
  const savedActiveHref = localStorage.getItem("activeSidebarSection");
  if (savedActiveHref) {
    const savedItem = document.querySelector(
      `.sidebar-item a[href="${savedActiveHref}"]`
    );
    if (savedItem) {
      savedItem.parentElement.classList.add("active");
    }
  }
});

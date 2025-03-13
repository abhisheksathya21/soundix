// /public/js/global.js
class ToastNotification {
    constructor() {
      this.container = document.querySelector('.toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
    show(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const icon = document.createElement('i');
      icon.className = `toast-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
      const textDiv = document.createElement('div');
      textDiv.textContent = message;
      toast.appendChild(icon);
      toast.appendChild(textDiv);
      this.container.appendChild(toast);
      toast.offsetHeight;
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => this.container.removeChild(toast), 300);
      }, 3000);
    }
  }
  
  const toast = new ToastNotification();
  
  // Fetch and update cart count
  async function fetchAndUpdateCartCount() {
    try {
      const response = await fetch('/cart/count');
      const data = await response.json();
      if (data.success) {
        updateCartCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  }
  
  // Fetch and update wishlist count
  async function fetchAndUpdateWishlistCount() {
    try {
      const response = await fetch('/wishlist/count');
      const data = await response.json();
      if (data.success) {
        updateWishlistCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching wishlist count:', error);
    }
  }
  
  // Update cart count in DOM
  function updateCartCount(count) {
    const cartCountElements = document.querySelectorAll('.cart-counter');
    cartCountElements.forEach(element => {
      if (element) element.textContent = count;
    });
  }
  
  // Update wishlist count in DOM
  function updateWishlistCount(count) {
    const wishlistCountElements = document.querySelectorAll('.wishlist-counter');
    wishlistCountElements.forEach(element => {
      if (element) element.textContent = count;
    });
  }
  
  // Fetch initial wishlist state
  async function fetchWishlistState() {
    try {
      const response = await fetch('/wishlist/state');
      const data = await response.json();
      if (data.success) {
        data.wishlistItems.forEach(itemId => {
          const heartIcon = document.querySelector(`.wishlist-btn[data-product-id="${itemId}"] .heart-icon`);
          if (heartIcon) {
            heartIcon.setAttribute('fill', 'red');
          }
        });
        updateWishlistCount(data.wishlistItems.length);
      }
    } catch (error) {
      console.error('Error fetching wishlist state:', error);
    }
  }
  
  // Initialize on page load
  document.addEventListener('DOMContentLoaded', function () {
    fetchAndUpdateCartCount();
    fetchAndUpdateWishlistCount();
    fetchWishlistState();
  
    // Add to Cart Logic
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
      button.addEventListener('click', async function (e) {
        try {
          const productId = this.getAttribute('data-product-id');
          const price = parseFloat(this.getAttribute('data-price'));
          const response = await fetch('/cart-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, price, quantity: 1 }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || 'Failed to add to cart');
          }
          toast.show('Product added to cart successfully!', 'success');
          fetchAndUpdateCartCount(); // Dynamic update
        } catch (error) {
          console.error('Error adding to cart:', error);
          toast.show(error.message, 'error');
        }
      });
    });
  
    // Wishlist Toggle Logic
    const wishlistButtons = document.querySelectorAll('.wishlist-btn');
    wishlistButtons.forEach(button => {
      button.addEventListener('click', async function (e) {
        e.preventDefault();
        const productId = this.getAttribute('data-product-id');
        const heartIcon = this.querySelector('.heart-icon');
        try {
          const response = await fetch('/wishlist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.message || 'Failed to update wishlist');
          }
          if (data.success) {
            heartIcon.setAttribute('fill', data.isAdded ? 'red' : 'none');
            toast.show(data.message, 'success');
            fetchAndUpdateWishlistCount(); // Dynamic update
          } else {
            toast.show(data.message, 'error');
          }
        } catch (error) {
          console.error('Error toggling wishlist:', error);
          toast.show('Failed to update wishlist', 'error');
        }
      });
    });
  });
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-working-text]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      const originalHTML = button.innerHTML;
      const workingText = button.getAttribute("data-working-text");

      button.disabled = true;
      button.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        ${workingText}
      `;

      // Fallback: restore the button after 10 seconds if not re-enabled manually
      setTimeout(() => {
        if (button.disabled) {
          button.disabled = false;
          button.innerHTML = originalHTML;
        }
      }, 10000);
    });
  });
});

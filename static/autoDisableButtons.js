document.addEventListener('DOMContentLoaded', function () {
    document.body.addEventListener('click', function (event) {
      const button = event.target.closest('button');
      if (button && !button.disabled && !button.classList.contains('no-auto-disable')) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.dataset.originalText = originalText;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Working...`;
  
        // Auto re-enable after 5 seconds (optional)
        setTimeout(() => {
          button.disabled = false;
          button.innerHTML = button.dataset.originalText;
        }, 5000);
      }
    });
  });
  
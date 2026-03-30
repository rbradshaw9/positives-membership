---
name: adding-dynamic-copyright
description: Adds a footer or copyright message with a dynamic year that updates automatically. Use whenever tasked with adding a footer, creating a copyright message, or updating copyright years on a website.
---

# Adding Dynamic Copyright

## When to use this skill
- Adding a new footer to a website.
- Creating a copyright message or notice.
- Updating an existing hardcoded copyright year to be dynamic.
- The user mentions "footer", "copyright", or "dynamic year".

## Workflow
- [ ] Identify where the copyright message needs to be placed (e.g., footer component, global layout).
- [ ] Determine the technology stack of the project (Vanilla HTML/JS, React/Next.js, GoHighLevel, etc.).
- [ ] Implement the dynamic year logic appropriate for the identified stack.
- [ ] Verify the year renders correctly as the current year.

## Instructions
When adding a copyright message, you MUST ensure the year updates automatically. Never hardcode the current year (e.g., `2024` or `2026`).

Here are the standard approaches for different environments:

### Vanilla JavaScript / HTML
Use an inline script or attach to an element ID:
```html
<p>&copy; <span id="copyright-year"></span> Your Company Name. All rights reserved.</p>
<script>
  document.getElementById('copyright-year').textContent = new Date().getFullYear();
</script>
```

### React / Next.js
Use JavaScript's `Date` object within the component:
```jsx
export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer>
      <p>&copy; {currentYear} Your Company Name. All rights reserved.</p>
    </footer>
  );
}
```

### GoHighLevel / Custom HTML block
If inserting into a platform that accepts Custom HTML/JS:
```html
<div>&copy; <span id="ghl-copyright-year"></span> Your Company Name. All rights reserved.</div>
<script>
  document.getElementById('ghl-copyright-year').innerText = new Date().getFullYear();
</script>
```

### PHP / WordPress theme
```php
<p>&copy; <?php echo date("Y"); ?> Your Company Name. All rights reserved.</p>
```

Ensure the implementation matches the styling and structure of the surrounding site layout.

# Toast Notification Component

Modern, reusable toast notification system for BiddingCrease.

## Features

- ✅ Four toast types: success, error, warning, info
- ✅ Smooth slide-in and fade-out animations
- ✅ Auto-dismiss with progress bar indicator
- ✅ Queueing multiple toasts
- ✅ Customizable duration
- ✅ Modern, premium design
- ✅ Responsive and accessible

## Setup

The `ToastProvider` is already added to your root layout. You can use the `useToast` hook anywhere in your app.

## Basic Usage

```jsx
'use client';

import { useToast } from '@/components/shared/Toast';

export default function MyComponent() {
  const { showToast } = useToast();

  const handleAction = () => {
    showToast('Action completed successfully!', 'success');
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## API

### `showToast(message, type, duration)`

Display a toast notification.

**Parameters:**
- `message` (string, required): The message to display
- `type` (string, optional): One of `'success'`, `'error'`, `'warning'`, `'info'` (default: `'info'`)
- `duration` (number, optional): Duration in milliseconds (default: `4000`)

**Returns:** Toast ID (can be used to manually remove the toast)

**Examples:**

```jsx
// Basic success toast
showToast('Player saved successfully!', 'success');

// Error toast with custom duration
showToast('Failed to save data', 'error', 6000);

// Warning toast
showToast('Budget running low', 'warning');

// Info toast
showToast('New player added', 'info');
```

## Toast Types

### Success (Green)
Use for successful operations:
- Player saved
- Bid placed
- Team created
- Data updated

```jsx
showToast('Player added successfully!', 'success');
```

### Error (Red)
Use for errors and failures:
- Validation errors
- Network errors
- Save failures
- Permission denied

```jsx
showToast('Failed to save player', 'error');
```

### Warning (Orange)
Use for warnings and cautions:
- Budget warnings
- Time limits
- Important notices

```jsx
showToast('Your budget is running low!', 'warning');
```

### Info (Blue)
Use for informational messages:
- Status updates
- Notifications
- General information

```jsx
showToast('Auction starting in 5 minutes', 'info');
```

## Real-world Examples

### Form Submission

```jsx
const handleSubmit = async (data) => {
  try {
    await playerAPI.create(data);
    showToast('Player created successfully!', 'success');
    // Reset form, navigate, etc.
  } catch (error) {
    showToast(error.response?.data?.message || 'Failed to create player', 'error');
  }
};
```

### Bid Placement

```jsx
const handleBid = async (amount) => {
  try {
    await auctionAPI.placeBid({ amount });
    showToast(`Bid of ₹${formatCurrency(amount)} placed successfully!`, 'success');
  } catch (error) {
    if (error.response?.status === 400) {
      showToast(error.response.data.message, 'error');
    } else {
      showToast('Failed to place bid. Please try again.', 'error');
    }
  }
};
```

### Multiple Toasts

```jsx
// Show multiple toasts in sequence
const handleBulkAction = async () => {
  showToast('Starting bulk operation...', 'info');
  
  try {
    await performBulkAction();
    showToast('Bulk operation completed!', 'success');
  } catch (error) {
    showToast('Bulk operation failed', 'error');
  }
};
```

### Custom Duration

```jsx
// Short duration for quick actions
showToast('Copied to clipboard', 'success', 2000);

// Long duration for important messages
showToast('Critical system update in progress...', 'warning', 8000);
```

## Styling

The toast component uses Tailwind CSS and includes:
- Rounded corners (16px)
- Subtle shadows
- Backdrop blur effect
- Smooth animations
- Progress bar indicator

Colors are automatically applied based on toast type.

## Positioning

Toasts appear in the top-right corner by default. To change the position, modify the `ToastContainer` component in `Toast.jsx`:

```jsx
// Top-left
<div className="fixed top-4 left-4 ...">

// Bottom-right
<div className="fixed bottom-4 right-4 ...">

// Bottom-left
<div className="fixed bottom-4 left-4 ...">
```

## Accessibility

- Close button with aria-label
- Keyboard accessible
- Screen reader friendly
- High contrast colors

## Demo

Visit `/toast-demo` to see all toast types and examples in action.

